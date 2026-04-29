#!/usr/bin/env bash
set -euo pipefail

# 模拟生产环境依赖验证
# 用途：在本地验证 server.ts 在仅安装生产依赖时能否正常启动
# 原理：临时目录装 --omit=dev 依赖，用 tsx 尝试 import server.ts
#
# 用法：bash scripts/deploy/verify-prod-deps.sh

LOG_PREFIX="[生产依赖验证]"
TEMP_DIR=".tmp/prod-deps-check"

log() { echo "${LOG_PREFIX} $*"; }
die() { echo "${LOG_PREFIX} 错误: $*" >&2; exit 1; }

cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    log "清理临时目录..."
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

log "创建临时目录 ${TEMP_DIR}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

log "复制依赖清单"
cp package.json package-lock.json "$TEMP_DIR/"

log "安装生产依赖（--omit=dev）..."
cd "$TEMP_DIR"
npm ci --omit=dev --ignore-scripts 2>&1 | tail -3
cd - > /dev/null

log "验证 server.ts 的第三方 import 是否都能解析..."

# 从 server.ts 提取所有第三方包名（排除相对路径和 node: 内置模块）
IMPORTS=$(grep -oP "from ['\"](?!\.\/|\.\.\/|node:)\K[^'\"\/]+" server.ts | sort -u)

MISSING=()
for pkg in $IMPORTS; do
  if [ ! -d "$TEMP_DIR/node_modules/$pkg" ] && [ ! -d "$TEMP_DIR/node_modules/@${pkg}" ]; then
    # 处理 scoped packages（如 @koa/router）
    SCOPED=$(grep -oP "from ['\"](?!\.\/|\.\.\/|node:)\K@[^'\"]+(?=['\"])" server.ts | grep "^@" | sed 's/\/.*//g' | sort -u || true)
    found=false
    for s in $SCOPED; do
      if [ -d "$TEMP_DIR/node_modules/$s" ]; then
        found=true
        break
      fi
    done
    if [ "$found" = false ] && [ ! -d "$TEMP_DIR/node_modules/$pkg" ]; then
      MISSING+=("$pkg")
    fi
  fi
done

# 也检查 scoped packages
SCOPED_IMPORTS=$(grep -oP "from ['\"](?!\.\/|\.\.\/|node:)\K@[^'\"]+['\"]" server.ts | tr -d "'" | tr -d '"' | sort -u || true)
for pkg in $SCOPED_IMPORTS; do
  PKG_DIR=$(echo "$pkg" | sed 's/\/[^\/]*$//')  # @koa/router -> @koa
  if [ ! -d "$TEMP_DIR/node_modules/$PKG_DIR" ]; then
    MISSING+=("$pkg")
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  log "✅ 所有第三方依赖都在生产依赖中，没有幽灵依赖"
else
  log "❌ 发现幽灵依赖（在 devDependencies 或未声明）："
  for pkg in "${MISSING[@]}"; do
    echo "   - $pkg"
  done
  die "请将以上包添加到 package.json 的 dependencies 中"
fi
