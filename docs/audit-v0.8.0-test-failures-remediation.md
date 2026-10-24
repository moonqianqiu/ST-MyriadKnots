# MyriadKnots v0.8.0 测试失败修复方案

## 结论与范围

本次审计针对 v0.8.0 合并后地基、召回、时间读取、提取与装配测试中观察到的失败。审计记录为 374 项中 367 通过、7 失败；这 7 项在纯上游 v0.8.0 树也可复现，因此不能归因于本地 merge resolution。不过，“上游原生”只说明失败不是合并冲突造成，并不代表预期行为正确：其中地点依赖导致的无关失效、时间提醒被固定提示挤出预算，是需要修正的功能/预算问题。

修复状态：以下列出的五项均已实施并通过对应定向测试。第二阶段收口后生产 bundle 已再次重建，manifest 缓存键更新为 `20261024.129-6a9ba9d3155dd5e0`（前期为 `20261024.128-331f41b4ec3cde3b`），最终全量结果见文末「第二阶段验证记录」。

## 修复项与优先级

| 优先级 | 问题 | 性质 | 主要位置 | 处理方向 |
| --- | --- | --- | --- | --- |
| P1 | 无地点标签时，后台地点/楼层变化仍使回执失效 | 功能回归 | `src/v3/recall-runtime.js` | 空地点引用不应建立依赖；有效引用仍须正确失效 |
| P1 | 小上下文下固定知情边界提示挤掉临期提醒 | 预算与行为问题 | `src/v3/recall-selector.js` | 缩短或按需注入冗长说明，并明确定义预算优先级 |
| P2 | 关闭时间功能仍读取 memory provider | 行为/性能回归 | `src/v3/time-runtime.js` | disabled 快路径不访问 provider |
| P2 | 每轮 floor memories 读取数由 7 增至 9 | 性能契约待确认 | 召回上下文及地点候选收集 | 定位新增扫描，优先复用同轮索引；不可只改数字 |
| P3 | 时间 DTO 编辑指引测试未提供 `customImpl` | 测试夹具缺陷 | 时间 DTO UI 测试 | 补齐生产契约所需夹具，不改运行时代码绕过接口 |

## 详细方案

### P1：空地点引用不应让回执依赖后台楼层变化

审计定位：`captureLatestLocationReference()`（`src/v3/recall-runtime.js` 约第 64 行）在没有地点标签时仍返回 `{ values: [], hostLocator }`。该空结果随后进入回执依赖签名；宿主可见性或 assistant 楼层变化因此可能触发重选，即使当前 user 楼没有地点引用。

建议改法：

1. 当没有有效地点引用时返回 `null`（或等价的“无依赖”状态），不要把 `hostLocator` 单独记作地点依赖。
2. 当存在有效引用时，保留当前地点引用的定位和变化检测；引用所指楼层变化时仍应使旧回执失效。
3. 增加正反成对回归用例：无标注时后台楼层可见性/assistant 变化不重选；有标注时引用对应内容变化会按设计失效。
4. 保持三项冻结回执/来源排除相关用例通过：
   - `同 user 首次空回执冻结后，宿主楼可见性后台变化仍不重选`
   - `runtime 未映射 core 新增不改变来源排除集，regenerate/swipe/continue 复用同一收据`
   - `runtime 无 saveChat 时按 user 对象保留 session-only，assistant 后台变化仍复用`

禁止的修法：无条件删除地点引用依赖。那会让真实地点标签变化无法刷新召回结果。

### P1：为临期提醒留出可预测的预算空间

审计定位：`CSE_RECALL_KNOWLEDGE_BOUNDARY`（`src/v3/recall-selector.js` 约第 322 行）固定提示扩展后，在 `contextSize: 1000` 用例中占用了召回预算，临期时间提醒从期望的 1 条降为 0 条。独立副本中临时缩短这段固定提示后，该用例通过，表明提示的固定开销参与了淘汰。

实施结果：

1. 有状态或 CSE 变化注入时仍保留完整分类边界；只有历史/提醒而无状态/CSE 时使用短基础边界（作者资料不代表人物知情、private 仅属标明主体），不再让冗长分类说明消耗小上下文预算。
2. 时间提醒仍按完整条目参与统一主排序，不截断条目、不增加独立时间配额。
3. 原小预算用例通过；完整分类边界、状态可见性和反全知边界测试通过。

禁止的修法：永久删除知情边界内容，或为让单例通过而无条件提高时间提醒优先级、突破整体预算。既有 `CSE_RECALL_KNOWLEDGE_BOUNDARY`、地点引用、状态可见性及反全知边界用例必须继续通过。

### P2：时间功能关闭时走 provider-free 快路径

审计定位：`getState()`（`src/v3/time-runtime.js` 约第 325 行）在功能关闭时仍先调用 `getMemoryActivityState()`；测试记录到关闭状态多出一次 provider 读取。

建议改法：在确认时间功能 disabled 后直接构造 disabled 状态并返回，不读取 memory provider。启用路径继续每次只读一次，并保持读取新鲜快照的现有语义。

验收需同时覆盖：关闭时 provider 调用数为 0；启用时单次 `getState()` 只读一次；下一次调用能看到更新后的快照。不得通过全局缓存旧快照来压低计数。

### P2：查明召回材料多出的两次读取，再决定优化或调整契约

测试 `真实 LLM 入口每轮只建立一份选择上下文...` 中，floor memories 读取期望为 7、实际为 9，而 `currentState` 仍为 1。新增地点候选收集可能造成额外遍历，但须先用计数/调用路径确认两次读取的来源。

实施结果：`selectRecall()` 将 `floorMemories` 列表在调用开始时读取一次，并复用于地点索引和最终统计，不再为这两处重复访问 getter；测试原有的每轮 7 次契约保持不变。

验收：同一轮 selection context 仍只构造一次；下一轮能刷新材料；读取次数有明确上界且不随无关调用意外倍增；召回全套测试通过。

### P3：补齐时间 DTO UI 测试夹具

失败项 `真实时间runtime DTO把归并主项状态传到编辑指引` 的测试 view 未提供 `customImpl`。生产 UI 的 `startRecentEdit()` 在该接口缺失时会提前返回，因此编辑表单和归并指引没有建立。生产装配 `src/bootstrap.js` 会提供该接口。

实施结果：测试 view 提供捕获并挂载 `content` 的 `customImpl`，沿真实 UI 路径断言 DTO 包含 `hasMergedMembers: true`、不暴露 `mergedItemIds`，且 UI 显示正确提示；运行时接口未作妥协。

## 建议实施顺序

以上项目已按该顺序实施。定向召回、时间体、回执本地守卫、inline renderer 和 wiring 测试通过；生产入口与 wiring 合计 19/19 通过，bundle 已重建。全量结果详见本文“结论与范围”。

## 验证清单

在 `ST-MyriadKnots` 仓库根目录执行，按需拆分单文件运行：

```bash
node --experimental-vm-modules --test --test-concurrency=1 tests/v3-recall.test.mjs
node --experimental-vm-modules --test --test-concurrency=1 tests/v3-time-body.test.mjs
node --experimental-vm-modules --test --test-concurrency=1 tests/recall-local-guards.test.mjs
node --experimental-vm-modules --test --test-concurrency=1 tests/v3-wiring.test.mjs
node --experimental-vm-modules --test --test-concurrency=1 tests/production-entry-load.test.mjs
node --experimental-vm-modules --test --test-concurrency=1 tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs
npm test
```

源码变更后按仓库惯例先更新版本/构建，再回填真实 bundle 哈希缓存键；运行 `npm run build` 后确认生产入口加载测试通过。全量测试按 `AGENTS.md` 的单并发基线解释结果：合并时基线为 1922 项中 1882 通过、40 项上游原生失败；第一阶段末复跑 1885 通过、37 失败；第二阶段收口后的最终结果见下节。上游原生红判定以「同用例纯上游树复现、计数一致」为准（本文「start-only 裁决」一节即按此法实测）。

## 完成标准

- 地点空引用与有效引用的失效行为均由成对测试锁定。
- 小预算下临期提醒恢复，必要安全边界、地点/状态边界测试不回退，注入结果满足预算。
- 时间功能关闭时不访问 memory provider；启用读取仍为单次且新鲜。
- floor memories 多出的读取已被消除，或已由证据支持地更新性能契约，不是机械改计数。
- 时间 DTO 测试以符合生产接口的夹具通过，运行时代码不为测试而偏离契约。
- 清洗器金样、本地守卫、生产装配与入口测试通过；全量测试中本方案目标项无失败，剩余失败继续作为基线审计项逐一对照纯上游树。

---

## 第二阶段：v0.8.0 合并后的跨仓审计修复（2026-10-22 ~ 2026-10-24）

第一阶段的五项修复完成后，跨仓（MK + SDC）审计又确认了六项功能/合同问题并全部修复。本节同时记录三处对早期审计表述的更正。

### 对早期审计表述的更正

1. **SDC 唯一失败不是 EPERM**：`runtime/store-local-applied.test.js` 的数据库预检用例失败原因不是环境 EPERM，而是测试仍期待布尔返回值；生产接口 `memoryPreCheckConfirm` 实际返回 `{ proceed, memorySnapshot }`。已按生产合同改写测试断言（继续/取消/回退三分支），生产接口未回退为布尔。
2. **「SDC 严格超集、无能力损失」不成立**：两仓清洗器原先都按「第一个闭合定界符」扁平匹配同名嵌套包裹符，`前[[噪音]]中[[a [[b]] c]]尾`（extra=`[[...]]`）会输出 `前中 c]]尾`——内层开符被吞、闭符泄漏成正文噪音。这不是「SDC 多出的能力」，是两仓共同的泄漏。
3. **「上游也失败」只说明来源，不替代功能验收**：上游原生红只证明失败不是本地合并裁决造成；对其中属于功能/预算缺陷的项（空地点依赖、知情边界挤预算、地点采集被残留 AI 楼污染等）仍须修复，不能以「上游也红」结案。

### 修复项一：同名嵌套包裹符平衡解析（MK `src/memory-content-sanitizer.js` + SDC `runtime/tag-sanitizer.js`）

- 字面量定界符 token 改为开闭入栈配对（`pairWrapperTokens`）：相同开/闭定界符优先关闭当前包裹，最长定界符优先识别；未闭合的开/闭定界符保持文本，不再吞至文末。
- XML 与包裹符共享节点树，包裹边界隔离内部 XML 闭合标记；字面量规则保持大小写敏感，不再自动加小写别名（`[DRAFT]` 与 `[draft]` 不互为别名）。
- M0–M3 四模式合同、extra 恒优先、未闭合行为全部保持；两仓新增 18 条同名嵌套用例逐字一致（`tests/memory-content-sanitizer.test.mjs` / `memory.sanitizer.test.js`）。
- **金样口径变更为「39 例逐字一致 + 1 例显式安全修正」**：`brk-extra-paired` 的旧期望输出 `前中 c]]尾` 本身保留嵌套噪音尾段，属泄漏的历史快照而非安全合同；新输出 `前中尾` 才符合 M3「extra 恒优先整块剔除」。测试同时断言历史值（留痕）与修正值，`tag-sanitizer.golden.json` 未改动。两仓口径一致。

### 修复项二：弹窗摘要保存的跨聊天回执保护（`src/ui/v3-foundation-view.js`）

- v0.8.0 把楼内记忆编辑器抽为 `openMemoryEditor` 弹窗后，保存回调不再持有正确聊天上下文：A 聊天保存期间切到 B，A 的完成回调会经 `invalidate('manualMemoryEdit', …, { clearPersisted: true })` 误删并保存 B 的召回回执。
- 修复：`run(…).after` 回调先比对 `nextState?.chatId === state.chatId`（保存发起时的聊天），仅当目标聊天仍激活时才执行清理联动；切聊、切回、关闭及失败路径均不误删。回归锁定于 `tests/v3-foundation-view.test.mjs`「弹窗摘要保存只清理目标聊天回执」。

### 修复项三：地点采集截止触发 USER 之前（`src/v3/recall-runtime.js`）

- `captureLatestLocationReference(snapshot, sanitizerOptions, maximumFloors, beforeIndex)`：采集循环以触发用户楼定位为上界，不再从聊天末尾读起。删除当前 AI 楼重新生成时，残留的旧 AI 回复不再被当作最新地点来源。
- 空地点依赖归一化 `normalizeLocationReferenceDependency`：旧回执依赖里 `values: []` 的空快照与现行 `null` 依赖等价，避免旧回执因空集合形态差异被无关失效。
- 真实地点标签仍建立宿主楼定位依赖，内容变化照常失效（第一阶段 P1 的成对合同不变）。

### 修复项四：旧版知情边界白名单（`src/ui/inline-projection.js` + `src/v3/recall-selector.js`）

- `CSE_RECALL_KNOWLEDGE_BOUNDARY` 缩短后（为小预算留空间），旧回执注入头不再匹配 `RECALL_BOUNDARY_LINES`，楼内卡片无法结构化投影历史回执。
- 修复：边界白名单收录全部历史版本文案（完整版、上一版短版、现行短基础版）；现行注入按「有状态/CSE 变化用完整边界，只有历史/提醒用短基础边界」二分。
- 冻结回执是持久协议的判据自此明示：文案迭代不能使旧版合法回执失去结构化识别。回归锁定于 `tests/inline-renderer.test.mjs`（固定旧版边界字符串，不依赖当前常量）。

### 修复项五：前情显式变更后的回执重选与旧回执有界迁移（`src/v3/recall-runtime.js`）

- **策略**（有意行为变更）：显式保存、修改或清空前情 → 当前 USER 旧回执失去复用资格，下一次生成按现有前情预算预留机制重选一次；前情未变或保存失败则保留；其他 USER 历史回执不动。代价是前情保存后发生一次重选。
- 新回执带可选 `prequelDependencyFingerprint`（前情源文本指纹，空前情为 `null`）并纳入签名材料；旧回执按原材料验签、只读展示不受影响。
- **跨聊天路径**：A 保存前情期间切到 B 时，只清理 A 的当前 USER（内存），不落盘、不清 B、不借 B 的保存接口写 A。
- **旧回执有界迁移标记**（本次收口补齐）：`savePrequel` 在前情文本同一次元数据保存里附带写入 `qianqianjiePrequelReceiptInvalidation`（当时最后一个 USER 楼的内容指纹，保存失败随前情一并回滚）。复用校验时，无 `prequelDependencyFingerprint` 的旧格式回执若命中该标记（同一 USER 楼）即失去复用资格；新回执写回后带指纹、按指纹比较，标记自然失效——迁移代价有界（每「前情变更 × 旧格式回执」组合至多一次重选）。冷重载（内存清理未及落盘）后旧格式回执也无法冒充有效。
- 端到端回归：`tests/v3-recall-prequel.test.mjs`「A 前情跨聊天保存后冷重载：旧格式回执凭失效标记重选一次并恢复冻结」——暖会话产真实回执 → 降级重签为旧格式 → 切 B 保存 → 冷重载 A（旧回执回到 USER 楼）→ 断言重选、新回执带新前情指纹、历史回执不动、下一轮恢复冻结复用。

### 修复项六：提取器 schema-only 回显拒绝与弱时间参考（`src/v3/extractor.js` + `src/v3/time-body.js`）

- `isSchemaOnlyPacket` + `JSON_SCHEMA_KEYS`：LLM 把输入 JSON schema 原样回显时（无实际摘要内容），按 schema-only 拒绝，不再让回显挡住同批合法摘要。
- `readTimeBody` 时间指纹改用 `sourceRaw || summaryRaw`：弱时间参考不再以空原文覆盖主线时间。
- 提取器兜底顺序同步降级弱参考：正文规范时间（canonicalTime）与模型结果先于 `referenceText`，后者只作末位兜底；模型已给出实质时间编排（kind 非 unknown/sequenceOnly 且有非空 sourceText）时不再被兜底行覆盖。该降级对现有全部用例惰性（两冲突用例均无 referenceText），属无测试覆盖的小步偏离，已留注释。

### 裁决：start-only 时间编排按上游合同处理，不迁就上游自相矛盾的红测试

上游 v0.8.0 同时携带两条互相矛盾、测试体逐字一致的用例：

- `tests/v3-time-body.test.mjs:547`「start-only 摘要编译不把已知起点当篇末」——qqj 命名空间、start-only 故事钟、无模型主线 → 期望**不合成**起点时间行（纯上游树通过）；
- `tests/v3-extractor-memory.test.mjs:5656`「残缺同楼时间戳进入同次提取并作非 exact 兜底」——myknots 命名空间、同样 start-only → 期望**合成** `10月5日 10:15` 兜底行（纯上游树同样失败，属 40 上游原生红之一，已实测复现）。

第二阶段曾把 `normalizeExtractorResponse` 改为合成 `partialStart` 起点行（迁就红的那条），代价是把原本绿的 time-body 合同打破——净红数不变（1↔1），且违反 AGENTS「禁止为让全量变绿而改本地 src 合同」。本次收口已回退合成路径：恢复上游「start-only 且无模型主线/可靠结束/参考/正文时间时不合成」的早退合同，time-body 恢复绿；该 myknots 用例保持红，作为上游原生红基线记录（325 例中 324 通过 / 1 上游原生红，与纯上游树同用例计数一致）。

### SDC 侧同步改动

- `runtime/tag-sanitizer.js`：平衡嵌套解析与 MK 逐字对齐；金样口径同为 39+1。
- `runtime/store-local-applied.test.js`：数据库预检断言改为 `{ proceed, memorySnapshot }` 合同（见更正 1）。
- SDC 全量：373 项 / 372 通过 / 1 跳过（缺宿主源码）/ 0 失败。

### 第二阶段验证记录

- MK 定向：`v3-recall-prequel` 9/9（含新增冷重载端到端）、`recall-local-guards`+`inline-renderer`+`v3-foundation-view` 166/166、清洗器+金样+生产入口+装配 62/62、`v3-time-body` 114/114、`v3-extractor-memory` 324/325（1 例上游原生红，见「start-only 裁决」）。
- MK 最终全量（bundle 重建、缓存键 `20261024.128-331f41b4ec3cde3b` 回填后）：1948 项 / 1947 通过 / 1 失败——唯一失败为上文裁决保留的上游原生红（`v3-extractor-memory` myknots 残缺时间戳例，测试体与上游逐字一致、纯上游树同败）。合并时基线 40 上游原生红中的其余 39 项已由测试夹具迁移（惰性卡片/弹窗、`customImpl`、生产入口 mock）与 `<location>` 适配（显式 `extraTags`）等 §2.1 认可的代修方式消解，未改清洗器缺省行为。
- SDC 全量：373 项 / 372 通过 / 1 跳过（缺宿主源码）/ 0 失败；两仓 40 例金样按「39 逐字 + 1 显式安全修正」口径跨仓一致，18 条平衡嵌套用例逐字一致。

### 收尾勘误与补充守卫（2026-10-24，第二轮独立审计）

- **文案勘误**：`src/ui/help-guide.js`（设置章节与排障手册两处）与 `docs/troubleshooting.md` 原写「保留包裹符默认是 content」，与本 fork 实际默认 `sourceKeepTags: ''`（两栏留空＝M0 直通）矛盾，已按实际默认改写；设置面板占位符「留空＝不清洗」不变。
- **补充守卫**：`src/v3/extractor.js` 的 `fallbackText` 顺序调整（`canonicalTime` 先于弱 `referenceText`）此前无测试覆盖，已加 `tests/recall-local-guards.test.mjs`「提取器时间兜底顺序」用例，并做变异验证（回退顺序即红）。
- **复核结果**：bundle 重建后缓存键 `20261024.129-6a9ba9d3155dd5e0`；四门禁 43/43、19/19、1949 项 / 1948 通过 / 1 上游原生红、跨仓 40+18 例 0 差异。
