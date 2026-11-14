# 合并上游实录与教训（Moon 定制版）

> **用途**：`AGENTS.md` §2/§3 只保留**当前契约、锚点与红线**；本文存放被外置的**合并实录与教训全文**（早期逐版本行与索引、正交性论证、损坏与陷阱实例、上游自带红测试代修史、版本要点、冲突实录、UI 迁移实录）。
> **何时读**：怀疑本地增强与上游机制相互干扰时（§2）；排查「合并后单侧绿、运行时 `ReferenceError`」类损坏时（§3）；遇到上游自动改写调用点或改名时（§4）；需要判断某条红测试是上游缺陷还是本地回归时（§5）。
> **日常合并流程本身不必读本文**——流程与门禁见 AGENTS.md §1.4 与 §4。

---

## 1. 早期合并实录（v0.5.0 ~ v0.7.15）

自 AGENTS.md §5.1 索引表外置：该表只保留近期版本，更早版本明细在此（不丢信息，仅改存放位置）。

| 上游版本 | 日期 | 合并提交 | 冲突与裁决要点 | 当期全量 |
| :--- | :--- | :--- | :--- | :--- |
| v0.5.0~v0.5.6 | 2026-09 | ed9fbfb..a3c17e8（docs 记录） | 基线记录期：清洗器资产域、守卫体系与本文档体例成型 | — |
| v0.6.0 | 2026-09-30 | 见 git log | people-workspace 整文件回归上游直通裁决（勿回植 extraOnly，§3.2） | — |
| v0.6.2+v0.6.3 | 10-01 | `7354fa3` | 3 冲突；`invalidate` 并集（千事 sessionReceipt + 本地 clearPersisted）；上游 2 红测试代修 | 1400 |
| v0.6.4~v0.6.6 | 10-03 | `6262acc` | 7 冲突；help-guide 包裹符段保本地、拒上游 `'content'` 默认、time-body `calendar` 并集（该 `calendar` 方案后由「剥壳投影」取代，见 AGENTS.md §2.2） | 1427 |
| v0.6.7+v0.6.8 | 10-05 | `60401dd` | 4 冲突；向量召回全采纳；**合并损坏一例**：本地 `sameRoot` 被吞致 118 红（见本文 §3） | 1506/1508 |
| v0.6.9~v0.6.11 | 10-06 | `c916304` | 3 冲突；union hunk（上游 `markVerificationFailure` + 本地密封点重对齐）；键 `20261006.15` | 1545 |
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

---

## 2. 正交性备忘（本地召回三增强 vs 上游千事删除撤回）

上游千事删除撤回（`qianshiDeletionProvider` / `withoutDeletedQianshi`）在冻结回执时**临时撤回**删除，既不重跑模型也不重签，故与本地三增强正交：

- **witness 赋值在密封之前**——本地「密封点活版本重对齐」调用 `receiptMaterial` 时，witness 尚未定义，不存在读到过期 witness 的窗口。
- **冻结复用路径本就不校验指纹**——上游 `commitFrozenReceiptIfCurrent` 复用阶段有意不比对 Checkpoint/Revision（测试锁定复用零 I/O），本地重签逻辑不参与该路径。

结论：三者自洽。日常重新生成照走上游 `root: 0` 极速通道，本地修复零性能开销。

---

## 3. v0.6.8 合并损坏实录（定义与使用分居两个被重写区域）

**症状**：合并后 `tests/v3-recall.test.mjs` 大面积 error，运行时 `ReferenceError`（本地 `sameRoot` 被吞），共 118 条红。

**机制**：本地补丁的**定义块**与**使用块**分别落在两个都被上游重写的区域里。3-way 自动合并让**使用块幸存**（上游该处未改，本地侧被保留），而**定义块被上游新代码整体替换吞掉**——语法检查无异常、单侧测试可能仍绿，直到运行时才炸。

**归因方法（教训）**：不要据「某一侧测试绿」判断合并正确。用「**合并树 vs 纯上游 diff**」快速定位残余差异：把合并结果与纯上游树逐段对比，凡只属于本地侧却被删掉的段落，就是被吞的定义。

---

## 4. v0.7.0 合并陷阱（上游自动改写调用点）

上游把 6 处 `materiallySame(` 调用点自动改写为 `sameMaterial(`，而 `sameMaterial` 的**定义在被弃的那一侧**（本地缓存版本的弃用分支）——只取本地侧会 `ReferenceError`。

**解法（已落地，红线）**：保留本地缓存块 + 加薄别名，使上游调用点**字节不变**、行为路由本地缓存：

```js
const sameMaterial = (left, right) => materiallySame(left, right, prepareMaterial);
```

一般形态：上游对某个本地化过的私有助手改名或改签名后，若只采纳调用点一侧，定义就丢了——与 §3 同源。

---

## 5. 上游自带红测试代修实录

判据：**先在纯上游树上复现同一红**，再判定为上游缺陷并代修。代修只动「路径可移植性」与「版本断言对齐」，断言与夹具内容一字未动。

| 版本 | 现象（纯上游树同样红） | 本地处置 |
| :--- | :--- | :--- |
| v0.7.2 / v0.7.4 | `tests/v3-extractor-memory.test.mjs` 调试导出夹具名由 `271` 改名 `1000`，写死 POSIX `/tmp/...`（Windows 解析为 `D:\tmp` → ENOENT） | 路径改 `join(tmpdir(), …)`（当前 `<n>` = `1000`），夹具名随之同步 |
| v0.7.5 | 认领前坐标校验致 2 条挂起/红 | 补 name/avatar 适配（`7c87ea9`） |
| v0.7.13 | `tests/production-entry-load.test.mjs:240` 版本断言停留在 `'0.7.12'`，而 manifest 已 `0.7.13` | 代修断言对齐上游发布号 |
| v0.7.14+v0.7.15 | `tests/production-dist-branch.test.mjs` 的 `fetchImpl` 只认 `/v1/records/qianqianjie/` 单条路由；v0.7.14 起记录读取强制先协商 `/v1/health`，探针 404 → 「聊天身份准备失败」（HTTP 404）→ 副本 binding 10s 超时 | 夹具补 `/v1/health` 桩：`{ ok: true, api: { current: 1, supported: [1] }, capabilities: { records: true, optimisticRevision: true } }`（不声明 `recordBatchRead`/`recordIdList`）→ 客户端走单条 GET 回退；断言与夹具内容一字未动 |
## 6. 合并要点与冲突实录归档（v0.8.0 ~ v1.1.6）

> 由 `AGENTS.md` §5 / §2.1 外置：AGENTS 只保留**当下底数**与**最近一版**要点，历史版本要点与长实录全文在此。新增合并记录直接写本文（AGENTS 只追加 §5.1 一行）。

### 6.1 版本要点（v0.8.0 ~ v1.1.6）

- **v1.1.4+v1.1.5+v1.1.6 合并要点（2026-11-09，合并提交 `04a0f15`）**：3 冲突（merge-tree 预判全中）——dist 重建、manifest 版本+键、`src/ui/v3-foundation-view.js` 唯一实质冲突（完全重构 reset 按钮：上游把 `reset.disabled = (busy && !pausedRebuildTask)` 简化为 `busy ||`（暂停任务也禁用，与 v1.1.4 chat-memory-management fullRebuild continue 前新增 `QQJ_REBUILD_BUSY` busy 拒绝相配）× 本仓同行 after 回调（`rebuildChatId` 捕获 + `recallRuntime.invalidate('foundationFullRebuild',…,{clearPersisted:true})` 本仓失效资产）→ **并集**：上游 disabled + 本仓回调，两改动正交共存）。extractor（160 行：prompt 62→64/semantic-compiler 34→36/`compileSemanticPacket` wrapper 化）、place 系列（新模块 `place-parent.js`、place-foundation 214、place-workspace 98、place-parent-contract 测试 187 行）、memory-runtime（128）、chat-memory-management（44）、entity-identity（54）、`recall-selector`（3 hunks 记忆化区外）、recall-source、cse-runtime、index.js、appearance（v1.1.5）、layout/panel/help-guide（v1.1.6）、测试 9 文件全部自动合并。上游 v1.1.4 主题：**地点父级批量裁决**——新模块 `src/v3/place-parent.js` `resolvePlaceParentBatch`（authority body=0/path=1/foundation=2、`previous`/`manual` 图合并、环整链拒绝、最近父选取、`compatible` 兼容集），extractor 旧回执归一化（`selectedParentsByFloor`）与 `projectFloorMemoryIdentityReferences`（`selectedParentsBySource`、`includeSpatial` 选项、places 不可用短路）统一接入，取代散装 parentSets；**places 源不可用全链降级**（v1.1.3 辅助解耦的完成态）——index.js `identityProjectionProvider` 增 `allowUnavailablePlaces`、recall-source 把投影记忆的 places 缺失升格为 identityProjection `unavailableSources`、selector 地点候选 try/catch + `placesUnavailable` 时清空 locations/spatialFacts + `placeSourceUnavailable` skipReason、extractor `compileSemanticPacket` 变 wrapper（places 缺失或域编译失败 → `skipPlaces` 重跑 `compileSemanticPacketDomains`，正文/身份/范围校验照跑，isolated 记 `V3_EXTRACTOR_PLACE_SOURCE_UNAVAILABLE`/`V3_EXTRACTOR_PLACE_COMPILE_FAILED`；placePaths 每段增 `placeKey` 显式关联 spatialFacts）、memory-runtime `optionalPlaceProjection`/`unavailablePlaceIdentity`（千窗快照 error 态「地点资料暂时无法读取」）+ placeMerges 先应用再 mergePlaceFoundation + 地点正文引文按 `resolveIdentityEntityId` 归并、cse-runtime `includeSpatial:false`；**placeMerges 显式地点合并**——place-workspace 新增 `compilePlaceMerges`（sourceKey→targetKey 链解析、环/冲突 isolated）与 `applyPlaceMerges`（重定向压缩、字段/范围并集继承、父级归属迁移），`validatePlaceWorkspace` 归一化 `identityRedirectsByEntityId`（链压缩+环拒绝），entity-identity `normalizeIdentityProjection` 并入 placeWorkspace 重定向、`reuseIdentityProjection` 增 unavailableSources 比对；**重构任务状态机**——`refreshHistoricalRebuildState`（getState 即刷新）、`partial` 态可见收敛判定 `readCompletedVisibleRebuildState`、continue 前 `busy()` 拒绝、`mainGenerationActive` 布尔直读。上游 v1.1.5 主题：appearance.js 自适应对比度（WCAG 4.5:1 readableSurface/readableText、blur tint 回退、onPrimary 对照）。上游 v1.1.6 主题：视口面板布局——layout.js `visualViewport` 几何（`--qqj-panel-bounds-*` CSS 变量 + `positionInView`，拖拽/缩放/恢复全走可视视口坐标）、panel.js 背景点击关闭（pointer down/up 双端手势 + moved>5px 不关）、移动端上下边距 max(40px, safe-area)、host `pointer-events:auto`；与 SDC v4.1.6/v4.1.7（新模块 ui/panel-window.js）**同主题姊妹提交，shared-body-wrappers 两侧均未触碰**。**语义复核（10 项全过）**：①`recall-runtime.js` 对合并前**零字节差**——§3.4①②③ 三资产与 `RECALL_STRATEGY_VERSION 'continuity-v32'`（零迁移）原样；②四记忆化 15 处在位，上游 3 hunks（`historySelectionContext` facts 重构 ~875、返回值 +`placesUnavailable` ~940、`selectRecall` skipReasons ~1825）与本仓记忆化 hunk 无行级交叠；`entityDerivedCache` 键控 context 对象（WeakMap），上游降级路径的记忆克隆（`{...memory, locations:[], spatialFacts:null}`）发生在 context 内部 facts 构造、仅降级路径生效，与键控零交互；③extractor 本地故事钟兜底排序（canonicalTime 先于 referenceText）与上游 wrapper/domains 并存无交叠；④index.js 本地 `migrateSanitizerKeepTags` 与上游 `allowUnavailablePlaces` 并存；⑤sanitizer 面与金样对合并前零字节差；⑥v1.1.1 两处 `extraTags:'think'` 适配原样（v3-recall.test.mjs 2751/2763）；⑦harness 并集（`sanitizerOptions`×`manualMemorySnapshot`）延续；⑧help-guide 本地 M2 段与上游 5 段新文案共存；⑨v3-foundation-view 并集语义自洽；⑩`RECALL_BOUNDARY_LINES` 白名单不动（上游无边界文案改动）。**测试适配：1 处 §2.1③ 环境适配**——上游新增故障注入测试「共享父级算法整体故障时…」（v3-extractor-memory 15360+）硬编码 POSIX `mkdtemp('/tmp/…')`（Windows ENOENT；纯上游树 3a06377 **同红**实锤）且以 `.pathname`（Windows 产出 `/D:/…` 畸形目标）+ 默认目录 symlink（EPERM 特权）挂 node_modules；适配为 `os.tmpdir()`+`fileURLToPath`+`junction`（免特权、POSIX 上类型参数被忽略），故障注入与断言意图不变。其余 +106 例新测试全部直过。等价性对 `3a06377` **144/144 逐字节一致**（sibling 清单无需扩充——selector import 面仅增 place-parent，审计工具重写清单兼容）。基准（上游裸 vs 本地，median-of-5）：n=48 **7.39×**、n=96 12.00×、n=192 **16.96×**、n=384 **23.52×**，指数 n^1.75→n^1.19（上游 v1.1.4 大 n 端更重，记忆化倍数继续拉大，渐近仍次线性）。键 `20261109.261-c328a623f21e5864`（20261109 全历史未用；上游 v1.1.4/5/6 同版键日期 20261108 已用 `.255`/`.257`/`.260`，本仓取 `.261` > 同版上游；bundle 7,445,258 B）。门禁数据：门禁1 金样 6/6 块（43 例）+memory-content-sanitizer 37/37、门禁2 35/35、门禁3 全量 **3485/3484+1skip（EXIT=0，连续第四次全绿；首轮 3485/3483 为上述环境红，适配后归零）**、门禁4 金样与 SDC 逐字节一致（sha256 `a61361cb…` 两仓同值）。SDC 侧同期完成 v4.1.6+v4.1.7 合并（2 冲突预判全中，617/615+1 上游原生红，金三件零改动）；
- **v1.1.2+v1.1.3 合并要点（2026-11-08，合并提交 `f17b3cf`）**：3 冲突（merge-tree 预判全中）——dist 重建、manifest 版本+键、`tests/v3-recall.test.mjs` 唯一实质冲突（harness 签名：本仓 `sanitizerOptions`（v1.1.1 §2.1 适配）与上游新增 `manualMemorySnapshot` 同位 → **并集**两参共存）。`recall-runtime`（v1.1.2 101 行+v1.1.3 218 行）、`memory-runtime`（181+20）、`recall-source`（新导出 `isolateRecallAuxiliarySources`）、`memory-coverage`、`recall-selector`（2 hunks 在记忆化区外）、`inline-projection`、`compact-api-client`、`index.js` 全部自动合并。上游 v1.1.2 主题：**召回续用**——`memory-coverage` 局部覆盖容忍（`hostCoverageProof` 冲突/重复 marker 只作废本楼 → `unmatchedFloorIds`，不再整图回 unknown；`permanent-memory-contract` 断言随之重写为 deepEqual）；`recall-source.projectRecallSource` 对未确认楼保留人工摘要残影（自动事实不随行）；`readiness` 短路（无缺摘要时 `unmatchedFloorIds` 不阻塞）；**单楼重新提取**——memory-runtime 新增 `captureExtractionTarget`/`assertExtractionTarget`/`anchorExtractionTarget`（先 `persistAnchors` 保存本楼 marker（`expectedCandidateSnapshot`+`replaceExisting`，message-floor-anchor 相应加固）再按所选正文提取；foundation-view/inline-renderer 接线）；time-runtime `manualBlock` 对象参数化+`canEdit`（记忆待同步时已存事项可查看维护）+写入前 `assertCurrentItems` 防陈旧+valid 键改 chatId+narrativeGeneration。上游 v1.1.3 主题：**辅助来源解耦**——index.js `identityProjectionProvider` 改 `Promise.allSettled` 并发读 people/places，失败方记 `unavailableSources`（entity-identity 透传），`allowUnavailable`+`onPartial` 渐进回调；recall-runtime `basePreparedSource` 超时/异常回退 `auxiliaryFallback`，`applyAuxiliaryProjection`+`isolateRecallAuxiliarySources`（people 不可用剥参与者/私密层、places 不可用剥地点/空间事实，人工知情名单 `manualEntityNames` 冻结保留）；新增 `refreshAuxiliaryReceipt`/`refreshFrozenManualSummaries`/`refreshLegacyAuxiliaryText`（≈160 行）与复用提交路径 `manualReceiptChanged` 再持久化；**回执模型演进**：`renderPlan.entityNames`（≤10000 对，receiptShapeValid 校验）+复用期冻结名合并、`persistedReceiptValid` 移除 placeWorkspaceDependency 比对、依赖固定 `${chatId}:0`（地点编辑失效改由 refreshAuxiliaryReceipt 局部同步承担）；**地点整理精简**：knownPlaces 去 `pathLabel` 改 entityKey+aliases+parentKey 绑定、`uniqueMaterial` 简化、`facilityIcons:{keywords}`、organizePlaces 提示文修订、place-evidence `collectPlaceOrganizationSources` 增 `contextSources`（旧引文直接复用不重展上下文）+按候选 placeKeys 定名；**API 参数兼容**：`applyOutputTokenLimit`（max_tokens/max_completion_tokens 择一）+推理模型（gpt-5/6、o1/o3/o4）温度省略——与 SDC v4.1.5 api/client.js 姊妹同构；`readManualArtifactBlocks` 外移**新文件 `src/v3/recall-text.js`**（增 `preserveHeaders` 选项；inline-projection 改导入，旧定义无残留）。**语义复核（本仓资产零触碰实证）**：①`captureCoreBodyWitness` 上游仍 5 参、未进函数体——本仓 6 参合成签名+triggerIndex 边界+双调用点原样；②§3.4② `clearPersistedReceipt(snapshot,save)` 原样（上游未触该区）；③§3.4③ sealed 新捕获持久化（`sealedReceipt`）与上游 `manualReceiptChanged` **分属新捕获与复用提交两分支互斥**，无双重持久化；④四记忆化在位，上游 2 hunks 落 `historySelectionContext` 人工原件段与 `manualKnowledgeBoundary`（manualArtifacts 增 `knownEntityNames`、知情边界用冻结名），均在记忆化区外；⑤`RECALL_BOUNDARY_LINES` 白名单 6 条与两侧边界常量一字未动（上游无边界文案改动，冻结回执协议无需扩充）；⑥`user-input-source.js` 上游未触碰，extra-only 适配原样；⑦v1.1.1 两例 `extraTags:'think'` 适配测试上游未改写、原样存活。**RECALL_STRATEGY_VERSION 两侧均 continuity-v32**（合并前回执零迁移）。**测试适配：零**——上游新测试（v3-recall +360、v3-extractor-memory +191、compact-api +130、place-evidence +54、foundation-view +40、cse +12、time-body +34、inline-renderer +13、message-floor-anchor +18、permanent-memory-contract 断言重写）全部通过本仓 M0 缺省，无 keep='content' 依赖类适配需求。等价性对 `d0d5612` **144/144 逐字节一致**（sibling 清单无需扩充——selector import 面未变）。基准（上游裸 vs 本地，median-of-5）：n=48 **7.45×**、n=96 10.10×、n=192 **15.26×**、n=384 18.62×，指数 n^1.79→n^1.33（上游新增工作使倍数较 v1.1.1 口径回落，渐近仍次线性）。键 `20261108.251-70d1f0ecd3e8029e`（新日期 20261108 全历史未用；上游 11-07 同日已用 `.246`/`.250`，本仓保守取 `.251` 兼容跨日读法；bundle 7,417,788 B）。门禁数据：门禁1 金样 6/6 块（43 例）+memory-content-sanitizer 37/37、门禁2 35/35、门禁3 全量 **3379/3378+1skip（EXIT=0，连续第三次全绿）**、门禁4 金样与 SDC 逐字节一致；SDC 侧同期完成 v4.1.5 合并（2 冲突预判全中，597/595+1 上游原生红，金三件零改动）；

- **v1.1.1 合并要点（2026-11-07，合并提交 `c93a7df`）**：5 冲突（merge-tree 预判全中）——dist 重建、manifest 版本+键、`recall-runtime`（1+1 hunks）、`memory-runtime`（1 hunk）、`time-body`（1 hunk）。上游主题：事项跟进拆分（`following` 布尔进事件语义签名与千事存档、「已停止」状态链）、剧情取材 USER 材料并读（**新文件 `src/v3/user-input-source.js`** 自 memory-runtime 外移 selectedUserInput/capturePrecedingUserInputFromSnapshot，另加 storedSourceUserInput/memoriesBySourceFloor；`time-body` 把前置 USER 输入按 `sourceParts` 并进取材正文并计入 `userInputFingerprint` 版本键；宿主快照最小化重投影）、地点层级共用（`placeParentFactBindings`；organizePlaces 系统提示整体重写为「身份/物理父链→scope→描述归并」，支持 `identityChange:ownershipChanged`+`parentPlaceKey:null` 撤销自动父；`lastOrganization.displayMetadata` 编译绑定 mapLevel/mapStyle/mapLayout）、地点整理引文核对（`place-evidence.js`：`collectMissingPlaceSources`→`collectPlaceOrganizationSources`+段落上下文+同名别名冲突检查，旧函数与旧测试保留）、校园地图×3（compact/garden/university）、召回精简（`placeRecallText(…,deduplicate)` 同来源重复短陈述去重，仅当前版本回执启用）、查询帧 canonical 对照（`buildRecallQueryFrame(…,canonicalAssistantByCoreIndex)`+runtime 预计算 `canonicalByRaw` Map 与正文见证共享清洗）、存储维护自动清理默认开启、TauriTavern 导入撤销备份字段精简；extractor prompt 57→62/compiler 28→34；**RECALL_STRATEGY_VERSION v30→v32**（合并前回执自动转历史，与 v27→v30 同理无迁移成本）。**三项裁决**：①`captureCoreBodyWitness` 上游第 5 参 `canonicalByRaw` 与本仓第 5 参 `userMessage`（§3.4①）**同位相撞→合成 6 参签名** `(chat, options, fingerprint, maximumFloors, canonicalByRaw, userMessage)`，两个调用点传 `(canonicalByRaw, user?.message)`；②memory-runtime 冲突实为上游外移——函数体整取上游侧、本仓唯一适配（`extraOnlySanitizerOptions` 包装，§3.2）**随迁新文件** user-input-source.js 的 sanitize 调用处（注释留痕）；③time-body 上游 USER 并读块整收、本仓 `clockContentFingerprint` 第三参 `sanitizerOptions` 穿透保留——两侧正交叠加，剥壳投影/等价绑定/控制源特性不受影响。**测试适配（§2.1）**：`recall-local-guards` 4 处调用改 6 参（第 5 参传 null 禁用缓存）；上游 2 例 canonical 查询帧新测试（「冻结清洗正文建近期对照」「只有思考的尾AI不回退审核」）依赖上游清洗器缺省 keep='content'（think 消失），本仓 M0 缺省保留正文 → 显式 `sanitizerOptions:{extraTags:'think'}` 复现同一语义，意图不变。语义复核：selector 记忆化 20 处符号在位、上游 9 hunks 无一落记忆化区；`RECALL_BOUNDARY_LINES` 白名单 6 条与两侧边界常量一字未动（上游 v1.1.1 不涉边界文案，冻结回执协议无需扩充）；`collectMissingPlaceSources` 为上游有意保留（非孤儿）。等价性对 `4084ed8` **144/144 逐字节一致**（sibling 清单无需扩充——selector import 面未变）。基准（上游裸 vs 本地，median-of-5）：n=48 **7.88×**、n=96 11.72×、n=192 **17.65×**、n=384 21.75×，指数 n^1.76→n^1.26。键 `20261107.243-e1f93110c0ba2595`（上游 11-06 已用 `.242`，按 §1.3 取未用过的更大值 `.243`，`git log --all` 复核 20261107 前缀全历史未用；bundle 7,389,356 B）。门禁数据：门禁1 43/43、门禁2 35/35、门禁3 全量 **3260/3259+1skip（EXIT=0，连续第二次全绿）**、门禁4 金样与 SDC 逐字节一致；SDC 侧同期完成 v4.1.4 合并（2 冲突预判全中，545/543+1 上游原生红）；

- **v1.1.0 合并要点（2026-11-06，合并提交 `2f047bc`）**：8 冲突（预判全中）——dist 重建、manifest 版本+键、`memory-content-sanitizer`（1 hunk：上游包装 htmlFormatting，保本地头）、`recall-selector`（6 hunks）、`inline-projection`（白名单并集）、`memory-content-sanitizer.test`（弃上游 HTML 测试）、`v3-recall.test`（4 hunks 并集）、`v3-recall-prequel.test`（整取上游）。上游主题：楼内召回目录、注入措辞结构性精简（直接陈述主体/态度对象/可见性）、地点召回合占合并（`groupRecallPlaces`）、**移除普通召回独立地点标注**、文字 API 重试次数（`transportBudget`）、HTML 正文兼容（`shared-body-wrappers.js` 增 htmlFormatting 解析）。**三项持久裁决**：①边界文案采上游统一短版，本仓 v0.8.0 两层制退役（动机已随上游格式精简消失；`inline-projection` 白名单并集收本仓 3 条历史文案保旧回执投影）；②**§2.2④ 前情指纹机制整体退役**——上游 v1.0.x 起自带 `fitReusedPrequel`（复用路径从活文本现算前情并按回执剩余额度收紧），v1.1.0 以测试锁死「前情保存后冻结回执继续复用」，本地指纹+失效标记+clearPersisted 成为冗余且每次前情变更多一次选材调用，采上游设计（与 v0.9.2 地点侧趋同先例同构），遗留失效标记元数据成惰性数据；③四项记忆化重植于上游新结构，`verify-equivalence.mjs c767988` **144/144 逐字节一致**（审计工具 sibling 清单补 place-foundation/place-workspace/spatial-domain）。新结构基准（上游裸 vs 本地记忆化，median-of-5）：n=48 **8.23×**、n=96 12.19×、n=129 14.90×、n=192 **18.25×**，指数 n^1.60→n^1.02。**htmlFormatting 适配面**（§2.1 勿改清洗器）：上游 4 个 HTML 测试弃用（依赖缺省 keep='content' 语义）；3 例改注释壳夹具承载同一意图（空壳绑定身份/空源零请求/extractNext 跳过空壳）；1 例结构性不可适配（「升级后 canonical 非空变空壳」的语义切换本仓不存在）带理由 skip；共享模块关系测试改断言本仓入口逐字保留 HTML。守卫测试 2 例随裁决更新（边界文案锁新短版+LEGACY 存续；地点依赖重选断言保留、注入文本断言随功能移除翻转）。上游修复 panel-navigation 18→21 原生红。键 `20261106.229-5634f7367c631b03`（上游 11-05 已用 `.228`，按 §1.3 取 `.229`；bundle 7,128,073 B）。门禁数据：门禁1 43/43、门禁2 35/35、门禁3 全量 3193/3192+1skip（EXIT=0，首次全绿）、门禁4 金样与 SDC 逐字节一致 + SDC 侧 33/33；

- **v1.0.4+v1.0.5+v1.0.6 合并要点（2026-11-04，合并提交 `010e65a`）**：2 冲突（预判全中）——dist 重建、manifest 版本+键。六测试热区全部自动合并，本地核心资产零触碰（清洗器四件套/shared-body-wrappers/people-workspace 双文件/foundation-domain 审计确认在位）。上游主题：v1.0.4 重庆/香港/名古屋城市底图+园林庄园/环廊底图+城市别名；v1.0.5 地点资料归并/图钉交互/统一方形地图/本丸院落底图；v1.0.6 室内定位父树水滴图钉修复+同文材料精简+已归并方位不重复召回。键 `20261103.219-7a2aa56eb8fa52e9`（上游同日已用 `.218`，按 §1.3 取未用过的更大值 `.219`；bundle 7,112,424 B）。**门禁3 1 条上游原生红**：`tests/panel-navigation.test.mjs:37` 断言 `18张通用图`，实际文案「现有21张通用图」（`src/ui/help-guide.js:76`）出自上游 v1.0.5 `7d2d5a5` 改文案未同步测试——本地与 upstream/main 该测试逐字节一致、纯上游树同红（1/0/1），待上游修复，禁止本地代改。门禁数据：门禁1 43/43、门禁2 35/35（上游扩例 23→35）、门禁3 全量 3146/3145+1 红、门禁4 金样与 SDC 逐字节一致 + SDC 侧金样 9/9；
- **v0.10.0+v0.10.1 合并要点（2026-10-30）**：6 冲突（预判全中）——dist 重建、manifest 键、`panel-navigation` 整取上游（其 CSS 断言自修 + 自带 `waitFor` 取代本地 stopgap）、`settings-api` 上游 env-root 子测试结构 + 补回本地 `'../utils/tag-names.js'` 重写行、`v3-extractor-memory` 1000 楼夹具取上游 `mkdtemp`（tmpdir 代修退役，§2.1）、`v3-foundation-view` 两侧都要（本地跨聊天回执测试 + 上游三红例断言重写）。上游主题：**记忆转移**（导出/导入单人聊天记忆、64MB 分卷、随包 JSONL，`memory-transfer*` 七新文件；TT 端改按设置启用 IndexedDB core cache）、人物十楼粗扫基线化（历史楼恢复不再误判新增）。**17 条旧上游原生红全清零**；新红 4 条（transfer wrapper 漂移）已修 `76cabfa`（§2.2）；全量 2635 全绿、等价 144/144、金样逐字、settings-api 41/41；
- **v0.9.6~v0.9.9 合并要点（2026-10-27）**：4 冲突；上游四主题直通——身份读宿主聊天文件优先（图键不变、无需迁移）、分支继承改三指纹匹配（无二次清洗风险）、peopleTaskRouter 分域取消、诊断可复制；入口夹具 M0 覆盖（反事实 7 红/7 绿，§2.1）；键 `20261027.1-61c780ebc41c3a3c`；
- **v0.9.5 合并要点（2026-10-25）**：5 冲突（dist 重建、manifest 键 `.132`、settings.js、help-guide、settings-api 测试）；上游三主题直通——identityFacts 结构化身份简介（新 `src/v3/identity-brief.js`）、共享破限容器（settings.js 并集裁决 §2.3）、分支复制（需白鳥后端 0.1.2）；help-guide 上游 3 处收 + 本地 2 处保；settings-api 测试并集 + data: 重写清单去重；入口 mock 缺 processingPrompt 访问器代修（§2.1）；全量 +4 上游原生红（§4）；等价 144/144、金样逐字节；
- **v0.9.2~v0.9.4 要点**（裁决细节已沉淀 §2.1/§2.3/§3.1 与 §5.1，逐版本实录随 git 历史）：合并裁决遵循「fork 资产保本地 / 上游同向修复取上游 / 本地语义嫁接上游管线」三原则；v0.9.3 唯一实伤 = plugin-activity 双声明（§2.1，已删本地版）；v0.9.4 引号解析修复整体直通（`json-symbol-repair`/`compact-api-client` 非本地资产）；
- **v0.8.0 审计修复（2026-10-22~24，已随 `7729c3a` 提交）**：空地点依赖、知情边界预算、时间 disabled 快路径、跨聊天弹窗保存保护、地点 beforeIndex、前情回执重选与旧回执有界迁移（§2.2 ④）、清洗器嵌套平衡（§3.1）；取证 `docs/audit-v0.8.0-test-failures-remediation.md`；
- **本地性能修复（2026-10-07）**：`src/v3/recall-selector.js` 四项记忆化（§3.5 / §2.2 末条），语义零改动；取证全文 `docs/audit-recall-budget-loop-2026-10.md`，审计工具 `tools/perf-audit/`（其 `absolutizeImports` 兄弟清单含 `memory-exclusion.js`，跨版本对比按「存在才重写」）；

### 6.2 冲突实录补遗（AGENTS §2.1 外置）

#### 6.2.1 `production-entry-load`：上游代修与本地代修相撞（v0.9.3 / v0.9.5 / v0.9.9）

**上游补声明方式可能与本地代修相撞（v0.9.3 实录）**：v0.9.2 本地曾给上游漏声明的 `plugin-activity` 等补 real-module define，v0.9.3 上游自带 `plugin-activity` stub 声明（并借 stub 捕获活动源供断言）→ 同测试双声明、`modules.set` 后到覆盖，real 压掉 stub 打红「人物资料/生日变化仍触发时间更新」；本地 real define 只保留上游仍缺的 `internal-processing-prompt`/`memory-exclusion`/`shared-body-wrappers` 三例，上游已自带声明的必须移除本地版。

**v0.9.5 实录（同类缺口）**：上游 index.js 改调 `settings.processingPrompt()` 而自带 settings stub 未加该访问器（纯上游树同红）→ 本地代补 `processingPrompt: () => productionSettings.processingPrompt`，断言与夹具不动（v0.9.9 上游已自行补齐该访问器，本地代修**已删**，勿回植）。

**v0.9.9 实录（M0 夹具覆盖，本行最易错）**：上游把 `readyFoundationRecords` 重写为 `{ expectedFloors = 1, summaries = false }` 变体（供 `nativeBranch` 6 例的源聊天 3 楼+摘要），并把该处 `sanitizerOptions` 保持为 base 的 `keepTags:'content'`——**本地那一行落在重写区间内才报冲突，属「位置重叠」而非语义对抗**。裁决＝**上游结构全收 + 只把该值换回本地 `() => ({})` + 重写 M2 合同注释**。反事实实测（2026-10-27）：换回上游 `keepTags:'content'` 时本仓 M2 把无标签夹具正文剥空 → 每楼摘要重试 3 次 → `summaryCalls = 9 ≠ 3`，7 例全红；换回 M0 则 7/7 绿。**等价性论证**：本夹具正文无 `<content>`、无注释，M0 直通与上游宽松 keep 产出逐字相同的 canonical，故此处只换配置表达、不改被测语义。

#### 6.2.2 `v3-wiring`：v0.8.0 设置页挂载机制改写

上游把设置页挂载改为 `v3FoundationView.mount(managementMount, { page: 'management' })`，断言仍停在旧 `setPage?.('management')`（纯上游树同样红）→ 本地按上游实际机制改写断言，勿误判为本地回归。

### 6.3 v0.8.1+v0.9.0+v0.9.1+v0.9.2 合并实录（2026-10-24，合并提交 `c6ace7c`）

跨度 v0.8.1+v0.9.0+v0.9.1+v0.9.2、20 处冲突，按三原则裁决（fork 资产保本地 / 上游同向修复取上游 / 本地语义嫁接上游管线）。要点与全部持久性契约见 `AGENTS.md` §2.1/§2.2/§2.3/§3.1/§4.3/§5.1，此处只记取证数据：

- **清洗器三向分歧**：上游 `sanitizeStoryBody`（shared-body-wrappers.js，两仓上游逐字一致）对拍 40 例金样仅 13 例一致 → 保本地实现；文件照收勿改（跨仓对拍依赖）；上游注释对包裹符能力不采纳（本仓注释属 M0 卫生清理）。
- **共享容器 M0 存活**：上游在 store 创建期初始化共享容器（全新安装落到回退值 'content'）→ 本仓 `get()` 默认回填后初始化 + `wrappers()/updateWrappers()` 先经 `get()` + 写入用本仓归一化 + 迁移同步重置容器；`tests/shared-body-wrappers.test.mjs` 期望按本仓合同适配（全新安装断言 keepTags=''）。
- **上游同向趋同（取上游形状）**：地点 `beforeIndex`（type 限定）+空值返 null+旧空占位宽容、时间 disabled 快路径、schema 回显拒绝（isSchemaMetadataCandidate）、弱参考降级（namespace-scoped）、夹具模式（openDetails/await save/editorError）。v0.8.0 的 start-only 矛盾红随上游测试重写消解。
- **记忆化等价**：`verify-equivalence.mjs upstream/main` 直接对比因本地条件边界文案分歧 36/144——临时中和边界（改回上游长文案）后 **144/144 逐字节一致**，证明四项记忆化+recordsByValue+sameMaterial 对上游 v0.9.2 新语义完全透明。工具 `absolutizeImports` 补 `memory-exclusion.js`（存在才重写）。
- **基线**：纯上游 v0.9.2 = 2018/2012/6（其中 2 例为跨仓读 moon-SDC 的环境性红，合并树已绿）；合并树终态 **2076/2072/4**，4 红全部实证上游原生（依赖清单缺 4 新模块叠加人物→时间门控断言脱钩 ×1；foundation 反馈文案 ×3）。`normalizeTagRules` 去重两仓同步（`f7a426f`）。
- 产物：版本 0.9.2，缓存键 `20261024.129-658429a52fe9524a`；门禁 1 清洗器 43 例、门禁 2 22/23（1=上述上游原生）、门禁 4 跨仓金样 40/40。


### 6.4 v0.9.3 合并实录（2026-10-24，合并提交 `d8eac84`）

**上游跨度**：单发布 `f40b574`（7948af1..f40b574），主题「人物资料、头像与故事时间」：新模块 `avatar-generation`/`avatar-image-store`/`story-time-clock`/`v3/people-profile-material`；`people-workspace`+298、`entity-identity`+113、`time-engine`+118、`index.js` 生命周期改 APP_READY 回放。

**冲突（4 文件，全为轻量并集）**：
- `src/v3/memory-runtime.js` import 并集：本地 `extraOnlySanitizerOptions` + 上游 4 个 entity-identity 新导入（`deriveUserIdentityProjection`/`projectFloorMemoryIdentityReferences` 等）。
- `src/ui/settings/prompts-settings.js` import 并集：本地 `normalizeMemoryTagList` + 上游 `DEFAULT_AVATAR_PROMPT`。
- `manifest.json` 缓存键行（版本行已自动并到 0.9.3）；`dist/qqj-app.js` 重建。

**唯一实伤——plugin-activity 双声明（新教训，已沉淀 §2.1）**：
- v0.9.2 时本地给上游漏声明的 4 个纯模块补 real-module define（`plugin-activity`/`internal-processing-prompt`/`memory-exclusion`/`shared-body-wrappers`）。
- v0.9.3 上游给 `plugin-activity` **自带 stub 声明**（并借 stub 捕获 `pluginActivitySources` 供 1213 行断言）；同测试内两个 define，`modules.set` **后到覆盖** → 本地 real 压掉 stub，人物→时间批次链路断（`timeBatches` 0≠1，`production-entry-load:1088`）。
- 归因过程：纯上游 v0.9.3 worktree（junction 链 node_modules）22/22 全绿 → 排除上游原生；「合并树 vs 纯上游 diff」显示链路 src 全逐字一致，仅测试文件多本地 real define → 删本地 `plugin-activity` define（保留上游仍缺的三例）即 23/23。
- 教训：**上游补声明的方式可能与本地代修相撞**；上游对同一缺陷自带修复时，本地代修从「资产」变「冲突源」，合并后须复核对同一 specifier 是否双声明。

**上游 v0.9.3 修复的旧红**：v0.9.2 的 4 上游原生红之一「生产入口行为接线：人物资料/生日变化仍触发时间更新」在本版被上游修复（重写人物资料链路时补齐装配）；门禁 2 由 22/23 回到 23/23。

**基线对照（isolation=none, concurrency=1）**：
- 纯上游 v0.9.3 Windows 树：**2086/2076/10**。其中 2 例环境红在合并树已绿：跨仓 settings 预设例（需 moon-SDC 兄弟仓）、1000 楼夹具 POSIX `/tmp` 路径（`D:\tmp` ENOENT——正是 §2.1 本地 tmpdir 代修所修，复跑 2 次确定性复现，非漏窗）。
- 合并树：**2144/2136/8**（+58 本地测试）。8 红**全部**含于纯上游 10 红集合：`v3-extractor-memory` ×4（时间状态字段具名纪年配对/增量千事索引共用/root 保存失败跨楼复用/历史楼顺序提取带时间——v0.9.3 上游自身新引入）+ `v3-foundation-view` ×3（v0.9.2 延续）+ `v3-people-workspace` ×1（取消选择迟到结果）。**零合并引入回归**。

**门禁终态**：①清洗器 43/43；②生产入口+装配 23/23；③全量 2136/2144（8 上游原生红）；④跨仓金样 40/40 逐字一致 + `verify-equivalence.mjs 7b8331d` **144/144 逐字节**（上游对 recall-selector 仅 2 行改动，记忆化透明性无需中和法）。

**本地资产复核（合并后 grep 实证在位）**：settings.js M0 三件套（共享容器初始化后置/wrappers 先 get/迁移重置）、extraOnly 三调用点、foundation-view 三处 invalidate（含 981 行弹窗 chatId 守卫、2253 行 rebuildChatId 捕获）、people-profiles-view:149 peopleProfileSaved、help-guide 两处文案、extractor record 单数+兜底顺序+namespace 早退、bootstrap recallRuntime 双注入、time-runtime 三元快路径、四项记忆化+recordsByValue+sameMaterial 别名。

**产物**：版本 0.9.3，缓存键 `20261024.130-9a9cb2f6e43e7773`（当日序号已用 .128/.129，上游同日 .90 不占本仓序列）。


## 7. UI 迁移实录：v0.8.0 覆盖型迁移（`v3-foundation-view.js`）

上游把本楼记忆编辑器从 `renderMemoryFloor()` 内联 `if (draft) {…}` 块抽为独立 `openMemoryEditor(floor, state, key, draft)` **弹窗**（`customImpl` + `qqj-editor-dialog` + 局部 `draw()` 重绘），并把卡片体改为惰性 `buildBody()`；**冲突块下游的公共代码引用上游新引入的 `currentState`**，故必须整体取上游结构。**「并集」在此类冲突上是错的**：`openMemoryEditor` 作为新函数会自动合入并 `drafts.set(key, draft)`，保留本地内联块会同时渲染两份编辑器，且缓存失效只挂在内联路径上 → 弹窗保存后静默不失效。正确做法是**迁移**：取上游结构，把 `recallRuntime?.invalidate?.('manualMemoryEdit', 'manualMemoryEdit', { clearPersisted: true })` 移植进 `openMemoryEditor` 的 `run(…).after` 回调。判据：先 `git grep` 特征串确认上游是「删除」还是「搬迁」，再查基线确认本地块是「新增定制」还是「保留旧行为」。**该 after 回调须先比 `nextState?.chatId === state.chatId`（保存发起时的聊天）才执行清理联动**（2026-10-24）：否则 A 保存期间切到 B，A 的完成回调会误删并保存 B 的回执。

## 9. v1.1.7~v1.1.16 合并（2026-11-13）

上游 `e9055d1`，合并范围 v1.1.7~v1.1.16。预判的 5 个冲突均命中：`dist/qqj-app.js` 重建；manifest 版本取 1.1.16 并重建缓存键；`src/v3/user-input-source.js` 保留上游 `selectUserStabilityAnchor` 与本地 `extraOnlySanitizerOptions`；`tests/v3-foundation-view.test.mjs` 并存本地回执保存回归与上游异步激活回归，并按上游更新“待登记”断言。

上游更新涵盖独立记忆管线、地点地图/来源选择、召回与地基修复、面板移动端输入几何，以及人物/向量索引和诊断能力；本地 §3.4 的 `recall-runtime` 与四项 recall-selector 记忆化继续保留。Vite 8.2.2 构建产物 6,596,867 B，SHA-256 `6c17d3371ed900c4ac6d24819c8d776d837d8b13cd1634fd75c5b877ca906cf7`。缓存键取当日未用序号 `20261113.299`，完整键 `20261113.299-6c17d3371ed900c4`。

验证：构建通过；金样 43/43、生产入口与装配 35/35。合并树全量 3695 项：3677 通过、17 失败、1 跳过；纯上游全量 3644 项：3622 通过、22 失败。合并树失败全部包含于纯上游失败集合（无新增红项），本地原生修复使 5 项上游红转绿；失败细节为上游行为/断言不一致，未改写业务行为。

## 10. v1.2.0 合并（2026-11-14）

上游 `5407522`（单发布提交，v1.1.16→v1.2.0）。`git merge-tree --write-tree main upstream/main` 预判 6 处冲突，实际合并**全部命中且无额外冲突**：`dist/qqj-app.js`、`manifest.json`、`src/ui/inline-projection.js`、`src/v3/time-body.js`、`tests/qianchuang-view.test.mjs`、`tests/v3-cse.test.mjs`。

**分包构建（v1.2.0 最大结构变化）**：上游新增 `tools/build.mjs`，把 `qianchuang-map-assets` 与四个 `qianchuang-*` UI 模块拆成 `dist/qianchuang-static-<hash>.js`；`vite.config.js` 改 `emptyOutDir:false` + `codeSplitting.groups`；`package.json` build 改 `node tools/build.mjs`。构建器逐文件比较字节、未变产物保 mtime/inode，稳定素材先于入口写入，失败不提前替换旧入口。本地无相关源码定制，构建出的分块与上游同名同 SHA（`qianchuang-static-yL4fQlU6.js`，2,136,068 B，`5f2c60c1…`），主入口 3,202,379 B（`010f29e1…`）。**注意**：入口测试 `modules.size === 2`、主入口相对导入只能指向该分块；`emptyOutDir:false` 会保留历史 dist 文件，重建前应清理旧 `qianchuang-static-*.js` 以免夹带。

**逐冲突裁决**：
- `dist/qqj-app.js`：删除冲突产物与旧分块后 `npm run build` 重建，不手工解。
- `manifest.json`：版本取 `1.2.0`；缓存键取 `20261114.333-010f29e1abf45db6`——上游 11-14 已用 `.332`，按全局递增取未用更大值 `.333`（`git log --all -S '20261114.'` 复核）。
- `src/ui/inline-projection.js`：本地「冻结回执全历史可投影」白名单并集 + 上游 v1.2.0 新增 `RECALL_COMPACT_KNOWLEDGE_GUIDANCE` 与无前缀短版字面量 → 8 条并集；上游其余解析改动（共享组 `表达者/接收者/内容`、`[已表达信息及接收范围]`、`qianshi` 边界段跳过）照收。
- `src/v3/time-body.js`：保留本地 `controlSource`+剥壳投影+5 参 `sanitizerOptions` 签名，嫁接上游「`timestamp.text` 存在即采用（incomplete 也保留部分日期/钟点）」判定；上游其余 `ambiguous && !clock.text`、`clock.meta.date` 基准处理自动合并。
- `tests/qianchuang-view.test.mjs`：import 并集（上游 `projectQianchuangSnapshot` + 本地 `resetQianchuangMapCatalogForTest`）。
- `tests/v3-cse.test.mjs`：`runtimeHarness` 签名并集（上游 `identityProjectionProvider` × 本地 `sanitizerOptions`），运行时注入保留本地 `() => sanitizerOptions`（默认 `{ keepTags: '' }`），不取上游 `{ keepTags: 'content' }`。

**上游主题**：人工内容优先与故障续做（单楼/人物/地点/时间分链隔离、向量索引复用分片、千事收尾）、双丝网（旧情境+新经历归纳）、地点初始化/整理分离与当前位置、地图底图统一与素材许可、时间读取/身份准备/分支历法继承、大档批量读写与核心缓存、`readContext` 公开参数（`focusQuery`/`participantNames`/`maxSummaries`/`summaryCharacters`/`recentSummaries`）。召回侧新增：`RECALL_KNOWLEDGE_GUIDANCE`/`RECALL_COMPACT_KNOWLEDGE_GUIDANCE`、冻结回执按活文本刷新知识边界、人工 CSE/时间冻结刷新、千事删除状态不可用时 `sessionOnly` 临时注入、`receiptMaterial` 重签点扩展——本地 §3.4 的见证 6 参/invalidate 三参/密封点重签与四项记忆化+recordsByValue+sameMaterial 均无行级交叠，自动合并后逐项 grep 在位。

**验证**（审计工作树 + 真实主仓路径复核，合并提交 `29f6ac0`）：
- 门禁 1：清洗器金样 43/43；门禁 2：`production-entry-load`+`v3-wiring` **45/45**（上游由 35 扩至 45，含分包构建四例）。
- 主仓全量 4114 项：**4113 通过、0 失败、1 skip 全绿**。审计工作树曾现 3 红，均为环境：`tauri-backend` 两例 `ENOTEMPTY` 清理竞态（重跑换例复现，AGENTS §4 已知偶发）、`共享父级算法整体故障` 的 node_modules junction 跨挂载点不可遍历（主仓同例通过）；主仓复跑全部消失。
- 等价对 `5407522` **144/144 逐字节一致**；审计工具 sibling 清单已补 `recall-text.js`（否则 `RECALL_KNOWLEDGE_GUIDANCE` 导入在 scratch 目录 MODULE_NOT_FOUND）。
- `settings-api`/`settings-modules`/`shared-body-wrappers`/`inline-renderer` 158/159 +1 skip 全绿；本地资产清单（§3.1/§3.4/§2.2）逐项 grep 在位。

## 8. 维护约定

- 新的逐版本合并要点写入 §6.1；新的冲突实录与上游原生红代修实例写入 §6.2 / §5；新的 UI 迁移写法写入 §7。
- `AGENTS.md` 仅保留契约、锚点、红线与索引；正文一旦膨胀即外置到本文。
