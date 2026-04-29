#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function hasFlag(name) {
    const argv = process.argv.slice(2);
    return argv.includes(`--${name}`) || argv.includes(`--${name}=true`);
}

function readArg(name) {
    const prefix = `--${name}=`;
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg.startsWith(prefix)) {
            return arg.slice(prefix.length);
        }
        if (arg === `--${name}` && argv[i + 1]) {
            return argv[i + 1];
        }
    }
    return null;
}

function normalizePath(rawPath, defaultPath) {
    return path.resolve(rawPath || defaultPath);
}

async function main() {
    const apply = hasFlag('apply');
    const boardPath = normalizePath(readArg('board'), 'temp/feedback-closeout/status-board.json');
    const raw = await fs.readFile(boardPath, 'utf8');
    const board = JSON.parse(raw);
    const now = new Date().toISOString();

    let changed = 0;
    for (const item of Array.isArray(board.items) ? board.items : []) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const status = typeof item.status === 'string' ? item.status : '';
        if (!status) {
            continue;
        }
        if (item.lastFetchedStatus !== status) {
            item.lastFetchedStatus = status;
            item.updatedAt = now;
            changed += 1;
        }
    }

    if (apply && changed > 0) {
        board.updatedAt = now;
        if (Number.isInteger(board.version)) {
            board.version += 1;
        }
        await fs.writeFile(boardPath, `${JSON.stringify(board, null, 2)}\n`, 'utf8');
    }

    console.log(`[SyncFeedbackBoardLastFetchedStatus] apply=${apply} changed=${changed} board=${boardPath}`);
}

main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(`[SyncFeedbackBoardLastFetchedStatus] error=${message}`);
    process.exitCode = 1;
});
