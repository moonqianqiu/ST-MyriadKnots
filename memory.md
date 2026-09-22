# 千千结 · Moon 定制版 — 项目记忆（供维护与 CLI 参考）

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（作者 moon 定制版）。
当前在 `main` 分支上跟踪上游最新基线，并叠加了“moon”专属改动。`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。

> **用途**：供后续会话/开发者在执行“合并上游”、“升级维护”、“排查改动”时，迅速掌握本 fork 的核心定制、版本惯例、冲突裁决规则以及架构设计决策，确保合并上游时不丢弃本地核心资产。

---

## 1. 仓库定位与版本构建惯例

1. **版本声明 (`manifest.json`)**：
   - 跟随上游官方发布版本号（当前已同步至 **`0.4.3`**）。
2. **打包构建与产物约束 (`dist/qqj-app.js`)**：
   - 生产单文件由 `npm run build`（Vite + Rolldown）编译生成；
   - 源码发生任何变动后，**必须重新构建 bundle**，否则入口加载测试会失败。
3. **缓存键规则 (`manifest.json` 的 `js` 字段)**：
   - 格式强制规范：`dist/qqj-app.js?v=YYYYMMDD.<递增序号>-<bundle SHA-256 前16位>`；
   - `tests/production-entry-load.test.mjs` 会严格校验该哈希是否与实际 `dist/qqj-app.js` 的文件摘要一致；
   - 序号随打包批次全局递增（当前批次为 **`20260922.327`**）。
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

> **业务文件自动合并注意**：
> - `src/settings.js`：本地添加的 `sourceKeepTags: ''` 与上游存储自动清理字段位于不同区域，自动合入；
> - `src/v3/cse-engine.js` 与 `src/v3/memory-runtime.js`：本地添加的 `extraOnlySanitizerOptions` 清洗拦截与上游新提示词/千事调度正交，自动合入。

---

## 3. 必须保住的本地核心定制资产（Fork 存在的价值，合并时逐项复核）

合并上游或重构时，以下 4 大定制模块为本地产权核心，**严禁被上游旧代码覆盖或对齐掉**：

### 3.1 四模式标签清洗器（与 ST-SevenDaysCal 逐字节一致）
- **核心文件**：
  - `src/memory-content-sanitizer.js`（树形单遍解析，`sanitizeMemoryContent` 接口）；
  - `src/tag-sanitizer.golden.json`（40 组锁定金样，LF 行尾）；
  - `tests/tag-sanitizer-golden.test.mjs` 与 `tests/memory-content-sanitizer.test.mjs`（20 组测试全绿）。
- **核心合同**：
  - **M0（两栏皆空）**：直通不清洗，保留正文，仅做注释/孤立标记清理；
  - **M1（仅 extra）**：成对删除 extra 标签及内容，未闭合 extra 吞至同名闭合或文末（噪音不泄漏）；
  - **M2（仅 keep）**：剥壳保留 keep 块内容（内部不再二次清洗，嵌套标签原样保留），块外裸文本丢弃；
  - **M3（混合）**：extra 恒优先，无论在外层、包裹 keep 还是嵌套在 keep 子树内一律整块剔除；
  - **三分支 token 正则**：`TAG_ATTR_SOURCE`（引号感知，属性内 `>` 不截断）+ `TAG_ATTR_FALLBACK_SOURCE`（未闭合引号宽松兜底回退旧行为，防止思维链泄漏）+ `[[...]]`；
  - **自闭合标记**：keep 子树内自闭合 extra 标记连标记删除，非 extra 原样保留 openRaw。
- **合法差异保留**：
  `src/utils/tag-names.js` 接受 `[,，\n]` 分隔符（中文逗号与换行兼容）。

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
- **核心文件**：`src/v3/recall-runtime.js`
- **深层痛点与双重致错源头**（此前曾片面归因于“后台自动摘要推进版本”）：
  实测表明：**即便上一楼摘要早已归档落盘，只要用户执行“删除当前用户楼 → 重新输入发送 → 点击重新生成”，该问题依然 100% 稳定必现！** 经排查，背后存在两大致命源头：
  1. **并发盖错公章（时序倒挂）**：推进全局 Root 的不仅是高层摘要，重新发送消息触发的底层地基扫描（`foundationRuntime.scan()` -> `commitRoot()`）也会对齐新消息节点。在选材 LLM 耗费 20+ 秒的窗口期内 Root 被推进，而原代码在开收据时依然盖了选材开始时的旧公章，导致收据存盘即过期；
  2. **正文见证指纹漂移（`bodyMatchFingerprint` 敏感失效）**：原 `captureCoreBodyWitness` 缺乏锚定，直接从数组末尾逆向采集 3 条 AI 楼层。点击重新生成时，宿主传来的数组尾部可能短暂残留刚被撤下的 AI 楼层，导致见证楼层从 `[#52, #50]` 漂移成 `[#54, #52, #50]`，指纹分歧无情击穿回执。
- **上游 0.4.3 应对机制与本地治本修复的客观定性**：
  - **上游 0.4.3 的取舍（无条件冻结复用）**：
    上游在 0.4.0~0.4.3 引入了 `commitFrozenReceiptIfCurrent`，立下严格的 `root: 0` 零 I/O 极速通道合同。为追求极致性能与消除等待症状，上游在复用阶段故意不再比对 `headCheckpointId`/`rootRevision`，直接信任冻结收据。其代价是放宽了校验，导致用户在面板手动修改记忆后重新生成时无法被灵敏感知；
  - **本地修复（`09f2b59`）的不可替代价值**：
    1. **见证楼层向前截断 (`captureCoreBodyWitness`) —— 绝对必要**：
       传入触发用户楼 `userMessage` 严格向前逆向采集。它不仅用于重新生成复用，还在全新生成（normal）及 `commitPromptIfCurrent` 的 `captureCoveredBodyGuards` 终检时发挥决定性保护作用，彻底消除了“删楼重发”及尾部临时 AI 楼层残留导致的见证漂移与意外 Abort；
    2. **密封点活版本重对齐 (`commitPromptIfCurrent`) —— 落盘数据治本保障**：
       选材结束后持久化前，重新读取活档案头，将收据的 Checkpoint、Revision 及签名自动重对齐为最新版本。使落盘到聊天记录 `extra` 中的收据天然自洽真实，消除了历史归档与分支继承中的失真假报警；即使上游后续收紧版本核验，本地收据也能平滑无缝兼容；
    3. **共存效果**：本地修复零性能开销、1067 项测试全绿，使插件在完美继承上游 0.4.3 毫秒级闪电复用的同时，守住了底层数据的真实性与鲁棒性。

---

## 4. 验证清单与验收标准

执行合并、升级或改动后，必须依序通过以下 4 项硬性门禁：

1. **清洗器金样与单元测试**：
   ```bash
   node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs
   ```
   *标准*：20/20 全部全绿（40 例金样逐字节一致）。
2. **生产构建与入口装配测试**：
   ```bash
   node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs
   ```
   *标准*：9/9 全部全绿（验证 manifest 缓存键与 bundle SHA-256 绝对吻合）。
3. **全量测试套件自动化运行**：
   ```bash
   npm test
   ```
   *标准*：全量 1067+ 测试用例全部全绿（耗时约 50s，0 失败）。
4. **与 ST-SevenDaysCal 跨仓终验对拍**：
   运行 40 例金样跨仓比对脚本，验证与 `ST-SevenDaysCal/runtime/tag-sanitizer.js` 输出 **0 差异、100% 逐字节一致**。

---

## 5. 当前仓库状态底数（基线备忘）

- **当前分支**：`main`
- **跟踪上游基线**：已合入 `upstream/main`（Tag: `v0.4.3`，提交 `64db02a`）；
- **当前产物版本**：`manifest.json` 版本号 `0.4.3`，缓存键 `20260922.327-0bb4701a9bdb8915`；
- **最近提交记录**：
  - `09f2b59`：召回回执重新生成失效的治本修复（密封点活版本重对齐 + 见证截断）；
  - `63a382f`：合并上游 v0.4.3 官方发布（引入千事图谱、白鸟存储管理等特性）；
  - `3b8ed8f`：清洗器与 ST-SevenDaysCal 40 例金样字节级对齐与同名 UI 校验；
