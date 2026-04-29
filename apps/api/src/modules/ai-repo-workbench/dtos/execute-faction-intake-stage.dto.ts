import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class ExecuteFactionIntakeStageDto {
    @IsOptional()
    @IsString()
    question?: string;

    @IsOptional()
    @IsString()
    gameId?: string;

    @IsOptional()
    @IsString()
    projectPath?: string;

    @IsOptional()
    @IsString()
    taskBrief?: string;

    @IsOptional()
    @IsString()
    factionOutline?: string;

    @IsOptional()
    @IsString()
    ttsPackPath?: string;

    @IsOptional()
    @IsString()
    supplementalNotes?: string;

    @IsOptional()
    @IsString()
    @IsIn(['deterministic-planner', 'codex-cli'])
    preferredExecutorId?: 'deterministic-planner' | 'codex-cli';

    @IsOptional()
    @IsString()
    @IsIn(['plan', 'workspace-write'])
    executionMode?: 'plan' | 'workspace-write';

    @IsOptional()
    @IsBoolean()
    forceCodex?: boolean;
}
