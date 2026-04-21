import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeDeveloperGameIds } from '../auth/schemas/developer-game-access';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import type { UserRole } from '../auth/schemas/user-role';
import { Feedback, FeedbackDocument, FeedbackReporterType, FeedbackStatus } from './feedback.schema';
import { CreateFeedbackDto, CreateSystemFeedbackDto, FeedbackFilterDto, QueryFeedbackDto } from './dto';

type FeedbackManagerScope = {
    role: Extract<UserRole, 'developer' | 'admin'>;
    developerGameIds: string[] | null;
};

const DEFAULT_USER_SOURCE = 'feedback-modal';
const LEGACY_WATCHDOG_SOURCE = 'online-ai-watchdog';
const WATCHDOG_AGGREGATION_SOURCE = 'online-ai-watchdog';
export const WATCHDOG_AGGREGATION_WINDOW_MS = 6 * 60 * 60 * 1000;

const FEEDBACK_SEVERITY_RANK: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
};

type WatchdogAggregationPlan = {
    dedupeKey: string;
    windowStartedAt: Date;
    windowMs: number;
    retentionPolicy: 'windowed-counter-aggregate';
};

@Injectable()
export class FeedbackService {
    constructor(
        @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async create(userId: string | null, dto: CreateFeedbackDto): Promise<Feedback> {
        return this.feedbackModel.create({
            ...dto,
            gameId: this.normalizeFeedbackGameIdCandidates(dto.clientContext?.gameId, dto.gameName),
            reporterType: FeedbackReporterType.USER,
            source: DEFAULT_USER_SOURCE,
            ...(userId && { userId }),
        });
    }

    async createSystem(dto: CreateSystemFeedbackDto): Promise<Feedback> {
        const source = this.normalizeSource(dto.source, 'unknown');
        const gameId = this.normalizeFeedbackGameIdCandidates(dto.clientContext?.gameId, dto.gameName);
        if (this.shouldAggregateSystemFeedback(dto, source, gameId)) {
            return this.createOrUpdateAggregatedSystemFeedback(dto, source, gameId);
        }
        return this.feedbackModel.create({
            ...dto,
            source,
            reporterType: FeedbackReporterType.SYSTEM,
            gameId,
        });
    }

    async findAll(actorUserId: string, query: QueryFeedbackDto) {
        const manager = await this.assertActorCanManage(actorUserId);
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const { status, type, severity, sort, reporterType, source } = query;
        const filter = this.buildScopedFilter(manager);
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (severity) filter.severity = severity;
        const originFilter = this.buildOriginFilter(reporterType, source);
        if (originFilter) {
            filter.$and = filter.$and ? [...(filter.$and as Record<string, unknown>[]), originFilter] : [originFilter];
        }
        const createdAtSort = sort === 'oldest' ? 1 : -1;

        const total = await this.feedbackModel.countDocuments(filter);
        const items = await this.feedbackModel
            .find(filter)
            .sort({ createdAt: createdAtSort })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('userId', 'username avatar email')
            .exec();

        return {
            items: items.map((item) => this.decorateLegacyOrigin(item)),
            total,
            page,
            limit,
        };
    }

    async updateStatus(actorUserId: string, id: string, status: FeedbackStatus): Promise<Feedback | null> {
        const manager = await this.assertActorCanManage(actorUserId);
        const scopeFilter = this.buildScopedFilter(manager);
        if (status === FeedbackStatus.CLOSED) {
            return this.feedbackModel.findOneAndUpdate(
                { _id: id, ...scopeFilter },
                { $set: { status }, $unset: { aggregationActiveKey: '' } },
                { new: true },
            );
        }
        const current = await this.feedbackModel.findOne({ _id: id, ...scopeFilter }).select({
            _id: 1,
            source: 1,
            reporterType: 1,
            aggregationKey: 1,
        }).lean<{
            _id: unknown;
            source?: string;
            reporterType?: FeedbackReporterType;
            aggregationKey?: string;
        } | null>();
        if (!current) {
            return null;
        }
        const shouldRestoreAggregationActiveKey = Boolean(
            current.aggregationKey
            && (current.source === WATCHDOG_AGGREGATION_SOURCE || current.reporterType === FeedbackReporterType.SYSTEM),
        );
        if (shouldRestoreAggregationActiveKey) {
            const conflictingActive = await this.feedbackModel.findOne({
                ...scopeFilter,
                _id: { $ne: id },
                aggregationActiveKey: current.aggregationKey,
                status: { $in: [FeedbackStatus.OPEN, FeedbackStatus.IN_PROGRESS, FeedbackStatus.RESOLVED] },
            }).select({ _id: 1 }).lean();
            if (conflictingActive) {
                throw new ConflictException('同一聚合键已存在活跃反馈，不能直接重新打开归档记录');
            }
        }
        const updatePayload: Record<string, unknown> = shouldRestoreAggregationActiveKey
            ? {
                $set: {
                    status,
                    aggregationActiveKey: current.aggregationKey,
                },
            }
            : { $set: { status } };
        try {
            return await this.feedbackModel.findOneAndUpdate(
                { _id: id, ...scopeFilter },
                updatePayload,
                { new: true },
            );
        } catch (error) {
            if (shouldRestoreAggregationActiveKey && this.isDuplicateKeyError(error)) {
                throw new ConflictException('同一聚合键已存在活跃反馈，不能直接重新打开归档记录');
            }
            throw error;
        }
    }

    async deleteOne(actorUserId: string, id: string): Promise<boolean> {
        const manager = await this.assertActorCanManage(actorUserId);
        const scopeFilter = this.buildScopedFilter(manager);
        const result = await this.feedbackModel.deleteOne({ _id: id, ...scopeFilter });
        return (result.deletedCount ?? 0) > 0;
    }

    async bulkDeleteByIds(actorUserId: string, ids: string[]) {
        const manager = await this.assertActorCanManage(actorUserId);
        const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
        if (!uniqueIds.length) {
            return { requested: 0, deleted: 0 };
        }
        const scopeFilter = this.buildScopedFilter(manager);
        const result = await this.feedbackModel.deleteMany({ _id: { $in: uniqueIds }, ...scopeFilter });
        return { requested: uniqueIds.length, deleted: result.deletedCount ?? 0 };
    }

    async bulkDeleteByFilter(actorUserId: string, filterDto: FeedbackFilterDto) {
        const manager = await this.assertActorCanManage(actorUserId);
        const filter = this.buildScopedFilter(manager);
        if (filterDto.status) filter.status = filterDto.status;
        if (filterDto.type) filter.type = filterDto.type;
        if (filterDto.severity) filter.severity = filterDto.severity;
        const originFilter = this.buildOriginFilter(filterDto.reporterType, filterDto.source);
        if (originFilter) {
            filter.$and = filter.$and ? [...(filter.$and as Record<string, unknown>[]), originFilter] : [originFilter];
        }
        const total = await this.feedbackModel.countDocuments(filter);
        if (total === 0) {
            return { requested: 0, deleted: 0 };
        }
        const result = await this.feedbackModel.deleteMany(filter);
        return { requested: total, deleted: result.deletedCount ?? 0 };
    }

    private normalizeFeedbackGameId(value?: string | null): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }
        const normalized = value.trim().toLowerCase();
        return normalized || undefined;
    }

    private normalizeFeedbackGameIdCandidates(...values: Array<string | null | undefined>): string | undefined {
        for (const value of values) {
            const normalized = this.normalizeFeedbackGameId(value);
            if (normalized) {
                return normalized;
            }
        }
        return undefined;
    }

    private normalizeSource(value?: string | null, fallback = DEFAULT_USER_SOURCE): string {
        if (typeof value !== 'string') {
            return fallback;
        }
        const normalized = value.trim().toLowerCase();
        return normalized || fallback;
    }

    private shouldAggregateSystemFeedback(
        dto: CreateSystemFeedbackDto,
        source: string,
        gameId?: string,
    ): boolean {
        if (source !== WATCHDOG_AGGREGATION_SOURCE) {
            return false;
        }
        return Boolean(gameId && (dto.autoReportKind || dto.errorContext?.name));
    }

    private buildWatchdogAggregationPlan(
        dto: CreateSystemFeedbackDto,
        source: string,
        gameId?: string,
        now = new Date(),
    ): WatchdogAggregationPlan | null {
        if (!gameId) {
            return null;
        }
        const autoReportFamily = this.normalizeWatchdogAutoReportFamily(
            dto.autoReportKind ?? dto.errorContext?.name,
        );
        const normalizedReason = this.normalizeWatchdogReason(
            dto.errorContext?.message
            ?? dto.content.replace(/^\[system\]\[online-ai-watchdog\]\s+/i, ''),
        );
        const normalizedRoute = this.normalizeAggregationSegment(dto.clientContext?.route, 'unknown-route');
        const normalizedMode = this.normalizeAggregationSegment(dto.clientContext?.mode, 'unknown-mode');
        const dedupeKey = [
            'system-feedback',
            source,
            gameId,
            normalizedRoute,
            normalizedMode,
            autoReportFamily,
            normalizedReason || 'unknown',
        ].join(':');
        return {
            dedupeKey,
            windowStartedAt: new Date(now.getTime() - WATCHDOG_AGGREGATION_WINDOW_MS),
            windowMs: WATCHDOG_AGGREGATION_WINDOW_MS,
            retentionPolicy: 'windowed-counter-aggregate',
        };
    }

    private normalizeAggregationSegment(value: string | null | undefined, fallback: string): string {
        if (typeof value !== 'string') {
            return fallback;
        }
        const normalized = value
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9:_-]/g, '');
        return normalized || fallback;
    }

    private normalizeWatchdogAutoReportFamily(value?: string | null): string {
        const normalized = typeof value === 'string'
            ? value.trim().toLowerCase()
            : '';
        if (!normalized) {
            return 'unknown';
        }
        if (normalized.startsWith('force-end-turn-')) {
            return 'force-end-turn';
        }
        return normalized;
    }

    private normalizeWatchdogReason(value?: string | null): string {
        if (typeof value !== 'string') {
            return 'unknown';
        }
        const normalized = value
            .trim()
            .toLowerCase()
            .replace(/:steps=\d+\b/g, ':steps')
            .replace(/\s+/g, ' ')
            || 'unknown';
        const segments = normalized.split(':').filter(Boolean);
        if (segments.length >= 2 && ['recover-interaction', 'follow-up-advance'].includes(segments[1])) {
            return `${segments[0]}:${segments[1]}`;
        }
        if (segments.length >= 3 && segments[1] === 'legal-action') {
            return `${segments[0]}:${segments[1]}:${segments[2]}`;
        }
        return normalized;
    }

    private pickMoreSevereSeverity(
        current?: string,
        incoming?: string,
    ): string | undefined {
        if (!incoming) {
            return current;
        }
        if (!current) {
            return incoming;
        }
        return (FEEDBACK_SEVERITY_RANK[incoming] ?? 0) >= (FEEDBACK_SEVERITY_RANK[current] ?? 0)
            ? incoming
            : current;
    }

    private resolveAggregatedSystemStatus(
        existingStatus: FeedbackStatus | undefined,
        incomingStatus: FeedbackStatus | undefined,
    ): FeedbackStatus {
        if (existingStatus === FeedbackStatus.IN_PROGRESS || existingStatus === FeedbackStatus.CLOSED) {
            return existingStatus;
        }
        if (incomingStatus === FeedbackStatus.RESOLVED) {
            return existingStatus === FeedbackStatus.OPEN
                ? FeedbackStatus.OPEN
                : FeedbackStatus.RESOLVED;
        }
        return FeedbackStatus.OPEN;
    }

    private async createOrUpdateAggregatedSystemFeedback(
        dto: CreateSystemFeedbackDto,
        source: string,
        gameId?: string,
        retryDepth = 0,
    ): Promise<Feedback> {
        const now = new Date();
        const aggregationPlan = this.buildWatchdogAggregationPlan(dto, source, gameId, now);
        if (!aggregationPlan) {
            return this.feedbackModel.create({
                ...dto,
                source,
                reporterType: FeedbackReporterType.SYSTEM,
                gameId,
            });
        }
        const aggregationKey = aggregationPlan.dedupeKey;
        const aggregationActiveKey = aggregationKey;

        // 先查找活跃 canonical；若已超过去重窗口，先归档旧 canonical 再新开。
        let existing = await this.feedbackModel.findOne({
            aggregationActiveKey,
            status: { $ne: FeedbackStatus.CLOSED },
        }).exec();

        if (!existing) {
            existing = await this.feedbackModel.findOne({
                aggregationKey,
                status: { $ne: FeedbackStatus.CLOSED },
            }).sort({ lastOccurredAt: -1, updatedAt: -1, createdAt: -1 }).exec();
            if (existing && existing.aggregationActiveKey !== aggregationActiveKey) {
                try {
                    await this.feedbackModel.updateOne(
                        { _id: existing._id, status: { $ne: FeedbackStatus.CLOSED } },
                        { $set: { aggregationActiveKey } },
                    ).exec();
                    existing.aggregationActiveKey = aggregationActiveKey;
                } catch (error) {
                    if (!this.isDuplicateKeyError(error)) {
                        throw error;
                    }
                    existing = await this.feedbackModel.findOne({
                        aggregationActiveKey,
                        status: { $ne: FeedbackStatus.CLOSED },
                    }).exec();
                }
            }
        }

        if (existing) {
            const baseline = existing.lastOccurredAt ?? existing.createdAt ?? now;
            const baselineMs = baseline instanceof Date ? baseline.getTime() : new Date(baseline).getTime();
            const isWithinWindow = Number.isFinite(baselineMs)
                && baselineMs >= aggregationPlan.windowStartedAt.getTime();
            if (!isWithinWindow) {
                await this.feedbackModel.updateOne(
                    { _id: existing._id, status: { $ne: FeedbackStatus.CLOSED } },
                    { $set: { status: FeedbackStatus.CLOSED }, $unset: { aggregationActiveKey: '' } },
                );
                existing = null;
            }
        }

        if (!existing) {
            try {
                return await this.feedbackModel.create({
                    ...dto,
                    source,
                    reporterType: FeedbackReporterType.SYSTEM,
                    gameId,
                    incidentKey: aggregationKey,
                    aggregationKey,
                    aggregationActiveKey,
                    occurrenceCount: 1,
                    firstOccurredAt: now,
                    lastOccurredAt: now,
                    latestIncidentKey: dto.incidentKey,
                });
            } catch (error) {
                if (!this.isDuplicateKeyError(error)) {
                    throw error;
                }
                // 兼容历史/旁路状态更新：closed 记录若仍保留 activeKey，会阻塞新 canonical 建立。
                const releasedClosedDoc = await this.feedbackModel.findOneAndUpdate(
                    { aggregationActiveKey, status: FeedbackStatus.CLOSED },
                    { $unset: { aggregationActiveKey: '' } },
                    { sort: { updatedAt: -1 } },
                ).exec();
                if (releasedClosedDoc) {
                    try {
                        return await this.feedbackModel.create({
                            ...dto,
                            source,
                            reporterType: FeedbackReporterType.SYSTEM,
                            gameId,
                            incidentKey: aggregationKey,
                            aggregationKey,
                            aggregationActiveKey,
                            occurrenceCount: 1,
                            firstOccurredAt: now,
                            lastOccurredAt: now,
                            latestIncidentKey: dto.incidentKey,
                        });
                    } catch (retryError) {
                        if (!this.isDuplicateKeyError(retryError)) {
                            throw retryError;
                        }
                    }
                }
                existing = await this.feedbackModel.findOne({
                    aggregationActiveKey,
                    status: { $ne: FeedbackStatus.CLOSED },
                }).exec();
                if (!existing) {
                    throw error;
                }
            }
        }

        const mergedSeverity = this.pickMoreSevereSeverity(existing.severity, dto.severity) as typeof existing.severity;
        const mergedStatus = this.resolveAggregatedSystemStatus(existing.status, dto.status);
        const updated = await this.feedbackModel.findOneAndUpdate(
            { _id: existing._id, status: { $ne: FeedbackStatus.CLOSED } },
            {
                $set: {
                    content: dto.content,
                    type: dto.type ?? existing.type,
                    severity: mergedSeverity,
                    status: mergedStatus,
                    source,
                    reporterType: FeedbackReporterType.SYSTEM,
                    gameId,
                    gameName: dto.gameName ?? existing.gameName,
                    autoReportKind: dto.autoReportKind ?? existing.autoReportKind,
                    contactInfo: dto.contactInfo ?? existing.contactInfo,
                    actionLog: dto.actionLog ?? existing.actionLog,
                    stateSnapshot: dto.stateSnapshot ?? existing.stateSnapshot,
                    clientContext: dto.clientContext ?? existing.clientContext,
                    errorContext: dto.errorContext ?? existing.errorContext,
                    incidentKey: aggregationKey,
                    aggregationKey,
                    aggregationActiveKey,
                    firstOccurredAt: existing.firstOccurredAt ?? now,
                    lastOccurredAt: now,
                    latestIncidentKey: dto.incidentKey ?? existing.latestIncidentKey,
                },
                $inc: {
                    occurrenceCount: 1,
                },
            },
            { new: true },
        ).exec();

        if (!updated) {
            if (retryDepth >= 1) {
                throw new Error('failed_to_update_aggregated_system_feedback_after_retry');
            }
            return this.createOrUpdateAggregatedSystemFeedback(dto, source, gameId, retryDepth + 1);
        }
        return updated.toObject() as Feedback;
    }

    private isDuplicateKeyError(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }
        const maybeCode = (error as { code?: unknown }).code;
        if (typeof maybeCode === 'number') {
            return maybeCode === 11000;
        }
        const maybeMessage = (error as { message?: unknown }).message;
        return typeof maybeMessage === 'string' && maybeMessage.includes('E11000');
    }

    private buildOriginFilter(
        reporterType?: FeedbackReporterType,
        source?: string,
    ): Record<string, unknown> | null {
        if (!reporterType && !source) {
            return null;
        }
        const normalizedSource = source ? this.normalizeSource(source) : undefined;
        const base: Record<string, unknown> = {};
        if (reporterType) base.reporterType = reporterType;
        if (normalizedSource) base.source = normalizedSource;

        if (reporterType === FeedbackReporterType.SYSTEM
            && (!normalizedSource || normalizedSource === LEGACY_WATCHDOG_SOURCE)) {
            const legacyFilter = this.buildLegacyWatchdogFilter();
            return { $or: [base, legacyFilter] };
        }

        return base;
    }

    private buildLegacyWatchdogFilter(): Record<string, unknown> {
        return {
            reporterType: null,
            $or: [
                { contactInfo: 'system:online-ai-watchdog' },
                { 'errorContext.source': LEGACY_WATCHDOG_SOURCE },
                { content: /^\[system\]\[online-ai-watchdog\]\s+/ },
            ],
        };
    }

    private decorateLegacyOrigin(item: FeedbackDocument): Feedback {
        const raw = item.toObject() as Feedback;
        const isLegacyWatchdog = raw.contactInfo === 'system:online-ai-watchdog'
            || raw.errorContext?.source === LEGACY_WATCHDOG_SOURCE
            || /^\[system\]\[online-ai-watchdog\]\s+/.test(raw.content);
        if (!isLegacyWatchdog) {
            if (raw.reporterType && raw.source) {
                return raw;
            }
            return raw;
        }
        return {
            ...raw,
            reporterType: FeedbackReporterType.SYSTEM,
            source: LEGACY_WATCHDOG_SOURCE,
            autoReportKind: raw.errorContext?.name || raw.autoReportKind,
        };
    }

    private buildScopedFilter(
        manager: FeedbackManagerScope,
        extra: Record<string, unknown> = {}
    ): Record<string, unknown> {
        const filter: Record<string, unknown> = { ...extra };

        if (manager.role === 'admin' || manager.developerGameIds === null) {
            return filter;
        }

        if (manager.developerGameIds.length === 0) {
            filter._id = { $exists: false };
            return filter;
        }

        filter.$or = [
            { gameId: { $in: manager.developerGameIds } },
            { 'clientContext.gameId': { $in: manager.developerGameIds } },
            { gameName: { $in: manager.developerGameIds } },
        ];

        return filter;
    }

    private async assertActorCanManage(actorUserId: string): Promise<FeedbackManagerScope> {
        const actor = await this.userModel.findById(actorUserId).select('role developerGameIds').lean<{
            role: UserRole;
            developerGameIds?: string[];
        } | null>();

        if (!actor || (actor.role !== 'admin' && actor.role !== 'developer')) {
            throw new ForbiddenException('无权管理反馈');
        }

        if (actor.role === 'admin') {
            return {
                role: actor.role,
                developerGameIds: null,
            };
        }

        return {
            role: actor.role,
            developerGameIds: normalizeDeveloperGameIds(actor.developerGameIds),
        };
    }
}

