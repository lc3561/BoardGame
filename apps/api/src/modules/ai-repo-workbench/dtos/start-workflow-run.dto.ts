import { IsObject, IsOptional, IsString } from 'class-validator';

export class StartWorkflowRunDto {
    @IsString()
    workflowId!: string;

    @IsString()
    subject!: string;

    @IsString()
    prompt!: string;

    @IsOptional()
    @IsString()
    projectPath?: string;

    @IsOptional()
    @IsObject()
    nodeToggles?: Record<string, boolean>;
}
