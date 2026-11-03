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
## 6. 合并要点与冲突实录归档（v0.8.0 ~ v1.0.3）

> 由 `AGENTS.md` §5 / §2.1 外置：AGENTS 只保留**当下底数**与**最近一版**要点，历史版本要点与长实录全文在此。新增合并记录直接写本文（AGENTS 只追加 §5.1 一行）。

### 6.1 版本要点（v0.8.0 ~ v0.10.1）

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

## 8. 维护约定

- 新的逐版本合并要点写入 §6.1；新的冲突实录与上游原生红代修实例写入 §6.2 / §5；新的 UI 迁移写法写入 §7。
- `AGENTS.md` 仅保留契约、锚点、红线与索引；正文一旦膨胀即外置到本文。
