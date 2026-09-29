# 千千结 · Moon 定制版 — 项目记忆（供维护与 CLI 参考）

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（作者 moon 定制版）。
当前在 `main` 分支上跟踪上游最新基线，并叠加了“moon”专属改动。`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。

> **用途**：供后续会话/开发者在执行“合并上游”、“升级维护”、“排查改动”时，迅速掌握本 fork 的核心定制、版本惯例、冲突裁决规则以及架构设计决策，确保合并上游时不丢弃本地核心资产。

---

## 1. 仓库定位与版本构建惯例

1. **版本声明 (`manifest.json`)**：
   - 跟随上游官方发布版本号（当前已同步至 **`0.5.11`**）。
2. **打包构建与产物约束 (`dist/qqj-app.js`)**：
   - 生产单文件由 `npm run build`（Vite + Rolldown）编译生成；
   - 源码发生任何变动后，**必须重新构建 bundle**，否则入口加载测试会失败。
3. **缓存键规则 (`manifest.json` 的 `js` 字段)**：
   - 格式强制规范：`dist/qqj-app.js?v=YYYYMMDD.<递增序号>-<bundle SHA-256 前16位>`；
   - `tests/production-entry-load.test.mjs` 会严格校验该哈希是否与实际 `dist/qqj-app.js` 的文件摘要一致；
   - 序号随打包批次全局递增（当前批次为 **`20260929.40`**）。
4. **分支与同步策略**：
   - 合并上游前先建立备份分支：`git branch backup/main-before-upstream-vX.Y.Z main`；
   - 在 `main` 分支执行 `--no-ff` 合并：`git merge --no-ff upstream/main`；
   - 本地合并验证完整前，不直接向远程 force push。

---

## 2. 合并冲突热区与解决规则（合并上游必查）

每次合并上游发布版本时，通常仅在以下 4 个文件产生常规版本与产物冲突，业务代码绝大部分均可 Git 3-way 自动平滑合并：

| 文件路径 | 冲突性质 | 解决裁决方式 |
| :--- | :--- | :--- |
| `manifest.json` | 版本号行与构建指纹行冲突 | 采纳上游发布的版本号（如 `0.4.3`）；构建完成后填入最新缓存键 |
| `dist/qqj-app.js` | 编译混淆产物冲突 | 冲突产生后直接执行 `npm run build` 覆盖重建即可消除 |
| `tests/production-entry-load.test.mjs` | 冒烟版本断言与上游新增 mock 冲突 | 采纳上游修改（版本断言对齐上游最新版本） |
| `tests/v3-wiring.test.mjs` | 架构装配接口导出与版本断言冲突 | 采纳上游修改（版本断言对齐上游最新版本） |
| `tests/v3-cse.test.mjs` | 上游新增 `runtimeHarness` 宿主参数与本地 `sanitizerOptions` 参数冲突 | **取并集**：本地默认值与上游 Persona 参数互不相干，两者都必须在场（v0.5.6 合并首次出现） |
| `src/memory-content-sanitizer.js` | 上游 v0.5.8 将清洗器整体重写为「默认 keep='content'」简化实现，并新增 `stripMemoryTagBlocks`/`readMemoryTagBlocks` 导出，与本地四模式合同全面相撞 | **双层保留**：本地 M0-M3 渲染器、`sanitizeMemoryContent`（不注入默认 keepTags）、`extraOnlySanitizerOptions` 逐字保留；上游 `stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`HTML_VOID_TAGS`/元数据解析器整段移植（仅将上游同名 `parseSanitizerTree` 更名 `parseTagTokenTree` 避免撞名，2 空格缩进原样保留使该区域未来合并零冲突）；自动合并测试中依赖上游默认 keep='content' 的断言按本地 M0 合同改写（v0.5.9 合并首次出现） |
| `src/v3/people-workspace.js` + `src/ui/people-profiles-view.js` | 上游增删人物工作区功能时与本地叠加层相撞（v0.5.11：上游删除群体整理 `fullRewriteEnvelope`/`rewriteSelectedProfiles` 换成轻扫 `automaticRecentFloors`，撞掉本地第二处 extra-only 调用点与视图 `recallRuntime` 注入） | **随功能走 + 本地注入保留**：被上游删除的功能代码连同其专属保护点一并放弃（功能没了保护点自然不需要）；视图工厂签名保留本地 `recallRuntime = null` 参数并采纳上游瘦身后的 runtime 校验列表；存留的世界书路径 extra-only 调用点逐一复核（v0.5.11 合并首次出现） |

> **业务文件自动合并注意**：
> - `src/settings.js`：本地添加的 `sourceKeepTags: ''` 与上游存储自动清理字段位于不同区域，自动合入；
> - `src/v3/cse-engine.js` 与 `src/v3/memory-runtime.js`：本地添加的 `extraOnlySanitizerOptions` 清洗拦截与上游新提示词/千事调度正交，自动合入。

> **本地已修改的上游产权文件（未来合并的潜在冲突热区）**：
> - `src/v3/recall-runtime.js`（上游所有，本地叠加三处增强：见证截断 / 密封点版本重对齐 / `invalidate` 支持 `clearPersisted`）——
>   上游 v0.4.4+ 若重写召回链路，须以本地增强为产权逐项回植，并重跑 `tests/v3-recall.test.mjs` 全绿；
> - `src/ui/v3-foundation-view.js`（单楼编辑 / 完全重构的 `invalidate` 联动点）、
>   `src/ui/people-profiles-view.js`（`saveProfile` 联动点）、`src/bootstrap.js`（`recallRuntime` 注入）——
>   上游若重排这几处 UI 装配代码，须保住三处 `invalidate` 联动调用。
> - `src/v3/time-body.js`（`currentBodyClock` 本地加法式内容视图兜底探测：canonical 探测返回 null 时以
>   `sanitizeMemoryContent(rawContent, { keepTags: 'content' })` 再探一次，弥合上游 v0.5.8 时间测试对
>   「effective canonical 已剥出 content」的依赖）——上游若重写 `currentBodyClock`，须回植该兜底并重跑
>   `tests/v3-time-body.test.mjs` 全绿。

---

## 3. 必须保住的本地核心定制资产（Fork 存在的价值，合并时逐项复核）

合并上游或重构时，以下 4 大定制模块为本地产权核心，**严禁被上游旧代码覆盖或对齐掉**：

### 3.1 四模式标签清洗器（与 ST-SevenDaysCal 逐字节一致）
- **核心文件**：
  - `src/memory-content-sanitizer.js`（树形单遍解析，`sanitizeMemoryContent` 接口）；
  - `src/tag-sanitizer.golden.json`（40 组锁定金样，LF 行尾）；
   - `tests/tag-sanitizer-golden.test.mjs` 与 `tests/memory-content-sanitizer.test.mjs`（21 组测试全绿）。
- **核心合同**：
  - **M0（两栏皆空）**：直通不清洗，保留正文，仅做注释/孤立标记清理；
  - **M1（仅 extra）**：成对删除 extra 标签及内容，未闭合 extra 吞至同名闭合或文末（噪音不泄漏）；
  - **M2（仅 keep）**：剥壳保留 keep 块内容（内部不再二次清洗，嵌套标签原样保留），块外裸文本丢弃；
  - **M3（混合）**：extra 恒优先，无论在外层、包裹 keep 还是嵌套在 keep 子树内一律整块剔除；
  - **三分支 token 正则**：`TAG_ATTR_SOURCE`（引号感知，属性内 `>` 不截断）+ `TAG_ATTR_FALLBACK_SOURCE`（未闭合引号宽松兜底回退旧行为，防止思维链泄漏）+ `[[...]]`；
  - **自闭合标记**：keep 子树内自闭合 extra 标记连标记删除，非 extra 原样保留 openRaw。
- **合法差异保留**：
  `src/utils/tag-names.js` 接受 `[,，\n]` 分隔符（中文逗号与换行兼容）。
- **v0.5.8+ 双层文件结构**：`src/memory-content-sanitizer.js` 前半部为本地四模式合同，后半部为上游移植段
  （`stripMemoryTagBlocks`/`readMemoryTagBlocks`/`tagTokens`/`parseTagTokenTree`，服务 v3 时间链路，`<br>` 按
  void-tag 处理、节点携带偏移元数据），与四模式合同正交。上游后续若改这些导出，直接对齐上游该段即可
  （逐字移植 + 仅保留 `parseTagTokenTree` 更名）。

### 3.2 非 AI 正文来源 extra-only 隔离清洗（防止世界书/用户输入被洗空）
- **核心辅助函数**：
  `export function extraOnlySanitizerOptions(options = {}) => { keepTags: '', extraTags: options?.extraTags ?? '' }`
- **保护场景与调用点**：
  - `src/v3/cse-engine.js`：`captureCseBaseline` 遍历世界书条目时；
  - `src/v3/people-workspace.js`：人物工作区扫描世界书时；
  - `src/cse-source-selection.js`：动态世界书与扫描窗纯文本；
  - `src/v3/memory-runtime.js`：`capturePrecedingUserInputFromSnapshot` 用户输入快照处理。
- **设计依据**：
  `keepTags`（如 `'content'`）是 AI 正文专属提取白名单；普通用户输入或未加自定义标签的世界书条目若流经 `keepTags` 会被直接清空为 0 字。非正文来源必须强制走 extra-only 清洗。

### 3.3 提示词与标签设置 UI 校验 (`src/ui/settings/prompts-settings.js`)
- **默认值配置**：`src/settings.js` 中 `sourceKeepTags: ''`（默认留空直通，全库不应残留 `'content'` 默认）；
- **保存拦截器 (`bindTagFieldWithClashCheck`)**：
  在保留/清洗两栏输入失焦保存时，自动对两栏标签进行归一化交集计算（含 `[[...]]`）。若检测到同名标签冲突，**拒绝落存、输入框回退旧值**，并在下方显示 `settings-result error` 行内红色警告提示，从源头上阻止非法配置存盘。

### 3.4 召回回执重新生成（Regenerate）秒级复用机制与架构定性
- **核心文件清单**：
  - `src/v3/recall-runtime.js`（见证截断、密封点版本重对齐、`invalidate` 增加 `clearPersisted` 支持与 `saveChat` 落盘）；
  - `src/ui/v3-foundation-view.js`（单楼记忆编辑保存与完全重构成功后触发主动失效）；
  - `src/ui/people-profiles-view.js`（人物资料手动保存成功后触发主动失效）；
  - `src/bootstrap.js`（向 `peopleProfilesViewFactory` 注入 `recallRuntime` 引用通道）。
- **深层痛点与双重致错源头**（此前曾片面归因于“后台自动摘要推进版本”）：
  实测表明：**即便上一楼摘要早已归档落盘，只要用户执行“删除当前用户楼 → 重新输入发送 → 点击重新生成”，该问题依然 100% 稳定必现！** 经排查，背后存在两大致命源头：
  1. **并发盖错公章（时序倒挂）**：推进全局 Root 的不仅是高层摘要，重新发送消息触发的底层地基扫描（`foundationRuntime.scan()` -> `commitRoot()`）也会对齐新消息节点。在选材 LLM 耗费 20+ 秒的窗口期内 Root 被推进，而原代码在开收据时依然盖了选材开始时的旧公章，导致收据存盘即过期；
  2. **正文见证指纹漂移（`bodyMatchFingerprint` 敏感失效）**：原 `captureCoreBodyWitness` 缺乏锚定，直接从数组末尾逆向采集 3 条 AI 楼层。点击重新生成时，宿主传来的数组尾部可能短暂残留刚被撤下的 AI 楼层，导致见证楼层从 `[#52, #50]` 漂移成 `[#54, #52, #50]`，指纹分歧无情击穿回执。
- **上游 0.4.3 应对机制与本地治本修复的客观定性**：
  - **上游 0.4.3 的取舍（无条件冻结复用）**：
    上游在 0.4.0~0.4.3 引入了 `commitFrozenReceiptIfCurrent`，立下严格的 `root: 0` 零 I/O 极速通道合同
    （上游测试 `tests/v3-recall.test.mjs:4338` 明确断言复用时 `root: 0`，禁止任何 `store.readRoot` 调用）。
    为追求极致性能与消除等待症状，上游在复用阶段故意不再比对 `headCheckpointId`/`rootRevision`，直接信任冻结收据。其代价是放宽了校验，导致用户在面板手动修改记忆后重新生成时无法被灵敏感知；
  - **本地修复体系（`09f2b59` + `5edef87`）的不可替代价值**：
    1. **见证楼层向前截断 (`captureCoreBodyWitness`) —— 绝对必要**：
       传入触发用户楼 `userMessage` 严格向前逆向采集。它不仅用于重新生成复用，还在全新生成（normal）及 `commitPromptIfCurrent` 的 `captureCoveredBodyGuards` 终检时发挥决定性保护作用，彻底消除了“删楼重发”及尾部临时 AI 楼层残留导致的见证漂移与意外 Abort；
    2. **密封点活版本重对齐 (`commitPromptIfCurrent`) —— 落盘数据治本保障**：
       选材结束后持久化前，重新读取活档案头，将收据的 Checkpoint、Revision 及签名自动重对齐为最新版本。使落盘到聊天记录 `extra` 中的收据天然自洽真实，消除了历史归档与分支继承中的失真假报警；即使上游后续收紧版本核验，本地收据也能平滑无缝兼容；
    3. **三端联动主动失效闭环 (`invalidate({ clearPersisted: true })`) —— 完美守护用户心智**：
       在 `recall-runtime.js` 的 `invalidate` 中增加了清除当前最新用户楼持久化收据并同步调用 `context.saveChat()` 落盘的能力（防止 F5 刷新后旧收据死灰复燃）。
       并在三大核心人工修改入口完成联动：
       - `v3-foundation-view.js` 单楼记忆保存（`manualMemoryEdit`）；
       - `v3-foundation-view.js` 完全重构完成（`foundationFullRebuild`）；
       - `people-profiles-view.js` 人物资料保存（`peopleProfileSaved`）。
       既遵守了上游日常重新生成时的 `root: 0` 极速通道，又在用户手动修改记忆时实现了精确的缓存清除与重新选材；
    4. **共存效果**：本地修复零性能开销、1067 项测试全绿，使插件在完美继承上游 0.4.3 毫秒级闪电复用的同时，守住了底层数据的真实性与鲁棒性。

---

## 4. 验证清单与验收标准

执行合并、升级或改动后，必须依序通过以下 4 项硬性门禁：

1. **清洗器金样与单元测试**：
   ```bash
   node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs
   ```
   *标准*：21/21 全部全绿（40 例金样逐字节一致）。
2. **生产构建与入口装配测试**：
   ```bash
   node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs
   ```
   *标准*：9/9 全部通过（验证 manifest 缓存键与 bundle SHA-256 绝对吻合）。
3. **全量测试套件自动化运行**：
   ```bash
   npm test
   ```
   *标准*：全量 1200+ 测试用例全部全绿（耗时约 57s，0 失败）。
   > **已知上游偶发用例（勿误判为本地回归！）**：`tests/v3-extractor-memory.test.mjs:5242`
   > 「切聊天及正文结构事件会撤销提前武装，迟到 token 不得写入或调用模型」存在**负载敏感的时序偶发**：
   > 空闲快速机器上后台自动化任务会在 10ms 断言窗口内漏入，报 `MESSAGE_DELETED 后不得触发旧楼任务 1 !== 0`；
   > 高负载或重跑时可通过。**已在纯 `upstream/main` worktree（零本地改动）中复现同样失败**，实证与本地产权无关。
   > 合并或维护时见此用例失败，先跑纯上游对照，切勿据此回滚本地资产。
   > v0.5.7 对照曾稳定复现 `tests/production-dist-branch.test.mjs` 的“源图准备失败”与 `tests/v3-chat-fork.test.mjs` 的“源聊天记忆未追平”两个 10 秒初始化超时；纯 `upstream/main` 同样失败，属于上游分支初始化时序问题。**v0.5.9 合并后这两项超时已不再出现**（v0.5.9 全量可 0 失败通过）。
4. **与 ST-SevenDaysCal 跨仓终验对拍**：
   运行 40 例金样跨仓比对脚本，验证与 `ST-SevenDaysCal/runtime/tag-sanitizer.js` 输出 **0 差异、100% 逐字节一致**。

---

## 5. 当前仓库状态底数（基线备忘）

- **当前工作分支**：`main`（v0.5.11 合并提交，哈希见 `git log`）；
- **跟踪上游基线**：已合入 `upstream/main`（Tag: `v0.5.11`，提交 `6475a65`，含 `v0.5.10`/`20c7280`）；
- **当前产物版本**：`manifest.json` 版本号 `0.5.11`，缓存键 `20260929.40-03173b1854dd0b22`（bundle SHA-256 前 16 位）；
- **v0.5.5/v0.5.6 上游能力**：v0.5.5（① 归档旧楼手动回填不再因正文被编辑/切 swipe 而拒绝，以归档快照为准；② 千事「编辑详情」可改/清空 **涉及物品（object）**，下游检索/召回/候选读取新值；③ 千事时间线按日期折叠，恒显日期+条数，搜索命中临时展开该日期、清空搜索恢复手动展开态；④ 新增 **user Core 提取**机制 `userCoreExtraction`，仅从 userPersona 文本提取用户长期核心特质，新字段 `userCoreExtraction`/`userCoreCheck`/`manualCoreSubjectEntityIds`，CSE 提示词 `qqj-v3-cse-prompt-23`、提取器提示词 `qqj-v3-extractor-prompt-24`）；v0.5.6（标准 ST 宿主上下文缺少 Persona 标识时，回退取当前条目 user UserPersona 标识，`index.js` 向 `createHostAdapter` 注入 `personaIdentifierProvider: () => user_avatar`；无可用标识时跳过用户 Core 辅助提取，常规角色状态分析照常保存）；本地清洗器、extra-only 隔离与召回失效闭环均已保留；
- **v0.5.7 上游能力**：CSE 提示词升级至 `qqj-v3-cse-prompt-24`、编译器升级至 `calibration-compiler-13`；兼容 `subjects`/`people` 等人物结果别名并拒绝冲突字段；所有候选均被隔离时明确失败并触发重试；本地清洗器、extra-only 隔离与召回失效闭环均已保留；
- **v0.5.8 上游能力（时间链路与千事日历兼容）**：清洗器新增 `stripMemoryTagBlocks(raw, tagNames)` / `readMemoryTagBlocks(raw)` 导出（节点携带 `start/end/contentStart/contentEnd/textRanges` 偏移元数据，`<br>` 按 void-tag 路径处理不吞其后文本）；`src/v3/extractor.js` 的 `inferCanonicalCurrentTime` 改为标签块感知（`<date>/<time>` 字段组、status 容器、excluded 标签块过滤）；`src/v3/time-body.js` 的 `currentBodyClock` 先在剥离 content 块的原文上找状态栏时间、再回退清洗后正文；千事后端与日历兼容性修正；本地清洗器、extra-only 隔离与召回失效闭环均已保留；
- **v0.5.9 上游能力**：字号以旧版 85% 档观感为基准，调整后固定所选大小不再随窗口缩放（新增 `src/ui/font-scale.js`）；高级 API 设置中每个配置可单独留空温度沿用默认行为；召回标题放大到 150% 时允许换行；人物资料保存时保全引用字段；
- **v0.5.10 上游能力**：千事时间线把无法确定发生日期的事件单独收入「无法确定单一发生时间」分组，编辑自动展开、重绘保留手动展开态；时间解析保留约略表述（日期明确钟点约略时按日期归组但不按钟点精确排序，日期约略入未定分组，具名纪年「约」前缀仍按历法名识别）；摘要解析兼容限定说明包围的唯一 JSON 对象、stop 结束且只缺唯一结尾大括号的情况，标准 `people` 无可用人物时可回退读取 `person`；
- **v0.5.11 上游能力**：千人轻扫——每约十个新增稳定 AI 楼触发近期原文轻扫，只更新明确新增或重大变化的长期资料，手动修改优先、无有效新结果保留旧资料、迟到结果不写入已变化的人物或聊天；移除千人页顶部群体整理入口及专属流程（`fullRewriteEnvelope`/`rewriteSelectedProfiles` 删除），仍可逐人整理；
- **v0.5.11 本次合并实况**：真冲突 4 处——`manifest.json`（版本号 + 缓存键）、`dist/qqj-app.js`（编译产物）、`src/ui/people-profiles-view.js`（本地 `recallRuntime` 注入参数 vs 上游删除 `rewriteSelectedProfiles` 校验项，取并集）、`src/v3/people-workspace.js`（上游删除 `fullRewriteEnvelope` 换成 `automaticRecentFloors` 轻扫，随功能走）；上游触碰 `people-workspace.js`（302 行）与 `people-profiles-view.js`（19 行）两个本地热区，`view.js:128` 的 `peopleProfileSaved` 失效联动与 `people-workspace` 世界书路径 extra-only 调用点均完好；`people-workspace` 第二处 extra-only 调用点随被删除的整档重写功能一并消失（轻扫流程不读世界书，无需保护点）；清洗器、time-body、settings、floor-binding、recall-runtime 上游零触碰；
- **v0.5.11 本次验证**：金样/清洗器 21/21（40 例金样逐字节）；生产入口 + 装配 30/30（含金样合并跑）；千人套件 70/70；extractor/CSE/千事/故事时钟 421/421；**全量 1278/1278 全绿**（首轮失败为第 4 节记载的上游负载敏感时序偶发项，重跑通过）；跨仓 40 例金样对拍 **三方逐字节 0 差异**；
- **v0.5.9 本次合并实况**：真冲突 3 处——`manifest.json`（版本号 + 缓存键）、`dist/qqj-app.js`（编译产物）、**`src/memory-content-sanitizer.js`（首次真冲突：上游 v0.5.8 将清洗器整体重写为「默认 keepTags='content'」简化实现，与本地四模式合同全面相撞）**；其余全部三方自动平滑合并（`src/settings.js` 本地 `sourceKeepTags: ''` 默认完好，`src/v3/floor-binding.js` 的 `equivalentContent`/`locatorEquivalent` 绑定修复完好）；
- **v0.5.9 冲突裁决（清洗器双层保留）**：本地 M0-M3 渲染器、`sanitizeMemoryContent`（不注入默认 keepTags）、`extraOnlySanitizerOptions` 及全部既有导出**逐字节保留**；上游 `stripMemoryTagBlocks`/`readMemoryTagBlocks` 连同 `tagTokens`/`HTML_VOID_TAGS`/元数据解析器**整段移植**（仅将上游同名 `parseSanitizerTree` 更名 `parseTagTokenTree` 避免撞名，上游 2 空格缩进原样保留使该区域未来合并零冲突）；移植段内归一化引用改走本地 `normalizeTagRules`（简单标签名下与上游归一化等价，含 `[,，\n]` 分隔与 `<tag>` 解包）；
- **v0.5.9 测试侧适配**：自动合并的 `tests/memory-content-sanitizer.test.mjs` 中，上游新测试两条断言依赖上游「默认 keepTags='content'」语义（`sanitizeMemoryContent('甲<br>乙</br>丙')==='甲丙'`、`sanitizeMemoryContent('<meta>说明</meta>')===''`），按本地合同改写为 M0 直通正断言（两输入逐字节保留）；`stripMemoryTagBlocks`/`readMemoryTagBlocks` 的 br-void 与祖先链断言原样保留；
- **v0.5.9 源码侧加法式修复（time-body 内容视图兜底）**：上游新测试「同父字段容器允许其他包装节点…」与「raw无可用戳或状态时才从清洗后的正文开头回退时间」依赖上游 effective canonical（content 块已剥出且块外裸文本保留），该语义在本地**无对应清洗模式**（M0 保留标签壳致提取门禁拒绝；M2 对无 content 块正文产空串会被 `scanAssistantCandidates` 的 `if (!canonicalContent) continue` 跳过），纯测试侧无法适配。修复：`src/v3/time-body.js` 的 `currentBodyClock` 在 canonical 探测返回 null（非 ambiguous）时，追加 `inferCanonicalCurrentTime(sanitizeMemoryContent(rawContent, { keepTags: 'content' }))` 内容视图兜底——与上游时间链路自身硬编码 `'content'` 的 `stripMemoryTagBlocks(rawContent, 'content')` 口径一致；用户已显式配置 keepTags 时行为不变；
- **v0.5.9 本次验证**：清洗器/金样 21/21（40 例金样逐字节）；生产入口 + 装配 9/9；v3 CSE 75/75；time 23/23、time-body 89/89、extractor 240/240；**全量 1274/1274 全绿（0 失败，含上游负载敏感偶发项通过）**；跨仓 40 例金样对拍 **本地/SDC/金样三方逐字节 0 差异**；
- **v0.5.6 合并实况**：真冲突 3 处——`manifest.json`（版本号 + 缓存键）、`dist/qqj-app.js`（编译产物）、**`tests/v3-cse.test.mjs`（新增冲突，仅 `runtimeHarness({...})` 签名单块）**；其余全部三方自动平滑合并，含 `src/ui/v3-foundation-view.js`（上游新增 `clockReminder` 与本地两处 `invalidate` 钩子位于不同区域）、`src/v3/memory-runtime.js`（上游千事 object/历史护栏与本地 `extraOnlySanitizerOptions` 正交）、`src/cse-source-selection.js`（上游 `personaLocator` 与本地 extra-only 无关）、`src/v3/cse-engine.js`、`tests/v3-extractor-memory.test.mjs`、`tests/v3-time-body.test.mjs`；`src/v3/recall-runtime.js`、`src/bootstrap.js`、`src/ui/people-profiles-view.js`、`src/settings.js`、`src/memory-content-sanitizer.js`、`src/utils/tag-names.js` 上游零触碰，12 项本地核心资产完整保留；
- **v0.5.6 合并验证**：金样/清洗器 20/20；生产入口 + 装配 9/9；全量测试 1244 例、1243 通过、**唯一失败为第 4 节记载的上游负载敏感时序偶发项**（首轮即现、与本地无关）；跨仓 40 例金样对拍 **80 次用例执行 0 差异**（40 本地 + 40 SDC 各跑双方实现，且各自匹配自身金样）；
- **v0.5.6 合并的额外本地修复（真实语义冲突，非机械合并）**：
  本地 M0 清洗器合同**保留**已配置的故事时钟引用标签（`storyClockReferenceTags`）于 canonical 正文中，而上游 v0.5.5 新增「编辑时间标签不得撤销已落盘覆盖」的保证依赖 canonical 正文剥离标签。二者相遇导致：改标签 → `canonicalFingerprint` 变化 → `matchFloorCandidates` 绑不上楼 → `evaluateTimeBatches` 丢弃该读取 → `tests/v3-time-flexible-date.test.mjs:95` 失败（对照工作树二分确认：仅拷入本地 `src/utils/tag-names.js` + `src/memory-content-sanitizer.js` 即复现 5/1，纯上游 6/6 通过；上游从未改过 `src/v3/floor-binding.js`）。
  修复方式（加法式，不削弱本地合同、不改金样语义）：为 `matchFloorCandidates` 增加可选第三参 `{ equivalentContent }`，仅供 `src/v3/time-body.js` 的 `readTimeBody` 传入，用新增私有助手 `withoutStoryClockReferenceTags` 剥离**仅已配置的**故事时钟引用标签后比较；新增绑定种类 `'locatorEquivalent'`；其余 14 处调用点行为逐字节不变；
- **v0.5.7 合并审计**：真冲突 2 处——`manifest.json` 与 `dist/qqj-app.js`；`src/v3/cse-engine.js` 自动合并后保留本地 `extraOnlySanitizerOptions`，并吸收上游 CSE v0.5.7 逻辑；生产与 CSE 测试均采纳上游新增回归覆盖；
- **v0.5.7 合并验证**：清洗器 20/20；生产入口 + 装配 9/9；v3 CSE 74/74；全量 1245 例中 1243 通过，`production-dist-branch` 与 `v3-chat-fork` 两项 10 秒初始化超时在纯 `upstream/main` 对照中同样失败；
- **最近提交记录**：
  - 本次合并：审计并合并上游 v0.5.11（含 v0.5.10），千人热区冲突裁决（视图 recallRuntime 注入保留、整档重写随上游删除）、重建生产 bundle；
  - v0.5.9 合并：审计并合并上游 v0.5.9（含 v0.5.8），清洗器双层保留（本地四模式合同 + 上游 strip/read 导出移植）、time-body 加法式内容视图兜底、重建生产 bundle；
  - `6c64941`：审计并合并上游 v0.5.7，保留 extra-only 世界书清洗并重建生产 bundle；
  - `7211f6f`：审计并合并上游 v0.5.6（含 v0.5.5），重建生产 bundle，并落地上述 `matchFloorCandidates` 加法式绑定修复；
  - `ead1a6c`：审计并合并上游 v0.5.4（含 v0.5.3），重建生产 bundle；
  - `c6b0446`：审计并合并上游 v0.5.2，重建生产 bundle；
  - `392715c`：记录上游 v0.5.1 基线；
  - `9d52b78`：审计并合并上游 v0.5.1，重建生产 bundle；
  - `03cfb52`：审计并合并上游 v0.5.0，重建生产 bundle；
  - `0c45608`：千人面板接入主动失效（`bootstrap.js` 注入 `recallRuntime` + `saveProfile` 成功后联动清理）；
  - `5edef87`：召回失效联动接入千结面板（单楼记忆编辑 `manualMemoryEdit` / 完全重构 `foundationFullRebuild`）；
  - `09f2b59`：召回回执重新生成失效的治本修复（密封点活版本重对齐 + 见证截断）；
  - `63a382f`：合并上游 v0.4.3 官方发布（引入千事图谱、白鸟存储管理等特性）；
  - `3b8ed8f`：清洗器与 ST-SevenDaysCal 40 例金样字节级对齐与同名 UI 校验。
