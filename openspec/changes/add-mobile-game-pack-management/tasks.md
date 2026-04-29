## 1. Spec
- [x] 1.1 新增 `mobile-game-pack-management` capability，定义 runtime、模块包、素材包、发布清单与兼容检查要求
- [x] 1.2 修改 `android-app-shell`，明确 `embedded` 模式支持“基础壳 + runtime + 按游戏分包”的装载架构
- [x] 1.3 修改 `game-registry`，要求移动端包交付元数据显式暴露到注册表
- [x] 1.4 修改 `game-details-content`，定义移动端详情页左下角安装/更新操作区与状态语义

## 2. Runtime & Packaging
- [ ] 2.1 设计运行时发布清单格式与生成流程
- [ ] 2.2 设计本地包目录布局、校验记录与激活版本切换机制
- [ ] 2.3 设计运行时加载器如何在进入游戏前解析并挂载指定 `module pack`
- [ ] 2.4 设计素材包解析与 `AssetLoader` 的本地包优先策略

## 3. UI & UX
- [ ] 3.1 定义移动端详情页左下角安装/更新区的视觉层级、状态和文案
- [ ] 3.2 明确下载中、校验失败、版本不兼容、可更新、已安装等状态机
- [x] 3.2.1 修复安装成功后安装确认弹窗残留并回退到“确认下载”的状态收口问题
- [ ] 3.3 明确该区域不应挤压现有详情页正文布局，采用 overlay 贴边策略

## 4. Validation
- [x] 4.1 运行 `openspec validate add-mobile-game-pack-management --strict --no-interactive`
