"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = assetHashPlugin;
/**
 * Vite 插件：为 public/assets/ 下的静态资源生成 content hash 映射
 *
 * 构建时扫描资源目录，注入全局常量 __ASSET_HASHES__。
 * 运行时资源 URL 统一追加 ?v=<hash>，实现“长缓存 + 内容变更自动失效”。
 *
 * 开发模式返回空映射，避免影响本地调试。
 */
var fs_1 = require("fs");
var path_1 = require("path");
var crypto_1 = require("crypto");
function scanAssetHashes(assetsDir) {
    var hashes = {};
    function walk(dir) {
        for (var _i = 0, _a = (0, fs_1.readdirSync)(dir, { withFileTypes: true }); _i < _a.length; _i++) {
            var entry = _a[_i];
            var fullPath = (0, path_1.join)(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            var rel = (0, path_1.relative)(assetsDir, fullPath).replace(/\\/g, '/');
            var content = (0, fs_1.readFileSync)(fullPath);
            var hash = (0, crypto_1.createHash)('md5').update(content).digest('hex').slice(0, 8);
            hashes[rel] = hash;
        }
    }
    walk(assetsDir);
    return hashes;
}
function assetHashPlugin() {
    return {
        name: 'vite-asset-hash',
        config: function (_, _a) {
            var command = _a.command;
            if (command === 'build') {
                var assetsDir = (0, path_1.join)(process.cwd(), 'public', 'assets');
                var hashes = scanAssetHashes(assetsDir);
                return {
                    define: {
                        __ASSET_HASHES__: JSON.stringify(hashes),
                    },
                };
            }
            return {
                define: {
                    __ASSET_HASHES__: JSON.stringify({}),
                },
            };
        },
    };
}
