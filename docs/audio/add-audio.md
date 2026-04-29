# 新增音频资产全链路流程

> 本文覆盖“新增音频 → 压缩 → 生成 registry → 中文友好名 → 生成清单 → 预览验证 → 代码接入”的完整流程。
> **适用范围**：所有音效/音乐统一放在 `public/assets/common/audio/`。

---

## 0. 前置准备（必读）

1. **安装 ffmpeg**（用于压缩）：命令行需能直接执行 `ffmpeg`。
2. **只使用公共目录**：禁止在 `src/games/<gameId>/` 下放音频。
3. **只放“原始素材”**：源文件保留在原路径，压缩产物会写入同级 `compressed/` 目录。

---

## 1. 素材整理与目录结构

### 1.1 目录结构约定

```
public/assets/common/audio/
├── bgm/                         # 背景音乐（BGM）
│   └── <合集/曲目>.wav
├── ui/                          # UI 类音效（示例）
│   └── <子分类>/<文件>.wav
├── card/                        # 卡牌类音效（示例）
│   └── <子分类>/<文件>.wav
└── ...                          # 其他类别（自定义）
```

- **BGM 必须在 `bgm/` 根目录下**，其余均视为音效（sfx）。
- **目录层级即语义**：后续会被转换成 `registry key`，请保持可读、稳定、语义清晰。

### 1.2 命名规则（强制）

- **推荐**：全英文 + 数字 + 下划线（如 `menu_click_01.wav`）
- **避免**：空格、中文、特殊符号（虽然会被归一化，但可读性变差）
- **变体命名**：同类音效用 `_01/_02/_03` 扩展，便于后续替换

### 1.3 registry key 的生成规则（非常重要）

生成脚本：`scripts/audio/generate_common_audio_registry.js`

**核心规则**：路径 → key
- 去除扩展名
- 全部小写
- 非字母数字字符转为 `_`
- 多段目录用 `.` 拼接
- `bgm/` 目录统一归类为 `bgm` 组
- 其他目录以**第一级目录**作为 `group`
- `cards` 会自动归一为 `card`

**示例**：
```
public/assets/common/audio/ui/general/Menu Click.wav
=> key: ui.general.menu_click

public/assets/common/audio/bgm/Fantasy Vol7.flac
=> key: bgm.fantasy_vol7
```

> **注意**：只要 key 冲突就会报错，除非“压缩版本/原始版本”的冲突会自动优先保留压缩版。

---

## 2. 压缩与格式转换（强制）

使用脚本：`scripts/audio/compress_audio.js`

```bash
# 压缩整个目录（会在每个目录生成 compressed/）
npm run compress:audio -- public/assets/common/audio

# 清理旧压缩后再压缩（等价于 AUDIO_CLEAN=1）
AUDIO_CLEAN=1 npm run compress:audio -- public/assets/common/audio

# 调整 ogg 码率（默认 96k）
AUDIO_OGG_BITRATE=96k npm run compress:audio -- public/assets/common/audio

# 指定 ffmpeg 路径（支持相对路径或完整路径）
FFMPEG_PATH=tools/ffmpeg/bin/ffmpeg.exe npm run compress:audio -- public/assets/common/audio
```

**脚本行为说明**：
- 输入格式支持：`.wav/.aiff/.aif/.flac/.m4a`
- 输出格式：`compressed/*.ogg`（编码器：`libopus`）
- 仅跳过 `compressed/` 目录，其他目录会递归扫描

> **强制要求**：无论新增多少文件，都必须运行压缩脚本。

---

## 3. 生成 registry.json（强制）

使用脚本：`scripts/audio/generate_common_audio_registry.js`

```bash
node scripts/audio/generate_common_audio_registry.js
```

可选参数：
```bash
node scripts/audio/generate_common_audio_registry.js \
  --source public/assets/common/audio \
  --output public/assets/common/audio/registry.json
```

**生成规则**：
- 同一个 key 出现“原始 + compressed”时，**自动保留压缩版**
- 若出现两个同级冲突（如两个不同原始文件生成同 key），会直接报错

产出：`public/assets/common/audio/registry.json`

---

## 4. 更新中文友好名（强制）

### 4.1 翻译文件位置

`public/assets/common/audio/phrase-mappings.zh-CN.json`

结构示例：
```json
{
  "version": 8,
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "phrases": {
    "Fantasy Vol7": "幻想·第七章",
    "Menu Click": "菜单点击"
  }
}
```

> **注意**：这里的 key 是“英文短语”而非完整 registry key，系统会把 key 中的“词干”映射为中文并保留尾部变体（如 `_01`）。

### 4.2 合并翻译（推荐流程）

1. 新建翻译批次文件（示例）：
```json
{
  "translations": {
    "Menu Click": "菜单点击",
    "Fantasy Vol7": "幻想·第七章"
  }
}
```

2. 合并到主文件：
```bash
node scripts/audio/merge_audio_translations.js .tmp/translation_batch_xxx.json
```

**脚本行为**：
- 自动更新 `version` 与 `generatedAt`
- 支持 `translations` 或 `phrases` 字段

### 4.3 校验翻译覆盖

- 打开 `/dev/audio`，若展示名称仍为英文，说明翻译缺失
- 必要时补齐 `phrases` 后重新刷新

---

## 5. 生成音频资源清单（强制）

生成 markdown 清单：
```bash
node scripts/audio/generate_audio_assets_md.js
```

产出：`docs/audio/common-audio-assets.md`

> 清单用于人工检索与审核，必须与 registry 同步更新。

---

## 6. 语义目录（推荐）

生成语义目录（AI/人工检索首选）：
```bash
node scripts/audio/generate_audio_catalog.js
```

产出：`docs/audio/audio-catalog.md`

---

## 7. 浏览器验证（强制）

入口：`/dev/audio`

验证点：
- 新增音效是否出现
- 分类/子分类是否正确
- 中文友好名是否命中
- 点击播放是否正常

> 若缺失，优先检查：是否压缩、是否生成 registry、是否补翻译。

---

## 8. 代码接入（强制）

**原则**：只使用 `registry.json` 中的 key，禁止手写路径与 `compressed/`。

示例：
```ts
// feedbackResolver 直接返回 registry key（SoundKey 类型）
feedbackResolver: (event): SoundKey | null => {
  if (event.type === 'DICE_ROLLED') return 'dice.decks_and_cards_sound_fx_pack.dice_roll_velvet_002';
  // 有动画的事件返回 null，音效由动画层 onImpact 播放
  if (event.type === 'DAMAGE_DEALT') return null;
  return null;
}

// 飞行动画 onImpact 回调中直接播放
playSound('combat.impact.hit_heavy_001');
```

> `getOptimizedAudioUrl()` 会自动优先使用压缩音频路径，无需自行处理。
> **已废弃**：`DeferredSoundMap`、`AudioTiming`、`EventSoundResult` 已移除，`feedbackResolver` 不再返回 `{ key, timing }` 对象。

### 8.1 预加载策略（新增）
- **criticalSounds**：进入游戏后立即预加载（适合首回合高频音效）。
- **contextualPreloadKeys**：基于上下文增量预热（如选派系/卡组后加载对应音效）。
- **UI 层预热**：按钮/教程步骤等可在显示前手动调用 `AudioManager.preloadKeys()`。

示例：
```ts
// 游戏配置：上下文预加载
contextualPreloadKeys: (context) => {
  return context.G?.selectedFactions ? ['ui.general.menu_click_01'] : [];
}

// UI 层：进入教程后预热按钮音效
AudioManager.preloadKeys(['ui.general.menu_click_01']);
```

---

## 9. 全链路检查清单（提交前必过）

- [ ] 原始音频已放入 `public/assets/common/audio/`
- [ ] 已运行 `npm run compress:audio -- public/assets/common/audio`
- [ ] 已生成 `public/assets/common/audio/registry.json`
- [ ] 已更新 `phrase-mappings.zh-CN.json`
- [ ] 已生成 `docs/audio/common-audio-assets.md`
- [ ] 已生成 `docs/audio/audio-catalog.md`
- [ ] `/dev/audio` 可预览且显示中文
- [ ] 代码中不出现 `compressed/`

---

## 10. 常见问题

### 10.1 出现重复 key 报错
- 检查目录/文件名是否会归一为同一个 key
- 保证同一个 key 只对应一条“语义明确”的音效

### 10.2 registry 没更新
- 是否忘记执行 `generate_common_audio_registry.js`
- 是否指向了错误的 `--source` 路径

### 10.3 中文名不生效
- 是否遗漏 `phrase-mappings.zh-CN.json`
- 是否没有刷新 `/dev/audio`
- 是否在翻译中使用了错误的“英文词干”
