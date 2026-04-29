import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SubmitDecisionDto {
    @IsString()
    decisionId!: string;

    @IsString()
    @IsIn(['proceed', 'reject'])
    action!: 'proceed' | 'reject';

    @IsOptional()
    @ValidateIf((dto: SubmitDecisionDto) => dto.optionId !== undefined)
    @IsString()
    @IsIn(['wiki', 'pdf', 'document', 'other-url'])
    optionId?: 'wiki' | 'pdf' | 'document' | 'other-url';

    @IsOptional()
    @IsString()
    feedback?: string;
}
