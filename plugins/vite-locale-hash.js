"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = localeHashPlugin;
/**
 * Vite 插件：为 public/locales/ 下的 JSON 文件生成 content hash 映射
 *
 * 构建时扫描所有 locale JSON，计算短 hash，注入全局变量 __LOCALE_HASHES__。
 * i18n 加载时带上 ?v=<hash> 参数，内容不变则 hash 不变（CDN/浏览器继续缓存），
 * 内容变了 hash 自动变（缓存自动失效）。
 *
 * 开发模式下返回空映射（Vite dev server 不缓存）。
 */
var fs_1 = require("fs");
var path_1 = require("path");
var crypto_1 = require("crypto");
function scanLocaleHashes(localesDir) {
    var hashes = {};
    function walk(dir) {
        for (var _i = 0, _a = (0, fs_1.readdirSync)(dir, { withFileTypes: true }); _i < _a.length; _i++) {
            var entry = _a[_i];
            var fullPath = (0, path_1.join)(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.name.endsWith('.json')) {
                var rel = (0, path_1.relative)(localesDir, fullPath).replace(/\\/g, '/');
                var content = (0, fs_1.readFileSync)(fullPath);
                var hash = (0, crypto_1.createHash)('md5').update(content).digest('hex').slice(0, 8);
                hashes[rel] = hash;
            }
        }
    }
    walk(localesDir);
    return hashes;
}
function localeHashPlugin() {
    return {
        name: 'vite-locale-hash',
        config: function (_, _a) {
            var command = _a.command;
            if (command === 'build') {
                var localesDir = (0, path_1.join)(process.cwd(), 'public', 'locales');
                var hashes = scanLocaleHashes(localesDir);
                return {
                    define: {
                        __LOCALE_HASHES__: JSON.stringify(hashes),
                    },
                };
            }
            // 开发模式不需要 hash（Vite dev server 不缓存静态文件）
            return {
                define: {
                    __LOCALE_HASHES__: JSON.stringify({}),
                },
            };
        },
    };
}
