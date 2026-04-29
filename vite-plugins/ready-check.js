"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readyCheckPlugin = readyCheckPlugin;
var fs = require("node:fs/promises");
var path = require("node:path");
var READY_DELAY_MS = 1000;
var CAPTURE_SAVE_ROUTE = '/__capture/save';
var CAPTURE_STATUS_ROUTE = '/__capture/status';
function endJson(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}
function readJsonBody(req) {
    return __awaiter(this, void 0, void 0, function () {
        var chunks, chunk, e_1_1, raw;
        var _a, req_1, req_1_1;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    chunks = [];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, 7, 12]);
                    _a = true, req_1 = __asyncValues(req);
                    _e.label = 2;
                case 2: return [4 /*yield*/, req_1.next()];
                case 3:
                    if (!(req_1_1 = _e.sent(), _b = req_1_1.done, !_b)) return [3 /*break*/, 5];
                    _d = req_1_1.value;
                    _a = false;
                    chunk = _d;
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    _e.label = 4;
                case 4:
                    _a = true;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 12];
                case 6:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 12];
                case 7:
                    _e.trys.push([7, , 10, 11]);
                    if (!(!_a && !_b && (_c = req_1.return))) return [3 /*break*/, 9];
                    return [4 /*yield*/, _c.call(req_1)];
                case 8:
                    _e.sent();
                    _e.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 11: return [7 /*endfinally*/];
                case 12:
                    raw = Buffer.concat(chunks).toString('utf8');
                    return [2 /*return*/, raw ? JSON.parse(raw) : {}];
            }
        });
    });
}
function resolveWorkspaceOutputPath(outputPath) {
    if (typeof outputPath !== 'string' || !outputPath.trim()) {
        throw new Error('missing_output_path');
    }
    var workspaceRoot = path.resolve(process.cwd());
    var resolvedOutputPath = path.resolve(outputPath);
    var relativePath = path.relative(workspaceRoot, resolvedOutputPath);
    var isInsideWorkspace = relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
    if (!isInsideWorkspace) {
        throw new Error('output_path_outside_workspace');
    }
    return resolvedOutputPath;
}
function readScenarioFromUrl(url) {
    var _a;
    if (!url) {
        return '';
    }
    var parsed = new URL(url, 'http://127.0.0.1');
    return (_a = parsed.searchParams.get('scenario')) !== null && _a !== void 0 ? _a : '';
}
function updateCaptureStatus(captureStatuses, nextStatus) {
    captureStatuses.set(nextStatus.scenario, __assign(__assign({}, nextStatus), { updatedAt: Date.now() }));
}
function handleCaptureSave(req, res, captureStatuses) {
    return __awaiter(this, void 0, void 0, function () {
        var body, imageDataUrl, outputPath, scenario, match, buffer, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (req.method === 'OPTIONS') {
                        res.statusCode = 204;
                        res.end();
                        return [2 /*return*/];
                    }
                    if (req.method !== 'POST') {
                        endJson(res, 405, { ok: false, error: 'method_not_allowed' });
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, readJsonBody(req)];
                case 2:
                    body = _a.sent();
                    imageDataUrl = String((body === null || body === void 0 ? void 0 : body.imageDataUrl) || '');
                    outputPath = resolveWorkspaceOutputPath(body === null || body === void 0 ? void 0 : body.outputPath);
                    scenario = String((body === null || body === void 0 ? void 0 : body.scenario) || '');
                    match = imageDataUrl.match(/^data:image\/png;base64,(.+)$/);
                    if (!match) {
                        throw new Error('invalid_image_data');
                    }
                    buffer = Buffer.from(match[1], 'base64');
                    return [4 /*yield*/, fs.mkdir(path.dirname(outputPath), { recursive: true })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(outputPath, buffer)];
                case 4:
                    _a.sent();
                    if (scenario) {
                        updateCaptureStatus(captureStatuses, {
                            scenario: scenario,
                            phase: 'upload-saved',
                            outputPath: outputPath,
                            bytes: buffer.length,
                        });
                    }
                    endJson(res, 200, {
                        ok: true,
                        outputPath: outputPath,
                        scenario: scenario || null,
                        bytes: buffer.length,
                    });
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    endJson(res, 400, {
                        ok: false,
                        error: error_1 instanceof Error ? error_1.message : String(error_1),
                    });
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function handleCaptureStatus(req, res, captureStatuses) {
    return __awaiter(this, void 0, void 0, function () {
        var scenario, status_1, body, scenario, phase, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (req.method === 'OPTIONS') {
                        res.statusCode = 204;
                        res.end();
                        return [2 /*return*/];
                    }
                    if (req.method === 'GET') {
                        scenario = readScenarioFromUrl(req.url);
                        if (!scenario) {
                            endJson(res, 400, { ok: false, error: 'missing_scenario' });
                            return [2 /*return*/];
                        }
                        status_1 = captureStatuses.get(scenario);
                        endJson(res, status_1 ? 200 : 404, {
                            ok: Boolean(status_1),
                            status: status_1 !== null && status_1 !== void 0 ? status_1 : null,
                        });
                        return [2 /*return*/];
                    }
                    if (req.method !== 'POST') {
                        endJson(res, 405, { ok: false, error: 'method_not_allowed' });
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, readJsonBody(req)];
                case 2:
                    body = _a.sent();
                    scenario = String((body === null || body === void 0 ? void 0 : body.scenario) || '').trim();
                    phase = String((body === null || body === void 0 ? void 0 : body.phase) || '').trim();
                    if (!scenario) {
                        throw new Error('missing_scenario');
                    }
                    if (!phase) {
                        throw new Error('missing_phase');
                    }
                    updateCaptureStatus(captureStatuses, {
                        scenario: scenario,
                        phase: phase,
                        message: typeof (body === null || body === void 0 ? void 0 : body.message) === 'string' ? body.message : undefined,
                        outputPath: typeof (body === null || body === void 0 ? void 0 : body.outputPath) === 'string' ? body.outputPath : undefined,
                        bytes: typeof (body === null || body === void 0 ? void 0 : body.bytes) === 'number' ? body.bytes : undefined,
                    });
                    endJson(res, 200, {
                        ok: true,
                        status: captureStatuses.get(scenario),
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    endJson(res, 400, {
                        ok: false,
                        error: error_2 instanceof Error ? error_2.message : String(error_2),
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function readyCheckPlugin() {
    var isReady = false;
    var readyTimer = null;
    var captureSaveEnabled = process.env.BG_ENABLE_CAPTURE_SAVE === '1';
    var captureTraceRequestsEnabled = process.env.BG_CAPTURE_TRACE_REQUESTS === '1';
    var captureStatuses = new Map();
    var clearReadyTimer = function () {
        if (!readyTimer)
            return;
        clearTimeout(readyTimer);
        readyTimer = null;
    };
    var markNotReady = function () {
        clearReadyTimer();
        isReady = false;
    };
    var scheduleReady = function () {
        markNotReady();
        readyTimer = setTimeout(function () {
            isReady = true;
            console.log('Vite server is ready, /__ready is available.');
        }, READY_DELAY_MS);
    };
    return {
        name: 'ready-check',
        configureServer: function (server) {
            var _this = this;
            var _a;
            var originalListen = server.listen.bind(server);
            server.listen = (function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () {
                    var result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, originalListen.apply(void 0, args)];
                            case 1:
                                result = _b.sent();
                                (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.once('close', markNotReady);
                                scheduleReady();
                                return [2 /*return*/, result];
                        }
                    });
                });
            });
            if ((_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.listening) {
                scheduleReady();
            }
            server.middlewares.use('/__ready', function (_req, res) {
                if (isReady) {
                    endJson(res, 200, { ready: true, timestamp: Date.now() });
                }
                else {
                    endJson(res, 503, { ready: false, message: 'Server is starting...' });
                }
            });
            if (!captureSaveEnabled) {
                return;
            }
            if (captureTraceRequestsEnabled) {
                server.middlewares.use(function (req, res, next) {
                    var _a, _b, _c;
                    var startedAt = Date.now();
                    var requestUrl = (_a = req.url) !== null && _a !== void 0 ? _a : '';
                    var userAgent = (_b = req.headers['user-agent']) !== null && _b !== void 0 ? _b : '';
                    console.log("[capture-trace] -> ".concat((_c = req.method) !== null && _c !== void 0 ? _c : 'GET', " ").concat(requestUrl, " ua=").concat(userAgent));
                    res.on('finish', function () {
                        console.log("[capture-trace] <- ".concat(res.statusCode, " ").concat(requestUrl, " ").concat(Date.now() - startedAt, "ms"));
                    });
                    next();
                });
            }
            server.middlewares.use(CAPTURE_SAVE_ROUTE, function (req, res) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                void handleCaptureSave(req, res, captureStatuses);
            });
            server.middlewares.use(CAPTURE_STATUS_ROUTE, function (req, res) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                void handleCaptureStatus(req, res, captureStatuses);
            });
        },
    };
}
