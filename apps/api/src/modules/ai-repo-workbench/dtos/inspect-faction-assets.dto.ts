import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class InspectFactionAssetsDto {
    @IsOptional()
    @IsString()
    ttsPackPath?: string;

    @IsOptional()
    @IsString()
    gameId?: string;

    @IsOptional()
    @IsString()
    projectPath?: string;

    @IsOptional()
    @IsString()
    factionOutline?: string;

    @IsOptional()
    @IsBoolean()
    enableWikiComparison?: boolean;

    @IsOptional()
    @IsBoolean()
    enableDocLookup?: boolean;

    @IsOptional()
    @IsString()
    extraDataSources?: string;
}
