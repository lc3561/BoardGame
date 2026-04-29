/**
 * Converts LangGraph WorkflowState into the WorkbenchJournal shape that
 * the frontend (and FlowiseWorkbenchShell) expects.
 *
 * This is the **only** bridge between the LangGraph-owned execution state
 * and the journal persistence format.
 */

import type {
    ArtifactBundleOutput,
    DecisionPayload,
    DecisionResolution,
    GraphRunResult,
    NodeRecord,
    RuleSourceOptionId,
    WorkflowNodeId,
} from './langgraph-orchestrator';

// Re-export the frontend-compatible types locally so the service doesn't
// have to reach into `src/features/…` for type definitions.

export interface WorkbenchJournalRun {
    id: string;
    templateId: string;
    templateVersion: string;
    repoSessionId: string;
    worktreeTaskId: string;
    status: string;
    currentNodeId?: string;
    checkpointVersion: number;
    startedAt: string;
    finishedAt?: string;
    latestDecisionRequestId?: string;
    latestArtifactBundleId?: string;
    title: string;
    enabledNodeIds: WorkflowNodeId[];
    orchestrator?: {
        engine: 'langgraph';
        threadId: string;
        checkpointStatus: 'waiting_decision' | 'resumed' | 'completed';
        lastSyncAt: string;
    };
    context: {
        gameId?: string;
        factionName?: string;
        subject: string;
        prompt: string;
    };
}

export interface WorkbenchJournalNodeRecord {
    nodeId: WorkflowNodeId;
    runId: string;
    status: string;
    attempt: number;
    inputRef: string;
    inputSnapshot: Record<string, unknown>;
    outputRef?: string;
    outputSnapshot?: Record<string, unknown>;
    stateRef?: string;
    stateSnapshot?: Record<string, unknown>;
    startedAt?: string;
    finishedAt?: string;
    errorCode?: string;
    errorSummary?: string;
}

export interface WorkbenchJournalDecision {
    id: string;
    runId: string;
    nodeId: WorkflowNodeId;
    phase: string;
    kind: string;
    title: string;
    summary: string;
    blocking: boolean;
    rationale?: string;
    options: Array<{
        id: RuleSourceOptionId;
        label: string;
        description: string;
        payload: Record<string, unknown>;
    }>;
    evidenceRefs: string[];
    recommendedOptionId?: RuleSourceOptionId;
    createdAt: string;
    resumeToken: string;
    allowReject?: boolean;
    allowFeedback?: boolean;
    proceedLabel?: string;
    rejectLabel?: string;
    feedbackPlaceholder?: string;
    resolution?: {
        action: 'proceed' | 'reject';
        optionId?: string;
        optionLabel?: string;
        notes?: string;
        decidedAt: string;
        decidedBy: string;
    };
}

export interface WorkbenchJournalArtifactBundle {
    id: string;
    runId: string;
    title: string;
    status: 'published';
    createdAt: string;
    summary: string;
    outputs: Record<string, unknown>;
    evidenceRefs: string[];
    keyObservations: string[];
}

// ---------------------------------------------------------------------------
// Sync helpers
// ---------------------------------------------------------------------------

function toNodeRecords(runId: string, records: NodeRecord[]): WorkbenchJournalNodeRecord[] {
    return records.map((r) => ({
        nodeId: r.nodeId,
        runId,
        status: r.status,
        attempt: r.attempt,
        inputRef: `${r.nodeId}.input.${r.status}`,
        inputSnapshot: r.inputSnapshot,
        ...(r.outputSnapshot ? {
            outputRef: `${r.nodeId}.output.${r.status}`,
            outputSnapshot: r.outputSnapshot,
        } : {}),
        ...(r.startedAt ? { startedAt: r.startedAt } : {}),
        ...(r.finishedAt ? { finishedAt: r.finishedAt } : {}),
        ...(r.errorSummary ? { errorSummary: r.errorSummary } : {}),
    }));
}

function toDecisions(
    runId: string,
    nodeRecords: NodeRecord[],
    decisions: Array<DecisionPayload & { resolution?: DecisionResolution }>,
): WorkbenchJournalDecision[] {
    return decisions.map((d) => ({
        id: d.decisionId,
        runId,
        nodeId: d.nodeId,
        phase: d.phase,
        kind: d.kind,
        title: d.title,
        summary: d.summary,
        blocking: true,
        rationale: d.rationale ?? '通过 LangGraph interrupt 暂停，等待人工输入。',
        options: d.options as WorkbenchJournalDecision['options'],
        evidenceRefs: d.evidenceRefs,
        recommendedOptionId: d.recommendedOptionId as RuleSourceOptionId | undefined,
        createdAt: d.createdAt
            ?? nodeRecords.find((record) => record.nodeId === d.nodeId)?.startedAt
            ?? new Date().toISOString(),
        resumeToken: `lg-resume-${d.decisionId}`,
        allowReject: d.allowReject,
        allowFeedback: d.allowFeedback,
        proceedLabel: d.proceedLabel,
        rejectLabel: d.rejectLabel,
        feedbackPlaceholder: d.feedbackPlaceholder,
        ...(d.resolution ? {
            resolution: {
                action: d.resolution.action,
                optionId: d.resolution.optionId,
                optionLabel: d.resolution.optionLabel,
                notes: d.resolution.notes,
                decidedAt: d.resolution.decidedAt,
                decidedBy: d.resolution.decidedBy,
            },
        } : {}),
    }));
}

function toArtifactBundle(
    runId: string,
    bundle: ArtifactBundleOutput,
): WorkbenchJournalArtifactBundle {
    return {
        id: bundle.id,
        runId,
        title: bundle.title,
        status: bundle.status,
        createdAt: bundle.createdAt,
        summary: bundle.summary,
        outputs: bundle.outputs,
        evidenceRefs: bundle.evidenceRefs,
        keyObservations: bundle.keyObservations,
    };
}

// ---------------------------------------------------------------------------
// Main sync: GraphRunResult → journal patch
// ---------------------------------------------------------------------------

export interface JournalPatch {
    run: WorkbenchJournalRun;
    nodeRecords: WorkbenchJournalNodeRecord[];
    decisions: WorkbenchJournalDecision[];
    artifactBundle: WorkbenchJournalArtifactBundle | null;
    activeRunId: string;
    pendingDecision: DecisionPayload | null;
}

export function syncGraphResultToJournalPatch(result: GraphRunResult): JournalPatch {
    const { state, threadId, interrupted, interruptPayload } = result;
    const now = new Date().toISOString();
    const interruptNodeId = interrupted ? interruptPayload?.nodeId : undefined;

    const nodeRecords: NodeRecord[] = interruptNodeId
        ? state.nodeRecords.map((record): NodeRecord => {
            if (record.nodeId !== interruptNodeId) {
                return record;
            }
            if (record.status === 'waiting_decision') {
                return record;
            }
            return {
                ...record,
                status: 'waiting_decision',
                attempt: Math.max(record.attempt, 1),
                startedAt: record.startedAt ?? now,
            };
        })
        : state.nodeRecords;

    const checkpointStatus = interrupted
        ? 'waiting_decision' as const
        : state.runStatus === 'completed'
            ? 'completed' as const
            : 'resumed' as const;

    const runStatus = interrupted ? 'waiting_decision' : state.runStatus;

    const latestDecisionId = state.decisions.length > 0
        ? state.decisions[state.decisions.length - 1].decisionId
        : interruptPayload?.decisionId;

    const run: WorkbenchJournalRun = {
        id: state.runId,
        templateId: state.templateId,
        templateVersion: state.templateVersion,
        repoSessionId: state.repoSessionId,
        worktreeTaskId: state.worktreeTaskId,
        status: runStatus,
        currentNodeId: interruptNodeId ?? state.currentNodeId ?? undefined,
        checkpointVersion: state.checkpointVersion,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt ?? undefined,
        latestDecisionRequestId: latestDecisionId,
        latestArtifactBundleId: state.artifactBundle?.id,
        title: `${state.factionName} / ${state.templateId} / ${state.branchName}`,
        enabledNodeIds: state.enabledNodeIds,
        orchestrator: {
            engine: 'langgraph',
            threadId,
            checkpointStatus,
            lastSyncAt: now,
        },
        context: {
            gameId: state.gameId,
            factionName: state.factionName,
            subject: state.factionName,
            prompt: state.promptText,
        },
    };

    const allDecisions = [
        ...state.decisions,
        ...(interrupted && interruptPayload && !state.decisions.some((d) => d.decisionId === interruptPayload.decisionId)
            ? [interruptPayload]
            : []),
    ];

    return {
        run,
        nodeRecords: toNodeRecords(state.runId, nodeRecords),
        decisions: toDecisions(state.runId, nodeRecords, allDecisions),
        artifactBundle: state.artifactBundle
            ? toArtifactBundle(state.runId, state.artifactBundle)
            : null,
        activeRunId: state.runId,
        pendingDecision: interrupted ? interruptPayload : null,
    };
}
