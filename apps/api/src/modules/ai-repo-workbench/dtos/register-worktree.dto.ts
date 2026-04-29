import { IsOptional, IsString } from 'class-validator';

export class RegisterWorkbenchWorktreeDto {
    @IsString()
    branchName!: string;

    @IsOptional()
    @IsString()
    projectPath?: string;

    @IsOptional()
    @IsString()
    worktreePath?: string;

    @IsOptional()
    @IsString()
    label?: string;
}
