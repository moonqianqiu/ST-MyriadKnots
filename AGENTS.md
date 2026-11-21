# 千千结 · Moon 定制版 — Agent 手册

本仓库是 [`atonal519/ST-MyriadKnots`](https://github.com/atonal519/ST-MyriadKnots) 的 fork（moon 定制版）。`main` 分支跟踪上游最新基线，并叠加 moon 专属改动；`origin = moonqianqiu/ST-MyriadKnots`，`upstream = atonal519/ST-MyriadKnots`。本文件只保留**红线、文档地图、门禁与当前状态**——细节一律按下方地图查对应文档，**不要往本文件堆积内容**（保持 <10KB，超限即外移）。

## 红线（违反即返工）

1. **清洗器缺省行为不得改动**：`src/memory-content-sanitizer.js` 四模式合同（M0 直通等）由 43 例金样 + SDC 跨仓对拍锁定；上游测试依赖其缺省剥 `<location>` 时改夹具，不改清洗器。逐文件契约见 [`docs/fork/fork-contracts.md`](docs/fork/fork-contracts.md)。
2. **双声明陷阱**：上游已自带声明的本地代修必须删除本地侧（同测试同 specifier 后到覆盖）；上游原生红禁止为「让全量变绿」而改 `src/` 合同。
3. **测试红先归因**：先查 [`docs/fork/merge-playbook.md`](docs/fork/merge-playbook.md) §4（已知偶发 + 纯上游树判定法），确认非上游原生红再动本地。
4. **单一事实源（防复胖）**：合并事实只写 merge-notes；定制契约只写 fork-contracts；流程判定只写 merge-playbook；本文件状态块只更新当前值、不追加历史叙述。下方资产清单是导航索引——增删资产须与 fork-contracts 同步。
5. **源码变动必须重建 dist 并回填缓存键**（键规则与构建铁律见 merge-playbook §1）；未验证完整不 force push。

## 本地核心定制资产清单（Fork 存在的价值——每次合并/维护逐项复核；细节见 fork-contracts 对应节）

| 资产 | 核心文件 | 一句话不变式 |
| :--- | :--- | :--- |
| 四模式标签清洗器 | `src/memory-content-sanitizer.js` | 缺省 M0 直通；缺省行为一字不改（金样 43 例 + SDC 对拍） |
| 非 AI 正文 extra-only 隔离 | 同上 `extraOnlySanitizerOptions` | 用户输入/世界书只走 extra 清洗，防整楼洗空 |
| 设置面板校验与迁移 | `src/ui/settings/prompts-settings.js`、`src/settings.js` | 共享容器 M0 挂接顺序 + 两栏冲突拒绝落存 + keepTags 迁移四边界 |
| 召回回执复用三件套 | `src/v3/recall-runtime.js` | 见证 6 参向前截断 / invalidate 三参 / 密封点活版本重对齐 |
| 召回四项记忆化 | `src/v3/recall-selector.js` | 语义零改动；等价 144/144 不可破坏 |
| 地点标签证据闸门 | `src/v3/place-evidence.js`（+extractor/place-foundation） | M0 保留的闭合 `<location>` 块不冒充正文证据 |
| 故事钟时间投影 | `src/v3/time-body.js`、`src/v3/floor-binding.js` | 剥壳投影 + `locatorEquivalent` 绑定 |
| UI invalidate 三联动 | v3-foundation-view / people-profiles-view / bootstrap | 三处失效联动 + 跨聊天 chatId 守卫 |
| 记忆转移漂移拒绝 | `src/memory-transfer.js` | 清洗配置漂移显式拒绝（canonical/指纹一致才放行） |
| 受保护共享容器 | `src/settings.js` | 初始化后置 + 本仓大小写敏感归一化写入（上游管线挂本地语义） |

## 文档地图

| 要做什么 | 读哪里 |
| :--- | :--- |
| 合并上游（流程、缓存键规则、冲突热区表、上游红判定法、已知偶发） | [`docs/fork/merge-playbook.md`](docs/fork/merge-playbook.md) |
| 查某文件为什么与上游不同 / 上游重写后怎么回植 / 勿回植清单 | [`docs/fork/fork-contracts.md`](docs/fork/fork-contracts.md)（卷首含旧 `AGENTS §N` 编号对照表） |
| 查某次合并改了什么、验证数据、历史教训 | [`docs/fork/merge-notes.md`](docs/fork/merge-notes.md)（卷首含全部版本索引表） |
| 召回选材性能取证 / v0.8.0 修复取证 | `docs/fork/audit-recall-budget-loop-2026-10.md` / `docs/fork/audit-v0.8.0-test-failures-remediation.md` |
| 用户可见的用法与排障 | `README.md` / `docs/troubleshooting.md`（上游产权文件，fork 增补句见 merge-notes） |

**docs/ 分布与产权**：`docs/fork/` 下全部为本仓本地文档（契约/流程/实录/取证，见上表）；其余 `docs/**` 为**上游产权文件**——随上游更新，勿改名、勿搬动、勿按本地习惯改写：
`public-api.md`（readContext 公开读取接口）、`qianshi-backend.md`（千事后端接口合同）、`qianchuang-assets.md`（千窗底图素材与许可，代码引用 ×25）、`real-city-basemaps.md`（现实城市底图素材）、`tauritavern.md`（TauriTavern 原生存储适配说明）、`troubleshooting.md`（用户排障手册，fork 有增补句）、`updates-0.8.0.md`（0.8.0 历史发布说明）、`history/`（v0.8.0 前版本记录）、`superpowers/`（上游 Superpowers agent 工作流的实施计划/设计规格产物）。

## 门禁

```bash
# 1) 清洗器金样与单元
node --experimental-vm-modules --test tests/tag-sanitizer-golden.test.mjs tests/memory-content-sanitizer.test.mjs   # 43/43
# 2) 生产构建与入口装配（校验 manifest 缓存键与 bundle SHA 吻合）
node --experimental-vm-modules --test tests/production-entry-load.test.mjs tests/v3-wiring.test.mjs                  # 全绿（entry-load 当前 54 例）
# 3) 全量
npm test                                                                                                             # 当前 4264 例 / 4263 通过 / 0 失败 / 1 skip
# 4) 召回选择器等价
node tools/perf-audit/verify-equivalence.mjs <上游提交>                                                               # 144/144 逐字节一致
```

测试红先查 merge-playbook §4 归因；跨仓终验（SDC 金样对拍 + `tests/settings-api.test.mjs`）在发布前加跑一次。

## 当前状态（合并/发布后原地更新本节，旧值删除不保留）

- **分支** `main`；**上游基线** v1.3.1（提交 `9b46b36`）；合并提交 `98de638`（2026-11-21）。
- **产物**：manifest 版本 `1.3.1`，缓存键 `20261121.362-a74100f4fcd7d528`（主入口 SHA-256 `a74100f4…`；稳定分块未变且与上游同 SHA）。
- **测试基线**：全量 4264 项 / 4263 通过 / 0 失败 / 1 skip；等价 144/144（对 `9b46b36`，合并前后各一）；生产入口+装配 54/54；跨仓 `tests/settings-api.test.mjs` 47/47。默认隔离模式受沙箱 `spawn EPERM` 限制，进程内模式可运行；`tauri-backend` 的 TT 临时目录清理偶发 `ENOTEMPTY`（单跑绿，见 merge-playbook §4）。
- **兄弟仓库**：`ST-SevenDaysCal` 同步至 v4.2.6moon（合并提交 `f788a3a`）；清洗器金样双仓 SHA-256 一致，改动须两边同改（见 fork-contracts §3.1 同步标记）。
