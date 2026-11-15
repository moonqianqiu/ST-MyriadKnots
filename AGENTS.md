# 千千结 · Moon 定制版 — Agent 手册

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（moon 定制版）。`main` 分支跟踪上游最新基线，并叠加 moon 专属改动；`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。本文件只保留**红线、文档地图、门禁与当前状态**——细节一律按下方地图查对应文档，**不要往本文件堆积内容**（保持 <10KB，超限即外移）。

## 红线（违反即返工）

1. **清洗器缺省行为不得改动**：`src/memory-content-sanitizer.js` 四模式合同（M0 直通等）由 43 例金样 + SDC 跨仓对拍锁定；上游测试依赖其缺省剥 `<location>` 时改夹具，不改清洗器。逐文件契约见 [`docs/fork/fork-contracts.md`](docs/fork/fork-contracts.md)。
2. **双声明陷阱**：上游已自带声明的本地代修必须删除本地侧（同测试同 specifier 后到覆盖）；上游原生红禁止为「让全量变绿」而改 `src/` 合同。
3. **测试红先归因**：先查 [`docs/fork/merge-playbook.md`](docs/fork/merge-playbook.md) §4（已知偶发 + 纯上游树判定法），确认非上游原生红再动本地。
4. **单一事实源（防复胖）**：合并事实只写 merge-notes；定制契约只写 fork-contracts；流程判定只写 merge-playbook；本文件状态块只更新当前值、不追加历史叙述。
5. **源码变动必须重建 dist 并回填缓存键**（键规则与构建铁律见 merge-playbook §1）；未验证完整不 force push。

## 文档地图

| 要做什么 | 读哪里 |
| :--- | :--- |
| 合并上游（流程、缓存键规则、冲突热区表、上游红判定法、已知偶发） | [`docs/fork/merge-playbook.md`](docs/fork/merge-playbook.md) |
| 查某文件为什么与上游不同 / 上游重写后怎么回植 / 勿回植清单 | [`docs/fork/fork-contracts.md`](docs/fork/fork-contracts.md)（卷首含旧 `AGENTS §N` 编号对照表） |
| 查某次合并改了什么、验证数据、历史教训 | [`docs/fork/merge-notes.md`](docs/fork/merge-notes.md)（卷首含全部版本索引表） |
| 召回选材性能取证 / v0.8.0 修复取证 | `docs/fork/audit-recall-budget-loop-2026-10.md` / `docs/fork/audit-v0.8.0-test-failures-remediation.md` |
| 用户可见的用法与排障 | `README.md` / `docs/troubleshooting.md`（上游产权文件，fork 增补句见 merge-notes） |

**docs/ 产权规则**：`docs/fork/` 下全部为本仓本地文档（含两个专项取证）；其余 `docs/**`（含 `docs/superpowers/`、`docs/history/`）均为**上游产权文件**——随上游更新，勿改名、勿搬动、勿按本地习惯改写。

## 门禁

```bash
# 1) 清洗器金样与单元
node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs   # 43/43
# 2) 生产构建与入口装配（校验 manifest 缓存键与 bundle SHA 吻合）
node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs                  # 全绿（entry-load 当前 45 例）
# 3) 全量
npm test                                                                                                             # 当前 4173 例 / 4172 通过 / 0 失败 / 1 skip
# 4) 召回选择器等价
node tools/perf-audit/verify-equivalence.mjs <上游提交>                                                               # 144/144 逐字节一致
```

测试红先查 merge-playbook §4 归因；跨仓终验（SDC 金样对拍 + `tests/settings-api.test.mjs`）在发布前加跑一次。

## 当前状态（合并/发布后原地更新本节，旧值删除不保留）

- **分支** `main`；**上游基线** v1.2.1（提交 `50e6282`）；上次合并 `f73017f`（2026-11-15）+ 地点标签证据闸门修复（`31dbeea`/`76c435a`）。
- **产物**：manifest 版本 `1.2.1`，缓存键 `20261115.346-f08732aa6e8add6e`（主入口 3,210,706 B；稳定分块 `dist/qianchuang-static-yL4fQlU6.js` 与上游同 SHA）。
- **测试基线**：全量 4173 例（4172 通过 / 1 skip）；等价 144/144（对 `50e6282`）。
- **兄弟仓库**：`ST-SevenDaysCal` 同步至 v4.2.0moon（合并提交 `958f5a5`）；清洗器契约双仓同步，改动须两边同改（见 fork-contracts §3.1 同步标记）。
