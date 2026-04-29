"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = publicFileHashPlugin;
/**
 * Vite 插件：为 public 根目录下的非 /assets 静态文件生成 content hash 映射。
 *
 * 目标目录：
 * - public/fonts
 * - public/logos
 * - public/game-data（可按文件排除动态配置）
 *
 * 运行时由 versionedPublicFileUrl 统一追加 ?v=<hash>，
 * index.html / src/fonts.css 在构建期直接改写，避免继续走短缓存。
 */
var fs_1 = require("fs");
var crypto_1 = require("crypto");
var path_1 = require("path");
var VERSION_PARAM = 'v';
var HASHED_PUBLIC_DIRS = ['fonts', 'logos', 'game-data'];
var EXCLUDED_PUBLIC_FILES = new Set([
    'game-data/summonerwars.layout.json',
]);
var PUBLIC_FILE_RE = /\/(?:fonts|logos|game-data)\/[^"'`\s)]+/g;
var normalizePath = function (value) { return value.replace(/\\/g, '/').replace(/^\/+/, ''); };
var shouldHashPublicFile = function (relativePath) {
    var normalized = normalizePath(relativePath);
    if (EXCLUDED_PUBLIC_FILES.has(normalized)) {
        return false;
    }
    return HASHED_PUBLIC_DIRS.some(function (dir) { return normalized === dir || normalized.startsWith("".concat(dir, "/")); });
};
var scanPublicFileHashes = function (publicDir) {
    var hashes = {};
    var walk = function (dirPath) {
        for (var _i = 0, _a = (0, fs_1.readdirSync)(dirPath, { withFileTypes: true }); _i < _a.length; _i++) {
            var entry = _a[_i];
            var fullPath = (0, path_1.join)(dirPath, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            var rel = normalizePath((0, path_1.relative)(publicDir, fullPath));
            if (!shouldHashPublicFile(rel)) {
                continue;
            }
            var content = (0, fs_1.readFileSync)(fullPath);
            hashes[rel] = (0, crypto_1.createHash)('md5').update(content).digest('hex').slice(0, 8);
        }
    };
    for (var _i = 0, HASHED_PUBLIC_DIRS_1 = HASHED_PUBLIC_DIRS; _i < HASHED_PUBLIC_DIRS_1.length; _i++) {
        var dir = HASHED_PUBLIC_DIRS_1[_i];
        var targetDir = (0, path_1.join)(publicDir, dir);
        if (!(0, fs_1.existsSync)(targetDir)) {
            continue;
        }
        walk(targetDir);
    }
    return hashes;
};
var appendVersionToPublicUrl = function (value, hashes) {
    var hashIndex = value.indexOf('#');
    var withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    var hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
    var queryIndex = withoutHash.indexOf('?');
    var path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
    var query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
    var normalized = normalizePath(path);
    if (!shouldHashPublicFile(normalized)) {
        return value;
    }
    var version = hashes[normalized];
    if (!version) {
        return value;
    }
    var params = new URLSearchParams(query);
    params.set(VERSION_PARAM, version);
    var nextQuery = params.toString();
    return nextQuery ? "".concat(path, "?").concat(nextQuery).concat(hash) : "".concat(path).concat(hash);
};
function publicFileHashPlugin() {
    var hashes = {};
    return {
        name: 'vite-public-file-hash',
        enforce: 'pre',
        config: function (_, _a) {
            var command = _a.command;
            if (command === 'build') {
                var publicDir = (0, path_1.join)(process.cwd(), 'public');
                hashes = scanPublicFileHashes(publicDir);
                return {
                    define: {
                        __PUBLIC_FILE_HASHES__: JSON.stringify(hashes),
                    },
                };
            }
            hashes = {};
            return {
                define: {
                    __PUBLIC_FILE_HASHES__: JSON.stringify({}),
                },
            };
        },
        transform: function (code, id) {
            if (!hashes || Object.keys(hashes).length === 0) {
                return null;
            }
            var cleanId = id.split('?')[0];
            var normalizedId = cleanId.replace(/\\/g, '/');
            if (!normalizedId.endsWith('/src/fonts.css') && !normalizedId.endsWith('src/fonts.css')) {
                return null;
            }
            return code.replace(PUBLIC_FILE_RE, function (matched) { return appendVersionToPublicUrl(matched, hashes); });
        },
        transformIndexHtml: function (html) {
            if (!hashes || Object.keys(hashes).length === 0) {
                return html;
            }
            return html.replace(PUBLIC_FILE_RE, function (matched) { return appendVersionToPublicUrl(matched, hashes); });
        },
        generateBundle: function (_, bundle) {
            if (!hashes || Object.keys(hashes).length === 0) {
                return;
            }
            for (var _i = 0, _a = Object.values(bundle); _i < _a.length; _i++) {
                var output = _a[_i];
                if (output.type !== 'asset' || !output.fileName.endsWith('.css')) {
                    continue;
                }
                var source = output.source;
                if (typeof source !== 'string') {
                    continue;
                }
                output.source = source.replace(PUBLIC_FILE_RE, function (matched) { return appendVersionToPublicUrl(matched, hashes); });
            }
        },
    };
}
