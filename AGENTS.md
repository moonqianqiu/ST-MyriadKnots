# 千千结 · Moon 定制版 — 项目记忆（供维护与 CLI 参考）

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（作者 moon 定制版）。`main` 分支跟踪上游最新基线，并叠加“moon”专属改动。`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。

> **用途**：供后续会话/开发者在执行“合并上游”、“升级维护”、“排查改动”时，迅速掌握本 fork 的核心定制、版本惯例、冲突裁决规则与架构设计决策，确保合并上游时不丢弃本地核心资产。

---

## 1. 仓库定位与版本构建惯例

1. **版本声明 (`manifest.json`)**：跟随上游官方发布版本号。
2. **生产单文件 (`dist/qqj-app.js`)**：由 `npm run build`（Vite + Rolldown）编译生成；源码任何变动后**必须重新构建 bundle**，否则入口加载测试会失败。
3. **缓存键规则 (`manifest.json` 的 `js` 字段)**：格式强制 `dist/qqj-app.js?v=YYYYMMDD.<全局递增序号>-<bundle SHA-256 前16位>`；`tests/production-entry-load.test.mjs` 严格校验该哈希与实际 bundle 文件摘要一致。**序号在全库历史内全局递增（同一天多次重建也不得复用已用过的序号）；哈希必须取自真实重建产物的 SHA-256 前 16 位（小写），禁止手写或沿用上一次的值**——2026-09-30 曾出现文档记录 `…41-80132f68…` 而实际产物为 `…41-e50ecda8…` 的漂移，即因重建后未同步序号与哈希。
4. **合并流程**：先建备份分支 `git branch backup/main-before-upstream-vX.Y.Z main`，再在 `main` 上执行 `git merge --no-ff upstream/main`；本地合并验证完整前不向远程 force push。

---

## 2. 合并冲突热区与解决规则（合并上游必查）

每次合并上游通常仅在以下文件产生常规版本与产物冲突，业务代码绝大部分可 Git 3-way 自动平滑合并：

| 文件路径 | 冲突性质 | 解决裁决方式 |
| :--- | :--- | :--- |
| `manifest.json` | 版本号行与构建指纹行冲突 | 采纳上游发布版本号；构建完成后填入最新缓存键 |
| `dist/qqj-app.js` | 编译混淆产物冲突 | 冲突产生后直接 `npm run build` 覆盖重建即可消除 |
| `tests/production-entry-load.test.mjs` | 冒烟版本断言与上游新增 mock 冲突 | 采纳上游修改（版本断言对齐上游最新版本） |
| `tests/v3-wiring.test.mjs` | 架构装配接口导出与版本断言冲突 | 采纳上游修改；**v0.6.6 起版本断言已由上游泛化为正则 `assert.match(manifest.version, /^\d+\.\d+\.\d+$/u)`，本文件不再随版本号产生常规冲突**（v0.6.3 时代曾因上游漏改精确断言 `'0.6.2'` 而需代改，该失效模式已根除） |
| `tests/v3-cse.test.mjs` | 上游 `runtimeHarness` 宿主参数与本地 `sanitizerOptions` 参数冲突 | **取并集**：本地默认值与上游 Persona 参数互不相干，两者都必须在场 |
| `src/memory-content-sanitizer.js` | 上游 v0.5.8 起重写为「默认 keep='content'」简化实现，与本地四模式合同相撞 | **双层保留**：本地 M0-M3 渲染器、`sanitizeMemoryContent`（不注入默认 keepTags）、`extraOnlySanitizerOptions` 逐字保留；上游 `stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`HTML_VOID_TAGS`/元数据解析器整段移植（仅将上游同名 `parseSanitizerTree` 更名 `parseTagTokenTree` 避免撞名，上游 2 空格缩进原样保留使该区域未来合并零冲突） |
| `src/v3/people-workspace.js` + `src/ui/people-profiles-view.js` | 上游增删人物工作区功能时与本地叠加层相撞 | **随功能走 + 本地注入保留**：被上游删除的功能代码连同其专属保护点一并放弃；视图工厂签名保留本地 `recallRuntime = null` 参数并采纳上游瘦身后的 runtime 校验列表；people-profiles-view 保留 `saveProfile → invalidate('peopleProfileSaved',{clearPersisted:true})` 联动。**v0.6.0 实录（2026-09-30 定案）**：上游改世界书原文直通并删 `sanitizerOptions` 参数，本地曾回植 extraOnly，后按「世界书少含自定义噪音标签、直通系上游设计意图」裁决**整文件回归上游逐字相同**（源码/工厂签名/import/测试，含其直通断言），该文件未来合并零冲突——勿再回植 extraOnly（详见 §3.2 已回归清单） |
| `src/v3/foundation-domain.js` | 本地 `SANITIZER_VERSION` 已升 `memory-content-sanitizer-v2` 且 `sanitizerFingerprint` 默认 keepTags 为 `''`（M0），上游停留 v1+`'content'`——同一宿主聊天在两侧派生出**不同的确定性图 ID**（floor/run/checkpoint/index 全链） | **保留本地合同**；上游 fixture 类测试（`tests/fixtures/tt2-native-init-failure.json`，编码上游预计算 ID）须在本地语义下重生成：干净初始化后按 `fstore.recordKey(record)` 捕获 run/checkpoint/floor/index（索引键含 `floorOrder-0-` 段，勿手拼 `v3-index-<id>`），run 回卷为 `retryableError`+`V3_GRAPH_INDEX_ROUTE_INVALID` 定格、无 root；否则上游"重试幂等/篡改零容忍"两测试或挂 ID 断言、或因键不相交而绕过篡改检测 |

> **业务文件自动合并注意**：`src/settings.js`（本地 `sourceKeepTags: ''` 与上游存储自动清理字段不同区域）、`src/v3/cse-engine.js` 与 `src/v3/memory-runtime.js`（本地 `extraOnlySanitizerOptions` 拦截与上游新提示词/千事调度正交）均可三方自动合入。

> **本地已修改的上游产权文件（未来合并的潜在冲突热区；上游重写对应链路时，须以本地增强为产权逐项回植并重跑对应测试全绿）**：
> - `src/v3/recall-runtime.js`：本地叠加三处增强——见证截断 / 密封点版本重对齐 / `invalidate` 支持 `clearPersisted`（详见 3.4）→ `tests/v3-recall.test.mjs`（与上游逐字相同，本地断言一律加在 `tests/recall-local-guards.test.mjs`）。**v0.6.x 实录**：上游将 `captureCoreBodyWitness` 导出并加第 4 位参数 `maximumFloors`（经 `normalizeAutoHideKeepAiCount` 归一化，其测试按位置传参调用）——并集签名为 `(coreChat, sanitizerOptions, fingerprint, maximumFloors = 3, userMessage = null)`，内部调用点传 `(…, recentBodyFloorLimit(), user?.message)`；循环保留本地 triggerIndex 向前截断、上限改用上游归一化值；**v0.6.3 实录（2026-10-01）**：上游新增千事删除撤回——`qianshiDeletionProvider` 注入、`withoutDeletedQianshi` 冻结回执临时撤回（不重跑模型、不重签 `receiptFingerprint`；冻结复用路径本就不校验指纹，已查证自洽）、`qianshiDeletionWitness` 可选签名扩展（witness 赋值在密封**前**，新 wrapper `receiptMaterial` 会把 witness 纳入签名；旧回执签名不变；本地密封点重对齐调用 `receiptMaterial` 时 witness 尚未定义，行为不变）。`invalidate` 与本地 `clearPersisted` 增强为唯一真冲突，已并集：上游 `reason !== 'qianshiManuallyDeleted'` 才清 `sessionReceipt` + 本地 `clearPersisted`/`saveChat` 清除块并存，语义正交；**v0.6.6 实录（2026-10-03）**：上游新增召回请求计时诊断——`createRecallRequestDiagnostic` 模块接线（`requestDiagnostic.start()/clear()/snapshot()`、`operation.requestDiagnosticId`、冻结复用与密封两处 `timings.commitMs`），与本地三增强完全正交；`invalidate` 签名再冲突，并集为 `(reason = 'invalidated', { clearPersisted = false } = {})` 且函数体首行加 `requestDiagnostic.clear()`；**v0.6.8 实录（2026-10-05）**：① `invalidate` 三参并集 `(reason = 'invalidated', sourceEvent = 'runtimeInvalidate', { clearPersisted = false } = {})`——上游 sourceEvent 字符串方言（4 个内部调用点）与本地 clearPersisted 方言正交；三处 UI 调用点与 `recall-local-guards` 守卫 3 断言同步改为事件名方言，漏改则 `{ clearPersisted }` 落入 `sourceEvent`、清理**静默失效**；② **密封点重对齐条件重写**——上游以 `basePreparedSource(…, { fresh: true, sourceToVerify: source })` 无条件 fresh 重读 + 对象同一性判定**原生取代本地 sameRoot 条件重读块**（rootResult 校验/sourceReader 兜底均被 basePreparedSource 内化），本地重对齐块条件从 `!sameRoot` 改写为等价 `currentSource !== source`（该分支内上游已重附新鲜 bodyMatch，语义对齐）。**教训**：合并时定义与使用分处两个被上游重写的区域——使用块自动幸存、定义块被吞，运行时 `ReferenceError: sameRoot` 致 v3-recall 108 例 error；用「合并树 vs 纯上游 diff」仅 3 处差异快速定位；
> - `src/v3/floor-binding.js`：`matchFloorCandidates` 可选第三参 `{ equivalentContent }` 与新增绑定种类 `'locatorEquivalent'`——为弥合「本地 M0 保留已配置故事时钟引用标签于 canonical 正文」与「上游保证编辑时间标签不得撤销已落盘覆盖（依赖 canonical 剥离标签）」的语义冲突而加；经私有助手 `withoutStoryClockReferenceTags` 剥离仅已配置的引用标签后比较，仅供 `src/v3/time-body.js` 的 `readTimeBody` 传入，其余调用点行为不变；
> - `src/v3/time-body.js`：`currentBodyClock` 加法式内容视图兜底——canonical 探测返回 null（非 ambiguous）时以 `sanitizeMemoryContent(rawContent, { keepTags: 'content' })` 再探一次，弥合上游时间测试对「effective canonical 已剥出 content」的依赖；用户已显式配置 keepTags 时行为不变 → `tests/v3-time-body.test.mjs`。**v0.6.6 实录（2026-10-03）**：上游故事历法（v0.6.4 `calendar` 贯穿 `resolveStoryClock`/`projectTime`）与本地兜底正交，`readTimeBody` 签名冲突并集为 `{ sanitizerOptions = {}, storyClockReferenceTags = '', calendar = null }`，本地 `withoutStoryClockReferenceTags` 函数体与上游 `calendar` 用法在函数体内自动共存；
> - `src/ui/v3-foundation-view.js`（单楼编辑 / 完全重构的 `invalidate` 联动点）、`src/ui/people-profiles-view.js`（`saveProfile` 联动点）、`src/bootstrap.js`（`recallRuntime` 注入）——上游若重排这几处 UI 装配代码，须保住三处 `invalidate` 联动调用；
> - `src/ui/help-guide.js`（**v0.6.6 新增热区**）：本地仅改设置章节的「保留包裹符」说明段（P5 通用包裹符 `[[...]]、{{...}}` 双栏语义描述），上游高频重写本文件文案（v0.6.4 历法三段、v0.6.5 文案澄清），同段相邻必然冲突——裁决：**上游新增段落全收 + 包裹符段保持本地**（上游侧该段仍是旧的 `[[...]]` 专用描述，勿取上游侧）。

---

## 3. 必须保住的本地核心定制资产（Fork 存在的价值，合并时逐项复核）

以下 4 大定制模块为本地产权核心，**严禁被上游旧代码覆盖或对齐掉**：

### 3.1 四模式标签清洗器（与 ST-SevenDaysCal 逐字节一致）
- **核心文件**：`src/memory-content-sanitizer.js`（树形单遍解析，`sanitizeMemoryContent` 接口）；`src/tag-sanitizer.golden.json`（40 组锁定金样，LF 行尾）；`tests/tag-sanitizer-golden.test.mjs` 与 `tests/memory-content-sanitizer.test.mjs`。
- **核心合同**：
  - **M0（两栏皆空）**：直通不清洗，保留正文，仅做注释/孤立标记清理；
  - **M1（仅 extra）**：成对删除 extra 标签及内容，未闭合 extra 吞至同名闭合或文末（噪音不泄漏）；
  - **M2（仅 keep）**：剥壳保留 keep 块内容（内部不再二次清洗，嵌套标签原样保留），块外裸文本丢弃；
  - **M3（混合）**：extra 恒优先，无论在外层、包裹 keep 还是嵌套在 keep 子树内一律整块剔除；
  - **三分支 token 正则**：`TAG_ATTR_SOURCE`（引号感知，属性内 `>` 不截断）+ `TAG_ATTR_FALLBACK_SOURCE`（未闭合引号宽松兜底回退旧行为，防止思维链泄漏）+ 每条配置的字面量包裹规则各一分支（由 `freshTokenRx(wrapperRules)` 动态生成）；
  - **自闭合标记**：keep 子树内自闭合 extra 标记连标记删除，非 extra 原样保留 openRaw。
- **通用字面量包裹规则（P5 已于 2026-09-30 按方案 B 恢复）**：两栏都接受任意「起始...结束」（`LITERAL_WRAPPER_SEPARATOR = '...'`，如 `{{...}}`、`<<...>>`），`...` 前=开定界符、后=闭定界符；keep 栏=剥壳取内层，extra 栏=连同定界符整块删除，`[[...]]` 只是其特例。解析由 `collectWrapperRules(keep, extra)` 收集两栏并集（去重、按开定界符长度降序防短前缀抢占）后生成 `kind:'wrapper'` 节点，`renderFlat`/`renderKeptInner` 用节点自带 `openRaw`/`closeRaw` 重建 —— **不再有硬编码 `\[\[…\]\]`，也取消了上游式前置删除与 keep 栏 `TAG_NAME_PATTERN` 过滤**。归一化侧 `normalizeTagRules` 对包裹规则原样保留（大小写敏感）、对标签名照旧小写；非法形态（开/闭定界符为空、`...` 出现两次）按 `literalWrapperRule` 三条件丢弃。
- **与上游包装符语义的唯一分歧**：嵌套包装符（如 `{{a{{b}}c}}`）本 fork 按树机整块处理（与本地 `[[...]]` 既有树机语义一致），上游 `dropLiteralWrappedContent` 为扁平 indexOf 扫描；40 例金样不含嵌套包装符，故不冲突。
- **测试侧不得回退**：`tests/memory-content-sanitizer.test.mjs` 中上游两条依赖「默认 keepTags='content'」语义的断言，已按本地 M0 合同改写为直通正断言（两输入逐字节保留），未来合并不得采用上游语义覆盖。
- **v0.5.8+ 双层文件结构**：文件前半部为本地四模式合同，后半部为上游移植段（`stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`parseTagTokenTree`，服务 v3 时间链路，`<br>` 按 void-tag 处理、节点携带偏移元数据；移植段内归一化引用改走本地 `normalizeTagRules`，简单标签名下与上游归一化等价），与四模式合同正交。上游后续若改这些导出，直接对齐上游该段即可。

### 3.2 非 AI 正文来源 extra-only 隔离清洗（防止世界书/用户输入被洗空）
- **核心辅助函数**：`export function extraOnlySanitizerOptions(options = {}) => { keepTags: '', extraTags: options?.extraTags ?? '' }`
- **保护场景与调用点（仅剩 3 处，均为上游活洗空点）**：`src/v3/cse-engine.js` L133（`captureCseBaseline` 遍历世界书条目，上游 M2 提取致无 `<content>` 标签条目洗空、L134 静默跳过）；`src/cse-source-selection.js` 扫描窗 rows 分路（上游 L98 把用户楼也用 keep 提取 → 用户输入洗空；本地 assistant 行保 keep 提取+合并 `qqj-cse`，用户行/canonical 行走 plainText extraOnly）；`src/v3/memory-runtime.js`（`capturePrecedingUserInputFromSnapshot` 用户输入快照，上游 L134 同款洗空）。
- **已回归上游直通的点（2026-09-30 裁决，勿再回植）**：`src/v3/people-workspace.js` 人物整理世界书（上游 v0.6.0 原文直通，防洗空价值归零，源码/工厂签名/import/测试已逐字回归上游）；`src/cse-source-selection.js` 动态世界书（上游本为 `clean+宏替换` 直通，extraOnly 仅剩卫生价值已撤）。上游直通策略与「世界书条目少含自定义噪音标签」的实践相符。
- **设计依据**：`keepTags`（如 `'content'`）是 AI 正文专属提取白名单；普通用户输入或未加自定义标签的世界书条目若流经 `keepTags` 会被直接清空为 0 字。非正文来源必须强制走 extra-only 清洗。

### 3.3 提示词与标签设置 UI 校验 (`src/ui/settings/prompts-settings.js`)
- **默认值配置**：`src/settings.js` 中 `sourceKeepTags: ''`（默认留空直通）。
- **存量迁移 (`migrateSanitizerKeepTags`，2026-09-30 新增)**：上游 v0.5.8+ 默认 `sourceKeepTags: 'content'` 会被 `get()` 的默认回写持久化进老存档，而本地严格 M2 下该值会把**无 `<content>` 标签的 AI 正文整楼清空**（`src/v3/foundation-domain.js:123-124` 的 `if (!canonicalContent) continue;` 静默跳楼）。故 `src/settings.js` 加版本化迁移：`sanitizerKeepTagsMigrationVersion` 由 0 升 1 时，仅当持久值为纯 `'content'`（trim + 小写后完全相等）才重置为 `''`；`'content,summary'` 等用户手改值原样保留；迁移后再手填 `content` 永不被覆盖；全新存档直接置位。`index.js` 在 `settings.migrateLegacyApiSettings()` 之后以**可选链**调用（`settings.migrateSanitizerKeepTags?.()`，宿主/测试桩缺该方法时跳过而不中断加载）。断言见 `tests/settings-api.test.mjs` 末尾两条用例。
- **保存拦截器 (`bindTagFieldWithClashCheck`)**：保留/清洗两栏失焦保存时自动做归一化交集计算（标签名与字面量包裹规则一并参与，含 `[[...]]`、`{{...}}`）；检测到同名标签冲突即**拒绝落存**，输入框回退 `settings.get()[key] ?? ''`（= 该栏最近一次成功保存值；**不得**再用视图创建时快照——本面板只在 `src/ui/panel.js` 初始化时创建一次，二次冲突会回退成陈旧值），并显示 `settings-result error` 行内红色警告，从源头阻止非法配置存盘。守卫见 `tests/settings-modules.test.mjs`「包裹符冲突回退取最近一次成功保存值，而非视图创建时的陈旧快照」。

### 3.4 召回回执重新生成（Regenerate）秒级复用机制与架构定性
- **核心文件**：`src/v3/recall-runtime.js`（修复主体）；`src/ui/v3-foundation-view.js`（单楼记忆编辑/完全重构联动）；`src/ui/people-profiles-view.js`（人物资料保存联动）；`src/bootstrap.js`（`recallRuntime` 注入通道）。
- **双重致错源头**（稳定复现：删当前用户楼 → 重新发送 → 重新生成，即便摘要早已归档落盘也 100% 必现）：① **并发盖错公章**——选材 LLM 耗时窗口内，重新发送触发的底层地基扫描（`foundationRuntime.scan()` → `commitRoot()`）推进全局 Root，原代码开收据仍盖选材开始时的旧公章，收据存盘即过期；② **见证指纹漂移**——原 `captureCoreBodyWitness` 从数组末尾逆向采集，重新生成时尾部短暂残留刚撤下的 AI 楼层，指纹分歧击穿回执。
- **本地修复三件套（治本，不可被上游旧代码覆盖）**：① **见证向前截断**——`captureCoreBodyWitness` 以传入触发用户楼 `userMessage` 严格向前逆向采集，同时保护全新生成与 `commitPromptIfCurrent` 的 `captureCoveredBodyGuards` 终检；② **密封点活版本重对齐**——`commitPromptIfCurrent` 持久化前重读活档案头，将收据 Checkpoint/Revision/签名重对齐为最新版本，落盘收据天然自洽；③ **三端联动主动失效**——`invalidate({ clearPersisted: true })` 清除最新用户楼持久化收据并 `saveChat()` 落盘（防 F5 后旧收据复活），联动 `manualMemoryEdit` / `foundationFullRebuild` / `peopleProfileSaved` 三个入口。
- **与上游 `root: 0` 极速通道共存**：上游 0.4.0~0.4.3 的 `commitFrozenReceiptIfCurrent` 在复用阶段有意不比对 `headCheckpointId`/`rootRevision`（测试锁定复用零 I/O），代价是面板手动改记忆无法被灵敏感知。本地修复零性能开销：日常重新生成照走毫秒级极速通道，仅人工修改记忆时精确清缓存重选材。
- **本地守卫测试（上游无此文件，2026-09-30 新增）**：`tests/recall-local-guards.test.mjs` 集中回归本地补丁——见证向前截断（第 5 参 `userMessage` 与 4 参旧行为对照）、`matchFloorCandidates` 的 `{ equivalentContent }` 探针与 `'locatorEquivalent'` 绑定、`extraOnlySanitizerOptions` 合同、`invalidate` 默认不删持久收据而 `clearPersisted: true` 才删并 `saveChat`、时间参考标签探针。因 `tests/v3-recall.test.mjs` 按 §2 与上游逐字相同（不得追加本地断言），本地补丁的守卫一律写在该文件；上游重写对应链路后先跑它。

---

## 4. 验证清单与验收标准

执行合并、升级或改动后，必须依序通过以下 4 项硬性门禁：

1. **清洗器金样与单元测试**：
   ```bash
   node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs
   ```
   *标准*：25/25 全部全绿（40 例金样逐字节一致；19 条清洗器合同断言 + 6 条金样/对拍断言）。
2. **生产构建与入口装配测试**：
   ```bash
   node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs
   ```
   *标准*：10/10 全部通过（`tests/production-entry-load.test.mjs` 9 + `tests/v3-wiring.test.mjs` 1；前者验证 manifest 缓存键与 bundle SHA-256 绝对吻合）。
3. **全量测试套件**：`npm test` —— 全量用例全绿（本地当前基线 **1427** = 上游 v0.6.6 纯树 1403（推算：1427 − 本地 24，未单测纯上游树；v0.6.4~v0.6.6 未再发现上游发版疏漏红测试）+ 本地新增（召回守卫 5 + 金样测试 6 + 清洗器合同 7 + cse 分路 1 等）；实测约 61s，0 失败）。**注意本机沙箱下须加 `--test-isolation=none`**（默认管道 stdio 会报 `Error: spawn EPERM`，属环境边界而非回归）：`node --experimental-vm-modules --test --test-isolation=none --test-concurrency=1 tests/*.test.mjs`。
   > **已知上游负载敏感时序偶发（勿误判为本地回归！）**：`tests/v3-extractor-memory.test.mjs:5242`「切聊天及正文结构事件会撤销提前武装」在空闲快速机器上可能于 10ms 断言窗口内漏入后台自动化任务而失败（报 `MESSAGE_DELETED 后不得触发旧楼任务 1 !== 0`），重跑可通过；已在纯 `upstream/main` worktree 复现同样失败。见此失败先跑纯上游对照，切勿据此回滚本地资产。
   > **v0.6.1 新增 Windows 偶发**：`tests/tauri-backend.test.mjs` 各测试在并行满载下可能于 `t.after` 清理临时目录时报 `ENOTEMPTY: directory not empty, rmdir`（每轮全量挂的用例不同），单跑该文件或重跑全量即过；已在纯 `upstream/main` 树 3 轮复现同款失败（23/24），确系环境竞态而非回归。
4. **与 ST-SevenDaysCal 跨仓终验对拍**：运行 40 例金样跨仓比对脚本，验证与 `ST-SevenDaysCal/runtime/tag-sanitizer.js` 输出 **0 差异、100% 逐字节一致**。

---

## 5. 当前仓库状态底数（基线备忘）

- **工作分支**：`main`；**上游基线**：已合入 `upstream/main`（Tag `v0.6.11`，提交 `797e2ab`；v0.6.9 召回实证选择与千事恢复 + v0.6.10 语义召回支持手动摘要 + v0.6.11 原始向量索引维护/摘要重试，新文件 `src/v3/vector-auto-update.js`）；合并前备份分支 `backup/main-before-upstream-v0.6.11`；
- **产物版本**：`manifest.json` 版本号 `0.6.11`（含 `author: "atonal519"` 字段），缓存键 `20261006.15-4375cf376a092ffd`（v0.6.11 合并后 2026-10-06 重建，序号 >14 避开上游同日已用的 `.14`；注意 bundle 内嵌版本常量来自构建时的 manifest.json——**须先把版本号改到位再 build**，否则入口测试按旧版本红；本轮曾先 build 后修 sameRoot，修复后**必须重 build 并重算缓存键**）；
- 逐版本上游能力、合并实况与裁决细节见 git log 及本文件的 git 历史版本（`git log -p AGENTS.md`）。
- **v0.6.2+v0.6.3 合并验证记录（2026-10-01，合并提交 `7354fa3`）**：冲突 3 处与 merge-tree 试合并预判完全一致——`dist/qqj-app.js`（`npm run build` 重建消除）、`manifest.json` 缓存键行、`src/v3/recall-runtime.js` 的 `invalidate`（上游千事删除保留 sessionReceipt + 本地 clearPersisted 并集，见 §2 实录）；5 个自动合并热文件（memory-runtime extraOnly、foundation-view 两处 invalidate 联动、people-profiles saveProfile 联动、prompts-settings clash 拦截器、index.js 迁移调用）合并后逐项核对本地资产原样存活。上游 v0.6.3 自带 2 个红测试（纯上游 worktree 1376 例实测坐实，非合并损坏）：① `tests/production-entry-load.test.mjs:170` manifest 缓存键哈希（`ae54f0d9d5da7729`）与其提交的 bundle 实际 SHA（`d186d15ba2a0ba37`）不符——§1.3 记录过的「漏 bump 假通过」失效模式；② `tests/v3-wiring.test.mjs:26` 版本断言漏改仍 `'0.6.2'`。两处均已代修（重建填真键 `20261001.44-7ccebe9c5952ad33` + 断言改 `'0.6.3'`）。四门禁复跑全绿：金样+清洗器 25/25、入口装配+wiring 10/10、全量 **1400/1400**（61s）、跨仓 40 例金样双实现输出与金样期望逐字节一致互拍 0 差异（`tests/v3-extractor-memory.test.mjs` 经测试名集合比对 230=230 确认上游重排未丢用例）。
- **v0.6.4+v0.6.5+v0.6.6 合并验证记录（2026-10-03，合并提交 `6262acc`）**：merge-tree 试合并预判与实际冲突完全一致，7 处——`dist/qqj-app.js`（重建消除）、`manifest.json`（版本号自动合至 `0.6.6`，仅缓存键行冲突，重建后填 `20261003.45-d4266c1a0e418fab`）、`tests/v3-wiring.test.mjs`（采纳上游泛化正则断言，根治版本断言冲突模式）、`src/ui/help-guide.js`（上游历法三段全收 + 本地 P5 通用包裹符段保持，见 §2 新热区条目）、`src/ui/settings/prompts-settings.js`（保留本地 M0 空默认与通用包裹符 placeholder，拒绝上游 `?? 'content'` 展示默认；上游 hint 文案「补读故事时间」手工补入）、`src/v3/recall-runtime.js`（`invalidate` 双参 + `requestDiagnostic.clear()` 并集，见 §2 实录）、`src/v3/time-body.js`（`readTimeBody` 签名加 `calendar = null` 并集，见 §2 实录）。自动合并热文件（bootstrap recallRuntime 注入、settings 迁移、v3-foundation-view 联动、cse-engine/memory-runtime extraOnly、prompts-settings clash 拦截器、index.js 迁移调用、v3-cse 测试 sanitizerOptions 并集）合并后逐项核对本地资产原样存活；时间系统 6 文件（story-clock/time-engine/time-runtime/time-annual-setting/calendar-rules 新文件/people-workspace）本地零实质差异，干净采纳上游。上游本轮无发版疏漏红测试。四门禁全绿：金样+清洗器 25/25、入口装配+wiring 10/10（先改版本号再 build 的教训：首建 bundle 内嵌 0.6.3 致 1 红，重build 后过）、全量 **1427/1427**（61s，0 失败）、跨仓 40 例金样 QQJ/SDC 双实现与金样期望逐字节一致 0 差异。
- **v0.6.7+v0.6.8 合并验证记录（2026-10-05，合并提交 `60401dd`）**：merge-tree 试合并预判与实际冲突完全一致，4 处——`.gitignore`（并集 `.zcode/` + `diagnostics.local.json`）、`manifest.json`（版本自动合至 `0.6.8`，仅缓存键行冲突，重建后填 `20261005.3-68ce2f49ad39571d`）、`dist/qqj-app.js`（重建消除；**教训**：首建于 sameRoot 修复前，内嵌坏代码，修复后必须重 build 并重算缓存键）、`src/v3/recall-runtime.js`（`invalidate` 三参并集 + 密封点重对齐条件重植，见 §2 v0.6.8 实录）。**合并损坏一例（本轮主风险，已修复）**：上游重写 commit 流程吞掉本地 `sameRoot` 定义（使用块幸存），首跑全量 1508 例 118 失败；经 worktree 三方归因（本地基线 v3-recall 207/207 绿、纯上游 233/233 绿、合并 108 红）定性合并损坏，重植后全绿。自动合并热文件（settings 迁移与上游向量键共存、index.js 迁移调用、bootstrap 注入、v3-foundation-view/people-profiles-view 联动调用点行号漂移 130→134/1520→1536、settings-modules 断言并集）逐项核对本地资产原样存活。上游新增整体采纳：向量召回 4 文件 + `vector-api-settings`（`vectorEnabled` 默认 false）+ `private-recall-diagnostics` + `tests/vector-recall.test.mjs`(586 行)；向量取文实证走 `canonicalContent`（`vector-source.js:projectVectorSources`），不绕本地清洗器。**上游自带 1 个跨仓红测试**：`tests/settings-api.test.mjs:288`「只双向共享 schedule-planner 预设池」断言 SDC 侧 `loadCfg()` 含 `spAdditionalParams`（纯上游 worktree 1484 例实测复现，非合并损坏）——SDC `v3.8.0` 的 `runtime/settings.js:153` 正是新增该字段，**SDC 合并后自然转绿**（SDC v3.8.0moon 合并提交 `29bc7e7` 后复跑 `tests/settings-api.test.mjs` 37/37 确认）。四门禁：金样+清洗器 25/25、入口装配+wiring 10/10、全量 **1506/1508**（`npm test`，1508 = 纯上游 1484 + 本地 24；2 红分别为上述跨仓依赖红——SDC 合并后已转绿——与 `tauri-backend` ENOTEMPTY 环境竞态——后者单跑/重跑即过，与 §4 已知偶发同款）、跨仓 40 例金样 0 差异（SDC v3.8.0moon 合并后终验复跑 25/25 确认）。
- **v0.6.9+v0.6.10+v0.6.11 合并验证记录（2026-10-06，合并提交 `c916304`）**：merge-tree 试合并预判与实际冲突完全一致，3 处——`dist/qqj-app.js`（重建消除）、`manifest.json`（版本自动合至 `0.6.11`，仅缓存键行冲突，重建后填 `20261006.15-4375cf376a092ffd`）、`src/v3/recall-runtime.js`（**唯一 1 个 union hunk**：上游在 `coveredBodyGuards === null` 分支新增 `markVerificationFailure('coveredBodyGuard', 'changed')` 诊断，与本地密封点重对齐块正交，并集同时保留，见 §3.4 ②）。**本轮上游零触碰** `captureCoreBodyWitness`/`invalidate`/`receiptMaterial`/`captureCoveredBodyGuards` 签名——无新并集；v0.6.8 式「定义块被吞」未复现。自动合并热文件（memory-runtime extraOnly、cse-engine extraOnly 接线、foundation-view 两处 invalidate 联动、index.js `migrateSanitizerKeepTags` 迁移调用、settings-modules 包裹符冲突回退测试、v3-cse sanitizerOptions 并集、v3-extractor-memory `keepTags:'content'` 注入——上游重写 harness 后同名用例自动合并存活且无冲突标记）合并树+实跑双重验证本地资产原样存活。上游新增整体采纳：`vector-auto-update.js`（原始向量索引后台维护，取文仍走 `canonicalContent`/`summaryCandidateText`——后者输入为 `summary.userText` 摘要工件而非正文，NFKC+regex 剥壳，不绕本地清洗器）+ extractor prompt v25→v26（千事合同收紧）。上游新增 root 推进测试（`headCheckpointId: 'head-after'`）在准备阶段即断言 `sourceStale` 中止、legacy schema 16/17 测试在 restore 只读路径，均不进本地重对齐所在的 commit 阶段，实测无交互。上游自带 bundle 哈希与 manifest 键一致（`f3918ff361cdf0d5`），v0.6.3「漏 bump」模式未复发。四门禁全绿：金样+清洗器 **25/25**、入口装配+wiring **11/11**（新缓存键与 0.6.11 版本校验通过）、本地守卫 recall-local-guards 5/5、全量 **1545/1545**（69s，基线 1508 → 1545，ENOTEMPTY 偶发本轮未现）；`git diff upstream/main -- tests/v3-recall.test.mjs` 为空（逐字相同规则保持）；合并后产权清单 34 文件与合并前完全一致无扩散；跨仓终验见下条。
