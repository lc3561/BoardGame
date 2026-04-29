/**
 * Vite 插件：为 public/assets/ 下的静态资源生成 content hash 映射，
 * 并注入语言化图片存在索引。
 *
 * - __ASSET_HASHES__: 构建时为资源 URL 追加 ?v=<hash>
 * - __LOCALIZED_IMAGE_INDEX__: 运行时在发图前就知道某语言是否存在该图
 *
 * 开发模式继续返回空的 __ASSET_HASHES__，避免干扰调试；
 * 但会注入 __LOCALIZED_IMAGE_INDEX__，用于本地候选决策。
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import type { Plugin } from 'vite';

const LOCALIZED_IMAGE_EXTENSIONS = new Set(['avif', 'webp', 'png', 'jpg', 'jpeg', 'gif', 'svg']);

function scanAssetHashes(assetsDir: string): Record<string, string> {
    const hashes: Record<string, string> = {};

    function walk(dir: string) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            const rel = relative(assetsDir, fullPath).replace(/\\/g, '/');
            const content = readFileSync(fullPath);
            const hash = createHash('md5').update(content).digest('hex').slice(0, 8);
            hashes[rel] = hash;
        }
    }

    walk(assetsDir);
    return hashes;
}

function scanLocalizedImageIndex(assetsDir: string): Record<string, 1> {
    const index: Record<string, 1> = {};

    function walk(dir: string) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            const rel = relative(assetsDir, fullPath).replace(/\\/g, '/');
            if (!rel.startsWith('i18n/')) {
                continue;
            }

            const ext = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1).toLowerCase() : '';
            if (!LOCALIZED_IMAGE_EXTENSIONS.has(ext)) {
                continue;
            }

            index[rel.slice(0, -(ext.length + 1))] = 1;
        }
    }

    walk(assetsDir);
    return index;
}

export default function assetHashPlugin(): Plugin {
    return {
        name: 'vite-asset-hash',
        config(_, { command }) {
            const assetsDir = join(process.cwd(), 'public', 'assets');
            const localizedImageIndex = scanLocalizedImageIndex(assetsDir);

            if (command === 'build') {
                const hashes = scanAssetHashes(assetsDir);
                return {
                    define: {
                        __ASSET_HASHES__: JSON.stringify(hashes),
                        __LOCALIZED_IMAGE_INDEX__: JSON.stringify(localizedImageIndex),
                    },
                };
            }

            return {
                define: {
                    __ASSET_HASHES__: JSON.stringify({}),
                    __LOCALIZED_IMAGE_INDEX__: JSON.stringify(localizedImageIndex),
                },
            };
        },
    };
}
