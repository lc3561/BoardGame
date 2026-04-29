#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { installViteWindowsNetUseBypass } from './vite-windows-net-use-bypass.mjs';

export async function runViteCli(args = process.argv.slice(2)) {
    installViteWindowsNetUseBypass();

    const viteArgs = [...args];
    const hasExplicitConfig = viteArgs.some(arg => arg === '--config' || arg.startsWith('--config='));
    if (!hasExplicitConfig) {
        const preferredConfigPath = path.resolve(process.cwd(), 'vite.config.ts');
        if (fs.existsSync(preferredConfigPath)) {
            viteArgs.push('--config', preferredConfigPath);
        }
    }

    // inline 模式也要把 Vite CLI 参数透传进去，否则 configLoader/port 等参数会失效。
    const originalArgv = process.argv;
    process.argv = [process.execPath, fileURLToPath(import.meta.url), ...viteArgs];
    try {
        await import(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));
    } finally {
        process.argv = originalArgv;
    }
}

const isDirectExecution = process.argv[1]
    ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;

if (isDirectExecution) {
    await runViteCli();
}
