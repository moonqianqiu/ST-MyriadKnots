import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMemoryTagList, sanitizeMemoryContent } from '../src/memory-content-sanitizer.js';
import { createSettingsStore } from '../src/settings.js';

// 上游 v0.9.x 本文件按 sanitizeStoryBody 语义书写（缺省 keep='content'、命名对大小写不
// 敏感、M1 rescue-only、块外正文保留）；本仓入口是四模式清洗器（AGENTS §3.1，与 SDC
// 跨仓金样锁定），期望已按本仓合同适配——分歧点与 SDC「tag-sanitizer.test.mjs」同源。
test('共用正文保XML内层，明确字面清洗块整块删除且保留优先', () => {
  for (const [raw, options, expected] of [
    // 注释属 M0 卫生清理（始终剥除、不充当定界符）——注释对包裹符为本仓不采纳的上游能力。
    ['前<!--draft-->草稿<content>不应救回</content><!--/draft-->后', { extraTags: '<!--draft-->...<!--/draft-->' }, '前草稿<content>不应救回</content>后'],
    ['前<!--<content>注释</content>-->后', {}, '前后'],
    ['前<br>后', {}, '前后'],
    // M1：extra 配对块连内容删，不做 rescue；上游期望 '正文'（救援）。
    ['<think>噪音<content>正文</content></think>', { extraTags: 'think' }, ''],
    ['前[[草稿<content>不应救回</content>]]后', { extraTags: '[[...]]' }, '前后'],
    // 定界符大小写敏感：闭符 [/draft] 与规则 [/DRAFT] 不同名，规则不啮合、原样保留。
    ['前[DRAFT]草稿<content>不应救回</content>[/draft]后', { extraTags: '[DRAFT]...[/DRAFT]' }, '前[DRAFT]草稿<content>不应救回</content>[/draft]后'],
    ['前开始草稿<content>不应救回</content>结束后', { extraTags: '开始...结束' }, '前后'],
    // 混合大小写开闭配平后按闭符所属规则（extra）整块删。
    ['前[DRAFT]正文[/draft]后', { keepTags: '[DRAFT]...[/DRAFT]', extraTags: '[draft]...[/draft]' }, ''],
    // M3：同名规则两栏并存时 extra 恒优先，整块剔除；上游期望 '正文'。
    ['<think>前开始正文结束后</think>', { keepTags: '开始...结束', extraTags: '开始...结束,think' }, ''],
    // M2：keep 块之外的裸文本丢弃；上游保留块外正文 '前内容后'。
    ['前<正文 属性="值">内容</正文>后', { keepTags: '<正文>' }, '内容'],
    ['<段~甲>正文</段~甲>', { keepTags: '段~甲' }, '正文'],
    ['<e\u0301tage>正文</e\u0301tage>', { keepTags: 'e\u0301tage' }, '正文'],
    // 大小写不啮合时未闭合定界符保持文本（上游大小写不敏感会剥离）。
    ['前[DRAFT]未闭合<content>正文</content>', { extraTags: '[draft]...[/draft]' }, '前[DRAFT]未闭合<content>正文</content>'],
  ]) assert.equal(sanitizeMemoryContent(raw, options), expected, raw);
  // 字面量包裹规则原样保留（不 lower 归一）；同名标签去重与上游对齐。
  assert.deepEqual(normalizeMemoryTagList('CONTENT，<正文>\n段~甲,[DRAFT]...[/draft],开始...结束,content'), ['content', '正文', '段~甲', '[DRAFT]...[/draft]', '开始...结束']);
});

test('首次共享归并在默认补齐前读own字段，后续空值和删项不回灌旧值', () => {
  const ext = { qianqianjie: { sourceKeepTags: '', sourceExtraTags: 'think,开始...结束' }, 'schedule-planner': { extraTags: '[DRAFT]...[/DRAFT],think', apiPresets: [{ id: 'keep-api' }] } };
  const settings = createSettingsStore({ extensionSettings: ext, save() {} });
  assert.deepEqual(settings.wrappers?.(), { keepTags: '', extraTags: 'think,开始...结束,[draft]...[/draft]' });
  settings.updateWrappers({ extraTags: '' });
  ext.qianqianjie.sourceKeepTags = '不得回灌'; ext['schedule-planner'].extraTags = '不得回灌';
  assert.deepEqual(settings.wrappers(), { keepTags: '', extraTags: '' });
  settings.updateWrappers({ keepTags: 'content' });
  assert.deepEqual(settings.wrappers(), { keepTags: 'content', extraTags: '' });
  assert.equal(ext['schedule-planner'].apiPresets[0].id, 'keep-api');
  // 本仓 M0 合同：全新安装的共享容器继承本地默认 keepTags=''（上游回退 'content'，
  // AGENTS §3.3；get() 默认回填先于共享容器初始化，见 src/settings.js）。
  const empty = createSettingsStore({ extensionSettings: {}, save() {} });
  assert.deepEqual(empty.wrappers(), { keepTags: '', extraTags: '' });
});
