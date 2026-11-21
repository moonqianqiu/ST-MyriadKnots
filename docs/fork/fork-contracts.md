# Fork 定制契约（逐文件回植清单）

> **产权**：本文件为 fork 本地文档（上游无此文件），存放于 `docs/fork/`。
> **回答的问题**：每个文件为什么与上游不一样、上游重写时按什么回植、哪些东西已被主动放弃勿补回。
> **分工**：合并流程与裁决判定法见 [`merge-playbook.md`](./merge-playbook.md)；逐版本实录见 [`merge-notes.md`](./merge-notes.md)；门禁命令见根 [`AGENTS.md`](../../AGENTS.md)。本文件只描述「现在为什么长这样」，**不写叙事**（实录一律指向 merge-notes）。
> **跨仓同步标记**：§3.1 清洗器契约与 ST-SevenDaysCal 对应节于 v1.2.1（2026-11-15）对齐；任何措辞或语义改动**须双仓同步提交**（40 例金样跨仓对拍依赖文本一致）。
> **条目体例**：契约（不变式+红线）/ 守卫（tests 路径）/ 实录（merge-notes §N 指针）。单条目膨胀超过 ~500B 时把叙事外移 merge-notes。
> **最后核对**：2026-11-15（v1.2.1 + 地点标签证据闸门）。

## 旧编号对照表（代码注释里遗留的 `AGENTS §N` 已按此改写）

| 旧 AGENTS 编号 | 新位置 |
| :--- | :--- |
| §1.1~§1.2 版本与产物、§1.3 缓存键、§1.4 合并流程 | merge-playbook §1 / §1.3 / §2 |
| §2.1 常规冲突表 | merge-playbook §3 |
| §2.2 逐文件回植契约 | 本文件「一、逐文件回植契约」 |
| §2.3 正交区与受保护设置 | 本文件「二、自动合并正交区与受保护设置」 |
| §3.1~§3.5 核心定制资产 | 本文件 §3.1~§3.5（编号不变） |
| §4 门禁 | AGENTS「门禁」；判定法与已知偶发在 merge-playbook §4 |
| §5 底数与版本索引 | AGENTS「当前状态」（只留当前值）+ merge-notes 卷首索引表 |

---

## 一、逐文件回植契约（上游重写对应链路时，以本地增强为产权逐项回植并重跑对应测试全绿）

### 召回链路 `src/v3/recall-runtime.js`（本地增强，详见 3.4）

`tests/v3-recall.test.mjs` 对上游差异仅限既有本地适配（`createRuntimeHarness` 增 `sanitizerOptions` 透传（`<location>` 类用例传 `extraTags:'location'`，见 3.1）；v1.1.0 起指纹材料三行并集 qianshiDeletionWitness+prequelDependencyFingerprint+placeWorkspaceDependency/selectedPlaces——**prequel 一行已随下方④退役，现仅两行本地增量**），**不得新增本地断言/用例**，本地断言一律加在 `tests/recall-local-guards.test.mjs`（前情相关 `tests/v3-recall-prequel.test.mjs` 自 v1.1.0 起整取上游，本地断言随机制退役）。**v1.3.1 起新增三处夹具适配（同根因：上游测试依赖其宽松 keep 语义）**：① `tests/production-entry-load.test.mjs` 的「排除图块编辑继续原召回」用例种子由上游 `bodyWrappers:{keepTags:'content',extraTags:'bbi_image'}` 改为 `{keepTags:'',extraTags:'bbi_image'}`——本仓 M2 合同下 keep='content' 会把无标签正文从 canonical 整体剔除，容器种子生效后的 foundation 复扫得空 canonical 候选 → stableCountMismatch → needsReview；测试意图（生图 extra 块编辑不改变召回帧键）由 extraTags 清洗完整覆盖。② `tests/v3-recall.test.mjs` 的「用户来源仅按本轮R/P读取清洗」用例的 `projectRecallSource(…, {removeTags:'noise'})` 改传 `{extraTags:'noise'}`——`removeTags` 并非上游清洗器真实选项（全树仅该测试出现），上游靠缺省 keep='content' 丢弃非 keep 标签；本仓等义模式为 M1 extra（连内容删、其余正文逐字保留），输出逐字一致。③ 同文件「已记忆近期AI只接受同楼同swipe的净正文等价变化」五场景 harness 的 `{keepTags:'content',extraTags:'bbi_image'}` 改 `{keepTags:'',extraTags:'bbi_image'}`——夹具正文无标签且指纹按 canonical==raw 预置，本仓 M2 剔除致 coveredRefs 指纹失配；M0 直通与预置指纹逐字一致，excludedImage 场景意图不变。当前契约：

① **见证向前截断**——`captureCoreBodyWitness(coreChat, sanitizerOptions, fingerprint, maximumFloors = 3, canonicalByRaw = null, userMessage = null)`（v1.1.1 起第 5 参为上游查询帧共享清洗缓存 `canonicalByRaw`，本仓触发楼边界移至第 6 参——同位相撞合成 6 参共存），循环以触发用户楼定位 `triggerIndex` 向前采集，上限用上游归一化值 `normalizeAutoHideKeepAiCount`；内部调用点传 `(…, recentBodyFloorLimit(), canonicalByRaw, user?.message)`。

② **invalidate 三参**——`(reason = 'invalidated', sourceEvent = 'runtimeInvalidate', { clearPersisted = false } = {})`，函数体首行 `requestDiagnostic.clear()`；`clearPersisted: true` 时删除最新用户楼持久化收据并 `saveChat()` 落盘。三处 UI 调用点用事件名方言（`manualMemoryEdit` / `foundationFullRebuild` / `peopleProfileSaved`），**漏改则 `{ clearPersisted }` 落入 `sourceEvent`、清理静默失效**。

③ **密封点活版本重对齐**（`commitPromptIfCurrent` 内、`captureCoveredBodyGuards` 之后）：条件 `currentSource !== source && currentSource?.status === 'ready'`（与上游 `basePreparedSource(…, { fresh: true, sourceToVerify: source })` 无条件 fresh 重读 + 对象同一性判定等价），以活档案头 Checkpoint/Revision/正文指纹重签 `receiptFingerprint`。

④ **前情依赖与旧回执有界迁移——已于 v1.1.0 整体退役（2026-11-06），勿回植**：本机制（prequelDependencyFingerprint 入签名材料、savePrequel 变化守卫+失效标记落盘+invalidate(clearPersisted)、复用校验按指纹比较）是上游尚未给出复用路径方案时的平行解；上游 v1.0.x 起自带 `fitReusedPrequel`（复用路径每次拦截从活文本 `selectPrequel` 现算前情并按回执剩余额度收紧，回执签名材料不含前情依赖），旧前情注入被结构性消灭，v1.1.0 更以测试锁死「前情保存后冻结回执继续复用（selectorCalls=1、回执逐字保留）」。本地机制若保留则每次前情变更强制整轮重选（多一次选材 LLM 调用）且与上游测试永久冲突，故**采上游设计**：`savePrequel` 上游逐字（无变化守卫、`invalidate('prequelSaved')` 两参）、`receiptMaterial` 去 prequel 行、候选循环验证去指纹比较。遗留 `qianqianjiePrequelReceiptInvalidation` 元数据成惰性数据（无读写方）；旧回执因 RECALL_STRATEGY_VERSION v27→v30 本就全部失效重签，无额外迁移成本。地点侧 v0.9.2 起已与上游趋同（保上游形状，本地同功能实现已删）。2026-11-03 补：`receiptMaterial` 含 `placeWorkspaceDependency` 与 `selectedPlaces`（上游 v1.0.x 工作区依赖，可选）。

正交性论证与 v0.6.8 损坏教训（定义/使用分居两处被重写区域、`sameRoot` 被吞）见 merge-notes §2–§3——归因法：用「合并树 vs 纯上游 diff」定位残余差异，勿据单侧绿误判。

### `src/v3/floor-binding.js`

`matchFloorCandidates` 可选第三参 `{ equivalentContent }` 与绑定种类 `'locatorEquivalent'`——弥合「本地 M0 保留已配置故事时钟引用标签于 canonical 正文」与「上游保证编辑时间标签不得撤销已落盘覆盖」的语义冲突；私有助手 `withoutStoryClockReferenceTags` 剥离仅已配置的引用标签后比较，仅供 `readTimeBody` 传入。

### `src/v3/time-body.js`

**剥壳投影**（2026-10-11 定案）——`currentBodyClock` 在 canonical 结构化读取无果时对 canonical 同文做时间专用投影：先整块移除平台排除块（`TIME_EXCLUDED_TAGS`，含 `record` 单数），再剥掉其余闭合标签块的壳读时间。控制信号另走原文控制视图：仅应用用户 `extraTags` 隔离，保留 QQJ/SDC 注释、配置的时间参考标签和 `<br>` 换行；正文仍只消费 canonical。排除名单与 extractor 同步并由逐名行为守卫锁定。三条件：只投影 canonical 不碰原文；排除块整块移除；canonical 优先（结构化解释压过扁平文本）。未声明的闪回/回忆类块仍须用户填入 `extraTags` 才会排除。`readTimeBody` 仍向 `matchFloorCandidates` 传第三参 `{ equivalentContent }`（见 floor-binding 条目）。另（2026-10-24）：`readTimeBody` 时间指纹用 `sourceRaw || summaryRaw`（弱时间参考不再以空原文覆盖主线时间）。**v1.2.0 上游合同**：`resolveStoryClock` 的 `ambiguous/incomplete` 结果现在携带 `meta` 与部分 `text`；`currentBodyClock` 首判改为 `timestamp && (timestamp.text || timestamp.status !== 'incomplete')`，日期/钟点独立保留精度，且 `readRecentBodyStoryTimes`/`readTimeBody` 仅在 `status==='ambiguous' && !text` 时清空 `previous`（`clock.meta && !clock.meta.date` 时不以旧基准补日期）。合并时本地 `controlSource`/剥壳投影与 5 参 `sanitizerOptions` 签名保本地，仅嫁接上述判定（2026-11-14 实测 v3-time-body 全绿）。

### `src/v3/extractor.js`

**start-only 故事钟不合成起点时间行**（上游合同，第二早退：无模型主线、可靠结束、参考或正文时间时原样返回）——v0.8.0 时代的「残缺同楼时间戳」红例已随上游 v0.9.x 测试重写消解（2026-10-24 复核通过）。**v0.9.2 裁决**：schema 回显拒绝取上游 `isSchemaMetadataCandidate`（文本级、更严；本地 `isSchemaOnlyPacket`+`JSON_SCHEMA_KEYS` 已删）；第一早退取上游 namespace-scoped 版（`(!referenceText || clock?.namespace?.startsWith('tag:'))`，本地无锚定 solid-chronology 变体已弃）；本地保留：`excludedTags` 的 `record` 单数、fallbackText/kind/precision 中 canonicalTime 先于弱 `referenceText` 的降序（对现有用例惰性）。

### 地点标签证据闸门（v1.2.1 后本仓修复，2026-11-15，跨三文件一体回植）

M0 直通把 `<location>` 标签逐字保留在 canonical（见 3.1），其**闭合标签块（含标记与内部）是场景元数据而非正文叙事**，不得作为正文证据被引用——否则模型引用标签内部文本即可把人物位置标成 confirmed（上游因缺省清洗剥除标签而无此暴露；提示词澄清不可消除，须证据校验层兜住）。落点：`src/v3/place-evidence.js` 新增 `locationTagRanges`/`isNarrativeSpan`/`narrativeOccurrences`（分词正则与 `readMemoryTagBlocks` 的 TAG_PATTERN 逐字一致；闭配/截断语义**全栈镜像 `parseTagTokenTree`**——`</同名>` 就近闭合并截断丢弃其上方未闭合节点，被 `</wrapper>` 吞掉内层 location 开标记后游离 `</location>` 不再配对；**带空格/属性的"自闭合"（`<location />`）因属性段吞斜杠按开标记处理，系上游解析器逐字共享怪癖，故意与 `readMemoryTagBlocks` 同判**——通道认领为标签则闸门同向拒绝，不得单侧改自闭合语义；末尾未闭合块不算元数据）；`src/v3/extractor.js` 三处消费——`segmentOccurrences`（`compileEvidenceSegments` 底层，全体字段证据共用）+ `sourceContentFor` 无 key 多绑过滤 + `semanticSource` 精确定位与省略恢复；`src/v3/place-foundation.js` `pathEvidence` 正文行（`storedPlaceEvidence` 整行自证除外）。**规则**：引文**整体落入**闭合标签块区间才拒绝；跨界引文（含真实叙事字节，含整楼 canonical 引文如「地点承接回归」例的 `exactQuote: payload.canonicalContent` 用法）不受影响；`locationReference` 通道与世界书/角色卡来源不过滤（标签身份/层级路径仍合法）。只过滤匹配**不改写内容**——存储 `quotedText`/`occurrence` 仍与 canonical 逐字对齐。守卫：`tests/place-evidence.test.mjs` 单元例（含 10 形态与 `readMemoryTagBlocks` 的块数 parity 锁定 + 截断/带空格行为断言）+ `tests/v3-extractor-memory.test.mjs`「默认M0」单元与生产链路两例（tag-only 拒绝 / narrative 放行 / 整楼引文放行）。上游重写引文定位或地点证据链时按此逐项回植。

### UI 联动点（上游重排装配代码时保住三处 `invalidate` 联动）

`src/ui/v3-foundation-view.js`（单楼编辑 / 完全重构）、`src/ui/people-profiles-view.js`（`saveProfile`）、`src/bootstrap.js`（`recallRuntime` 注入通道）。**v0.7.2 起完全重构跨聊天继续执行**——上游 `fullRebuild(expectedChatId, mode)` 绑定固定目标聊天（异聊天并发报 `QQJ_REBUILD_BUSY`、目标不符报 `QQJ_REBUILD_TARGET_INVALID`），其完成回调**不得**无条件 `clearPersisted`，须先比 `runtime.getState().chatId === 捕获时的 state.chatId` 再 `invalidate('foundationFullRebuild', …, { clearPersisted: true })`，否则 A 聊天重构跑完会误删当前显示的 B 聊天持久收据（`src/chat-memory-management.js:165 adoptRebuiltTarget` 在真实切聊后不切回；`src/ui/v3-foundation-view.js:1640` 的 `{...state, ...taskState}` 即该差异来源）。

### UI 迁移纪律（v0.8.0 覆盖型迁移）

上游把本地定制块**重写/搬迁**（而非删除）时，取上游结构并把本地联动**移植进新结构**——在此类冲突上「并集」是错的（会双渲染 + 缓存失效失灵）。判据：先 `git grep` 特征串确认上游是「删除」还是「搬迁」，再查基线确认本地块是「新增定制」还是「保留旧行为」。**`run(…).after` 回调须先比 `nextState?.chatId === state.chatId`（保存发起时的聊天）才执行 `invalidate('manualMemoryEdit', …, { clearPersisted: true })`**（跨聊天误删保护）。完整实录（编辑器抽 `openMemoryEditor` 弹窗）见 merge-notes §7。

### v0.7.9 上游隐藏「空间记录」UI

删除 `placeNameCache`/`placeNamesFor` 助手与整块 `qqj-memory-spatial` 渲染（内部空间记忆与「地点」meta 保留），并把 `EXTRACTOR_FIXED_CONTRACT` 第 11 条地点粒度改写为「按房间或有独立意义的区域」。本地未定制该区块，**全采纳，勿回植空间 UI**。

### `src/ui/help-guide.js`

本地改两处——设置章节「保留包裹符」说明段（P5 通用包裹符双栏语义）+ 排障手册「大量楼摘要缺正文」段尾的日期读取教义句（2026-10-11：含日期的闪回/回忆类块会被当作本楼当前时间，extraTags 声明可排除）。上游高频重写本文件文案——裁决：**上游新增段落全收 + 两处本地保持**（包裹符段上游侧仍是旧 `[[...]]` 专用描述，勿取上游侧；教义句属上游文案区内的本地追加句尾，合并后须核在位）。

### `src/v3/recall-selector.js`（本地四项纯性能记忆化，详见 3.5）

**语义零改动**，判定输入一字未动；上游重写本文件时按以下锚点逐项回植，并以 `node tools/perf-audit/verify-equivalence.mjs <上游提交>` 确认输出逐字节不变（重植实证：v1.1.0 对 `c767988`、v1.1.1 对 `4084ed8`、v1.1.2/v1.1.3 对 `d0d5612`、v1.1.4~v1.1.6 对 `3a06377`、v1.2.0 对 `5407522`、v1.2.1+闸门对 `50e6282` 各 144/144 逐字节一致；v1.3.0 合并时漏跑该门禁且脚手架缺 `cse-quantification.js` 重写——2026-11-21 补齐后补跑对 `8c5f8c9`、合并 v1.3.1 前预跑对 `9b46b36` 均各 144/144）。上游 v1.1.1 新增 `placeRecallText(…, deduplicate)`（同来源重复短陈述去重）与 `buildRecallQueryFrame(…, canonicalAssistantByCoreIndex)`（查询帧对照清洗后正文），与本仓记忆化正交，均按上游照收。**边界文案自 v1.1.0 起采上游统一短版**；**v1.2.0 起上游把 `CSE_RECALL_KNOWLEDGE_BOUNDARY` 改为 `RECALL_KNOWLEDGE_GUIDANCE + '人物状态记录：主体、态度对象、可见性。'`**（`LEGACY_` 长版供旧回执），本仓照收。本仓 v0.8.0 两层制动机（长文案挤掉临期提醒）已随上游注入格式结构性精简而不复存在，勿再回植（见「四、勿回植速查」）；`inline-projection.js` 的 `RECALL_BOUNDARY_LINES` 白名单取**并集**（上游 LEGACY + 旧短版字面量 + v1.2.0 `RECALL_COMPACT_KNOWLEDGE_GUIDANCE`/无前缀短版 + 本仓 fork 期 3 条历史文案 = 8 条），冻结回执协议要求全历史版本可投影；`locationReferenceKey`/`locationReferencesByFloorId` 随上游 v1.1.0 删除（普通召回独立地点标注整个移除，地点改 `groupRecallPlaces` 合占分组），无孤儿引用。审计工具 `tools/perf-audit/lib/recall-audit.mjs` 的 sibling 重写清单需随上游新 import 同步扩充（v1.1.0 增 place-foundation/place-workspace/spatial-domain；v1.2.0 增 recall-text.js，否则等价对拍报 `recall-text.js` MODULE_NOT_FOUND；v1.3.0 增 cse-quantification.js——量化 CSE，v1.3.0 合并时漏补致对拍挂 `ERR_MODULE_NOT_FOUND`，2026-11-21 合并 v1.3.1 前补齐）：

① `compactOf`（按**字符串**记忆化 `compact()`；`COMPACT_MEMO_LIMIT = 200000`）——`decorate()` 每轮 `{...value}` 克隆候选，但克隆体**共享 `_coreText`/`_rankText` 字符串实例**，故按字符串键可跨轮命中（按对象键则命中率仅 ~4.5%）；路由面保持审计认定的热点（`duplicateKey`/`prepareMaterial`/`entityNameEntries`），上游重写区新增的 `compact()` 裸调用点不扩大路由；

② `entityDerivedCache`（`WeakMap` on `context`）上提 `entityTokens` 与 `entityNameEntries`（实体名 → 已 `compact` 的标签表），替代 `recordFor()` 内对 92 实体的逐次扫；

③ `stableKeyMemo` + `historyStableKeyRaw`（按对象记忆化 `historyStableKey()`，仍是导出的 `historyStableKey`）；

④ `preparedMaterialMemo`（按 material 文本共享 `prepareMaterial()` 结果，使 `materialTokens` 的懒加载 `tokens` Set 得以存活）。

**反例警示（勿回植）**：「按内容键跨轮缓存 `recordFor`」的键不完整——`historyStableKey` **不含** `_rankText`／`towardEntityId`／`*?.sourceFloorId`，而这些正是 `recordFor()` 的输入，用它做键会把仅 `toward` 不同（上游 `cseDuplicateKey` 特意区分）的值串成同一条 record（实测收益在噪声内：0.982×/0.989×）。

**正例（v0.7.0 已采纳，勿再删）**：上游 `recordsByValue`——`WeakMap` 按**对象身份**缓存 `recordFor()` 结果，作用域严格限于**单次 `buildStorylinePlan()`**。安全前提：`recordFor()` 的输入是 history 数组内的**原对象**（不经 `decorate()` 克隆），故既命中又**不会在「同文本、不同 `towardEntityId`」之间串记录**；成立前提是该 plan 执行期间候选对象不被原地修改。**红线**：绝不可改成按 `historyStableKey`（或「稳定键 + 文本」）跨对象／跨轮缓存。

**合并陷阱（v0.7.0 实录）**：上游把 6 处 `materiallySame(` 调用点自动改写为 `sameMaterial(`，而其定义在被弃的那一侧——只取本地侧会 `ReferenceError`。解法是保留本地缓存块 + 加薄别名 `const sameMaterial = (left, right) => materiallySame(left, right, prepareMaterial);`，使上游调用点字节不变、行为路由本地缓存（同类实例见 merge-notes §4）。

**同时弃用**（上游 v0.7.0 的 plan 级缓存，勿再回植）：`compactForPlan`／`prepareForPlan`／`searchableEntityLabels`／`compactByText`／`preparedByValue`——按**对象键**，在 `decorate()` 克隆下几乎不命中，且与上面的字符串键缓存重复。

### `src/memory-transfer.js`（v0.10.1 本地增强，上游新模块）

`verifyConversation` 增**清洗配置漂移拒绝**——上游防线是「配置变化→canonical 洗空→候选被 `if (!canonicalContent) continue` 丢弃→楼层无候选」，M0 直通下永不触发（canonical 不洗空、raw 指纹与配置无关）；本地改为显式合同：每楼层绑定须 `canonicalFingerprintMatches` 或 `sanitizerFingerprintMatches`（配置无关等价变更放行），否则按上游同文报错。上游重写 `verifyConversation` 时须重植（提交 `76cabfa`）。

## 二、自动合并正交区与受保护设置

`src/v3/cse-engine.js` / `src/v3/memory-runtime.js`（本地 `extraOnlySanitizerOptions` 拦截与上游新提示词/千事调度正交）；`index.js`（`settings.migrateSanitizerKeepTags?.()` 迁移调用，定义在 `src/settings.js`；v1.2.0 上游重写启动/停止生命周期为 `Promise.allSettled` 并新增 `onPrepared`/`observeOnly`/`coreRecordCacheProvider`/历法迁移注入，本地迁移调用与 `recallRuntime` 注入通道必须保持）；`src/host-context.js`（上游 v0.7.10 新增 `cloneHostJsonMetadata(value) = JSON.parse(JSON.stringify(value))`——宿主 metadata 的 JSON 持久化边界，替换 index.js、`src/chat-session.js`、`src/v3/chat-branch-inheritance.js`、`src/v3/message-floor-anchor.js`、`src/chat-memory-management.js` 共 6 处 structuredClone 前手写克隆；本地未改该链路，纯上游产权，勿改）。**v1.2.0 新增纯上游产权**：`tools/build.mjs`（分包写入/保 mtime）、`dist/qianchuang-static-*.js`（稳定素材分块）、公开读取接口 `src/v3/public-context.js`（`readContext` 话题重点/参与人物/摘要预算）、`src/v3/chat-branch-inheritance.js` 历法交接——均照收，勿按本地 M0/UI 习惯改写。**v1.2.1 新增纯上游产权**：TT 原生适配器 `record-batch` PUT 批写（≤64 条/1MiB、4 路并发、逐条版本校验、root 于全部引用记录保存后发布；`backend-client` 删 `useTauri→null` 短路改走真批量协商）、核心缓存小批写事务（`PUBLISH_BATCH_SIZE=64`/1MiB、慢写 5s、删 `publishUnavailable` 全局熔断）、地点 `locationReference` 证据链（`PLACE_LOCATION_GUIDANCE`、schema/prompt-67、标签只证地点身份不证在场）——均照收；`plugin-lifecycle` CHAT_CHANGED 改 fire-and-forget 系上游行为合同，勿改回 await。

**`src/settings.js` 自 v0.9.2 起为受保护区（共享包裹符容器 M0 三件套，与 SDC `runtime/settings.js` 同构）**：① `get()` 内 `getSharedBodyWrappers(extensionSettings)` 初始化调用必须在本地默认值（`sourceKeepTags:''`）回填**之后**（上游在 store 创建期先初始化 → 全新安装落到回退值 `'content'` 丢失 M0）；② `wrappers()`/`updateWrappers()` 必须先经 `get()` 再触共享容器（防未物化路径直读）；③ 写入用本仓 `writeWrappers`（`normalizeTagRules`，大小写敏感）——**不得用 `updateSharedBodyWrappers`**（按上游规则 lower 归一命名对，破坏 3.1 合同；共享容器照用、上游插件读取时各自归一化）；④ `migrateSanitizerKeepTags` 重置旧默认 `'content'` 时须同步重置已初始化的 `schedule-planner.bodyWrappers.keepTags`（get() 先于迁移执行，容器已吃到旧默认）。**v0.9.5 起该文件另接共享破限提示词容器（上游产权照收，与 SDC v3.10 同构）**：store 创建期 `initializeSharedProcessingPrompt(extensionSettings, save)`（一次性迁移旧 `qianqianjie.processingPrompt` 非空值并落一次 save——**bodyWrappers 容器不随之提前**，其初始化点保留在 get() 回填后，见①）；update 路由 `updateSharedProcessingPrompt`、访问器 `processingPrompt()` 读共享容器（缺省回 BASE，与 M0 无语义交集）。`src/ui/settings/prompts-settings.js` 同步守卫：采上游 `wrappers()/updateWrappers/blur` 管线 + 本地 `bindTagFieldWithClashCheck` 两栏冲突拦截（读/回退走 `settings.wrappers()`）。

**上游一键聊天记忆迁移模块（v0.7.3 新增，纯上游产权，勿改）**：`src/chat-memory-migration.js`、`src/v3/memory-migration.js`、`src/v3/migration-prefix.js`、`tests/chat-memory-migration.test.mjs`。其 `sanitizerOptions = () => ({})` 默认值（`src/chat-memory-migration.js:113`）在本 fork 的 M0 直通合同下与本地语义**一致**（不注入 `keepTags:'content'`），故**无需回植本地变体**——上游若日后改为注入默认 `keepTags`，须按 3.2 同一理由评估是否改用 `extraOnlySanitizerOptions`。

## 三、核心定制资产（Fork 存在的价值，合并时逐项复核）

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
- **v0.8.0 起「`<location>` 缺省剥除」类**：上游清洗器对 `<location>…</location>` **无条件剥除**，本仓 M0 合同**保留**它（属普通配对标签，未配置即不清洗）。上游 v0.8.0 新增/改写的测试（`tests/v3-recall.test.mjs` 的「人工地点清除」例、`tests/v3-extractor-memory.test.mjs` 的「地点名参照」与「地点绑定和父级」两例）依赖该缺省行为 → 一律本地适配（显式 `extraTags:'location'`，或把 canonical 期望值改为 M0 直通原文），**严禁为迁就测试而给清洗器加 `<location>` 缺省剥除**（会破坏 40 例金样与 SDC 跨仓对拍）。该适配反而更强：原消息地点标签真实存活时，「人工清除」的抑制效果才可被单独验证。**v1.0.3 起有原生入口**：`tests/v3-recall.test.mjs` 的 `createRuntimeHarness` 支持 `sanitizerOptions` 透传，直接传 `{extraTags:'location'}` 适配，勿改文件级默认配置。**v1.2.1 后证据层配套闸门**：M0 保留的闭合标签块不再能被模型引文冒充正文证据（地点/位置确认链路，详见一、地点标签证据闸门条）——清洗器缺省行为与 40 例金样仍一字未动。
- **v0.5.8+ 双层文件结构**：前半部本地四模式合同，后半部上游移植段（`stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`parseTagTokenTree`，服务 v3 时间链路，`<br>` 按 void-tag 处理、节点携带偏移元数据；移植段归一化引用走本地 `normalizeTagRules`）。上游后续若改这些导出，直接对齐上游该段即可。

### 3.2 非 AI 正文来源 extra-only 隔离清洗（防止世界书/用户输入被洗空）

- **核心辅助函数**：`export function extraOnlySanitizerOptions(options = {}) => { keepTags: '', extraTags: options?.extraTags ?? '' }`
- **保护场景与调用点（仅剩 3 处，均为上游活洗空点）**：`src/v3/cse-engine.js`（`captureCseBaseline` 遍历世界书条目，上游 M2 提取致无 `<content>` 标签条目洗空后静默跳过）；`src/cse-source-selection.js` 扫描窗 rows 分路（assistant 行保 keep 提取+合并 `qqj-cse`，用户行/canonical 行走 plainText extraOnly）；`src/v3/memory-runtime.js`（`capturePrecedingUserInputFromSnapshot` 用户输入快照）。
- **已回归上游直通的点（勿再回植）**：`src/v3/people-workspace.js` 人物整理世界书（v0.6.0 定案，整文件回归上游，见「四、勿回植速查」）；`src/cse-source-selection.js` 动态世界书（上游本为 clean+宏替换直通，extraOnly 仅剩卫生价值已撤）。
- **设计依据**：`keepTags`（如 `'content'`）是 AI 正文专属提取白名单；普通用户输入或未加自定义标签的世界书条目若流经 `keepTags` 会被直接清空为 0 字。非正文来源必须强制走 extra-only 清洗。

### 3.3 提示词与标签设置 UI 校验 (`src/ui/settings/prompts-settings.js`)

- **默认值配置**：`src/settings.js` 中 `sourceKeepTags: ''`（默认留空直通）。
- **存量迁移 (`migrateSanitizerKeepTags`)**：上游默认 `sourceKeepTags: 'content'` 会被 `get()` 的默认回写持久化进老存档，本地严格 M2 下会把无 `<content>` 标签的 AI 正文整楼清空（`foundation-domain` 的 `if (!canonicalContent) continue;` 静默跳楼）。版本化迁移 `sanitizerKeepTagsMigrationVersion` 0→1 四边界：仅持久值为纯 `'content'`（trim+小写完全相等）才重置 `''`；其他手改值原样保留——**纯 `'content'` 值无法与上游默认回写区分，用户主动配置的同值也会被一次性重置**（2026-11-15 独立复审确认；发布说明 CHANGELOG 1.2.1「本仓说明」与 troubleshooting 清洗小节已注明可重新配置）；迁移后再手填 `content` 永不覆盖；全新存档直接置位。`index.js` 在 `settings.migrateLegacyApiSettings()` 之后以**可选链**调用；断言见 `tests/settings-api.test.mjs` 末尾两条。
- **保存拦截器 (`bindTagFieldWithClashCheck`)**：两栏失焦保存时自动做归一化交集计算（标签名与字面量包裹规则一并参与）；同名冲突即**拒绝落存**，输入框回退 `settings.get()[key] ?? ''`（= 该栏最近一次成功保存值；**不得**用视图创建时快照——本面板只在 `src/ui/panel.js` 初始化时创建一次，二次冲突会回退成陈旧值），并显示行内红色警告。守卫见 `tests/settings-modules.test.mjs`「包裹符冲突回退取最近一次成功保存值」。

### 3.4 召回回执重新生成（Regenerate）秒级复用机制

- **核心文件**：`src/v3/recall-runtime.js`（修复主体）；`src/ui/v3-foundation-view.js`；`src/ui/people-profiles-view.js`；`src/bootstrap.js`。
- **双重致错源头**（删当前用户楼 → 重新发送 → 重新生成，稳定复现）：① **并发盖错公章**——选材 LLM 耗时窗口内底层地基扫描推进全局 Root，原代码收据仍盖选材开始时的旧公章，存盘即过期；② **见证指纹漂移**——原 `captureCoreBodyWitness` 从数组末尾逆向采集，重新生成时尾部残留刚撤下的 AI 楼层。
- **本地修复三件套（治本，不可被上游旧代码覆盖）**：见证向前截断（一、①）、三端联动主动失效（一、②）、密封点活版本重对齐（一、③）。
- **与上游 `root: 0` 极速通道共存**：上游 `commitFrozenReceiptIfCurrent` 复用阶段有意不比对 Checkpoint/Revision（测试锁定复用零 I/O）。本地修复零性能开销：日常重新生成照走极速通道，仅人工修改记忆时精确清缓存重选材。
- **本地守卫测试**：`tests/recall-local-guards.test.mjs`（上游无此文件）集中回归本地补丁——见证向前截断对照、`matchFloorCandidates` 探针与 `'locatorEquivalent'`、`extraOnlySanitizerOptions` 合同、`invalidate` 默认不删持久收据而 `clearPersisted: true` 才删并 `saveChat`、时间参考标签探针。上游重写对应链路后**先跑它**。

### 3.5 召回选材性能（`src/v3/recall-selector.js` 四项记忆化）

- **动机**：长聊天（129 楼层记忆 / 92 实体）点「重新生成」时 `buildStorylinePlan()` 占 `selectRecall()` 壁钟 **92.7–97.3%**（`candidateBuild` 一步 ~20.2s），主线程被单核跑满、界面无响应。根因是**同一批字符串被反复重算**：键推导（主要是作用在最长 12000 字符 `_coreText` 上的 `compact()`）占 self time **42.4%**，而真正做集合交集的 `setIntersection` 只占 **0.3%**（逐项成本分布见 [`audit-recall-budget-loop-2026-10.md`](./audit-recall-budget-loop-2026-10.md)）。
- **四项改动（语义零改动，判定输入一字未动）**：见一、recall-selector 条。实测 `contextSize=8192`、median-of-5 加速：v0.x 结构 n=48 17.18× → n=192 35.49×；v1.1.4~v1.1.6 结构对上游裸版 `3a06377` n=48 **7.39×**、n=96 12.00×、n=192 **16.96×**、n=384 **23.52×**（指数 n^1.75→n^1.19）；实机卡死上报场景（n=129 / `contextSize=20000`）**20201ms → 706ms = 28.62×**，增长指数由 `n^1.76` 降到 `n^1.24`（完整数表见审计文档）。
- **等价性证据**：`node tools/perf-audit/verify-equivalence.mjs HEAD` = **144/144 逐字节一致**（`injectionText` 逐字符 + 完整结果树 canonical 深比）；四门禁全绿。判据：三者都是纯函数（`compact`/`historyStableKey`/`prepareMaterial`）按输入记忆化，`entityDerivedCache` 只上提依赖 `context` 的常量。
- **容量策略注意点（2026-11-15 独立复审标记，暂不动代码）**：`compactMemo`（`COMPACT_MEMO_LIMIT` :26）与 `preparedMaterialMemo`（`PREPARED_MATERIAL_LIMIT` :1024）均为模块级 Map、按**条目数**各限 200,000、达限整体 `.clear()`；后者随缓存对象持有懒生成 token Set，键是未清洗原文——限额不看文本长度/总 token 量，跨聊天长期驻留的内存占用不稳定（未复现错误，不影响等价性结论）。后续方向：真实长档案实测峰值堆内存后，再评估按总字符/token 限额或 LRU；届时**任何改动必须先过等价门禁 144/144**。
- **仍未解决的（有意留作后续）**：`buildStorylinePlan` 内层仍是 **O(m²)** 对比较（四层：候选线生成／建线合并／附着／continuity 兜底）。本改动只砍常数与部分指数，**不改阶**——悬崖仅从 192 楼推到 **~1500 楼**（数表见审计文档）。要真正压阶只能收缩参与分组的候选池（`baseHistory` 有原则预过滤）；硬切 `.slice(0,128)` 实测可得 17×–54×但**会改变召回结果**，不可取。
- **五条教训**（全文取证 [`audit-recall-budget-loop-2026-10.md`](./audit-recall-budget-loop-2026-10.md) §5）：①键必须廉价、只缓存最贵热点；②跨轮记忆化别按对象身份（`decorate()` 每轮克隆→按对象键命中率仅 **4.5%**，浅拷贝共享字符串实例、按字符串键才有效）；③缓存键须覆盖被缓存函数全部输入；④审计基线谱系须断言；⑤原对象 + 窄作用域下身份缓存可用（`recordsByValue`）——③⑤红线表述以一、recall-selector 条反例/正例为准。
- **审计工具**：`tools/perf-audit/`（`verify-equivalence.mjs` 等价门禁、`benchmark.mjs` 计时与指数拟合；`README.md` 载方法学与夹具设计理由）。变体物化到**系统临时目录**（`SCRATCH_DIR = tmpdir()/qqj-recall-perf-audit`，见 `lib/recall-audit.mjs`），即仓库之外——**绝不写入 `src/` 旁，也不需 `.gitignore` 条目**。

## 四、已主动放弃、勿回植速查

> 以下能力已**有意**采上游设计或删除；再见到相关 diff 属预期，勿当「本地资产丢失」补回。细节都挂在其所属条目，此处仅作索引。

| 放弃项 | 裁决 | 详情 |
| :--- | :--- | :--- |
| 前情依赖与旧回执有界迁移 | v1.1.0 整体退役，采上游 `fitReusedPrequel` | 一、recall-runtime ④ |
| plan 级缓存（`compactForPlan` 等 5 项） | v0.7.0 弃用（对象键不命中） | 一、recall-selector「同时弃用」 |
| 两层制召回边界文案 | v1.1.0 随上游注入格式精简退役 | 一、recall-selector |
| people-workspace extraOnly 隔离 | v0.6.0 整文件回归上游直通 | 一、people-workspace 行；3.2 已回归清单 |
| 空间记录 UI（`qqj-memory-spatial`） | v0.7.9 上游移除，本地未定制 | 一、v0.7.9 条 |
| extractor 本地 tmpdir 代修 | v0.10.1 上游自带仓库内 mkdtemp | merge-playbook §3 v3-extractor 行 |
| `shared-body-wrappers` 作 `sanitizeMemoryContent` / htmlFormatting 注入 | v0.9.0/v1.1.0 三向分歧定案，不采 | 3.1 三向分歧条 |
| cse-source-selection 动态世界书 extraOnly | 2026-09-30 撤（上游本为直通） | 3.2 已回归清单 |
