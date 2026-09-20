# 千千结 · Moon 定制版 — 项目记忆（供 CLI 参考）

本仓库将作为 atonal519/ST-MyriadKnots 的 fork 基础
（origin 计划指向 moonqianqiu/ST-MyriadKnots，upstream = atonal519/ST-MyriadKnots）。
当前在 main 上叠加了"moon"专属改动（标签清洗对齐 ST-SevenDaysCal）。

> 用途：让其它 CLI / 会话在执行"合并上游""检查合并""改代码"等任务时，知道哪些本地改动是
> fork 存在的意义、哪里会冲突、以及怎么确认合并没有吞掉本地改动。

---

## 1. 本次改动：标签清洗器整体对齐 ST-SevenDaysCal（2026-09-19）

### 1.1 背景与根因（为什么必须改）

用户真实正文格式为多层嵌套标签：

- erii_draft（思考链）→ scene_card → HTML 注释（SDC 时间戳）→ content（story / time / now_plot）→
  meanwhile / erii_memo / erii_whisper / options / disclaimer。

真正的剧情正文在 content 内层的 now_plot 里。

旧清洗器（旧 memory-content-sanitizer.js）的合同是：keep（默认 content）块剥壳后**内部二次清洗**，
"已闭合但不保留"的子标签**连同内容整块丢弃**。结果：content 里的 now_plot 正文被整块吞掉，
4854 字正文洗成 0 字 → 扫描器得到 0 个候选楼 → 界面永远"尚未开始记录"、
"补齐缺失 / 完全重构 / 人物状态重构"全部报"后端数据尚未就绪"。

排查过程中曾加过调试日志（前缀 qqj-scan / qqj-foundation / qqj-host），**现已全部移除**，
src 与 dist 均为干净版本。

### 1.2 改动清单（18 个文件）

| 文件 | 改动性质 | 说明 |
|---|---|---|
| src/utils/tag-names.js | 新增 | 逐字节复用 SevenDaysCal utils/tag-names.js：TAG_NAME_SOURCE / TAG_NAME_RE / LITERAL_DOUBLE_BRACKET_RULE / normalizeTagNames / normalizeTagRules |
| src/memory-content-sanitizer.js | 整体重写 | 换成 SevenDaysCal runtime/tag-sanitizer.js 的四模式树形实现（逐字节同算法），仅保留本项目对外函数名 sanitizeMemoryContent(raw, { keepTags, extraTags })，并 re-export normalizeMemoryTagList（= normalizeTagRules 别名，settings 层依赖不变） |
| src/tag-sanitizer.golden.json | 新增 | 直接复制 SevenDaysCal 的 29 例金样（锁定行为逐字节一致） |
| tests/tag-sanitizer-golden.test.mjs | 新增 | 金样比对 + 四模式语义探针；import 指向 ../src/memory-content-sanitizer.js，金样路径 ../src/tag-sanitizer.golden.json |
| tests/memory-content-sanitizer.test.mjs | 重写 | 旧测试锁定的是旧行为（keep 内二次删噪声、块外裸文本抢救），正是吞正文的根因；新测试按四模式合同重写，全部断言与 SevenDaysCal stripTags 逐例对拍核实 |
| src/settings.js | 默认值 | sourceKeepTags: 'content' → ''（对齐 SevenDaysCal：两栏皆空 = M0 不清洗；全库不得残留 keepTags: 'content' 默认） |
| src/ui/settings/prompts-settings.js | 文案 | 保留标签输入框回填改为空串，placeholder 改为"留空＝不清洗；示例：content" |
| src/v3/foundation-domain.js | 指纹缺省值 | sanitizerFingerprint 内 options.keepTags 缺省 'content' → ''（与新设置默认一致；该指纹参与 foundationInputSnapshot → checkpointId → runId → floorId 级联，改缺省值会使旧档楼 id 全部变化，见 1.4） |
| src/cse-source-selection.js | CSE 隔离 | 无论默认清洗模式如何，CSE 扫描窗都强制剔除历史 qqj-cse 块，防止旧 CSE 自激活 |
| src/v3/memory-runtime.js | 用户输入隔离 | 前置用户输入只应用 extra 清洗，不使用 AI 正文的 keep 白名单，避免 keep=content 时普通用户文本变空 |
| tests/v3-foundation.test.mjs | 期望更新 | ① 纯扫描测试：M0 下含 content 标签的楼直通保留（canonicalContent 为原文）；② 53 楼测试：legacyIndexPuts 更新为 141（清洗器 v2 指纹使楼 id 与 reverseRef 分桶变化）；③ 冷读 GET 硬编码改为自洽公式 3 + floors + indexes；④ 尾部孤儿测试的 sanitizerOptions 从 keepTags:'content' 改 ''（M2 下裸文本楼会洗成空导致 uninitialized） |
| tests/settings-api.test.mjs | 跨仓测试路径 | SevenDaysCal 设置模块改为按相邻仓库相对路径读取，兼容当前 Windows 工作区 |
| tests/production-entry-load.test.mjs | 版本断言 | manifest 版本断言与当前 0.3.1 对齐 |
| tests/cse-source-selection.test.mjs | 来源回归 | 锁定原始 AI 使用完整规则、用户与 canonical 正文只用 extra，并继续阻止旧 CSE 自激活 |
| tests/v3-cse.test.mjs | 集成回归 | 测试默认清洗模式对齐 M0，并显式覆盖 keep=content 下用户输入与 canonical 正文不被二次清空 |
| manifest.json | 产物缓存键 | 重建 bundle 后更新日期、序号与内容哈希 |
| dist/qqj-app.js | 重新构建 | 已验证旧清洗器特征（rescueOnly / renderSanitizerChildren / 旧 TAG_NAME_PATTERN）消失、新特征（Unicode \p{M} 正则、[[...]] 规则）存在 |
| memory.md | 项目记忆 | 记录本地合同、审计修复、验证结果与后续同步注意事项 |

### 1.3 四模式合同（主体源自 SevenDaysCal，并强化 extra 恒优先，后续维护以此为准）

- M0 两栏皆空 = 不清洗：配对块逐字节保留，仅删注释/孤立标记/自闭合标记/折空行；
- M1 仅 extra：extra 配对块连内容删；未闭合 extra 吞至最后同名闭合或 EOF（噪音不泄漏）；其余原样；
- M2 仅 keep：keep 配对块剥壳、**内部逐字保留（不再二次清洗）**；keep 块之外的一切（含裸文本）丢弃；
  多个 keep 块以空行连接；
- M3 混合：M2 基础上 extra 穿透 keep 子树（恒优先），双中括号 [[...]] extra 同样穿透。

关键行为差异（易踩坑）：

- M2 下 content 内嵌 now_plot（keep=content）→ 正文保留（旧版在此输出空，即本次修复的根因）；
- M2 下 keep 块外的裸文本也丢弃："前文 has-content 正文"只剩 content 块内部；
- [[...]] 是配置字面量（LITERAL_DOUBLE_BRACKET_RULE），不属于标签名正则，不要当无效规则删改；
- 未闭合 keep 块（"前 content 开 标签 正文"无闭合）内容随外层丢弃 → 输出空。

### 1.4 对用户聊天档案的实际影响

- 用户的龙族档格式在新 M2（keep=content）下能完整洗出 now_plot 正文；默认 M0 下全部原样建档；
- 旧档分歧（预期行为，不是 bug）：sanitizerFingerprint 缺省值变化 → 旧档楼的
  sanitizerFingerprint / foundationInputSnapshot.fingerprint / checkpointId / floorId 全部级联变化，
  打开旧档可能出现 canonical 分歧或 needsReview。处理方式：记忆管理点"刷新状态"按提示核对；
  **不要直接完全重构**（会删光旧摘要/CSE/人物资料）。

### 1.5 验证状态

- `2d29d53` 批次曾完成全量 `node --experimental-vm-modules --test tests/*.test.mjs`：**1002/1002 全绿**；
- 最新动态 CSE 世界书补漏后，相关短测试 **129/129 全绿**：v3-cse 65、清洗器 13、
  people-workspace 42、v3-wiring 1、production-entry-load 8；本次未重复运行完整 1002 项套件；
- tests/memory-content-sanitizer.test.mjs + tests/tag-sanitizer-golden.test.mjs 全绿
  （金样 29 例与 SevenDaysCal 逐字节一致；金样**不覆盖**本地三处偏差，见 1.6）；
- npm run build 成功，dist/qqj-app.js 约 1.32 MB，已确认包含新清洗器与 extraOnlySanitizerOptions；
- 提示：tests/chat-rename.test.mjs 在全量并行跑时偶发 ~1s 超时（`waitFor` 判据），单独运行
  21/21 稳定；与本清洗器改动无关。

### 1.6 实现注意（改代码前必读）

- 清洗器主体来自 SevenDaysCal，但千千结有**三处自觉偏差**；金样文件与上游逐字节相同，因此**不覆盖**
  这三处，合并上游时切勿按金样把它们"对齐"掉：
  ① M3 的 extra 恒优先（collectKept / renderKeptInner 对 closed 节点先判 extra 再判 keep）；
  ② keep 子树内的 self-closing extra 标记被删除（上游无条件保留 openRaw）；
  ③ 属性部分引号感知 TAG_ATTR_SOURCE（双/单引号内允许 `>`）。上游仍是 `(?:\s[^>]*)?`，
     M2 下会把 `<div title="a>b">正文</div>` 洗成 `b">正文` 残片；该修复应一并回灌上游才算真正对齐；
- 保留千千结的中文逗号／换行分隔兼容。后续同步 SevenDaysCal 时，应把外层 extra、同名 keep/extra、
  双中括号、引号属性与分隔符回归案例一并带回；
- src/memory-content-sanitizer.js 里节点字段、解析器与渲染函数仍与 SevenDaysCal
  runtime/tag-sanitizer.js 基本对应（parseSanitizerTree / renderFlat / renderKeptInner /
  collectKept / residueAfterLastSameNameClose / toRuleSet），合并上游时需保留上述本地修复；
- 本项目对外接口签名 sanitizeMemoryContent(raw, options) 与旧版一致。调用点分两类，**不可混淆**：
  - 服从 keepTags（AI 正文）：v3/foundation-domain.js、v3/recall-runtime.js、
    v3/memory-runtime.js:1047，以及经 scanAssistantCandidates 的 v3/time-body.js /
    foundation-runtime.js / chat-branch-inheritance.js / memory-coverage.js；
  - 必须 extra-only（非正文来源，用 extraOnlySanitizerOptions）：用户输入
    （v3/memory-runtime.js 的 capturePrecedingUserInputFromSnapshot）、世界书条目
    （v3/people-workspace.js 两处、v3/cse-engine.js 的 captureCseBaseline）、CSE 扫描窗的
    canonical/用户行（cse-source-selection.js 的 csePlainTextSanitizerOptions）。
    keep 白名单套到纯文本来源会把整条洗成空串——这是 2026-09-20 审计发现的漏改；
- 测试里的标签字面量用 OT/CT 常量拼接（如 OT.think = '<' + 'think>'），
  避免在测试源码中出现与解析冲突的字面标签；
- write_file / bash 补丁工具会把测试源码里的某些字面标签 token 吞掉或截断字符串——
  改这个测试文件时务必整体重写并立即用 node --test 验证可解析。

---

### 1.7 审计修复批次（47e7ca4 之后，2026-09-20）

对 667879e / 47e7ca4 两个手工提交做功能审计后补齐的收尾改动：

| 文件 | 改动性质 | 说明 |
|---|---|---|
| src/memory-content-sanitizer.js | 新增导出 | `extraOnlySanitizerOptions(options) => { keepTags:'', extraTags }`，供非 AI 正文来源复用 |
| src/v3/people-workspace.js | 漏改修复 | 世界书条目内容改 extra-only。此前直接传 `options`，keepTags='content' 时纯文本/任意 HTML 条目被洗成空串，随后被 `.filter(item => item.content)` 丢弃 |
| src/v3/cse-engine.js | 漏改修复 | `captureCseBaseline` 的世界书条目同样改 extra-only（与 people-workspace 一致） |
| src/v3/memory-runtime.js | 收敛 | 局部 `userSanitizerOptions` 改用 helper（行为不变） |
| src/cse-source-selection.js | 漏改修复 | CSE 扫描窗的 canonical/用户行与每楼动态选择的世界书都走 extra-only；后者此前会绕过 `sourceExtraTags`，把用户要求排除的块继续发给模型 |
| tests/v3-people-workspace.test.mjs | 期望更新 | harness 的 sanitizerOptions 补 `extraTags:'secret'`（世界书走 extra-only 后由 extra 负责剔除 `<secret>`）；:153/:162/:559/:720/:757/:1006 同时成为世界书"不得被 keep 洗空"的回归锁 |
| tests/v3-time-body.test.mjs | harness 扩展 | 新增 `bodyWrapper` 形参；:154 用例用 `<keep>` 包裹纯文本楼层，保留 M2 覆盖与"每批截止不是历史未来末楼"的判别力 |
| tests/v3-extractor-memory.test.mjs | 期望更新 | :3373 harness 显式给 `sanitizerOptions: () => ({ keepTags:'content' })`，不再依赖清洗器缺省值 |
| tests/v3-wiring.test.mjs | 期望更新 | manifest 版本断言 0.3.0 → 0.3.1（基线即红的陈旧断言） |
| tests/v3-cse.test.mjs | 新增回归锁 | 同时检查落盘 baseline 和每楼真实 CSE 请求：纯文本不被 keep 清空，配置的 extra 块不会进入存储或模型输入 |
| manifest.json | 产物缓存键 | 重建 bundle 后 digest 更新为 20260920.307-10e5fa4098a654d0（**version 保持 0.3.1**） |
| dist/qqj-app.js | 重新构建 | 含 extraOnlySanitizerOptions，并覆盖 baseline、人物工作区和每楼动态 CSE 世界书路径 |

未做的事（均为刻意决定）：

- **不写 `sourceKeepTags` 存量迁移**：分支只面向新用户，视为新插件，不为"旧默认 'content'"做兼容；
- **不改 ST-SevenDaysCal**：上游仍缺引号感知属性修复，需在本仓库保留 ③ 号偏差。

---

## 2. 同步与版本惯例（沿用 SevenDaysCal 惯例）

- 合并上游前：git branch backup/main-before-upstream-vX.Y.Z main 备份，再在
  integrate/upstream-vX.Y.Z 上 git merge --no-ff vX.Y.Z，最后快进合回 main。
- 版本号：manifest.json 的 version = 上游版本号 + moon 后缀。每次合并 manifest.json 必然冲突，按此惯例解决。
- 冲突热区预测：manifest.json（version 行）、src/memory-content-sanitizer.js（上游若重写清洗器，
  取本地树形版）、src/settings.js（sourceKeepTags 默认值，保持 ''）。其余文件通常能自动合并。

## 3. 必须保住的本地定制（合并时逐项复核）

- src/utils/tag-names.js 与 src/tag-sanitizer.golden.json 存在；标签名主体合同与 SevenDaysCal 一致，
  并保留千千结的中文逗号／换行分隔兼容；
- tests/tag-sanitizer-golden.test.mjs 存在且金样全绿（node --test tests/tag-sanitizer-golden.test.mjs）；
- src/settings.js 的 sourceKeepTags 默认为 ''（grep 确认无 "sourceKeepTags: 'content'"）；
- src/memory-content-sanitizer.js 无旧版特征函数（grep rescueOnly 应为 0 结果）；
- src/memory-content-sanitizer.js 保留上述三处与上游的自觉偏差（金样不覆盖，勿按金样删改）；
- 世界书来源必须走 extra-only：v3/people-workspace.js、v3/cse-engine.js、cse-source-selection.js 用
  extraOnlySanitizerOptions；tests/v3-cse.test.mjs 同时锁定落盘 baseline 与每楼真实 CSE 请求；
- 不做 sourceKeepTags 存量迁移（新插件前提，见 1.7）；
- grep "sourceKeepTags ?? 'content'" src/ 应为 0 结果（prompts-settings.js 已改为 ?? ''）。

## 4. 当前状态（执行任务时以 git status / git log 为准）

- 清洗器对齐与世界书 extra-only 修复链已进入 main；精确提交与工作区状态始终以
  `git log -5 --oneline`、`git status --short` 为准，避免在文档中维护会随下一次提交失效的“未提交”标记；
- `2d29d53` 批次全量测试 1002/1002；最新补漏相关测试 129/129。dist 已用新代码重建，
  manifest 缓存键与 bundle SHA-256 前 16 位一致，可直接部署到酒馆插件目录验证；
- 用户计划：在 GitHub 重新 fork 自己的仓库（origin = moonqianqiu），并将
  atonal519/ST-MyriadKnots 设为 upstream；本次改动将是 fork 的第一批 moon 提交。
