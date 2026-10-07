# 千千结 · Moon 定制版 — 项目记忆（供维护与 CLI 参考）

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（作者 moon 定制版）。`main` 分支跟踪上游最新基线，并叠加"moon"专属改动。`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。

> **用途**：供后续会话/开发者在执行"合并上游"、"升级维护"、"排查改动"时，迅速掌握本 fork 的核心定制、版本惯例、冲突裁决规则与架构设计决策，确保合并上游时不丢弃本地核心资产。
> **体例**：本文件只维护**当前契约**与**索引**；历次合并的逐版本实录与验证数据随 git 历史沉淀（`git log -p AGENTS.md` 按版本回查，`git show <合并提交>` 看合并能力摘要）。每次合并后仅在 §5.1 索引表追加一行，并把新的持久性裁决沉淀进 §2/§3 相应契约。

---

## 1. 仓库定位与版本构建惯例

1. **版本声明 (`manifest.json`)**：跟随上游官方发布版本号。
2. **生产单文件 (`dist/qqj-app.js`)**：由 `npm run build`（Vite + Rolldown）编译生成；源码任何变动后**必须重新构建 bundle**，否则入口加载测试失败。
3. **缓存键规则 (`js` 字段)**：格式强制 `dist/qqj-app.js?v=YYYYMMDD.<全局递增序号>-<bundle SHA-256 前16位小写>`；`tests/production-entry-load.test.mjs` 校验哈希与实际 bundle 摘要一致。**序号全库历史内全局递增、同日不得复用——合并上游后注意上游同日已用的序号，取未用过的更大值（`git log --all -S 'YYYYMMDD.'` 复核）；哈希取自真实重建产物，禁止手写或沿用旧值**（曾发生文档记录与实际产物哈希漂移的「漏 bump 假通过」失效模式）。构建顺序铁律：**先把版本号改到位 → 再 build（bundle 内嵌版本常量）→ 最后回填缓存键**。
4. **合并流程**：备份分支 `git branch backup/main-before-upstream-vX.Y.Z main` → `git merge --no-ff upstream/main`（先以 `git merge-tree --write-tree main upstream/main` 预判，实际冲突应与预判一致）→ 裁决（§2）→ 四门禁（§4）→ AGENTS.md 记录 → push origin；验证完整前不向远程 force push。**备份分支仅在本地存在，合并验证通过并推送后即可清理**（`git branch -d`，其尖端已是 main 历史内的祖先提交，即合并提交的第一父状态，删除零损失）。

---

## 2. 合并冲突热区与解决规则（合并上游必查）

### 2.1 常规冲突表

| 文件路径 | 冲突性质 | 解决裁决方式 |
| :--- | :--- | :--- |
| `manifest.json` | 版本号行与缓存键行冲突 | 版本采上游发布号；构建完成后回填最新缓存键（§1.3） |
| `dist/qqj-app.js` | 编译产物冲突（数千 hunk） | 不手工解，直接 `npm run build` 覆盖重建即消除 |
| `tests/production-entry-load.test.mjs` | 冒烟版本断言与上游新增 mock | 采纳上游修改（版本断言对齐上游最新版本） |
| `tests/v3-wiring.test.mjs` | 装配接口导出与版本断言 | 采纳上游；v0.6.6 起版本断言已泛化为正则 `assert.match(manifest.version, /^\d+\.\d+\.\d+$/u)`，本文件不再常规冲突 |
| `tests/v3-cse.test.mjs` | 上游 `runtimeHarness` 宿主参数 vs 本地 `sanitizerOptions` 参数 | **取并集**：本地默认值与上游 Persona 参数互不相干，两者都必须在场 |
| `src/memory-content-sanitizer.js` | 上游 v0.5.8 起「默认 keep='content'」简化实现 vs 本地四模式合同 | **双层保留**：本地 M0-M3 渲染器、`sanitizeMemoryContent`（不注入默认 keepTags）、`extraOnlySanitizerOptions` 逐字保留；上游 `stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`HTML_VOID_TAGS`/元数据解析器整段移植（仅将上游同名 `parseSanitizerTree` 更名 `parseTagTokenTree` 避免撞名；上游 2 空格缩进原样保留，使该区域未来合并零冲突） |
| `src/v3/people-workspace.js` + `src/ui/people-profiles-view.js` | 上游增删人物工作区功能 | **整文件保持与上游逐字相同**（v0.6.0 定案：世界书原文直通系上游设计意图，源码/工厂签名/import/测试含直通断言均随上游）——**勿再回植 extraOnly**（详见 §3.2 已回归清单）；people-profiles-view 的 `saveProfile → invalidate('peopleProfileSaved', …, { clearPersisted: true })` 联动除外（§3.4 ③） |
| `src/v3/foundation-domain.js` | 本地 `SANITIZER_VERSION = memory-content-sanitizer-v2` 且默认 keepTags `''`（M0），上游停留 v1+`'content'`——同一宿主聊天两侧派生**不同确定性图 ID**（floor/run/checkpoint/index 全链） | **保留本地合同**；上游 fixture 类测试（`tests/fixtures/tt2-native-init-failure.json`，编码上游预计算 ID）须在本地语义下重生成：干净初始化后按 `fstore.recordKey(record)` 捕获 run/checkpoint/floor/index（索引键含 `floorOrder-0-` 段，勿手拼 `v3-index-<id>`），run 回卷为 `retryableError`+`V3_GRAPH_INDEX_ROUTE_INVALID` 定格、无 root |

### 2.2 本地已修改的上游产权文件（上游重写对应链路时，以本地增强为产权逐项回植并重跑对应测试全绿）

> - `src/v3/recall-runtime.js`（本地三增强，详见 §3.4）：`tests/v3-recall.test.mjs` 与上游逐字相同、**不得追加本地断言**，本地断言一律加在 `tests/recall-local-guards.test.mjs`。当前契约：
>   ① **见证向前截断**——`captureCoreBodyWitness(coreChat, sanitizerOptions, fingerprint, maximumFloors = 3, userMessage = null)`，循环以触发用户楼定位 `triggerIndex` 向前采集，上限用上游归一化值 `normalizeAutoHideKeepAiCount`；内部调用点传 `(…, recentBodyFloorLimit(), user?.message)`。
>   ② **invalidate 三参**——`(reason = 'invalidated', sourceEvent = 'runtimeInvalidate', { clearPersisted = false } = {})`，函数体首行 `requestDiagnostic.clear()`；`clearPersisted: true` 时删除最新用户楼持久化收据并 `saveChat()` 落盘。三处 UI 调用点用事件名方言（`manualMemoryEdit` / `foundationFullRebuild` / `peopleProfileSaved`），**漏改则 `{ clearPersisted }` 落入 `sourceEvent`、清理静默失效**。
>   ③ **密封点活版本重对齐**（`commitPromptIfCurrent` 内、`captureCoveredBodyGuards` 之后）：条件 `currentSource !== source && currentSource?.status === 'ready'`（与上游 `basePreparedSource(…, { fresh: true, sourceToVerify: source })` 无条件 fresh 重读 + 对象同一性判定等价），以活档案头 Checkpoint/Revision/正文指纹重签 `receiptFingerprint`。
>   正交性备忘：上游千事删除撤回（`qianshiDeletionProvider`/`withoutDeletedQianshi` 冻结回执临时撤回，不重跑模型不重签）与三增强正交；witness 赋值在密封**前**，本地重对齐调 `receiptMaterial` 时 witness 尚未定义；冻结复用路径本就不校验指纹，均自洽。
>   **教训（v0.6.8 合并损坏实录）**：定义与使用分处两个被上游重写的区域时，使用块自动幸存、定义块可能被吞（运行时 `ReferenceError`、v3-recall 大面积 error）——用「合并树 vs 纯上游 diff」定位残余差异快速归因，勿据单侧绿误判。
> - `src/v3/floor-binding.js`：`matchFloorCandidates` 可选第三参 `{ equivalentContent }` 与绑定种类 `'locatorEquivalent'`——弥合「本地 M0 保留已配置故事时钟引用标签于 canonical 正文」与「上游保证编辑时间标签不得撤销已落盘覆盖」的语义冲突；私有助手 `withoutStoryClockReferenceTags` 剥离仅已配置的引用标签后比较，仅供 `readTimeBody` 传入。
> - `src/v3/time-body.js`：`currentBodyClock` 加法式内容视图兜底（canonical 探测返回 null 时以 `sanitizeMemoryContent(rawContent, { keepTags: 'content' })` 再探；用户显式配置 keepTags 时行为不变）；`readTimeBody` 签名并集 `{ sanitizerOptions = {}, storyClockReferenceTags = '', calendar = null }`（上游故事历法 `calendar` 与本地兜底正交）→ `tests/v3-time-body.test.mjs`。
> - **UI 联动点**（上游重排装配代码时保住三处 `invalidate` 联动）：`src/ui/v3-foundation-view.js`（单楼编辑 / 完全重构）、`src/ui/people-profiles-view.js`（`saveProfile`）、`src/bootstrap.js`（`recallRuntime` 注入通道）。
> - `src/ui/help-guide.js`：本地仅改设置章节「保留包裹符」说明段（P5 通用包裹符双栏语义），上游高频重写本文件文案——裁决：**上游新增段落全收 + 包裹符段保持本地**（上游侧该段仍是旧的 `[[...]]` 专用描述，勿取上游侧）。
> - `src/v3/recall-selector.js`（本地四项纯性能记忆化，详见 §3.5）：**语义零改动**，四者都是「纯函数按输入记忆化 / 只依赖 `context` 的常量上提」，判定输入一字未动。上游重写本文件时按以下锚点逐项回植，并以 `node tools/perf-audit/verify-equivalence.mjs <上游合并前提交>` 确认输出逐字节不变：
>   ① `compactOf`（按**字符串**记忆化 `compact()`；`COMPACT_MEMO_LIMIT = 200000`）——`decorate()` 每轮 `{...value}` 克隆候选，但克隆体**共享 `_coreText`/`_rankText` 字符串实例**，故按字符串键可跨轮命中（按对象键则命中率仅 ~4.5%，见 §3.5 教训）；
>   ② `entityDerivedCache`（`WeakMap` on `context`）上提 `entityTokens` 与 `entityNameEntries`（实体名 → 已 `compact` 的标签表），替代 `recordFor()` 内对 92 实体的逐次扫；
>   ③ `stableKeyMemo` + `historyStableKeyRaw`（按对象记忆化 `historyStableKey()`，仍是导出的 `historyStableKey`）；
>   ④ `preparedMaterialMemo`（按 material 文本共享 `prepareMaterial()` 结果，使 `materialTokens` 的懒加载 `tokens` Set 得以存活）。
>   **反例警示（勿回植）**：上游若引入「按内容键跨轮缓存 `recordFor`」须先证明键完整——`historyStableKey` **不含** `_rankText`／`towardEntityId`／`*?.sourceFloorId`，而这些正是 `recordFor()` 的输入，用它做键会把仅 `toward` 不同（上游 `cseDuplicateKey` 特意区分）的值串成同一条 record。本次实测该缓存收益在噪声内（n=129/192 为 0.982×/0.989×），已剔除。

### 2.3 自动合并正交区（3-way 自动合入，合并后核对资产在位即可）

`src/settings.js`（本地 `sourceKeepTags: ''` 与上游存储自动清理字段不同区域）；`src/v3/cse-engine.js` / `src/v3/memory-runtime.js`（本地 `extraOnlySanitizerOptions` 拦截与上游新提示词/千事调度正交）；`index.js`（`settings.migrateSanitizerKeepTags?.()` 迁移调用，定义在 `src/settings.js`）。

---

## 3. 必须保住的本地核心定制资产（Fork 存在的价值，合并时逐项复核）

### 3.1 四模式标签清洗器（与 ST-SevenDaysCal 逐字节一致）
- **核心文件**：`src/memory-content-sanitizer.js`（树形单遍解析，`sanitizeMemoryContent` 接口）；`src/tag-sanitizer.golden.json`（40 组锁定金样，LF 行尾）；`tests/tag-sanitizer-golden.test.mjs` 与 `tests/memory-content-sanitizer.test.mjs`。
- **核心合同**：
  - **M0（两栏皆空）**：直通不清洗，保留正文，仅做注释/孤立标记清理；
  - **M1（仅 extra）**：成对删除 extra 标签及内容，未闭合 extra 吞至同名闭合或文末（噪音不泄漏）；
  - **M2（仅 keep）**：剥壳保留 keep 块内容（内部不再二次清洗，嵌套标签原样保留），块外裸文本丢弃；
  - **M3（混合）**：extra 恒优先，无论在外层、包裹 keep 还是嵌套在 keep 子树内一律整块剔除；
  - **三分支 token 正则**：`TAG_ATTR_SOURCE`（引号感知，属性内 `>` 不截断）+ `TAG_ATTR_FALLBACK_SOURCE`（未闭合引号宽松兜底回退旧行为，防止思维链泄漏）+ 每条配置的字面量包裹规则各一分支（`freshTokenRx(wrapperRules)` 动态生成）；
  - **自闭合标记**：keep 子树内自闭合 extra 标记连标记删除，非 extra 原样保留 openRaw。
- **通用字面量包裹规则（P5，2026-09-30 按方案 B 恢复）**：两栏都接受任意「起始...结束」（`LITERAL_WRAPPER_SEPARATOR = '...'`，如 `{{...}}`、`<<...>>`），`...` 前=开定界符、后=闭定界符；keep 栏=剥壳取内层，extra 栏=连同定界符整块删除，`[[...]]` 只是其特例。解析由 `collectWrapperRules(keep, extra)` 收集两栏并集（去重、按开定界符长度降序防短前缀抢占）后生成 `kind:'wrapper'` 节点，`renderFlat`/`renderKeptInner` 用节点自带 `openRaw`/`closeRaw` 重建——**无硬编码 `\[\[…\]\]`，也取消了上游式前置删除与 keep 栏 `TAG_NAME_PATTERN` 过滤**。`normalizeTagRules` 对包裹规则原样保留（大小写敏感）、标签名照旧小写；非法形态（开/闭定界符为空、`...` 出现两次）按 `literalWrapperRule` 三条件丢弃。
- **与上游包装符语义的唯一分歧**：嵌套包装符（如 `{{a{{b}}c}}`）本 fork 按树机整块处理，上游 `dropLiteralWrappedContent` 为扁平 indexOf 扫描；40 例金样不含嵌套包装符，故不冲突。
- **测试侧不得回退**：`tests/memory-content-sanitizer.test.mjs` 中上游两条依赖「默认 keepTags='content'」语义的断言，已按本地 M0 合同改写为直通正断言，未来合并不得采用上游语义覆盖。
- **v0.5.8+ 双层文件结构**：前半部本地四模式合同，后半部上游移植段（`stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`parseTagTokenTree`，服务 v3 时间链路，`<br>` 按 void-tag 处理、节点携带偏移元数据；移植段归一化引用走本地 `normalizeTagRules`）。上游后续若改这些导出，直接对齐上游该段即可。

### 3.2 非 AI 正文来源 extra-only 隔离清洗（防止世界书/用户输入被洗空）
- **核心辅助函数**：`export function extraOnlySanitizerOptions(options = {}) => { keepTags: '', extraTags: options?.extraTags ?? '' }`
- **保护场景与调用点（仅剩 3 处，均为上游活洗空点）**：`src/v3/cse-engine.js`（`captureCseBaseline` 遍历世界书条目，上游 M2 提取致无 `<content>` 标签条目洗空后静默跳过）；`src/cse-source-selection.js` 扫描窗 rows 分路（assistant 行保 keep 提取+合并 `qqj-cse`，用户行/canonical 行走 plainText extraOnly）；`src/v3/memory-runtime.js`（`capturePrecedingUserInputFromSnapshot` 用户输入快照）。
- **已回归上游直通的点（勿再回植）**：`src/v3/people-workspace.js` 人物整理世界书（v0.6.0 定案，整文件回归上游，§2.1）；`src/cse-source-selection.js` 动态世界书（上游本为 clean+宏替换直通，extraOnly 仅剩卫生价值已撤）。
- **设计依据**：`keepTags`（如 `'content'`）是 AI 正文专属提取白名单；普通用户输入或未加自定义标签的世界书条目若流经 `keepTags` 会被直接清空为 0 字。非正文来源必须强制走 extra-only 清洗。

### 3.3 提示词与标签设置 UI 校验 (`src/ui/settings/prompts-settings.js`)
- **默认值配置**：`src/settings.js` 中 `sourceKeepTags: ''`（默认留空直通）。
- **存量迁移 (`migrateSanitizerKeepTags`)**：上游 v0.5.8+ 默认 `sourceKeepTags: 'content'` 会被 `get()` 的默认回写持久化进老存档，本地严格 M2 下会把无 `<content>` 标签的 AI 正文整楼清空（`foundation-domain` 的 `if (!canonicalContent) continue;` 静默跳楼）。版本化迁移：`sanitizerKeepTagsMigrationVersion` 0→1 时仅当持久值为纯 `'content'`（trim+小写完全相等）才重置 `''`；用户手改值原样保留；迁移后再手填 `content` 永不覆盖；全新存档直接置位。`index.js` 在 `settings.migrateLegacyApiSettings()` 之后以**可选链**调用。断言见 `tests/settings-api.test.mjs` 末尾两条。
- **保存拦截器 (`bindTagFieldWithClashCheck`)**：两栏失焦保存时自动做归一化交集计算（标签名与字面量包裹规则一并参与）；同名冲突即**拒绝落存**，输入框回退 `settings.get()[key] ?? ''`（= 该栏最近一次成功保存值；**不得**用视图创建时快照——本面板只在 `src/ui/panel.js` 初始化时创建一次，二次冲突会回退成陈旧值），并显示行内红色警告。守卫见 `tests/settings-modules.test.mjs`「包裹符冲突回退取最近一次成功保存值」。

### 3.4 召回回执重新生成（Regenerate）秒级复用机制
- **核心文件**：`src/v3/recall-runtime.js`（修复主体）；`src/ui/v3-foundation-view.js`；`src/ui/people-profiles-view.js`；`src/bootstrap.js`。
- **双重致错源头**（删当前用户楼 → 重新发送 → 重新生成，稳定复现）：① **并发盖错公章**——选材 LLM 耗时窗口内底层地基扫描推进全局 Root，原代码收据仍盖选材开始时的旧公章，存盘即过期；② **见证指纹漂移**——原 `captureCoreBodyWitness` 从数组末尾逆向采集，重新生成时尾部残留刚撤下的 AI 楼层。
- **本地修复三件套（治本，不可被上游旧代码覆盖）**：① **见证向前截断**（§2.2 ①）；② **密封点活版本重对齐**（§2.2 ③）；③ **三端联动主动失效**——`invalidate({ clearPersisted: true })` 清持久化收据并 `saveChat()`，联动 `manualMemoryEdit` / `foundationFullRebuild` / `peopleProfileSaved` 三个入口（§2.2 ②）。
- **与上游 `root: 0` 极速通道共存**：上游 `commitFrozenReceiptIfCurrent` 复用阶段有意不比对 Checkpoint/Revision（测试锁定复用零 I/O）。本地修复零性能开销：日常重新生成照走极速通道，仅人工修改记忆时精确清缓存重选材。
- **本地守卫测试**：`tests/recall-local-guards.test.mjs`（上游无此文件）集中回归本地补丁——见证向前截断对照、`matchFloorCandidates` 探针与 `'locatorEquivalent'`、`extraOnlySanitizerOptions` 合同、`invalidate` 默认不删持久收据而 `clearPersisted: true` 才删并 `saveChat`、时间参考标签探针。上游重写对应链路后**先跑它**。

### 3.5 召回选材性能（`src/v3/recall-selector.js` 四项记忆化）
- **动机**：长聊天（129 楼层记忆 / 92 实体）点「重新生成」时 `buildStorylinePlan()` 占 `selectRecall()` 壁钟 **92.7–97.3%**（`candidateBuild` 一步 ~20.2s），主线程被单核跑满、界面无响应。根因是**同一批字符串被反复重算**：`compact()`（NFKC + 3 次正则 + `toLocaleLowerCase` + `\p{L}\p{N}` 正则，作用在最长 12000 字符的 `_coreText` 上）占 self time **42.4%**，`tokenizeRecallText()` 16.1% + `materialTokens` 10.5%（合 26.6%）；真正做集合交集的 `setIntersection` 只占 **0.3%**。
- **四项改动（语义零改动，判定输入一字未动）**：见 §2.2 末条。实测 `contextSize=8192`、median-of-5：n=48 **17.18×**、n=96 25.95×、n=129 29.22×、n=192 **35.49×**；实机卡死上报场景（n=129 / `contextSize=20000`）**20201ms → 706ms = 28.62×**。增长指数由 `n^1.76` 降到 `n^1.24`。
- **等价性证据**：`node tools/perf-audit/verify-equivalence.mjs HEAD` = **144/144 逐字节一致**（`injectionText` 逐字符 + 完整结果树 canonical 深比）；四门禁全绿。判据：三者都是纯函数（`compact`/`historyStableKey`/`prepareMaterial`）按输入记忆化，`entityDerivedCache` 只上提依赖 `context` 的常量。
- **仍未解决的（有意留作后续）**：`buildStorylinePlan` 内层仍是 **O(m²)** 对比较（四层：候选线生成／建线合并／附着／continuity 兜底）。本改动只砍常数与部分指数，**不改阶**——按修复后自身实测，n=192 634ms → 384 1924ms → 768 6883ms → **1536 18056ms**，即悬崖约从 192 楼推到 **~1500 楼**。要真正压阶只能收缩参与分组的候选池（`baseHistory` 有原则预过滤）；硬切 `.slice(0,128)` 实测可得 17×–54×但**会改变召回结果**，不可取。
- **四条教训**（`docs/audit-recall-budget-loop-2026-10.md` 有完整取证）：
  ① **缓存要打在热点上，且键必须廉价**：实测成本分布是 `compact` 类键推导 **42.4%** 对 `setIntersection` **0.3%**；`_coreText` 4000 字符时键推导成本是交集的 **401×**，缓存命中一次的键成本是原运算的 **15.39×**——为便宜运算付昂贵键即净亏。故本节只缓存**最贵的** `compact`/`historyStableKey`/`prepareMaterial`。
  ② **跨轮记忆化不能按对象身份**：`decorate()` 每轮 `{...value}` 克隆候选 → 按对象键命中率仅 **4.5%**；但浅拷贝**共享字符串实例**，按字符串键才有效。
  ③ **缓存键必须覆盖被缓存函数的全部输入**：`historyStableKey` 不含 `_rankText`／`towardEntityId`／`*?.sourceFloorId`，用「它 + 内容」做 `recordFor` 的键会串记录——该方案的收益也落在噪声内（0.982×/0.989×），故剔除（§2.2 反例警示）。
  ④ **审计基线的谱系必须断言**：性能夹具曾在跨上游版本比较中给出虚假的「逐字节一致」；`tools/perf-audit/lib/recall-audit.mjs` 的 `assertUpstreamMarkers()` 让这种情况**抛异常而非静默通过**。
- **审计工具**：`tools/perf-audit/`（`verify-equivalence.mjs` 等价门禁、`benchmark.mjs` 计时与指数拟合；`README.md` 载方法学与夹具设计理由）。变体物化到**系统临时目录**（`SCRATCH_DIR = tmpdir()/qqj-recall-perf-audit`，见 `lib/recall-audit.mjs`），即仓库之外——**绝不写入 `src/` 旁，也不需 `.gitignore` 条目**。

---

## 4. 验证清单与验收标准（4 道硬性门禁）

1. **清洗器金样与单元测试**：
   ```bash
   node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs
   ```
   *标准*：25/25 全绿（40 例金样逐字节一致 + 清洗器合同断言）。
2. **生产构建与入口装配测试**：
   ```bash
   node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs
   ```
   *标准*：11/11 全通过（前者验证 manifest 缓存键与 bundle SHA-256 绝对吻合）。
3. **全量测试套件**：`npm test` —— 全量全绿（当前基线 **1564** = 上游 v0.6.12 树 1540 + 本地 24；实测约 69s）。若沙箱报 `Error: spawn EPERM`（环境边界非回归），加 `--test-isolation=none`。
   > **已知偶发（勿误判为本地回归，先跑纯上游对照）**：① `tests/v3-extractor-memory.test.mjs` 个别时序断言在空闲快速机器上可能漏窗失败，重跑即过（纯上游树可复现）；② `tests/tauri-backend.test.mjs` 并行满载下 `t.after` 清理临时目录报 `ENOTEMPTY`，单跑该文件或重跑全量即过（纯上游树可复现）。
4. **与 ST-SevenDaysCal 跨仓终验对拍**：40 例金样（`src/tag-sanitizer.golden.json` 与 SDC `runtime/tag-sanitizer.golden.json`）双实现输出 **0 差异、100% 逐字节一致**；另复跑 `tests/settings-api.test.mjs`（跨仓 settings 断言）。

---

## 5. 当前仓库状态底数（基线备忘）

- **工作分支**：`main`；**上游基线**：已合入 `upstream/main`（Tag `v0.6.12`，提交 `b33c843`；空档案初始化 + 召回来源核验：`sourceRefsValid` 混合楼 rawWitness 校验、准备期限 5000ms→8000ms、`recall-selector` 去重键 `cseDuplicateKey`/`sameSelectionDuplicate`）；本次未留备份分支（合并前基线 `2344a0d` 为合并提交 b422e28 的第一父提交，且已推送 origin）；
- **产物版本**：`manifest.json` 版本号 `0.6.12`（含 `author: "atonal519"` 字段），缓存键 `20261007.385-7b2e010282dc935d`（v0.6.12 合并后重建 → 2026-10-07 叠加**本地召回选材性能修复**后再次重建，见 §3.5）；
- **本地性能修复（2026-10-07）**：`src/v3/recall-selector.js` 四项记忆化（§3.5 / §2.2 末条），语义零改动；同一场景 **20201ms → 706ms（28.62×）**，四门禁全绿（1564/1564）；取证全文 `docs/audit-recall-budget-loop-2026-10.md`，审计工具 `tools/perf-audit/`；
- **兄弟仓库同步**：`ST-SevenDaysCal` 已同步至 v3.8.3moon（2026-10-07，`1739c19`；线 schema 重写/外部聊天存储/记忆上下文窗口化；上游自带 2 红测试本地适配），两仓清洗器保持输出 100% 逐字节一致（40 例金样 0 差异）；MK 跨仓 settings 断言（SDC `loadCfg()` 含 `spAdditionalParams`）由 SDC v3.8.0 起满足。

### 5.1 合并历史索引（逐版本实录与验证数据：`git log -p AGENTS.md`；上游能力摘要：`git show <合并提交>`）

| 上游版本 | 日期 | 合并提交 | 冲突与裁决要点 | 当期全量 |
| :--- | :--- | :--- | :--- | :--- |
| v0.5.0~v0.5.6 | 2026-09 | ed9fbfb..a3c17e8（docs 记录） | 基线记录期：清洗器资产域、守卫体系与本文档体例成型 | — |
| v0.6.0 | 2026-09-30 | 见 git log | people-workspace 整文件回归上游直通裁决（勿回植 extraOnly，§3.2） | — |
| v0.6.2+v0.6.3 | 10-01 | `7354fa3` | 3 冲突；`invalidate` 并集（上游千事删除保留 sessionReceipt + 本地 clearPersisted 并存）；上游自带 2 红测试代修（缓存键漏 bump + 版本断言漏改） | 1400 |
| v0.6.4~v0.6.6 | 10-03 | `6262acc` | 7 冲突；help-guide 包裹符段保持本地、prompts-settings 拒上游 `'content'` 展示默认、time-body `calendar` 签名并集、wiring 版本断言泛化 | 1427 |
| v0.6.7+v0.6.8 | 10-05 | `60401dd` | 4 冲突；向量召回整体采纳；**合并损坏一例**——上游重写吞掉本地 `sameRoot` 定义致 118 红，三方归因后重植（教训沉淀 §2.2）；上游 settings-api 跨仓红，SDC v3.8.0 合并后转绿 | 1506/1508 |
| v0.6.9~v0.6.11 | 10-06 | `c916304` | 3 冲突；唯一 union hunk（上游 `markVerificationFailure` 诊断 + 本地密封点重对齐并集）；缓存键 `20261006.15`；上游签名零触碰、无自带红测试 | 1545 |
| v0.6.12 | 10-07 | `b422e28` | 2 冲突（dist 重建 + manifest 缓存键 `20261006.19-f5bc5d2239eb3a09` 回填）；三增强与三处 UI 调用点方言幸存（§2.2 全项核验）；上游改 `recall-selector` 去重键（`cseDuplicateKey`），预算循环热点零触碰、无自带红测试 | 1564 |
