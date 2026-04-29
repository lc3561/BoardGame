import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const READY_DELAY_MS = 1000;
const CAPTURE_SAVE_ROUTE = '/__capture/save';
const CAPTURE_STATUS_ROUTE = '/__capture/status';

type JsonBody = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

type CaptureStatusRecord = {
  scenario: string;
  phase: string;
  message?: string;
  outputPath?: string;
  updatedAt: number;
  bytes?: number;
};

function endJson(res: ServerResponse, statusCode: number, body: JsonBody) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function resolveWorkspaceOutputPath(outputPath: unknown) {
  if (typeof outputPath !== 'string' || !outputPath.trim()) {
    throw new Error('missing_output_path');
  }

  const workspaceRoot = path.resolve(process.cwd());
  const resolvedOutputPath = path.resolve(outputPath);
  const relativePath = path.relative(workspaceRoot, resolvedOutputPath);
  const isInsideWorkspace = relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error('output_path_outside_workspace');
  }

  return resolvedOutputPath;
}

function readScenarioFromUrl(url: string | undefined) {
  if (!url) {
    return '';
  }

  const parsed = new URL(url, 'http://127.0.0.1');
  return parsed.searchParams.get('scenario') ?? '';
}

function updateCaptureStatus(
  captureStatuses: Map<string, CaptureStatusRecord>,
  nextStatus: Omit<CaptureStatusRecord, 'updatedAt'>,
) {
  captureStatuses.set(nextStatus.scenario, {
    ...nextStatus,
    updatedAt: Date.now(),
  });
}

async function handleCaptureSave(
  req: IncomingMessage,
  res: ServerResponse,
  captureStatuses: Map<string, CaptureStatusRecord>,
) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    endJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const imageDataUrl = String(body?.imageDataUrl || '');
    const outputPath = resolveWorkspaceOutputPath(body?.outputPath);
    const scenario = String(body?.scenario || '');
    const match = imageDataUrl.match(/^data:image\/png;base64,(.+)$/);

    if (!match) {
      throw new Error('invalid_image_data');
    }

    const buffer = Buffer.from(match[1], 'base64');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
    if (scenario) {
      updateCaptureStatus(captureStatuses, {
        scenario,
        phase: 'upload-saved',
        outputPath,
        bytes: buffer.length,
      });
    }

    endJson(res, 200, {
      ok: true,
      outputPath,
      scenario: scenario || null,
      bytes: buffer.length,
    });
  } catch (error) {
    endJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleCaptureStatus(
  req: IncomingMessage,
  res: ServerResponse,
  captureStatuses: Map<string, CaptureStatusRecord>,
) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const scenario = readScenarioFromUrl(req.url);
    if (!scenario) {
      endJson(res, 400, { ok: false, error: 'missing_scenario' });
      return;
    }

    const status = captureStatuses.get(scenario);
    endJson(res, status ? 200 : 404, {
      ok: Boolean(status),
      status: status ?? null,
    });
    return;
  }

  if (req.method !== 'POST') {
    endJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const scenario = String(body?.scenario || '').trim();
    const phase = String(body?.phase || '').trim();

    if (!scenario) {
      throw new Error('missing_scenario');
    }

    if (!phase) {
      throw new Error('missing_phase');
    }

    updateCaptureStatus(captureStatuses, {
      scenario,
      phase,
      message: typeof body?.message === 'string' ? body.message : undefined,
      outputPath: typeof body?.outputPath === 'string' ? body.outputPath : undefined,
      bytes: typeof body?.bytes === 'number' ? body.bytes : undefined,
    });

    endJson(res, 200, {
      ok: true,
      status: captureStatuses.get(scenario),
    });
  } catch (error) {
    endJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function readyCheckPlugin(): Plugin {
  let isReady = false;
  let readyTimer: NodeJS.Timeout | null = null;
  const captureSaveEnabled = process.env.BG_ENABLE_CAPTURE_SAVE === '1';
  const captureTraceRequestsEnabled = process.env.BG_CAPTURE_TRACE_REQUESTS === '1';
  const captureStatuses = new Map<string, CaptureStatusRecord>();

  const clearReadyTimer = () => {
    if (!readyTimer) return;
    clearTimeout(readyTimer);
    readyTimer = null;
  };

  const markNotReady = () => {
    clearReadyTimer();
    isReady = false;
  };

  const scheduleReady = () => {
    markNotReady();
    readyTimer = setTimeout(() => {
      isReady = true;
      console.log('Vite server is ready, /__ready is available.');
    }, READY_DELAY_MS);
  };

  return {
    name: 'ready-check',
    configureServer(server) {
      const originalListen = server.listen.bind(server) as typeof server.listen;
      server.listen = (async (...args: Parameters<typeof originalListen>) => {
        const result = await originalListen(...args);
        server.httpServer?.once('close', markNotReady);
        scheduleReady();
        return result;
      }) as typeof server.listen;

      if (server.httpServer?.listening) {
        scheduleReady();
      }

      server.middlewares.use('/__ready', (_req, res) => {
        if (isReady) {
          endJson(res, 200, { ready: true, timestamp: Date.now() });
        } else {
          endJson(res, 503, { ready: false, message: 'Server is starting...' });
        }
      });

      if (!captureSaveEnabled) {
        return;
      }

      if (captureTraceRequestsEnabled) {
        server.middlewares.use((req, res, next) => {
          const startedAt = Date.now();
          const requestUrl = req.url ?? '';
          const userAgent = req.headers['user-agent'] ?? '';
          console.log(`[capture-trace] -> ${req.method ?? 'GET'} ${requestUrl} ua=${userAgent}`);
          res.on('finish', () => {
            console.log(`[capture-trace] <- ${res.statusCode} ${requestUrl} ${Date.now() - startedAt}ms`);
          });
          next();
        });
      }

      server.middlewares.use(CAPTURE_SAVE_ROUTE, (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        void handleCaptureSave(req, res, captureStatuses);
      });

      server.middlewares.use(CAPTURE_STATUS_ROUTE, (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        void handleCaptureStatus(req, res, captureStatuses);
      });
    },
  };
}
