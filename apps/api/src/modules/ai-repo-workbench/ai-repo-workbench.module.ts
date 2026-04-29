import { Module } from '@nestjs/common';
import { AiRepoWorkbenchController } from './ai-repo-workbench.controller';
import { AiRepoWorkbenchExecutorService } from './ai-repo-workbench-executor.service';
import { AiRepoWorkbenchService } from './ai-repo-workbench.service';

@Module({
    controllers: [AiRepoWorkbenchController],
    providers: [AiRepoWorkbenchService, AiRepoWorkbenchExecutorService],
})
export class AiRepoWorkbenchModule {}
