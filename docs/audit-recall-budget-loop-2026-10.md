# 召回选材性能审计（2026-10）：预算循环「卡死」的证伪与修复

> **用途**：完整取证记录。AGENTS.md §3.5 是结论摘要，本文件是可复核的原始推导过程与数字。
> **基准**：ST-MyriadKnots v0.6.12（`main @ 1ddb860`）。行号以 v0.6.12 的 `src/v3/recall-selector.js`（1566 行）为准。
> **复现**：`tools/perf-audit/`（`node tools/perf-audit/verify-equivalence.mjs HEAD`、`node tools/perf-audit/benchmark.mjs HEAD --scaling`）。

---

## 1. 起因

移交文档 `HOTFIX-2026-10-06-recall-budget-loop.md`（**已由用户删除，不在仓库内**）声称：长聊天点「重新生成」时页面卡死，根因是 `selectRecall()` 的预算打包循环 **O(n³) 复杂度爆炸**，并给出「方案 A：跨轮缓存轮次不变量」+「方案 B：预算循环迭代上限」两处补丁。

审计结论：**诊断方向正确，处方错误**。原方案实测为 no-op 且**慢 20%**，方案 B 的一半是死代码。

现场参数（文档 §1）：261 楼 / **129 条活跃楼层记忆** / 92 实体 / 千事图 158 matters / 上下文设置 ~197 万 token / 聊天文件 11.6MB；`candidateBuild` 一步 **20.2s**、重新生成全程 33.6s。

---

## 2. 原文档七项主张的实测裁决

| # | 原文档主张 | 实测裁决 |
|---|---|---|
| 1 | 「总计 O(n³)」 | ❌ 实测 elapsed ≈ **n^1.88**、rounds ≈ n^1.64、topicTerms ≈ n^2.01 |
| 2 | 「n 每翻倍耗时约 ×8」 | ❌ 实测 **×3.2**（64→129 ×3.24、64→128 ×3.26、96→192 ×1.67） |
| 3 | 「外层每轮只删 1 个候选 → 迭代 O(n) 次」 | ❌ 默认预算（`contextSize=8192`）下 n=32…192 的 `dropCalls` 恒 **0–4**，不随 n 增长 |
| 4 | §5.1③「条目对象是被冻结的引用，跨轮稳定，WeakMap 按对象键存 record 安全」 | ❌ `decorate`(`:1062`) 每轮 `{...value}` 克隆 → 跨轮复用仅 **4.5%**（真算 253 / 命中 12） |
| 5 | 「输出与原来逐字节一致」 | ✅ 成立（但理由错，见 §2.1） |
| 6 | §6 守卫不会误触发 | ✅ 恰好成立，但**兜底渲染是死代码**（见 §5） |
| 7 | §7.2「`v3-wiring.test.mjs`（20/20）」 | ❌ 该文件实测只有 **1** 个用例 |

### 2.1 补丁等价但更慢（反向）

差分实验（3 fixture × 3 query × 7 参数组，canonical 深度比对 + path 级 diff）：**全部 byte-identical**。就此而言 §5.2 可安全合并——但收益为负：

| 场景 | v0.6.12 原版 | 原文档 §5.2 补丁 | 比值 |
|---|---|---|---|
| n=129 ctx=20000（median-of-7） | 5957 ms | 7172 ms | **1.204×（慢 20.4%）** |
| n=32 / 48 / 64 / 96 / 129 / 192 | — | — | 1.101 / 1.153 / 1.182 / 1.225 / 1.201 / 1.230（**全区间皆慢**） |

**连零命中的首次 plan 都更慢**（逐次计时，ctx=4000）：原版 `[3260, 27]` vs 补丁 `[4053, 17]` → **首次慢 1.24×**。`topicTerms` 调用总数 orig 59808 == patched **59808**，一次都没减少。

---

## 3. 真正的热点

### 3.1 归因（`performance.now()` + `try/finally` 包住 `buildStorylinePlan` 与 `render`）

| 阶段 | 占 `selectRecall` 壁钟 | 调用次数 |
|---|---|---|
| `buildStorylinePlan` | **92.7 – 97.3%** | 2 – 5 |
| `render` | 0.5 – 2.6% | 247 – 259 |

### 3.2 CPU profile self time（n=129，采样 19485ms）

| 函数 | self time | 占比 | 位置（v0.6.12） |
|---|---|---|---|
| `compact` | 8261.8 ms | **42.4%** | `src/v3/recall-selector.js:15` |
| `tokenizeRecallText` | 3128.2 ms | 16.1% | `src/v3/recall-ranking.js:13` |
| `materialTokens` | 2041.3 ms | 10.5% | `:685` |
| `clean` | 1483.2 ms | 7.6% | `:13` |
| `historyStableKey` / `duplicateKey` | 896.8 ms | 4.6% | `:600` / `:590` |
| `topicTerms` | 259.0 ms | 1.3% | `:876` |
| **`setIntersection`** | **63.9 ms** | **0.3%** | `:661` |

分组：**键与 compact 相关 54.6%** / tokenize 16.1% / **集合交集 1.7%** / 其他 27.6%。

**原文档缓存的正是那个 0.3%。**

### 3.3 为什么键推导这么贵

`compact`(`:15`) 对最长 12000 字符的 `_coreText` 做 NFKC + 3 次正则替换 + `toLocaleLowerCase` + 一次 `\p{L}\p{N}` 正则。微基准（`topicTerms` 每次调 `historyStableKey` 两次）：

| `_coreText` 长度 | 键推导 / 集合交集 |
|---|---|
| 40 字符 | **32.6×** |
| 200 字符 | 28.7× |
| 1000 字符 | 114.8× |
| 4000 字符 | **401.5×** |

绝对值：缓存命中 15.813 µs / 未命中 16.586 µs / 无缓存 1.027 µs → **命中即 15.39× 于原成本**。原方案把「算交集」换成「算更贵的键」，方向性错误。

### 3.4 最大单项：`prepareMaterial` 的懒加载 Set 活不过一次调用

```js
// :681-684 —— 每次调用都新建对象
const prepareMaterial = value => {
  const text = clean(materialText(value), 4000);
  return { text, compactText: text ? compact(text) : '', tokens: null };
};
// :685 —— 懒填充
const materialTokens = value => value.tokens ??= new Set(tokenizeRecallText(value.text));
```

`materiallySame`(`:687-694`) 被调 O(m²) 次，每次拿到**全新对象**，于是 `tokens` 这个懒加载 Set **永远活不过一次调用**，`tokenizeRecallText` 在同一个文本上被重算 O(m²) 次 → 这正是 16.1% + 10.5% = **26.6%** 的来源。

### 3.5 跨轮重复的规模（供对照）

| fixture | n | 预算轮数 | `planCalls` | 耗时 |
|---|---|---|---|---|
| 稠密（六类事实每楼都有） | 129 | 14 | 15 | **21914 ms** |
| 稀疏（`%7`/`%11`/`%5`） | 129 | 3 | 4 | 6024 ms |

→ 同一 n=129，稠密 14 轮 vs 稀疏 3 轮。**「卡死」由候选密度决定，不由 n 单独决定。**

---

## 4. 增长性：楼层继续增加会怎样

| n | 候选池 m | 首次 plan | 整次 selectRecall |
|---|---|---|---|
| 48 | 176 | 1.26 s | 1.73 s |
| 96 | 364 | 4.83 s | 5.21 s |
| 192 | 738 | 18.94 s | 19.43 s |
| 384 | 1472 | 72.80 s | 73.77 s |

- **候选池 `m ≈ n^1.02`（线性）**：`src/v3/recall-selector.js:632-643` 把所有旧楼（除最近 4 楼与正文全覆盖楼）展开成候选，而 `:1241-1242` 的 `allowedItems` 与 `:1289-1290` 的 `floorLimit` 默认都是 `Number.MAX_SAFE_INTEGER`，**没有上限**。
- **单次 plan ≈ n^1.95（对该池二次方）**：四层 m² 结构——候选线生成(`:906-932`，每个 anchor 遍历全 history 调 `topicTerms`)、建线合并(`:933-945`)、附着(`:947-959`)、continuity 兜底(`:961-971`)。
- **总耗时 ≈ n^1.80**；**预算轮数 ≈ n^-0.53（随 n 下降）**。

→ 增长期的主导项是「每次召回的首次 plan」，**不是**预算循环。约 200 楼 ≈ 20 s，400 楼 ≈ 74 s。

---

## 5. §6 守卫：等价，但一半是死代码

15 组组合（3 场景 × 5 档 contextSize）**byte-identical、触发 0 次**。但：

```js
const initialDroppable = chosenDistant.length + chosenStates.length + chosenChanges.length + chosenTimeReminders.length;
const maxBudgetRounds = initialDroppable + 8;              // 四处都是数组长度 ⇒ 恒 ≥ 8
for (let budgetRound = 0; ; budgetRound += 1) {
  if (budgetRound > maxBudgetRounds) { budgetGuardTripped = true; break; }  // 首轮 0 > ≥8 恒假
  ...
  rendered = render();                                     // 循环体必执行 ⇒ rendered 必被赋值
}
if (budgetGuardTripped && !rendered) { ... }                // !rendered 永不为真
```

→ **`let rendered = null` 与兜底渲染段是死代码**；有效的那半条只是「迭代上限」（能防不收敛），且正常路径下永不触发。

**且 `budgetLoopGuard` 不可观测**：不在 `src/ui/v3-foundation-view.js:94-100` 的 `skipReasonCopy` 映射表（fallback 只回显原始字串），还会被 `src/private-recall-diagnostics.js:135` 白名单 + `:172` 的 `.filter(value => reasons.includes(value))` **滤掉**，面板与本地面板都看不到。§6.3/§8.3 的「可观测」承诺不成立。

---

## 6. 修复：四个纯函数记忆化

设计原则：**打 42.4% 的热点**、**键要廉价**、**把只依赖 `context` 的常量提到循环外**、**不要重复造对象**、**结果必须逐字节等价**。

### 6.1 逐项贡献拆解（n=192，ctx=8192，单次）

| 变体 | 耗时 | 相对 orig | 边际贡献 |
|---|---|---|---|
| orig | 19069 ms | 1.00× | — |
| F1 | 8268 ms | 2.31× | **2.31×** |
| F1+F2 | 7661 ms | 2.49× | 1.08× |
| F1+F2+F3 | 6537 ms | 2.92× | 1.17× |
| **F1+F2+F3+F5** | **586 ms** | **32.54×** | **11.16×** |
| +F4 | 599 ms | 31.85× | **0.98×（更慢）** |

**F5 是绝对主力（11.16×）；F4 为零贡献。**

### 6.2 四项改动

| 杠杆 | 内容 | 机制 |
|---|---|---|
| **F1** | `compact()` 按**字符串**记忆化（`compactOf`，`COMPACT_MEMO_LIMIT = 200000`） | `decorate`(`:1062`) 每轮 `{...value}` 克隆候选，但浅拷贝**共享 `_coreText`/`_rankText` 字符串实例** → 按字符串键跨轮存活（按对象键命中率仅 4.5%） |
| **F2** | `entityTokens` + `entityNameEntries` 用 `entityDerivedCache`（`WeakMap` on `context`）提到 `recordFor` 外 | 原式每次 `recordFor` 对 92 个实体重跑 `entityLabels()`（含 `clean()`）+ `compact(label)`，而这些只依赖 `context` |
| **F3** | `historyStableKey()` 按对象记忆化（`stableKeyMemo` + `historyStableKeyRaw`） | 纯函数却被 `topicTerms`(`:876-878`) 每次调两次、共 O(m²) 次 |
| **F5** | `prepareMaterial()` 按 material 文本共享对象（`preparedMaterialMemo`） | 让懒加载 `tokens` Set 跨调用存活，消除 `tokenizeRecallText` 的 O(m²) 次重算 |

### 6.3 为什么剔除 F4（跨轮按内容键缓存 `recordFor`）

1. **收益在噪声内**：median-of-5，n=96 1.096×、n=129 **0.982×**、n=192 **0.989×**。
2. **缓存键不完整（决定性）**：`historyStableKey`(`:600`) = `[floorId, floorMemoryId, assistantSeq, _sourceOrder, compact(_coreText)|_subjectKey|_visibilityKey|_statusKey]`，**不含** `_rankText`、`towardEntityId`/`before?.towardEntityId`/`after?.towardEntityId`、`sourceFloorId`/`before?.sourceFloorId`/`after?.sourceFloorId`；而 `recordFor`(`:859-869`) 恰恰读这些值。两个仅 `toward` 不同的值会共享稳定键 → 可能把一个值的 record（`participants`/`tokens`）交给另一个值，**反而抹掉 v0.6.12 特意保留的 toward 边界**（其源码注释：「历史材料继续使用原有键；CSE另保留单向对象边界，避免同文状态互相吞并」）。

无实测收益，不值得承担该风险。对抗 fixture（同 text/subject/layer、仅 `toward` 与 `reason` 不同的 CSE 状态）未触发差异，但**「没触发」不等于「安全」**，故以收益为由剔除。

### 6.4 等价性证据

| 批次 | 覆盖 | 结果 |
|---|---|---|
| 小矩阵 | n=24/48 × unique × 3 query | 12/12 |
| 大 n | n=129/192 × unique × 2 query | 8/8 |
| 最终 | n=24/48/96/192 × dense/unique × toward 碰撞 fixture × ctx 400/8192/20000 | **90/90** |
| 落地后同源对拍 | 改前备份 vs 已落地源码（同进程） | **36/36** |
| 工具门禁 | `verify-equivalence.mjs HEAD` | **144/144** |

比对口径：`injectionText` **逐字符**相同 + 完整结果树 canonical 深比（键排序、Set→排序数组）。

### 6.5 收益（median-of-5，ctx=8192，改前备份 vs 已落地源码）

| n | 改前 | 改后 | 提升 |
|---|---|---|---|
| 48 | 1615 ms | **96 ms** | 16.73× |
| 96 | 5087 ms | **200 ms** | 25.41× |
| 129 | 8592 ms | **295 ms** | 29.09× |
| 192 | 19104 ms | **560 ms** | 34.09× |
| **129 / ctx=20000（原上报场景）** | **20201 ms** | **706 ms** | **28.62×** |

增长指数 **n^1.76 → n^1.24**。缓存内存（n=192 稠密单次）：`compactMemo 621 entries / ~0.05MB`、`preparedMemo 305 entries / ~0.04MB`；上限 20 万 → 正常会话 `clear()` 不触发。对照原方案 `cache.pairs` 的 **+56–107MB**。

### 6.6 未解决：阶未变

修复版自身实测：n=192 634 ms → 384 1924 ms → 768 6883 ms → **1536 18056 ms**（指数 1.63）→ 悬崖从 ~192 楼推到 **~1500 楼（约 8 倍余量）**，但 `buildStorylinePlan` 内层仍是 **O(m²)**。

要真正压阶只能收缩参与分组的候选池（`baseHistory` 有原则预过滤）。硬切 `.slice(0,128)` 实测可得 17×–54×，但**会改变召回结果**（`injectionText` 不同、storylines 数变化），不可取。

---

## 7. 三条教训

1. **缓存要打在热点上。** 原方案缓存 `setIntersection`（self **0.3%**）并以 `historyStableKey` 拼接串为键（键推导落在 **42.4%** 的大头上，4000 字符时键成本是交集的 **401×**）→ 实测**慢 20.4%**，并多吃 56–107MB。**缓存一个便宜的运算、却为它付出昂贵的键，是净亏。**
2. **跨轮记忆化不能按对象身份。** `decorate()` 每轮 `{...value}` 克隆候选 → 按对象键命中率仅 **4.5%**；但浅拷贝**共享字符串实例**，按字符串键才有效。
3. **缓存键必须覆盖被缓存函数的全部输入。** `historyStableKey` 不含 `_rankText`／`towardEntityId`／`*?.sourceFloorId`，用它（或「它 + 内容」）做 `recordFor` 的键会串记录（见 §6.3）。

**附带的方法论教训**：审计中途曾出现一整批结论作废——`g1.mjs`/`stack.mjs`/`stage2.mjs` 的基线文件在上游 v0.6.12 同步后被重建，而下游变体仍是 v0.6.11 文本，导致**跨上游版本比较**得出虚假的「byte-identical ✓」。`tools/perf-audit/lib/recall-audit.mjs` 的 `assertUpstreamMarkers()` 就是为了让这种错误**抛异常而不是静默通过**。

---

## 8. 落地记录

| 项 | 值 |
|---|---|
| 改动文件 | `src/v3/recall-selector.js`（唯一源码改动，**+63/−8**）、`manifest.json`（缓存键）、`dist/qqj-app.js`（重建） |
| 源码 SHA-256 | `c9e3f9fcc5c5aff247f0fdcebefbd19525b542a1e76c2e89de92865aa3647865` → **`118efe0181eb52ff9222a00fbfad54b2a8dd6c44677b280425d4a8809bbe6b89`** |
| manifest version | **`0.6.12`（未变）**——本地修复跟随上游版本号（§1.1） |
| 缓存键 | `20261006.19-f5bc5d2239eb3a09` → **`20261007.385-7b2e010282dc935d`**（今日无已用键；历史最大序号 384 → 取 385；哈希取自真实产物并逐位核对） |
| bundle | 1,918.16 kB（gzip 529.74 kB）；116 modules transformed；`node --check` exit=0 |
| 门禁 ① 清洗器 | **25/25** |
| 门禁 ② 生产构建与入口装配 | **11/11** |
| 门禁 ③ 全量套件 | **1564/1564**（fail 0，39.5 s） |
| 门禁 ④ 跨仓 | 两仓 `cases` sha256 均 `981d73a0e086c0ff`（40 例 0 差异）；`settings-api` **37/37** |
| 清洗器改动 | `src/memory-content-sanitizer.js` 与 `src/tag-sanitizer.golden.json` **零改动** |

**关于版本断言**：原移交文档称「实施时必须同步改 `tests/production-entry-load.test.mjs:195` 的硬编码版本断言」。此条**作废**——本地修复不 bump version（AGENTS.md §1.1，先例 `f26320e`/`e8ed5d1`/`74c0daf` 均只换缓存键），该行仍应为 `'0.6.12'`。

---

## 9. 工具

```bash
# 等价门禁：工作树是否与参考版本召回出完全相同的结果？（退出码 0/1）
node tools/perf-audit/verify-equivalence.mjs HEAD

# 性能基准：工作树比参考版本快多少？指数有没有变？
node tools/perf-audit/benchmark.mjs HEAD
node tools/perf-audit/benchmark.mjs HEAD --scaling

# 调参
PERF_RUNS=5 PERF_CONTEXT=8192 node tools/perf-audit/benchmark.mjs HEAD
```

`tools/perf-audit/lib/recall-audit.mjs` 是共享库（fixture 构造、canonical 比对、谱系断言、计时与指数拟合）；`tools/perf-audit/README.md` 载夹具设计理由。变体物化到 gitignore 的 `.perf-audit-scratch/`，**绝不写入 `src/` 旁**。
