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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var node_fs_1 = require("node:fs");
var path_1 = require("path");
var url_1 = require("url");
var typescript_1 = require("typescript");
var vite_locale_hash_ts_1 = require("./plugins/vite-locale-hash.ts");
var vite_asset_hash_ts_1 = require("./plugins/vite-asset-hash.ts");
var vite_public_file_hash_ts_1 = require("./plugins/vite-public-file-hash.ts");
var ready_check_ts_1 = require("./vite-plugins/ready-check.ts");
var configDir = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var LEGACY_GAMEPLAY_BUILD_TARGETS = ['chrome88', 'edge88', 'firefox78', 'safari14'];
var VIRTUAL_RUNTIME_CHUNK_PATTERNS = ['commonjsHelpers.js'];
var MANUAL_CHUNK_PATTERNS = [
    ['vendor-react', ['/node_modules/react/', '/node_modules/react-dom/', '/node_modules/react-router-dom/', '/node_modules/scheduler/']],
    ['vendor-motion', ['/node_modules/framer-motion/']],
    ['vendor-socket', ['/node_modules/socket.io-client/', '/node_modules/socket.io-msgpack-parser/', '/node_modules/@msgpack/msgpack/']],
    ['vendor-i18n', ['/node_modules/i18next/', '/node_modules/react-i18next/', '/node_modules/i18next-http-backend/', '/node_modules/i18next-browser-languagedetector/']],
    ['vendor-query', ['/node_modules/@tanstack/react-query/']],
    ['vendor-howler', ['/node_modules/howler/']],
];
var ANDROID_BUILD_PRUNE_PATHS = [
    'assets/atlas-configs/smashup/2833984701.json',
    'assets/common/audio/registry.json',
    'assets/common/audio/phrase-mappings.zh-CN.json',
];
var readCliFlag = function (flagName) {
    var prefix = "--".concat(flagName, "=");
    for (var i = 0; i < process.argv.length; i++) {
        var arg = process.argv[i];
        if (arg === "--".concat(flagName)) {
            var next = process.argv[i + 1];
            return next && !next.startsWith('-') ? next : undefined;
        }
        if (arg.startsWith(prefix)) {
            return arg.slice(prefix.length);
        }
    }
    return undefined;
};
var debugAndroidAppIdSegments = new Set(['debug', 'dev', 'test', 'qa']);
var isNonReleaseAndroidAppId = function (appId) { return (appId
    .split('.')
    .some(function (segment) { return debugAndroidAppIdSegments.has(segment.trim().toLowerCase()); })); };
var createAndroidBuildMetaPlugin = function (mode, backendUrl) { return ({
    name: 'android-build-meta',
    apply: 'build',
    generateBundle: function () {
        var _a, _b, _c;
        if (mode !== 'android')
            return;
        var appId = ((_a = process.env.VITE_CAPACITOR_APP_ID) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.CAPACITOR_APP_ID) === null || _b === void 0 ? void 0 : _b.trim()) || '';
        var appName = ((_c = process.env.CAPACITOR_APP_NAME) === null || _c === void 0 ? void 0 : _c.trim()) || '';
        this.emitFile({
            type: 'asset',
            fileName: 'android-build-meta.json',
            source: JSON.stringify({
                mode: mode,
                backendUrl: backendUrl,
                builtAt: new Date().toISOString(),
                appId: appId,
                appName: appName,
                shellType: appId && !isNonReleaseAndroidAppId(appId) ? 'release' : 'non-release',
            }, null, 2),
        });
    },
}); };
var createInlineTypeScriptFallbackPlugin = function (enabled) { return ({
    name: 'inline-typescript-fallback',
    enforce: 'pre',
    transform: function (code, id) {
        if (!enabled)
            return null;
        var cleanId = id.split('?')[0];
        if (!cleanId || cleanId.includes('/node_modules/'))
            return null;
        if (!cleanId.endsWith('.ts') && !cleanId.endsWith('.tsx'))
            return null;
        var transpiled = typescript_1.default.transpileModule(code, {
            fileName: cleanId,
            compilerOptions: {
                target: typescript_1.default.ScriptTarget.ES2022,
                module: typescript_1.default.ModuleKind.ESNext,
                moduleResolution: typescript_1.default.ModuleResolutionKind.Bundler,
                jsx: cleanId.endsWith('.tsx') ? typescript_1.default.JsxEmit.ReactJSX : undefined,
                sourceMap: true,
                inlineSources: true,
                allowImportingTsExtensions: true,
                importsNotUsedAsValues: typescript_1.default.ImportsNotUsedAsValues.Remove,
                preserveValueImports: false,
                verbatimModuleSyntax: false,
            },
        });
        return {
            code: transpiled.outputText,
            map: transpiled.sourceMapText ? JSON.parse(transpiled.sourceMapText) : null,
        };
    },
}); };
var createAndroidDistPrunePlugin = function (mode) { return ({
    name: 'android-dist-prune',
    apply: 'build',
    closeBundle: function () {
        if (mode !== 'android')
            return;
        var distDir = path_1.default.resolve(configDir, 'dist');
        for (var _i = 0, ANDROID_BUILD_PRUNE_PATHS_1 = ANDROID_BUILD_PRUNE_PATHS; _i < ANDROID_BUILD_PRUNE_PATHS_1.length; _i++) {
            var relativePath = ANDROID_BUILD_PRUNE_PATHS_1[_i];
            var targetPath = path_1.default.join(distDir, relativePath);
            if (!node_fs_1.default.existsSync(targetPath))
                continue;
            node_fs_1.default.rmSync(targetPath, { force: true });
        }
    },
}); };
// https://vite.dev/config/
exports.default = (0, vite_1.defineConfig)(function (_a) {
    var mode = _a.mode;
    var env = (0, vite_1.loadEnv)(mode, process.cwd(), '');
    var forceInlineVite = env.BG_VITE_FORCE_INLINE === '1'
        || process.env.BG_VITE_FORCE_INLINE === '1';
    var disableViteWatch = process.env.PW_SERVER_WATCH === 'false'
        || process.env.VITE_DISABLE_WATCH === 'true'
        || env.VITE_DISABLE_WATCH === 'true';
    var cliPort = Number(readCliFlag('port'));
    var cliHost = readCliFlag('host');
    var devPort = Number.isFinite(cliPort) && cliPort > 0
        ? cliPort
        : Number(env.VITE_DEV_PORT) || 4273;
    var serverHost = cliHost || '0.0.0.0';
    var hmrHost = cliHost && cliHost !== '0.0.0.0' ? cliHost : 'localhost';
    var gameServerPort = Number(env.GAME_SERVER_PORT) || 18000;
    var apiServerPort = Number(env.API_SERVER_PORT) || 18001;
    var suppressE2EProxyNoise = env.E2E_PROXY_QUIET === 'true';
    var backendUrl = env.VITE_BACKEND_URL || '';
    var isIgnorableProxyError = function (err) {
        if (err.code === 'ECONNABORTED')
            return true;
        if (!suppressE2EProxyNoise)
            return false;
        return err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'EPIPE';
    };
    var logProxyError = function (label, err) {
        if (isIgnorableProxyError(err))
            return;
        console.error("[proxy ".concat(label, "]"), err.message);
    };
    return {
        plugins: __spreadArray(__spreadArray([
            {
                name: 'suppress-public-dir-warning',
                enforce: 'pre',
                configResolved: function (config) {
                    var originalWarn = config.logger.warn;
                    config.logger.warn = function (msg, options) {
                        if (typeof msg === 'string' && msg.includes('Assets in public directory cannot be imported')) {
                            return;
                        }
                        originalWarn(msg, options);
                    };
                },
            },
            {
                name: 'suppress-e2e-proxy-noise',
                enforce: 'pre',
                configResolved: function (config) {
                    if (!suppressE2EProxyNoise)
                        return;
                    var originalError = config.logger.error;
                    config.logger.error = function (msg, options) {
                        if (typeof msg === 'string' && msg.includes('ws proxy error'))
                            return;
                        originalError(msg, options);
                    };
                },
            }
        ], (forceInlineVite ? [] : [(0, plugin_react_1.default)()]), true), [
            createInlineTypeScriptFallbackPlugin(forceInlineVite),
            (0, vite_locale_hash_ts_1.default)(),
            (0, vite_asset_hash_ts_1.default)(),
            (0, vite_public_file_hash_ts_1.default)(),
            (0, ready_check_ts_1.readyCheckPlugin)(),
            createAndroidBuildMetaPlugin(mode, backendUrl),
            createAndroidDistPrunePlugin(mode),
        ], false),
        esbuild: forceInlineVite ? false : undefined,
        build: {
            // 生产构建向下兼容到 Chrome 88+ 这档现代浏览器，确保旧一点的 WebView 也能正常进入并游玩。
            target: LEGACY_GAMEPLAY_BUILD_TARGETS,
            cssTarget: LEGACY_GAMEPLAY_BUILD_TARGETS,
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        // 把 CommonJS helper 单独抽离，避免某个大 vendor chunk 承载它后反向拖进首页入口。
                        if (VIRTUAL_RUNTIME_CHUNK_PATTERNS.some(function (pattern) { return id.includes(pattern); })) {
                            return 'vendor-runtime';
                        }
                        if (!id.includes('/node_modules/'))
                            return undefined;
                        for (var _i = 0, MANUAL_CHUNK_PATTERNS_1 = MANUAL_CHUNK_PATTERNS; _i < MANUAL_CHUNK_PATTERNS_1.length; _i++) {
                            var _a = MANUAL_CHUNK_PATTERNS_1[_i], chunkName = _a[0], patterns = _a[1];
                            if (patterns.some(function (pattern) { return id.includes(pattern); })) {
                                return chunkName;
                            }
                        }
                        return undefined;
                    },
                },
            },
        },
        resolve: {
            dedupe: ['react', 'react-dom'],
            alias: {
                '@': path_1.default.resolve(configDir, './src'),
                '@locales': path_1.default.resolve(configDir, './public/locales'),
            },
        },
        optimizeDeps: __assign({}, (forceInlineVite
            ? {
                // In constrained environments, disable dep optimization to avoid esbuild spawn EPERM.
                noDiscovery: true,
                include: [],
                entries: undefined,
            }
            : {
                entries: ['index.html'],
            })),
        server: {
            host: serverHost,
            port: devPort,
            strictPort: true,
            hmr: disableViteWatch
                ? false
                : {
                    protocol: 'ws',
                    host: hmrHost,
                    port: devPort,
                    clientPort: devPort,
                },
            // 单次 E2E 不依赖热更新；禁用监听可避免并发改工作区时触发 Vite 重启。
            watch: disableViteWatch
                ? {
                    ignored: ['**/*'],
                }
                : {
                    usePolling: true,
                    interval: 1000,
                    ignored: [
                        '**/test-results/**',
                        '**/playwright-report/**',
                        '**/.tmp/**',
                        '**/temp/**',
                        '**/tmp/**',
                        '**/evidence/**',
                        '**/logs/**',
                        '**/android/app/**',
                        '**/android/build/**',
                        '**/node_modules/**',
                        '**/*.test.*',
                        '**/*.spec.*',
                        '**/e2e/**',
                        '**/.tmp-*',
                        '**/.env',
                        '**/.env.*',
                        '**/playwright.config.*',
                        '**/vitest.config.*',
                        '**/vite.config.*',
                    ],
                },
            proxy: {
                '/games': {
                    target: "http://127.0.0.1:".concat(gameServerPort),
                    changeOrigin: true,
                },
                '/socket.io': {
                    target: "http://127.0.0.1:".concat(gameServerPort),
                    changeOrigin: true,
                    ws: true,
                    configure: function (proxy) {
                        proxy.on('error', function (err) {
                            logProxyError('/socket.io', err);
                        });
                    },
                },
                '/lobby-socket': {
                    target: "http://127.0.0.1:".concat(gameServerPort),
                    changeOrigin: true,
                    ws: true,
                    configure: function (proxy) {
                        proxy.on('error', function (err) {
                            logProxyError('/lobby-socket', err);
                        });
                    },
                },
                '/auth': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/game-changelogs': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/admin': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                    bypass: function (req) {
                        var _a;
                        if ((_a = req.headers.accept) === null || _a === void 0 ? void 0 : _a.includes('text/html')) {
                            return req.url;
                        }
                    },
                },
                '/feedback': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/sponsors': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/notifications': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/social-socket': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                    ws: true,
                    configure: function (proxy) {
                        proxy.on('error', function (err) {
                            logProxyError('/social-socket', err);
                        });
                    },
                },
                '/ugc': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/assets/ugc': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/assets/avatars': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
                '/layout': {
                    target: "http://127.0.0.1:".concat(apiServerPort),
                    changeOrigin: true,
                },
            },
        },
    };
});
