import { IsString } from 'class-validator';

export class FocusWorkbenchWorktreeDto {
    @IsString()
    worktreeId!: string;
}
