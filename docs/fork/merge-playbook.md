# 合并手册（上游同步操作规程）

> **产权**：本文件为 fork 本地文档（上游无此文件），存放于 `docs/fork/`。
> **回答的问题**：怎么合并上游、冲突怎么裁决、红测试怎么归因。
> **分工**：逐文件定制契约见 [`fork-contracts.md`](./fork-contracts.md)；合并实录见 [`merge-notes.md`](./merge-notes.md)；门禁命令与当前基线见仓库根 [`AGENTS.md`](../../AGENTS.md)（本文件不复制门禁命令，避免两处维护）。
> **最后核对**：2026-11-15（v1.2.1 + 地点标签证据闸门）。

## 1. 版本与产物

1. **版本声明 (`manifest.json`)**：跟随上游官方发布版本号。
2. **生产分包 (`dist/qqj-app.js` + `dist/qianchuang-static-*.js`)**：自上游 v1.2.0 起由 `npm run build`（`node tools/build.mjs`，Vite + Rolldown 代码分包）编译生成主入口与稳定素材分块（`codeSplitting` 组 `qianchuang-map-assets`/四个 `qianchuang-*` UI 模块）；源码任何变动后**必须重新构建**，否则入口加载测试失败。`tools/build.mjs` 逐文件比较字节、保 mtime/未变产物属性，素材先于入口写入；**不得手工解 dist 冲突或删分块**。
3. **缓存键规则 (`js` 字段)**：格式强制 `dist/qqj-app.js?v=YYYYMMDD.<全局递增序号>-<bundle SHA-256 前16位小写>`；`tests/production-entry-load.test.mjs` 校验哈希与实际**主入口** bundle 摘要一致，并校验分块相对导入完整、素材块名 `qianchuang-static-[hash].js` 与内容 SHA 稳定。**序号全库历史内全局递增、同日不得复用——合并上游后注意上游同日已用的序号，取未用过的更大值（`git log --all -S 'YYYYMMDD.'` 复核）；键日期取构建当日，可与上游发布日不同；哈希取自真实重建产物，禁止手写或沿用旧值**（曾有「漏 bump 假通过」：记录哈希与实际产物漂移）。构建顺序铁律：**先把版本号改到位 → 再 build（bundle 内嵌版本常量）→ 最后回填缓存键**。

## 2. 合并流程

备份分支 `git branch backup/main-before-upstream-vX.Y.Z main` → `git merge --no-ff upstream/main`（先以 `git merge-tree --write-tree main upstream/main` 预判，实际冲突应与预判一致）→ 裁决（逐文件契约见 [`fork-contracts.md`](./fork-contracts.md)，常规冲突表见本文 §3）→ 四门禁（命令与阈值见根 `AGENTS.md`）→ 记录（merge-notes 加当版本节 + 根 `AGENTS.md` 状态块原地更新）→ push origin；验证完整前不向远程 force push。**备份分支仅在本地存在，验证通过并推送后即可 `git branch -d` 清理**（其尖端是合并提交的第一父状态，删除零损失）。

## 3. 常规冲突热区表

| 文件路径 | 冲突性质 | 解决裁决方式 |
| :--- | :--- | :--- |
| `manifest.json` | 版本号行与缓存键行冲突 | 版本采上游发布号；构建完成后回填最新缓存键（本文 §1.3） |
| `dist/qqj-app.js` + `dist/qianchuang-static-*.js` | 编译产物冲突（数千 hunk）；v1.2.0 起主入口与稳定素材分包 | 不手工解：清理 `dist/qianchuang-static-*.js` 后 `npm run build`（`tools/build.mjs`）覆盖重建；分块名由内容哈希决定，上游未改素材时应与上游同名同 SHA |
| `tests/production-entry-load.test.mjs` | 冒烟版本断言、上游新增 mock、v1.2.0 分包构建断言（`modules.size === 2`、素材块相对导入、主入口 SHA） | 采纳上游修改（版本断言对齐上游最新版本；v1.2.0 起须由真实分包构建满足）。**上游忘同步版本断言系惯例缺陷**：断言常停在上一发布号而 manifest 已递增，**纯上游树同样红** → 本地代修对齐上游发布号，勿误判为本地回归（实例见 merge-notes 索引表）。**上游补声明方式可能与本地代修相撞**：同测试对同一 specifier 双声明时 `modules.set` 后到覆盖 → 只保留上游仍缺的代修，上游已自带声明的必须删本地版。**判据**：①本地改的若是「本地合同注入点（`sanitizerOptions`/`keepTags`/`SANITIZER_VERSION`/`invalidate` 三参…）」→ 值必保本地；②上游该行相对 base **没动** → 只搬值不动结构；③交叉组合后两侧断言必须同时绿；④反事实换回上游值须能打红，否则该本地适配已成死补丁应删。**红线**：上游若给夹具正文加 `<content>` 包裹，M0 会把标签本体留在 canonical → 须改夹具（显式 `extraTags`）或改期望值，**不得**动清洗器缺省行为。三则实录（v0.9.3 双声明 / v0.9.5 `processingPrompt` / v0.9.9 M0 夹具覆盖）见 [`merge-notes.md`](./merge-notes.md) §6.2 |
| `tests/production-dist-branch.test.mjs` | 上游 v0.7.14 起记录读取强制先协商 `/v1/health`（能力探测），该文件夹具只认 `/v1/records/…` 单条路由 → 探针 404（**纯上游树同样红**，见 merge-notes 索引表 v0.7.14+v0.7.15 行） | 本地代修：夹具补 `/v1/health` 桩并有意不声明 `recordBatchRead`/`recordIdList`，使客户端走单条 GET 回退；断言与夹具内容一字未动。v1.2.1 起上游自带该路由，本地桩已删（§6.2 退役实例） |
| `tests/v3-wiring.test.mjs` | 装配接口导出与版本断言 | 采纳上游；v0.6.6 起版本断言已泛化（`assert.match(manifest.version, /^\d+\.\d+\.\d+$/u)`），不再常规冲突。v0.8.0 起上游改设置页挂载机制（`v3FoundationView.mount(...)`），断言随之按上游实际机制改写，勿误判本地回归（实录见 merge-notes §6.2） |
| `tests/v3-cse.test.mjs` | 上游 `runtimeHarness` 宿主参数 vs 本地 `sanitizerOptions` 参数 | **取并集**：本地默认值与上游 Persona 参数互不相干，两者都必须在场；v1.2.0 再加 `identityProjectionProvider`（同一签名并集，本地 `sanitizerOptions` 默认 `{ keepTags: '' }` 与 `createV3MemoryRuntime` 的 `() => sanitizerOptions` 保本地） |
| `tests/qianchuang-view.test.mjs` | v1.2.0 上游新增 `projectQianchuangSnapshot` 导入 vs 本地 `resetQianchuangMapCatalogForTest` 导入 | **import 并集**：`projectQianchuangSnapshot`（上游）+ `startQianchuangMapCatalog, resetQianchuangMapCatalogForTest`（本地重置助手），断言不并集 |
| `tests/v3-extractor-memory.test.mjs` | 上游调试导出写死 POSIX `/tmp/qqj-v048-<n>-current-reachable.json`（Windows 解析为不存在的 `D:\tmp` → ENOENT，纯上游树同样红）。**<n> 随上游版本变动**（当前 `1000`，早期 `271`） | **v0.10.1 起上游已自带仓库内 `mkdtemp(new URL('./.tmp-current-reachable-', import.meta.url))` + `t.after` 清理，本地 tmpdir 代修已删勿回植**；v0.7.5 另有一条上游自带挂起/红测试，本地补 name/avatar 适配（`7c87ea9`）；其余代修实例见 merge-notes 索引表。**v0.8.0 起两例**（`地点名参照`、`地点绑定和父级`）新增/改写的原始消息带 `<location>` 标签并期望 canonical 不含它（依赖上游清洗器缺省剥除）→ 本地显式 `sanitizerOptions: () => ({ extraTags: 'location' })`，测试意图不变 |
| `src/memory-content-sanitizer.js` | 上游 v0.5.8 起「默认 keep='content'」简化实现 vs 本地四模式合同；**v0.9.0 起上游改为重导出 `shared-body-wrappers.js` 的 `sanitizeStoryBody`**（缺省 keep='content'、命名对大小写不敏感、M0 直通/M1 未闭合/同名 extra 语义全不同——实测对拍 40 例金样仅 13 例一致）；**v1.1.0 起上游再包一层 `sanitizeStoryBody(raw, { htmlFormatting: true })`**（HTML 正文去壳留字，改 M2「keep 块内逐字保留」合同） | **双层保留**：本地 M0-M3 渲染器、`sanitizeMemoryContent`（不注入默认 keepTags、**亦不注入 htmlFormatting**）、`extraOnlySanitizerOptions` 逐字保留（规格见 [`fork-contracts.md`](./fork-contracts.md) §3.1），**不采第 1 行共享重导出/包装**；移植段随上游（v0.9.x 内部名 `normalizeTagBlockNames`+其局部 `TAG_NAME_PATTERN`、新导出 `readMemoryTagBlocks`）。`src/shared-body-wrappers.js` 文件照收（settings/foundation import，**勿改其内容**；v1.1.0 起其 htmlFormatting 解析能力随上游照收，上游 HTML 测试依赖缺省 keep='content' 语义、按「主动放弃」清单弃用不搬）；上游 `tests/shared-body-wrappers.test.mjs` 的期望按本仓合同适配。待 SDC 上游引入 htmlFormatting 后两仓再对齐该能力 |
| `src/v3/people-workspace.js` + `src/ui/people-profiles-view.js` | 上游增删人物工作区功能 | **整文件保持与上游逐字相同**（v0.6.0 定案：直通系上游设计意图，源码/工厂签名/import/测试含直通断言均随上游）——**勿再回植 extraOnly**（fork-contracts §3.2 已回归清单）；唯 `saveProfile → invalidate('peopleProfileSaved', …, { clearPersisted: true })` 联动除外（fork-contracts §3.4 ②） |
| `src/v3/foundation-domain.js` | 本地 `SANITIZER_VERSION = memory-content-sanitizer-v2`、keepTags `''`（M0），上游停留 v1+`'content'`——同一宿主聊天两侧派生**不同确定性图 ID**（floor/run/checkpoint/index 全链） | **保留本地合同**；上游 fixture `tests/fixtures/tt2-native-init-failure.json`（编码上游预计算 ID）须按本地语义重生成——以 `fstore.recordKey(record)` 捕获 run/checkpoint/floor/index（索引键含 `floorOrder-0-` 段，勿手拼 `v3-index-<id>`），run 回卷 `retryableError`+`V3_GRAPH_INDEX_ROUTE_INVALID`、无 root |

## 4. 上游红判定法与已知偶发

> **判定法**：某测试文件与上游**逐字节相同**而失败时，先在纯上游树（`git worktree` 检出 upstream/main）跑同一文件；计数相同即上游原生红，**禁止为「让全量变绿」而改本地 `src/` 合同**。**慢文件勿整跑**（`v3-extractor-memory.test.mjs` 含 1000 楼生产夹具，整文件数分钟），用 `--test-name-pattern` 按例对照。**叠层红揭蔽**：上游某断言层失败会遮蔽其后的断言（如依赖清单红遮蔽人物→时间断言），代修第一层后须在纯上游树复跑确认第二层归属再定处理。
> **v0.8.0 起新增一类上游原生红**：上游新增/改写的测试依赖其清洗器**缺省剥除 `<location>`** 标签，本仓 M0 合同保留该标签（fork-contracts §3.1）→ 按 §3 判据代修（显式 `extraTags:'location'` 或改 canonical 期望值），**不得改清洗器缺省行为**（会破坏 40 例金样与跨仓对拍）。v0.9.2 起 `<location>` 适配面随上游测试重写基本消失；同类新增「上游 keep='content' 宽松语义」依赖（夹具正文无标签仍期望保留文本）按 fork-contracts §3.1 M2 合同改夹具（如 `production-entry-load` 别名分支改 M0 直通），勿改清洗器。
> **已知偶发（勿误判为本地回归，先跑纯上游对照）**：① `tests/v3-extractor-memory.test.mjs` 个别时序断言在空闲快速机器上可能漏窗失败，重跑即过（纯上游树可复现；v1.2.1 后另观测 `tests/v3-foundation.test.mjs` 的 CAS 交错例同类单次漏窗，单跑 140/140 即过）；② `tests/tauri-backend.test.mjs` 并行满载下 `t.after` 清理临时目录报 `ENOTEMPTY`，单跑该文件或重跑全量即过（纯上游树可复现）。

## 5. 合并记录的写法（防回胀）

1. 合并详情（冲突实录、代修实例、验证数字、主题清单）**只写本文同级目录的 [`merge-notes.md`](./merge-notes.md)** 新版本节；根 `AGENTS.md` 状态块只原地更新当前值（上游基线、缓存键、测试基线），**不追加历史叙述**。
2. 若合并触到某文件的定制契约（签名、注入点、红线的改与废），同步修订 [`fork-contracts.md`](./fork-contracts.md) 对应条目——契约永远描述「现在为什么长这样」，不带叙事。
3. merge-notes 索引表（卷首）每行 ≤120 字符：只写「版本 + 日期 + 合并提交 + 冲突数与裁决关键词 + 当期全量」。
