# 千千结 · Moon 定制版 — 项目记忆（供维护与 CLI 参考）

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（作者 moon 定制版）。`main` 分支跟踪上游最新基线，并叠加"moon"专属改动。`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。

> **用途**：供后续会话/开发者在执行"合并上游"、"升级维护"、"排查改动"时，迅速掌握本 fork 的核心定制、版本惯例、冲突裁决规则与架构设计决策，确保合并上游时不丢弃本地核心资产。
> **体例**：本文件只维护**当前契约**与**索引**；历次合并的逐版本实录与验证数据随 git 历史沉淀（`git log -p AGENTS.md` 按版本回查，`git show <合并提交>` 看合并能力摘要）。每次合并后仅在 §5.1 索引表追加一行，并把新的持久性裁决沉淀进 §2/§3 相应契约。
> **防回胀（硬规则）**：本文件每次会话都整体注入，体积即复现开销。① **§5.1 每行硬上限 120 字符**，只写「冲突数 + 裁决关键词 +（有则）缓存键」，细节落 §2/§3 或留 git 历史；② **同一事实只写一处**——规格与锚点归 §2.2，动机与理由归 §3，另一侧只留 `§x.y` 指针；③ 精确签名、`file:line` 锚点、缓存键序号规则、「勿回植/勿再删」红线与四门禁阈值**永久保留**，压缩只针对措辞与已外置的取证。
> **不可压核心（精简白名单）**：§1.3 缓存键规则、§1.4 合并流程、§2.1 各行的「路径 + 裁决关键词」、§2.2 全部签名/常量/`file:line` 锚点/红线、§3.1 M0-M3+P5+40 例金样、§4 四门禁命令与阈值、§5 版本号与缓存键——压缩只动措辞与已外置取证，上述内容一字不删。
> **取证外置**：合并实录与教训全文见 `docs/merge-notes.md`；召回性能取证见 `docs/audit-recall-budget-loop-2026-10.md`。本文件只留契约、锚点与指针。

---

## 1. 仓库定位与版本构建惯例

1. **版本声明 (`manifest.json`)**：跟随上游官方发布版本号。
2. **生产单文件 (`dist/qqj-app.js`)**：由 `npm run build`（Vite + Rolldown）编译生成；源码任何变动后**必须重新构建 bundle**，否则入口加载测试失败。
3. **缓存键规则 (`js` 字段)**：格式强制 `dist/qqj-app.js?v=YYYYMMDD.<全局递增序号>-<bundle SHA-256 前16位小写>`；`tests/production-entry-load.test.mjs` 校验哈希与实际 bundle 摘要一致。**序号全库历史内全局递增、同日不得复用——合并上游后注意上游同日已用的序号，取未用过的更大值（`git log --all -S 'YYYYMMDD.'` 复核）；键日期取构建当日，可与上游发布日不同；哈希取自真实重建产物，禁止手写或沿用旧值**（曾有「漏 bump 假通过」：记录哈希与实际产物漂移）。构建顺序铁律：**先把版本号改到位 → 再 build（bundle 内嵌版本常量）→ 最后回填缓存键**。
4. **合并流程**：备份分支 `git branch backup/main-before-upstream-vX.Y.Z main` → `git merge --no-ff upstream/main`（先以 `git merge-tree --write-tree main upstream/main` 预判，实际冲突应与预判一致）→ 裁决（§2）→ 四门禁（§4）→ AGENTS.md 记录 → push origin；验证完整前不向远程 force push。**备份分支仅在本地存在，验证通过并推送后即可 `git branch -d` 清理**（其尖端是合并提交的第一父状态，删除零损失）。

---

## 2. 合并冲突热区与解决规则（合并上游必查）

### 2.1 常规冲突表

| 文件路径 | 冲突性质 | 解决裁决方式 |
| :--- | :--- | :--- |
| `manifest.json` | 版本号行与缓存键行冲突 | 版本采上游发布号；构建完成后回填最新缓存键（§1.3） |
| `dist/qqj-app.js` | 编译产物冲突（数千 hunk） | 不手工解，直接 `npm run build` 覆盖重建即消除 |
| `tests/production-entry-load.test.mjs` | 冒烟版本断言与上游新增 mock | 采纳上游修改（版本断言对齐上游最新版本）。**上游忘同步版本断言系惯例缺陷**：断言（`tests/production-entry-load.test.mjs:240`）常停在上一发布号而 manifest 已递增，**纯上游树同样红** → 本地代修对齐上游发布号，勿误判为本地回归（实例见 §5.1） |
| `tests/production-dist-branch.test.mjs` | 上游 v0.7.14 起记录读取强制先协商 `/v1/health`（能力探测），该文件夹具只认 `/v1/records/…` 单条路由 → 探针 404（**纯上游树同样红**，见 §5.1 v0.7.14+v0.7.15 行） | 本地代修：夹具补 `/v1/health` 桩并有意不声明 `recordBatchRead`/`recordIdList`，使客户端走单条 GET 回退；断言与夹具内容一字未动 |
| `tests/v3-wiring.test.mjs` | 装配接口导出与版本断言 | 采纳上游；v0.6.6 起版本断言已泛化（`assert.match(manifest.version, /^\d+\.\d+\.\d+$/u)`），不再常规冲突。**v0.8.0 代修**：上游把设置页挂载改为 `v3FoundationView.mount(managementMount, { page: 'management' })`，断言仍停在旧 `setPage?.('management')`（纯上游树同样红）→ 本地按上游实际机制改写断言，勿误判为本地回归 |
| `tests/v3-cse.test.mjs` | 上游 `runtimeHarness` 宿主参数 vs 本地 `sanitizerOptions` 参数 | **取并集**：本地默认值与上游 Persona 参数互不相干，两者都必须在场 |
| `tests/v3-extractor-memory.test.mjs` | 上游调试导出写死 POSIX `/tmp/qqj-v048-<n>-current-reachable.json`（Windows 解析为不存在的 `D:\tmp` → ENOENT，纯上游树同样红）。**<n> 随上游版本变动**（当前 `1000`，早期 `271`） | 本地仅改路径可移植：`join(tmpdir(), 'qqj-v048-<上游当前 n>-current-reachable.json')` + `import { tmpdir } from 'node:os'` / `{ join } from 'node:path'`；**夹具名随上游改名同步**，断言与夹具内容一字未动；v0.7.5 另有一条上游自带挂起/红测试，本地补 name/avatar 适配（`7c87ea9`）；其余代修实例见 §5.1。**v0.8.0 起两例**（`地点名参照`、`地点绑定和父级`）新增/改写的原始消息带 `<location>` 标签并期望 canonical 不含它（依赖上游清洗器缺省剥除）→ 本地显式 `sanitizerOptions: () => ({ extraTags: 'location' })`，测试意图不变 |
| `src/memory-content-sanitizer.js` | 上游 v0.5.8 起「默认 keep='content'」简化实现 vs 本地四模式合同；**v0.9.0 起上游改为重导出 `shared-body-wrappers.js` 的 `sanitizeStoryBody`**（缺省 keep='content'、命名对大小写不敏感、M0 直通/M1 未闭合/同名 extra 语义全不同——实测对拍 40 例金样仅 13 例一致） | **双层保留**：本地 M0-M3 渲染器、`sanitizeMemoryContent`（不注入默认 keepTags）、`extraOnlySanitizerOptions` 逐字保留（规格见 §3.1），**不采第 1 行共享重导出**；移植段随上游（v0.9.x 内部名 `normalizeTagBlockNames`+其局部 `TAG_NAME_PATTERN`、新导出 `readMemoryTagBlocks`）。`src/shared-body-wrappers.js` 文件照收（settings/foundation import，与 SDC 上游逐字一致，**勿改其内容**；上游 `tests/shared-body-wrappers.test.mjs` 的期望按本仓合同适配） |
| `src/v3/people-workspace.js` + `src/ui/people-profiles-view.js` | 上游增删人物工作区功能 | **整文件保持与上游逐字相同**（v0.6.0 定案：直通系上游设计意图，源码/工厂签名/import/测试含直通断言均随上游）——**勿再回植 extraOnly**（§3.2 已回归清单）；唯 `saveProfile → invalidate('peopleProfileSaved', …, { clearPersisted: true })` 联动除外（§3.4 ②） |
| `src/v3/foundation-domain.js` | 本地 `SANITIZER_VERSION = memory-content-sanitizer-v2`、keepTags `''`（M0），上游停留 v1+`'content'`——同一宿主聊天两侧派生**不同确定性图 ID**（floor/run/checkpoint/index 全链） | **保留本地合同**；上游 fixture `tests/fixtures/tt2-native-init-failure.json`（编码上游预计算 ID）须按本地语义重生成——以 `fstore.recordKey(record)` 捕获 run/checkpoint/floor/index（索引键含 `floorOrder-0-` 段，勿手拼 `v3-index-<id>`），run 回卷 `retryableError`+`V3_GRAPH_INDEX_ROUTE_INVALID`、无 root |

### 2.2 本地已修改的上游产权文件（上游重写对应链路时，以本地增强为产权逐项回植并重跑对应测试全绿）

> - `src/v3/recall-runtime.js`（本地增强，详见 §3.4）：`tests/v3-recall.test.mjs` 与上游逐字相同、**不得追加本地断言**，本地断言一律加在 `tests/recall-local-guards.test.mjs`（前情相关在 `tests/v3-recall-prequel.test.mjs`）。当前契约：
>   ① **见证向前截断**——`captureCoreBodyWitness(coreChat, sanitizerOptions, fingerprint, maximumFloors = 3, userMessage = null)`，循环以触发用户楼定位 `triggerIndex` 向前采集，上限用上游归一化值 `normalizeAutoHideKeepAiCount`；内部调用点传 `(…, recentBodyFloorLimit(), user?.message)`。
>   ② **invalidate 三参**——`(reason = 'invalidated', sourceEvent = 'runtimeInvalidate', { clearPersisted = false } = {})`，函数体首行 `requestDiagnostic.clear()`；`clearPersisted: true` 时删除最新用户楼持久化收据并 `saveChat()` 落盘。三处 UI 调用点用事件名方言（`manualMemoryEdit` / `foundationFullRebuild` / `peopleProfileSaved`），**漏改则 `{ clearPersisted }` 落入 `sourceEvent`、清理静默失效**。
>   ③ **密封点活版本重对齐**（`commitPromptIfCurrent` 内、`captureCoveredBodyGuards` 之后）：条件 `currentSource !== source && currentSource?.status === 'ready'`（与上游 `basePreparedSource(…, { fresh: true, sourceToVerify: source })` 无条件 fresh 重读 + 对象同一性判定等价），以活档案头 Checkpoint/Revision/正文指纹重签 `receiptFingerprint`。
>   ④ **前情依赖与旧回执有界迁移**（2026-10-24）——新回执带可选 `prequelDependencyFingerprint`（前情源文本指纹，空前情 `null`）并纳入签名材料（`receiptMaterial` 追加，旧回执按原材料验签、只读展示不受影响）；`savePrequel` 仅文本真实变化才动手（未变/失败不动回执），变更时在前情**同一次**元数据保存写入 `qianqianjiePrequelReceiptInvalidation` = 当时最后 USER 内容指纹（失败随前情一并回滚），同聊路径 `invalidate('prequelSaved','prequelSaved',{clearPersisted:true})`、**跨聊路径只内存清 A 当前 USER、不落盘不清 B 不借 B 保存接口写 A**；复用校验（`intercept` 候选循环）：旧格式（无该字段）回执命中标记即失复用资格、新回执按指纹比较——迁移有界（每「前情变更×旧格式回执」至多重选一次）。地点侧 v0.9.2 起已与上游趋同（上游独立实现了 `beforeIndex`（默认 `Infinity`、调用点按 `['swipe','regenerate']` 限定）、空 `values` 返 `null`、`locationReferenceDependencyMatches` 旧空占位宽容）——**保上游形状**，本地同功能实现已删。
>   正交性论证与 v0.6.8 损坏教训（定义/使用分居两处被重写区域、`sameRoot` 被吞）见 `docs/merge-notes.md` §2–§3——归因法：用「合并树 vs 纯上游 diff」定位残余差异，勿据单侧绿误判。
> - `src/v3/floor-binding.js`：`matchFloorCandidates` 可选第三参 `{ equivalentContent }` 与绑定种类 `'locatorEquivalent'`——弥合「本地 M0 保留已配置故事时钟引用标签于 canonical 正文」与「上游保证编辑时间标签不得撤销已落盘覆盖」的语义冲突；私有助手 `withoutStoryClockReferenceTags` 剥离仅已配置的引用标签后比较，仅供 `readTimeBody` 传入。
> - `src/v3/time-body.js`：**剥壳投影**（2026-10-11 定案）——`currentBodyClock` 在 canonical 结构化读取无果时对 canonical 同文做时间专用投影：先整块移除平台排除块（`TIME_EXCLUDED_TAGS`，含 `record` 单数），再剥掉其余闭合标签块的壳读时间。控制信号另走原文控制视图：仅应用用户 `extraTags` 隔离，保留 QQJ/SDC 注释、配置的时间参考标签和 `<br>` 换行；正文仍只消费 canonical。排除名单与 extractor 同步并由逐名行为守卫锁定。三条件：只投影 canonical 不碰原文；排除块整块移除；canonical 优先（结构化解释压过扁平文本）。未声明的闪回/回忆类块仍须用户填入 `extraTags` 才会排除。`readTimeBody` 仍向 `matchFloorCandidates` 传第三参 `{ equivalentContent }`（见 floor-binding 条目）。另（2026-10-24）：`readTimeBody` 时间指纹用 `sourceRaw || summaryRaw`（弱时间参考不再以空原文覆盖主线时间）。
> - `src/v3/extractor.js`：**start-only 故事钟不合成起点时间行**（上游合同，第二早退：无模型主线、可靠结束、参考或正文时间时原样返回）——v0.8.0 时代的「残缺同楼时间戳」红例已随上游 v0.9.x 测试重写消解（2026-10-24 复核通过）。**v0.9.2 裁决**：schema 回显拒绝取上游 `isSchemaMetadataCandidate`（文本级、更严；本地 `isSchemaOnlyPacket`+`JSON_SCHEMA_KEYS` 已删）；第一早退取上游 namespace-scoped 版（`(!referenceText || clock?.namespace?.startsWith('tag:'))`，本地无锚定 solid-chronology 变体已弃）；本地保留：`excludedTags` 的 `record` 单数、fallbackText/kind/precision 中 canonicalTime 先于弱 `referenceText` 的降序（对现有用例惰性）。
> - **UI 联动点**（上游重排装配代码时保住三处 `invalidate` 联动）：`src/ui/v3-foundation-view.js`（单楼编辑 / 完全重构）、`src/ui/people-profiles-view.js`（`saveProfile`）、`src/bootstrap.js`（`recallRuntime` 注入通道）。**v0.7.2 起完全重构跨聊天继续执行**——上游 `fullRebuild(expectedChatId, mode)` 绑定固定目标聊天（异聊天并发报 `QQJ_REBUILD_BUSY`、目标不符报 `QQJ_REBUILD_TARGET_INVALID`），其完成回调**不得**无条件 `clearPersisted`，须先比 `runtime.getState().chatId === 捕获时的 state.chatId` 再 `invalidate('foundationFullRebuild', …, { clearPersisted: true })`，否则 A 聊天重构跑完会误删当前显示的 B 聊天持久收据（`src/chat-memory-management.js:165 adoptRebuiltTarget` 在真实切聊后不切回；`src/ui/v3-foundation-view.js:1640` 的 `{...state, ...taskState}` 即该差异来源）。
> - **v0.8.0 覆盖型迁移实录（`v3-foundation-view.js`）**：上游把本楼记忆编辑器从 `renderMemoryFloor()` 内联 `if (draft) {…}` 块抽为独立 `openMemoryEditor(floor, state, key, draft)` **弹窗**（`customImpl` + `qqj-editor-dialog` + 局部 `draw()` 重绘），并把卡片体改为惰性 `buildBody()`；**冲突块下游的公共代码引用上游新引入的 `currentState`**，故必须整体取上游结构。**「并集」在此类冲突上是错的**：`openMemoryEditor` 作为新函数会自动合入并 `drafts.set(key, draft)`，保留本地内联块会同时渲染两份编辑器，且缓存失效只挂在内联路径上 → 弹窗保存后静默不失效。正确做法是**迁移**：取上游结构，把 `recallRuntime?.invalidate?.('manualMemoryEdit', 'manualMemoryEdit', { clearPersisted: true })` 移植进 `openMemoryEditor` 的 `run(…).after` 回调。判据：先 `git grep` 特征串确认上游是「删除」还是「搬迁」，再查基线确认本地块是「新增定制」还是「保留旧行为」。**该 after 回调须先比 `nextState?.chatId === state.chatId`（保存发起时的聊天）才执行清理联动**（2026-10-24）：否则 A 保存期间切到 B，A 的完成回调会误删并保存 B 的回执。
> - **v0.7.9 上游隐藏「空间记录」UI**：删除 `placeNameCache`/`placeNamesFor` 助手与整块 `qqj-memory-spatial` 渲染（内部空间记忆与「地点」meta 保留），并把 `EXTRACTOR_FIXED_CONTRACT` 第 11 条地点粒度改写为「按房间或有独立意义的区域」。本地未定制该区块，**全采纳，勿回植空间 UI**。
> - `src/ui/help-guide.js`：本地改两处——设置章节「保留包裹符」说明段（P5 通用包裹符双栏语义）+ 排障手册「大量楼摘要缺正文」段尾的日期读取教义句（2026-10-11：含日期的闪回/回忆类块会被当作本楼当前时间，extraTags 声明可排除）。上游高频重写本文件文案——裁决：**上游新增段落全收 + 两处本地保持**（包裹符段上游侧仍是旧 `[[...]]` 专用描述，勿取上游侧；教义句属上游文案区内的本地追加句尾，合并后须核在位）。
> - `src/v3/recall-selector.js`（本地四项纯性能记忆化，详见 §3.5）：**语义零改动**，判定输入一字未动；上游重写本文件时按以下锚点逐项回植，并以 `node tools/perf-audit/verify-equivalence.mjs <上游合并前提交>` 确认输出逐字节不变：
>   ① `compactOf`（按**字符串**记忆化 `compact()`；`COMPACT_MEMO_LIMIT = 200000`）——`decorate()` 每轮 `{...value}` 克隆候选，但克隆体**共享 `_coreText`/`_rankText` 字符串实例**，故按字符串键可跨轮命中（按对象键则命中率仅 ~4.5%）；
>   ② `entityDerivedCache`（`WeakMap` on `context`）上提 `entityTokens` 与 `entityNameEntries`（实体名 → 已 `compact` 的标签表），替代 `recordFor()` 内对 92 实体的逐次扫；
>   ③ `stableKeyMemo` + `historyStableKeyRaw`（按对象记忆化 `historyStableKey()`，仍是导出的 `historyStableKey`）；
>   ④ `preparedMaterialMemo`（按 material 文本共享 `prepareMaterial()` 结果，使 `materialTokens` 的懒加载 `tokens` Set 得以存活）。
>   **反例警示（勿回植）**：「按内容键跨轮缓存 `recordFor`」的键不完整——`historyStableKey` **不含** `_rankText`／`towardEntityId`／`*?.sourceFloorId`，而这些正是 `recordFor()` 的输入，用它做键会把仅 `toward` 不同（上游 `cseDuplicateKey` 特意区分）的值串成同一条 record（实测收益在噪声内：0.982×/0.989×）。
>   **正例（v0.7.0 已采纳，勿再删）**：上游 `recordsByValue`——`WeakMap` 按**对象身份**缓存 `recordFor()` 结果，作用域严格限于**单次 `buildStorylinePlan()`**。安全前提：`recordFor()` 的输入是 history 数组内的**原对象**（不经 `decorate()` 克隆），故既命中又**不会在「同文本、不同 `towardEntityId`」之间串记录**；成立前提是该 plan 执行期间候选对象不被原地修改。**红线**：绝不可改成按 `historyStableKey`（或「稳定键 + 文本」）跨对象／跨轮缓存。
>   **合并陷阱（v0.7.0 实录）**：上游把 6 处 `materiallySame(` 调用点自动改写为 `sameMaterial(`，而其定义在被弃的那一侧——只取本地侧会 `ReferenceError`。解法是保留本地缓存块 + 加薄别名 `const sameMaterial = (left, right) => materiallySame(left, right, prepareMaterial);`，使上游调用点字节不变、行为路由本地缓存（同类实例见 `docs/merge-notes.md` §4）。
>   **同时弃用**（上游 v0.7.0 的 plan 级缓存，勿再回植）：`compactForPlan`／`prepareForPlan`／`searchableEntityLabels`／`compactByText`／`preparedByValue`——按**对象键**，在 `decorate()` 克隆下几乎不命中，且与上面的字符串键缓存重复。

### 2.3 自动合并正交区（3-way 自动合入，合并后核对资产在位即可）

`src/v3/cse-engine.js` / `src/v3/memory-runtime.js`（本地 `extraOnlySanitizerOptions` 拦截与上游新提示词/千事调度正交）；`index.js`（`settings.migrateSanitizerKeepTags?.()` 迁移调用，定义在 `src/settings.js`）；`src/host-context.js`（上游 v0.7.10 新增 `cloneHostJsonMetadata(value) = JSON.parse(JSON.stringify(value))`——宿主 metadata 的 JSON 持久化边界，替换 index.js、`src/chat-session.js`、`src/v3/chat-branch-inheritance.js`、`src/v3/message-floor-anchor.js`、`src/chat-memory-management.js` 共 6 处 structuredClone 前手写克隆；本地未改该链路，纯上游产权，勿改）。

**`src/settings.js` 自 v0.9.2 起为受保护区（共享包裹符容器 M0 三件套，与 SDC `runtime/settings.js` 同构）**：① `get()` 内 `getSharedBodyWrappers(extensionSettings)` 初始化调用必须在本地默认值（`sourceKeepTags:''`）回填**之后**（上游在 store 创建期先初始化 → 全新安装落到回退值 `'content'` 丢失 M0）；② `wrappers()`/`updateWrappers()` 必须先经 `get()` 再触共享容器（防未物化路径直读）；③ 写入用本仓 `writeWrappers`（`normalizeTagRules`，大小写敏感）——**不得用 `updateSharedBodyWrappers`**（按上游规则 lower 归一命名对，破坏 §3.1 合同；共享容器照用、上游插件读取时各自归一化）；④ `migrateSanitizerKeepTags` 重置旧默认 `'content'` 时须同步重置已初始化的 `schedule-planner.bodyWrappers.keepTags`（get() 先于迁移执行，容器已吃到旧默认）。`src/ui/settings/prompts-settings.js` 同步守卫：采上游 `wrappers()/updateWrappers/blur` 管线 + 本地 `bindTagFieldWithClashCheck` 两栏冲突拦截（读/回退走 `settings.wrappers()`）。

**上游一键聊天记忆迁移模块（v0.7.3 新增，纯上游产权，勿改）**：`src/chat-memory-migration.js`、`src/v3/memory-migration.js`、`src/v3/migration-prefix.js`、`tests/chat-memory-migration.test.mjs`。其 `sanitizerOptions = () => ({})` 默认值（`src/chat-memory-migration.js:113`）在本 fork 的 M0 直通合同下与本地语义**一致**（不注入 `keepTags:'content'`），故**无需回植本地变体**——上游若日后改为注入默认 `keepTags`，须按 §3.2/§3.3 同一理由评估是否改用 `extraOnlySanitizerOptions`。

---

## 3. 必须保住的本地核心定制资产（Fork 存在的价值，合并时逐项复核）

### 3.1 四模式标签清洗器（与 ST-SevenDaysCal 逐字节一致）

- **核心文件**：`src/memory-content-sanitizer.js`（树形单遍解析，`sanitizeMemoryContent` 接口）；`src/tag-sanitizer.golden.json`（40 例金样，LF 行尾；口径自 2026-10-24 起为 **39 例逐字 + `brk-extra-paired` 1 例显式安全修正**——该例旧期望 `前中 c]]尾` 本身是嵌套噪音泄漏，新输出 `前中尾` 才符合 M3，测试同时断言历史值与修正值留痕）；`tests/tag-sanitizer-golden.test.mjs` 与 `tests/memory-content-sanitizer.test.mjs`。
- **核心合同**：
  - **M0（两栏皆空）**：直通不清洗，保留正文，仅做注释/孤立标记清理；
  - **M1（仅 extra）**：成对删除 extra 标签及内容，未闭合 extra 吞至同名闭合或文末（噪音不泄漏）；
  - **M2（仅 keep）**：剥壳保留 keep 块内容（内部不再二次清洗，嵌套标签原样保留），块外裸文本丢弃；
  - **M3（混合）**：extra 恒优先，无论在外层、包裹 keep 还是嵌套在 keep 子树内一律整块剔除；
  - **三分支 token 正则**：`TAG_ATTR_SOURCE`（引号感知，属性内 `>` 不截断）+ `TAG_ATTR_FALLBACK_SOURCE`（未闭合引号宽松兜底回退旧行为，防止思维链泄漏）+ 每条配置的字面量包裹规则各一分支（`freshTokenRx(wrapperRules)` 动态生成）；
  - **自闭合标记**：keep 子树内自闭合 extra 标记连标记删除，非 extra 原样保留 openRaw。
- **通用字面量包裹规则（P5，2026-09-30 按方案 B 恢复）**：两栏都接受任意「起始...结束」（`LITERAL_WRAPPER_SEPARATOR = '...'`，如 `{{...}}`、`<<...>>`），`...` 前=开定界符、后=闭定界符；keep 栏=剥壳取内层，extra 栏=连定界符整块删除，`[[...]]` 只是其特例。解析由 `collectWrapperRules(keep, extra)` 收集两栏并集（去重、按开定界符长度降序防短前缀抢占）后生成 `kind:'wrapper'` 节点（节点自带 `openRaw`/`closeRaw` 重建）——**无硬编码 `\[\[…\]\]`，也取消了上游式前置删除与 keep 栏 `TAG_NAME_PATTERN` 过滤**。`normalizeTagRules` 对包裹规则原样保留（大小写敏感）、标签名照旧小写；非法形态（开/闭定界符为空、`...` 出现两次）按 `literalWrapperRule` 三条件丢弃。
- **同名嵌套包裹符平衡配对**（2026-10-24，两仓同步）：字面量定界符 token 开闭入栈配对（`pairWrapperTokens`，相同开/闭优先关闭当前包裹、最长定界符优先识别）；未闭合的开/闭**包裹定界符保持文本、不吞至文末**（XML 标签的 M1 吞至文末合同不变）；包裹边界隔离内部 XML 闭合标记；字面量规则大小写敏感、**不加小写别名**（`[DRAFT]`≠`[draft]`）。两仓 18 条平衡嵌套用例逐字一致；上游 `dropLiteralWrappedContent` 仍是扁平 indexOf 扫描——分歧自此从「无嵌套用例」变为「有 1 例金样修正 + 18 条守卫」。
- **与上游共享模块 `shared-body-wrappers.js` 的三向分歧**（2026-10-24 定案）：上游 v0.9.0 起两仓上游携带逐字一致的该文件（MK `src/`、SDC `utils/`，跨插件经 `extension_settings['schedule-planner'].bodyWrappers` 共享包裹符设置）——**文件照收、内容勿改**（MK 上游测试跨仓读 SDC 副本对拍），但其 `sanitizeStoryBody` **不用作 `sanitizeMemoryContent`**（对拍 40 例金样仅 13 例一致：缺省 keep='content'、命名对大小写不敏感、M0 直通/M1 未闭合/同名 extra 语义全不同）；上游「HTML 注释对作包裹定界符」能力**不采纳**（本仓注释属 M0 卫生清理，与 SDC 一致）；`normalizeTagRules` 输出**去重**已与上游 `normalizeWrapperRules` 对齐（两仓同步，`CONTENT`/`content` 归并一项）；上游 `tests/shared-body-wrappers.test.mjs` 期望按本仓合同适配（含全新安装共享容器 keepTags='' 而非上游 'content'）。
- **测试侧不得回退**：`tests/memory-content-sanitizer.test.mjs` 中上游两条依赖「默认 keepTags='content'」语义的断言，已按本地 M0 合同改写为直通正断言，未来合并不得采用上游语义覆盖。
- **v0.8.0 起「`<location>` 缺省剥除」类**：上游清洗器对 `<location>…</location>` **无条件剥除**，本仓 M0 合同**保留**它（属普通配对标签，未配置即不清洗）。上游 v0.8.0 新增/改写的测试（`tests/v3-recall.test.mjs` 的「人工地点清除」例、`tests/v3-extractor-memory.test.mjs` 的「地点名参照」与「地点绑定和父级」两例）依赖该缺省行为 → 一律本地适配（显式 `extraTags:'location'`，或把 canonical 期望值改为 M0 直通原文），**严禁为迁就测试而给清洗器加 `<location>` 缺省剥除**（会破坏 40 例金样与 SDC 跨仓对拍）。该适配反而更强：原消息地点标签真实存活时，「人工清除」的抑制效果才可被单独验证。
- **v0.5.8+ 双层文件结构**：前半部本地四模式合同，后半部上游移植段（`stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`parseTagTokenTree`，服务 v3 时间链路，`<br>` 按 void-tag 处理、节点携带偏移元数据；移植段归一化引用走本地 `normalizeTagRules`）。上游后续若改这些导出，直接对齐上游该段即可。

### 3.2 非 AI 正文来源 extra-only 隔离清洗（防止世界书/用户输入被洗空）

- **核心辅助函数**：`export function extraOnlySanitizerOptions(options = {}) => { keepTags: '', extraTags: options?.extraTags ?? '' }`
- **保护场景与调用点（仅剩 3 处，均为上游活洗空点）**：`src/v3/cse-engine.js`（`captureCseBaseline` 遍历世界书条目，上游 M2 提取致无 `<content>` 标签条目洗空后静默跳过）；`src/cse-source-selection.js` 扫描窗 rows 分路（assistant 行保 keep 提取+合并 `qqj-cse`，用户行/canonical 行走 plainText extraOnly）；`src/v3/memory-runtime.js`（`capturePrecedingUserInputFromSnapshot` 用户输入快照）。
- **已回归上游直通的点（勿再回植）**：`src/v3/people-workspace.js` 人物整理世界书（v0.6.0 定案，整文件回归上游，§2.1）；`src/cse-source-selection.js` 动态世界书（上游本为 clean+宏替换直通，extraOnly 仅剩卫生价值已撤）。
- **设计依据**：`keepTags`（如 `'content'`）是 AI 正文专属提取白名单；普通用户输入或未加自定义标签的世界书条目若流经 `keepTags` 会被直接清空为 0 字。非正文来源必须强制走 extra-only 清洗。

### 3.3 提示词与标签设置 UI 校验 (`src/ui/settings/prompts-settings.js`)

- **默认值配置**：`src/settings.js` 中 `sourceKeepTags: ''`（默认留空直通）。
- **存量迁移 (`migrateSanitizerKeepTags`)**：上游默认 `sourceKeepTags: 'content'` 会被 `get()` 的默认回写持久化进老存档，本地严格 M2 下会把无 `<content>` 标签的 AI 正文整楼清空（`foundation-domain` 的 `if (!canonicalContent) continue;` 静默跳楼）。版本化迁移 `sanitizerKeepTagsMigrationVersion` 0→1 四边界：仅持久值为纯 `'content'`（trim+小写完全相等）才重置 `''`；用户手改值原样保留；迁移后再手填 `content` 永不覆盖；全新存档直接置位。`index.js` 在 `settings.migrateLegacyApiSettings()` 之后以**可选链**调用；断言见 `tests/settings-api.test.mjs` 末尾两条。
- **保存拦截器 (`bindTagFieldWithClashCheck`)**：两栏失焦保存时自动做归一化交集计算（标签名与字面量包裹规则一并参与）；同名冲突即**拒绝落存**，输入框回退 `settings.get()[key] ?? ''`（= 该栏最近一次成功保存值；**不得**用视图创建时快照——本面板只在 `src/ui/panel.js` 初始化时创建一次，二次冲突会回退成陈旧值），并显示行内红色警告。守卫见 `tests/settings-modules.test.mjs`「包裹符冲突回退取最近一次成功保存值」。

### 3.4 召回回执重新生成（Regenerate）秒级复用机制

- **核心文件**：`src/v3/recall-runtime.js`（修复主体）；`src/ui/v3-foundation-view.js`；`src/ui/people-profiles-view.js`；`src/bootstrap.js`。
- **双重致错源头**（删当前用户楼 → 重新发送 → 重新生成，稳定复现）：① **并发盖错公章**——选材 LLM 耗时窗口内底层地基扫描推进全局 Root，原代码收据仍盖选材开始时的旧公章，存盘即过期；② **见证指纹漂移**——原 `captureCoreBodyWitness` 从数组末尾逆向采集，重新生成时尾部残留刚撤下的 AI 楼层。
- **本地修复三件套（治本，不可被上游旧代码覆盖）**：见证向前截断（§2.2 ①）、三端联动主动失效（§2.2 ②）、密封点活版本重对齐（§2.2 ③）。
- **与上游 `root: 0` 极速通道共存**：上游 `commitFrozenReceiptIfCurrent` 复用阶段有意不比对 Checkpoint/Revision（测试锁定复用零 I/O）。本地修复零性能开销：日常重新生成照走极速通道，仅人工修改记忆时精确清缓存重选材。
- **本地守卫测试**：`tests/recall-local-guards.test.mjs`（上游无此文件）集中回归本地补丁——见证向前截断对照、`matchFloorCandidates` 探针与 `'locatorEquivalent'`、`extraOnlySanitizerOptions` 合同、`invalidate` 默认不删持久收据而 `clearPersisted: true` 才删并 `saveChat`、时间参考标签探针。上游重写对应链路后**先跑它**。

### 3.5 召回选材性能（`src/v3/recall-selector.js` 四项记忆化）

- **动机**：长聊天（129 楼层记忆 / 92 实体）点「重新生成」时 `buildStorylinePlan()` 占 `selectRecall()` 壁钟 **92.7–97.3%**（`candidateBuild` 一步 ~20.2s），主线程被单核跑满、界面无响应。根因是**同一批字符串被反复重算**：键推导（主要是作用在最长 12000 字符 `_coreText` 上的 `compact()`）占 self time **42.4%**，而真正做集合交集的 `setIntersection` 只占 **0.3%**（逐项成本分布见 `docs/audit-recall-budget-loop-2026-10.md`）。
- **四项改动（语义零改动，判定输入一字未动）**：见 §2.2 末条。实测 `contextSize=8192`、median-of-5 加速 **n=48 17.18× → n=192 35.49×**；实机卡死上报场景（n=129 / `contextSize=20000`）**20201ms → 706ms = 28.62×**，增长指数由 `n^1.76` 降到 `n^1.24`（完整数表见审计文档）。
- **等价性证据**：`node tools/perf-audit/verify-equivalence.mjs HEAD` = **144/144 逐字节一致**（`injectionText` 逐字符 + 完整结果树 canonical 深比）；四门禁全绿。判据：三者都是纯函数（`compact`/`historyStableKey`/`prepareMaterial`）按输入记忆化，`entityDerivedCache` 只上提依赖 `context` 的常量。
- **仍未解决的（有意留作后续）**：`buildStorylinePlan` 内层仍是 **O(m²)** 对比较（四层：候选线生成／建线合并／附着／continuity 兜底）。本改动只砍常数与部分指数，**不改阶**——悬崖仅从 192 楼推到 **~1500 楼**（数表见审计文档）。要真正压阶只能收缩参与分组的候选池（`baseHistory` 有原则预过滤）；硬切 `.slice(0,128)` 实测可得 17×–54×但**会改变召回结果**，不可取。
- **五条教训**（`docs/audit-recall-budget-loop-2026-10.md` 有完整取证）：
  ① **缓存要打在热点上，且键必须廉价**：成本分布是键推导 **42.4%** 对 `setIntersection` **0.3%**——为便宜运算付昂贵键即净亏（键成本对原运算之比实测 401× / 15.39×，见审计文档）。故本节只缓存**最贵的** `compact`/`historyStableKey`/`prepareMaterial`。
  ② **跨轮记忆化不能按对象身份**：`decorate()` 每轮 `{...value}` 克隆候选 → 按对象键命中率仅 **4.5%**；但浅拷贝**共享字符串实例**，按字符串键才有效。
  ③ **缓存键必须覆盖被缓存函数的全部输入**：用「`historyStableKey` + 内容」做 `recordFor` 的键会串记录（该方案收益也在噪声内：0.982×/0.989×），故剔除——详见 §2.2 反例警示。
  ④ **审计基线的谱系必须断言**：性能夹具曾在跨上游版本比较中给出虚假的「逐字节一致」；`tools/perf-audit/lib/recall-audit.mjs` 的 `assertUpstreamMarkers()` 让这种情况**抛异常而非静默通过**。
  ⑤ **对象身份缓存并非一律不可用，取决于输入是不是「原对象」且作用域是否够窄**：②的克隆前提不适用于 `recordFor`（它读 history 数组原对象），故上游 v0.7.0 的 `recordsByValue`（`WeakMap`，作用域仅单次 `buildStorylinePlan()`）既命中又安全，已采纳——详见 §2.2 正例。判据仍是③。
- **审计工具**：`tools/perf-audit/`（`verify-equivalence.mjs` 等价门禁、`benchmark.mjs` 计时与指数拟合；`README.md` 载方法学与夹具设计理由）。变体物化到**系统临时目录**（`SCRATCH_DIR = tmpdir()/qqj-recall-perf-audit`，见 `lib/recall-audit.mjs`），即仓库之外——**绝不写入 `src/` 旁，也不需 `.gitignore` 条目**。

---

## 4. 验证清单与验收标准（4 道硬性门禁）

1. **清洗器金样与单元测试**：

   ```bash
   node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs
   ```

   *标准*：43/43 全绿（40 例金样 = 39 例逐字 + `brk-extra-paired` 显式安全修正（§3.1）；另含 18 条同名嵌套平衡用例与清洗器合同断言）。
2. **生产构建与入口装配测试**：

   ```bash
   node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs
   ```

   *标准*：23 例中除「生产入口行为接线」（上游原生红，见下）外全通过；前者验证 manifest 缓存键与 bundle SHA-256 绝对吻合。
3. **全量测试套件**：`npm test` —— 当前基线 **2076 例 / 2072 通过 / 4 上游原生红**（2026-10-24，v0.9.2 合并后；纯上游 v0.9.2 树基线 2018/2012/6 实测，其中 2 例系跨仓读 moon-SDC 之故在纯上游树假红、在合并树已绿）。4 红 = ① `production-entry-load`「生产入口行为接线」——上游新增 4 个纯模块未同步依赖清单（本地已代修补 define，见 §2.1）**叠加**「人物资料/生日变化仍触发时间更新」断言：上游期望的「人物→时间」订阅门控在 v0.9.x 装配中已不存在（同款代修后纯上游树同败实证，属上游断言与现实脱钩）；②-④ `v3-foundation-view`「needsReview 终态/管理页刷新反馈/旧刷新失败所有权」三条——上游改了测试期望未同步 src 文案（纯上游树同败）。若沙箱报 `Error: spawn EPERM`（环境边界非回归），加 `--test-isolation=none`——**注意 `npm test -- --test-isolation=none` 会把该标志追加在 glob 之后而被忽略（照样 EPERM 全红），须直跑 `node --experimental-vm-modules --test --test-isolation=none --test-concurrency=1 "tests/*.test.mjs"`**。
   > **已知偶发（勿误判为本地回归，先跑纯上游对照）**：① `tests/v3-extractor-memory.test.mjs` 个别时序断言在空闲快速机器上可能漏窗失败，重跑即过（纯上游树可复现）；② `tests/tauri-backend.test.mjs` 并行满载下 `t.after` 清理临时目录报 `ENOTEMPTY`，单跑该文件或重跑全量即过（纯上游树可复现）；③ 上游基线曾现「1000楼 production store」一次漏窗失败，重跑即过。
   > **上游原生红判定法**：某测试文件与上游**逐字节相同**而失败时，先在纯上游树跑同一文件；计数相同即上游原生，禁止为「让全量变绿」而改本地 `src/` 合同。**慢文件勿整跑**（`v3-extractor-memory.test.mjs` 含 1000 楼生产夹具，整文件数分钟），用 `--test-name-pattern` 按例对照。**叠层红揭蔽**：上游某断言层失败会遮蔽其后的断言（如依赖清单红遮蔽人物→时间断言），代修第一层后须在纯上游树复跑确认第二层归属再定处理。
   > **v0.8.0 起新增一类上游原生红**：上游新增/改写的测试依赖其清洗器**缺省剥除 `<location>`** 标签，本仓 M0 合同保留该标签（§3.1）→ 按 §2.1 代修（显式 `extraTags:'location'` 或改 canonical 期望值），**不得改清洗器缺省行为**（会破坏 40 例金样与跨仓对拍）。v0.9.2 起 `<location>` 适配面随上游测试重写基本消失（9 例定位、实跑仅零星需适配）；同类新增「上游 keep='content' 宽松语义」依赖（夹具正文无标签仍期望保留文本）按 §3.1 M2 合同改夹具（如 `production-entry-load` 别名分支改 M0 直通），勿改清洗器。
4. **与 ST-SevenDaysCal 跨仓终验对拍**：40 例金样（`src/tag-sanitizer.golden.json` 与 SDC `runtime/tag-sanitizer.golden.json`）按「39 例逐字 + 1 例 `brk-extra-paired` 显式安全修正」口径双实现**跨仓一致**，18 条平衡嵌套用例两仓逐字相同（§3.1）；另复跑 `tests/settings-api.test.mjs`（跨仓 settings 断言）。

---

## 5. 当前仓库状态底数（基线备忘）

- **工作分支**：`main`；**上游基线**：已合入 `upstream/main` v0.9.2（提交 `7948af1`，跨度 v0.8.1+v0.9.0+v0.9.1+v0.9.2）。本次合并提交及父提交见 §5.1 与 git 历史；
- **产物版本**：`manifest.json` 版本号 `0.9.2`（含 `author: "atonal519"`），缓存键 `20261024.129-658429a52fe9524a`（哈希与真实 bundle 一致）；
- **v0.9.2 合并要点（2026-10-24）**：20 冲突按「fork 资产保本地 / 上游同向修复取上游 / 本地语义嫁接上游管线」三原则裁决（清洗器三向分歧 §3.1、共享容器 M0 三件套 §2.3、地点/disabled 快路径/schema 拒绝均上游同向趋同取上游形状）；`verify-equivalence` 144/144（边界文案临时中和法隔离验证记忆化透明）；四项记忆化与 §2.2 全资产在位；
- **v0.8.0 审计修复（2026-10-22~24，已随 `7729c3a` 提交）**：空地点依赖、知情边界预算、时间 disabled 快路径、跨聊天弹窗保存保护、地点 beforeIndex、前情回执重选与旧回执有界迁移（§2.2 ④）、清洗器嵌套平衡（§3.1）；取证 `docs/audit-v0.8.0-test-failures-remediation.md`；
- **本地性能修复（2026-10-07）**：`src/v3/recall-selector.js` 四项记忆化（§3.5 / §2.2 末条），语义零改动；取证全文 `docs/audit-recall-budget-loop-2026-10.md`，审计工具 `tools/perf-audit/`（其 `absolutizeImports` 兄弟清单含 `memory-exclusion.js`，跨版本对比按「存在才重写」）；
- **兄弟仓库同步**：`ST-SevenDaysCal` 已同步至 v3.9.6moon（2026-10-24 合入 v3.9.5+v3.9.6，合并提交 `8222038` + 修复 `f691dc6`/`f7a426f`；共享容器同款 M0 三件套已同步）；两仓清洗器按「39 例逐字 + 1 例显式安全修正」口径与 18 条平衡嵌套用例逐字一致（§3.1），`normalizeTagRules` 去重两仓同步；SDC 全量 411/409+1 上游原生红+1skip；MK 跨仓 settings 断言由 SDC v3.8.0 起满足。

### 5.1 合并历史索引（细节回查：`git log -p AGENTS.md` / `git show <合并提交>`；**每行 ≤120 字符**，见前言防回胀）

> **v0.6.11 及更早（v0.5.0~v0.6.11）共 7 行实录已外置**：见 `docs/merge-notes.md` §1。

| 上游版本 | 日期 | 合并提交 | 冲突与裁决要点 | 当期全量 |
| :--- | :--- | :--- | :--- | :--- |
| v0.6.12 | 10-07 | `b422e28` | 2 冲突（dist 重建 + 键 `20261006.19-f5bc5d2239eb3a09`）；三增强与三处 UI 方言幸存 | 1564 |
| v0.7.0 | 10-08 | `118e68d` | 3 冲突；保本地四项记忆化，只采上游 `recordsByValue`（§2.2）；键 `20261008.39-e0cadf4e4a535afa` | 1588 |
| v0.7.1 | 10-09 | `746b48c` | 身份与千事重判并集；本地召回/清洗资产保留；键 `.47-ff373043728cf283` | 1606 |
| v0.7.2 | 10-10 | `a037fa4` | 3 冲突；完全重构跨聊天的失效门控（§2.2 UI）、空间事实与 IDB 缓存全采纳；键 `.386-e234f79fdc9e617a` | 1638 |
| v0.7.3+v0.7.4 | 10-10 | `9c8667b` | 5 冲突；bootstrap/time-body 并集；迁移模块上游直通（§2.3）；键 `.387-16163a91ab386e31` | 1681 |
| v0.7.5+v0.7.6 | 10-11 | `28a33b7` | 2 冲突；上游自带 2 认领挂/红测试代修；嵌套 record 修复；键 `.395` | 1702 |
| v0.7.7+v0.7.8 | 10-12 | `3b3ddc1` | 3 冲突；bootstrap 并入诊断且保人物失效联动；键 `.72` | 1717 |
| v0.7.9+v0.7.10 | 10-12 | `aa1691e` | 2 冲突（dist 重建、键 `.77-a5489a5c29fb0687`）；空间 UI 移除+prompt-31 全采纳 | 1721 |
| v0.7.11+v0.7.12 | 10-13 | `1ede0fb` | 2 冲突（dist 重建、键 `.84-c8fb4019a5778016`）；分支迁移+prompt-32 | 1725 |
| v0.7.13 | 10-14 | `c711ee8` | 2 冲突（dist 重建、键 `.89-e973510603efafb3`）；核记录缓存开关全采纳+上游版本断言代修 | 1727 |
| v0.7.14+v0.7.15 | 10-15 | `a61cfd5` | 3 冲突（dist 重建、manifest 版本+键 `.125-cd3219844744ee4f`、入口断言采上游）；batch 读协商代修 | 1739 |
| v0.8.0 | 10-20 | `bd44158` | 14 冲突；编辑器迁移+三处 invalidate 保位；删 legacyIndexPuts；键 `.126-58d4b7dcebff9b7f` | 1882/1922 |
| v0.8.1+v0.9.0+v0.9.1+v0.9.2 | 10-24 | `c6ace7c` | 20 冲突：清洗器三向分歧保本地（§3.1）、SANITIZER_VERSION 保 v2、共享容器 M0 三件套（§2.3）、extractor schema 拒绝/弱参考降级取上游、地点 beforeIndex/disabled 快路径上游同向取上游、prompts-settings 管线嫁接、wrappers 去重两仓同步、记忆化等价 144/144；键 `.129-658429a52fe9524a` | 2072/2076（4 上游原生红） |

> **审计更新（2026-10-11）**：`src/v3/extractor.js` 的 `excludedTags` 已补入 `record` 单数；嵌套 `<status><record>…</record></status>` 不再经父块 `plain` 文本进入时间读取，回归锁定于 `tests/v3-time-body.test.mjs`。§2.2 时间体条目中的该缺口描述仅保留为历史取证。
