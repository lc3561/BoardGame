import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

type FactionIntakeStageId =
    | 'data-entry'
    | 'reference-faction'
    | 'implementation'
    | 'audit'
    | 'upload';

type ExecutorId = 'deterministic-planner' | 'codex-cli';
type ExecutionMode = 'plan' | 'workspace-write';

interface StageInput {
    question: string;
    gameId: string;
    taskBrief: string;
    factionOutline: string;
    projectPath: string;
    ttsPackPath: string;
    supplementalNotes: string;
    fields: Record<string, string>;
    context: {
        assetCheck: string;
        dataEntry: string;
        referenceFaction: string;
        implementation: string;
        audit: string;
    };
    preferredExecutorId?: ExecutorId;
    executionMode: ExecutionMode;
    forceCodex: boolean;
}

interface ExecutorAvailability {
    id: ExecutorId;
    label: string;
    available: boolean;
    kind: 'planner' | 'coding';
    detail: string;
}

interface StageResponse {
    stage: FactionIntakeStageId;
    status: 'ready' | 'completed' | 'degraded';
    summary: string;
    summaryMarkdown: string;
    nextStepHints: string[];
    inputSnapshot: {
        gameId: string;
        taskBrief: string;
        factionOutline: string;
        ttsPackPath: string;
        supplementalNotes: string;
    };
    executor?: {
        selectedExecutorId: ExecutorId;
        availableExecutors: ExecutorAvailability[];
        executionMode: ExecutionMode;
        fallbackApplied: boolean;
        commandPreview?: string;
        stdoutSummary?: string;
        stderrSummary?: string;
    };
    structured: Record<string, unknown>;
}

@Injectable()
export class AiRepoWorkbenchExecutorService {
    private readonly logger = new Logger(AiRepoWorkbenchExecutorService.name);
    private readonly repoRoot = process.cwd();
    private readonly executorTempDir = resolve(this.repoRoot, 'temp', 'ai-repo-workbench', 'executors');

    async executeDataEntry(payload: Record<string, unknown>): Promise<StageResponse> {
        const input = this.normalizeInput(payload);
        const suggestedSources = this.buildSuggestedSources(input);
        const missingFacts = this.collectMissingFacts(input, ['派系主题', '首批卡牌范围', '规则主来源']);
        const summaryLines = [
            'DATA_ENTRY_READY',
            '',
            `- 游戏：${input.gameId}`,
            `- 任务摘要：${input.taskBrief}`,
            `- 目标派系：${this.safeText(input.factionOutline)}`,
            `- 推荐主来源：${suggestedSources.map((source) => source.label).join('、')}`,
            `- Wiki 对照：${suggestedSources.some((source) => source.id === 'wiki') ? '建议开启' : '可选'}`,
            `- 缺失信息：${missingFacts.length ? missingFacts.join('；') : '暂无强制缺口，可继续参考旧派系模块。'}`,
        ];

        return {
            stage: 'data-entry',
            status: 'completed',
            summary: `已为 ${input.taskBrief} 生成数据录入摘要。`,
            summaryMarkdown: summaryLines.join('\n'),
            nextStepHints: [
                '将当前录入摘要交给旧派系参考模块，先选可复用对象。',
                '若后续补到规则书或更完整图包，可回填数据来源字段再重跑。',
            ],
            inputSnapshot: this.toInputSnapshot(input),
            structured: {
                suggestedSources,
                missingFacts,
                extractedFields: input.fields,
            },
        };
    }

    async executeReferenceFaction(payload: Record<string, unknown>): Promise<StageResponse> {
        const input = this.normalizeInput(payload);
        const references = this.buildReferenceFactions(input);
        const summaryLines = [
            'REFERENCE_FACTION_READY',
            '',
            '建议优先对照这些旧派系：',
            ...references.map((item, index) => `- ${index + 1}. ${item.name}（${item.id}）：${item.reason}`),
            '',
            `- 建议核对点：${references.flatMap((item) => item.checkpoints).slice(0, 5).join('；')}`,
        ];

        return {
            stage: 'reference-faction',
            status: 'completed',
            summary: `已为 ${input.taskBrief} 生成旧派系参考建议。`,
            summaryMarkdown: summaryLines.join('\n'),
            nextStepHints: [
                '把最贴近的旧派系复用点传给实施模块，优先避免新造 UI / handler。',
                '若目标派系主题变化较大，可补充更具体的关键词后重跑本模块。',
            ],
            inputSnapshot: this.toInputSnapshot(input),
            structured: {
                references,
            },
        };
    }

    async executeImplementation(payload: Record<string, unknown>): Promise<StageResponse> {
        const input = this.normalizeInput(payload);
        const availableExecutors = await this.listExecutors();
        const preferred = input.preferredExecutorId ?? (input.forceCodex ? 'codex-cli' : 'deterministic-planner');
        const selected = this.pickExecutor(preferred, availableExecutors);
        const fallbackApplied = selected.id !== preferred;

        if (selected.id === 'codex-cli' && selected.available) {
            const codexResult = await this.runCodexImplementation(input, availableExecutors, fallbackApplied);
            return codexResult;
        }

        const plan = this.buildDeterministicImplementationPlan(input);
        return {
            stage: 'implementation',
            status: fallbackApplied ? 'degraded' : 'completed',
            summary: `已使用 ${selected.label} 生成实施方案。`,
            summaryMarkdown: plan.summaryMarkdown,
            nextStepHints: [
                '把最小数据落点和复用映射交给审计模块做收口。',
                '若环境允许，可把 preferredExecutorId 切到 codex-cli 获取更强的实现建议。',
            ],
            inputSnapshot: this.toInputSnapshot(input),
            executor: {
                selectedExecutorId: selected.id,
                availableExecutors,
                executionMode: input.executionMode,
                fallbackApplied,
                commandPreview: selected.id === 'codex-cli'
                    ? `codex exec --cd ${input.projectPath} --sandbox read-only -`
                    : undefined,
            },
            structured: plan.structured,
        };
    }

    async executeAudit(payload: Record<string, unknown>): Promise<StageResponse> {
        const input = this.normalizeInput(payload);
        const implementationText = `${input.context.implementation}\n${input.question}`;
        const findings = [
            implementationText.includes('最小数据落点') ? '已给出最小数据落点。' : '缺少“最小数据落点”小节，需要补齐。',
            implementationText.includes('复用') ? '已显式讨论旧实现复用。' : '未明确复用旧派系/旧能力，存在偏离风险。',
            implementationText.includes('验证') || implementationText.includes('烟测')
                ? '已包含验证或烟测口径。'
                : '验证口径不够清晰，建议补模拟验证场景。',
        ];
        const needsRewrite = findings.some((item) => item.includes('缺少') || item.includes('未明确'));
        const summaryLines = [
            needsRewrite ? 'AUDIT_REWRITE' : 'AUDIT_PASS',
            '',
            ...findings.map((item) => `- ${item}`),
        ];

        return {
            stage: 'audit',
            status: 'completed',
            summary: needsRewrite ? '审计建议回写实施模块补齐。' : '审计通过，可继续上传与验收。',
            summaryMarkdown: summaryLines.join('\n'),
            nextStepHints: needsRewrite
                ? ['回到实施模块补齐缺失项，再重新跑审计。']
                : ['将审计结论与现有证据交给上传与验收模块生成最终摘要。'],
            inputSnapshot: this.toInputSnapshot(input),
            structured: {
                decision: needsRewrite ? 'rewrite' : 'pass',
                findings,
            },
        };
    }

    async executeUpload(payload: Record<string, unknown>): Promise<StageResponse> {
        const input = this.normalizeInput(payload);
        const evidence = [
            input.context.assetCheck ? '素材检查结果已纳入' : '素材检查结果暂缺',
            input.context.implementation ? '实施结果已纳入' : '实施结果暂缺',
            input.context.audit ? '审计结果已纳入' : '审计结果暂缺',
        ];
        const summaryLines = [
            'UPLOAD_READY',
            '',
            `- 当前交付状态：${input.context.audit.includes('AUDIT_PASS') ? '已达到上传前验收标准' : '已形成上传前草案，正式上传前建议再核对审计结论'}`,
            `- 上传前清单：工作流摘要、复用映射、最小数据落点、审计结论`,
            `- 验收证据：${evidence.join('；')}`,
            '- 仍待补齐：若尚未执行真实远端上传，请明确这是“上传前验收通过”，不是正式发布完成。',
        ];

        return {
            stage: 'upload',
            status: 'completed',
            summary: '已生成上传与验收阶段摘要。',
            summaryMarkdown: summaryLines.join('\n'),
            nextStepHints: [
                '如需正式发布，再接入真实上传执行器或人工确认节点。',
                'OpenWebUI 接入时，可直接把本模块输出当成最终会话卡片内容。',
            ],
            inputSnapshot: this.toInputSnapshot(input),
            structured: {
                evidence,
                readyForFormalUpload: input.context.audit.includes('AUDIT_PASS'),
            },
        };
    }

    private normalizeInput(payload: Record<string, unknown>): StageInput {
        const rawQuestion = this.asString(payload.question);
        const fields = this.parseKeyValueLines(rawQuestion);
        const aliases = (...keys: string[]) => keys.map((key) => fields[key]).find(Boolean) || '';
        const inferredGameId = this.inferGameId(rawQuestion);
        const taskBrief = this.asString(payload.taskBrief) || aliases('任务描述', '需求', '目标', '任务') || rawQuestion.trim() || '未命名任务';
        const factionOutline = this.asString(payload.factionOutline)
            || aliases('派系列表', '派系大纲', '派系')
            || taskBrief;
        const preferredExecutorId = this.normalizeExecutorId(payload.preferredExecutorId || aliases('preferredExecutorId', '执行器'));
        const executionMode = this.normalizeExecutionMode(payload.executionMode || aliases('executionMode', '执行模式'));

        return {
            question: rawQuestion,
            gameId: this.asString(payload.gameId) || inferredGameId,
            taskBrief,
            factionOutline,
            projectPath: this.asString(payload.projectPath) || this.asString(payload.worktreePath) || this.repoRoot,
            ttsPackPath: this.asString(payload.ttsPackPath) || aliases('图包路径', '可选图包路径', '素材路径'),
            supplementalNotes: this.asString(payload.supplementalNotes) || aliases('补充说明', '备注', '说明'),
            fields,
            context: {
                assetCheck: aliases('素材检查'),
                dataEntry: aliases('数据录入'),
                referenceFaction: aliases('旧派系参考'),
                implementation: aliases('实施结果', '实施模块'),
                audit: aliases('审计结果', '审计模块'),
            },
            preferredExecutorId,
            executionMode,
            forceCodex: Boolean(payload.forceCodex) || preferredExecutorId === 'codex-cli',
        };
    }

    private buildSuggestedSources(input: StageInput) {
        const sources = [
            { id: 'document', label: 'doc/rule 文档', reason: '当前仓库规则文档是首选真相源。' },
        ];
        if (input.question.includes('wiki') || input.question.includes('Wiki') || input.gameId === 'smashup') {
            sources.push({ id: 'wiki', label: 'Wiki 对照', reason: '当前任务可能需要和既有 Wiki 词条交叉核对。' });
        }
        if (input.question.toLowerCase().includes('.pdf') || input.question.includes('PDF')) {
            sources.push({ id: 'pdf', label: 'PDF 规则书', reason: '输入里已经出现 PDF 线索。' });
        }
        return sources;
    }

    private collectMissingFacts(input: StageInput, expectedFields: string[]) {
        return expectedFields.filter((field) => !input.question.includes(field) && !input.factionOutline.includes(field));
    }

    private buildReferenceFactions(input: StageInput) {
        const keyword = `${input.taskBrief}\n${input.factionOutline}\n${input.supplementalNotes}`.toLowerCase();
        const smashupMap = [
            {
                match: ['海盗', 'pirate', '船', 'treasure'],
                result: [
                    { id: 'pirates', name: '海盗', reason: '可复用机动、抢基地和海盗主题表现。', checkpoints: ['基地机动', '行动牌节奏'] },
                    { id: 'explorers', name: '探险家', reason: '可参考探索/地图类主题组织方式。', checkpoints: ['主题关键词', '资源节奏'] },
                    { id: 'vikings', name: '维京人', reason: '可参考进攻与返回手牌的节奏感。', checkpoints: ['进攻回收', '基地压力'] },
                ],
            },
            {
                match: ['机器人', '机械', 'robot', 'factory'],
                result: [
                    { id: 'robots', name: '机器人', reason: '适合复用铺场和低费节奏。', checkpoints: ['小随从密度', '爆发节奏'] },
                    { id: 'steampunks', name: '蒸汽朋克', reason: '适合参考基地改造和装置型行动。', checkpoints: ['基地附着', '持续行动'] },
                ],
            },
        ];
        const matched = smashupMap.find((item) => item.match.some((fragment) => keyword.includes(fragment)));
        return matched?.result ?? [
            { id: 'wizards', name: '法师', reason: '适合参考手牌/资源周转与高层策略。', checkpoints: ['手牌周转', '资源密度'] },
            { id: 'tricksters', name: '捣蛋鬼', reason: '适合参考干扰与规则文本表达。', checkpoints: ['干扰措辞', '负面效果'] },
            { id: 'aliens', name: '外星人', reason: '适合参考节奏突破与得分特例。', checkpoints: ['节奏突破', '胜利条件特例'] },
        ];
    }

    private buildDeterministicImplementationPlan(input: StageInput) {
        const factionId = this.slugify(input.factionOutline.split(/[\n,，;；、]/)[0] || input.taskBrief);
        const summaryLines = [
            'IMPLEMENTATION_READY',
            '',
            `- 派系级接入目标：围绕“${this.safeText(input.factionOutline)}”做一个可继续迭代的首批原型。`,
            '- 首批实施项：1 个核心仆从 + 1 个功能仆从 + 1 个关键行动 + 1 个基地占位。',
            '- 旧派系/旧能力复用映射：优先沿用旧派系的现有 UI、交互模式和素材接线，不默认新增 handler。',
            `- 最小数据落点：faction_id=${factionId}，game_id=${input.gameId}，status=draft，首批 4 项沿同一批次落盘。`,
            '- 模拟验证场景：用 1 条规则来源选择 + 1 条实施摘要 + 1 条审计结论组成最小烟测闭环。',
        ];

        return {
            summaryMarkdown: summaryLines.join('\n'),
            structured: {
                factionId,
                items: [
                    { cardId: `${factionId}-leader`, cardType: 'minion', scriptRef: 'reuse-existing-minion', artRef: `${factionId}/leader` },
                    { cardId: `${factionId}-support`, cardType: 'minion', scriptRef: 'reuse-existing-support', artRef: `${factionId}/support` },
                    { cardId: `${factionId}-action`, cardType: 'action', scriptRef: 'reuse-existing-action', artRef: `${factionId}/action` },
                    { cardId: `${factionId}-base`, cardType: 'base', scriptRef: 'reuse-existing-base', artRef: `${factionId}/base` },
                ],
            },
        };
    }

    private async listExecutors(): Promise<ExecutorAvailability[]> {
        const codexAvailable = await this.isCodexAvailable();
        return [
            {
                id: 'deterministic-planner',
                label: '内置规划执行器',
                available: true,
                kind: 'planner',
                detail: '始终可用，用于稳定输出结构化阶段摘要。',
            },
            {
                id: 'codex-cli',
                label: 'Codex CLI',
                available: codexAvailable,
                kind: 'coding',
                detail: codexAvailable
                    ? '本机检测到 codex 命令，可作为可选实现执行器。'
                    : '当前环境未检测到可执行 codex 命令，将自动回退到内置执行器。',
            },
        ];
    }

    private pickExecutor(preferred: ExecutorId, availableExecutors: ExecutorAvailability[]) {
        const preferredExecutor = availableExecutors.find((executor) => executor.id === preferred);
        if (preferredExecutor?.available) {
            return preferredExecutor;
        }
        return availableExecutors[0];
    }

    private async isCodexAvailable(): Promise<boolean> {
        try {
            await execFileAsync('cmd.exe', ['/c', 'where', 'codex'], { cwd: this.repoRoot });
            return true;
        } catch {
            return false;
        }
    }

    private async runCodexImplementation(
        input: StageInput,
        availableExecutors: ExecutorAvailability[],
        fallbackApplied: boolean,
    ): Promise<StageResponse> {
        await mkdir(this.executorTempDir, { recursive: true });
        const prompt = [
            '你是 AI Repo Workbench 的 Codex 实施执行器。',
            '当前任务目标：基于下面给出的上下文，直接输出“新增派系 implementation 阶段”的最终结构化结果。',
            '严格要求：',
            '1. 不要复述角色、不要解释你将如何工作、不要请求补充信息；直接给最终结果。',
            '2. 不要输出英文壳文案；全部中文。',
            '3. 整个回复必须严格使用下面这个模板，不得新增其他标题：',
            'IMPLEMENTATION_READY',
            '',
            '- 派系级接入目标：...',
            '- 首批实施项：...',
            '- 旧派系复用映射：...',
            '- 最小数据落点：...',
            '- 模拟验证场景：...',
            '',
            '4. 每一项都必须填内容；如果信息不足，就用“待确认”标明，不得留空。',
            '5. 不要输出代码块、不要输出项目符号之外的解释段落。',
            '6. “旧派系复用映射”必须至少点名一个可复用对象或明确写“待确认”。',
            '7. “最小数据落点”必须出现 faction_id、game_id、status 这 3 个键。',
            '8. “模拟验证场景”必须是一个可执行的最小烟测闭环，不要写泛泛建议。',
            input.executionMode === 'workspace-write'
                ? '9. 允许在工作树内落盘最小实现，但本次回复仍必须先按模板给出结构化摘要。'
                : '9. 当前为只读规划模式，不允许修改仓库文件。',
            '',
            `游戏=${input.gameId}`,
            `任务描述=${input.taskBrief}`,
            `派系大纲=${input.factionOutline}`,
            `补充说明=${input.supplementalNotes || '无'}`,
            `素材检查=${input.context.assetCheck || '无'}`,
            `数据录入=${input.context.dataEntry || '无'}`,
            `旧派系参考=${input.context.referenceFaction || '无'}`,
        ].join('\n');
        const promptArg = prompt
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .join(' | ');

        const outputFile = resolve(this.executorTempDir, `codex-implementation-${Date.now()}.txt`);
        const sandboxMode = input.executionMode === 'workspace-write' ? 'workspace-write' : 'read-only';
        const args = [
            '/c',
            'codex',
            'exec',
            '--cd',
            input.projectPath,
            '--skip-git-repo-check',
            '--sandbox',
            sandboxMode,
            '--output-last-message',
            outputFile,
            promptArg,
        ];

        // Windows 下通过 stdin 向 `codex exec -` 输 prompt 会静默以 exitCode=2 失败，
        // 且 stdout/stderr 经常为空；改为把 prompt 作为位置参数传入，才能稳定得到结果文件。
        const execution = await this.runCommand('cmd.exe', args, 10 * 60 * 1000, input.projectPath);
        let finalMessage = '';
        try {
            finalMessage = await readFile(outputFile, 'utf8');
        } catch (error) {
            this.logger.warn(`读取 Codex 输出失败：${String(error)}`);
        }

        const normalizedFinalMessage = finalMessage.trim();
        const codexOutputIsStructured = normalizedFinalMessage.startsWith('IMPLEMENTATION_READY');

        if (normalizedFinalMessage && !codexOutputIsStructured) {
            this.logger.warn(`Codex 输出未命中 IMPLEMENTATION_READY 模板，已回退。输出片段：${this.takeTail(normalizedFinalMessage, 400)}`);
        }

        if (!normalizedFinalMessage || !codexOutputIsStructured) {
            finalMessage = this.buildDeterministicImplementationPlan(input).summaryMarkdown;
        }

        const usedCodexOutput = execution.exitCode === 0 && codexOutputIsStructured;

        return {
            stage: 'implementation',
            status: usedCodexOutput ? 'completed' : 'degraded',
            summary: usedCodexOutput ? 'Codex CLI 已返回实施阶段结果。' : 'Codex CLI 未返回可用的结构化结果，已回退到可读实施摘要。',
            summaryMarkdown: finalMessage.trim(),
            nextStepHints: [
                '将实施输出交给审计模块，确认复用与最小数据落点是否成立。',
                '后续接 OpenWebUI 时，可把 executorId / executionMode 做成工具参数或工作流变量。',
            ],
            inputSnapshot: this.toInputSnapshot(input),
            executor: {
                selectedExecutorId: 'codex-cli',
                availableExecutors,
                executionMode: input.executionMode,
                fallbackApplied,
                commandPreview: `codex exec --cd ${input.projectPath} --sandbox ${sandboxMode} "<implementation-prompt>"`,
                stdoutSummary: this.takeTail(execution.stdout),
                stderrSummary: this.takeTail(execution.stderr),
            },
            structured: {
                outputFile,
                exitCode: execution.exitCode,
                usedCodexOutput,
                stdout: this.takeTail(execution.stdout),
                stderr: this.takeTail(execution.stderr),
            },
        };
    }

    private runCommand(command: string, args: string[], timeoutMs: number, cwd = this.repoRoot) {
        return new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolvePromise, reject) => {
            const child = spawn(command, args, {
                cwd,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let stdout = '';
            let stderr = '';
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error(`命令执行超时：${basename(command)} ${args.join(' ')}`));
            }, timeoutMs);

            child.stdout.on('data', (chunk) => {
                stdout += String(chunk);
            });
            child.stderr.on('data', (chunk) => {
                stderr += String(chunk);
            });
            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
            child.on('close', (code) => {
                clearTimeout(timer);
                resolvePromise({
                    exitCode: code ?? -1,
                    stdout,
                    stderr,
                });
            });
        });
    }

    private parseKeyValueLines(raw: string) {
        const fields: Record<string, string> = {};
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const match = trimmed.match(/^([^=:：]+)\s*[:=：]\s*(.*)$/);
            if (!match) continue;
            fields[match[1].trim()] = match[2].trim();
        }
        return fields;
    }

    private inferGameId(raw: string) {
        const normalized = raw.toLowerCase();
        if (normalized.includes('dicethrone') || normalized.includes('王权骰铸')) return 'dicethrone';
        if (normalized.includes('summonerwars') || normalized.includes('召唤师战争')) return 'summonerwars';
        return 'smashup';
    }

    private normalizeExecutorId(value: unknown): ExecutorId | undefined {
        return value === 'codex-cli' || value === 'deterministic-planner' ? value : undefined;
    }

    private normalizeExecutionMode(value: unknown): ExecutionMode {
        return value === 'workspace-write' ? 'workspace-write' : 'plan';
    }

    private asString(value: unknown) {
        return typeof value === 'string' ? value.trim() : '';
    }

    private safeText(value: string) {
        return value || '未提供';
    }

    private slugify(value: string) {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40) || 'unnamed-faction';
    }

    private takeTail(value: string, max = 1200) {
        const trimmed = value.trim();
        if (!trimmed) return '';
        return trimmed.length <= max ? trimmed : trimmed.slice(-max);
    }

    private toInputSnapshot(input: StageInput) {
        return {
            gameId: input.gameId,
            taskBrief: input.taskBrief,
            factionOutline: input.factionOutline,
            ttsPackPath: input.ttsPackPath,
            supplementalNotes: input.supplementalNotes,
        };
    }
}
