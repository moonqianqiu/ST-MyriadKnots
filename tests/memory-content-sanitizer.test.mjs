// 四模式清洗器测试（与 ST-SevenDaysCal 完全对齐后的合同）：
// - 金样比对见 tests/tag-sanitizer-golden.test.mjs（29 例逐字节锁定）。
// - 集成层合同：默认值由 settings 层提供（sourceKeepTags 默认留空），
//   M2 keep 剥壳后内部逐字保留（不再二次删除嵌套标签）。
// 所有断言均与 SevenDaysCal runtime/tag-sanitizer.js stripTags 逐例对拍核实。
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMemoryTagList, sanitizeMemoryContent } from '../src/memory-content-sanitizer.js';
import { findEarliestCanonicalDivergence, scanAssistantCandidates, sanitizerFingerprint } from '../src/v3/foundation-domain.js';

const OT = { think: '<' + 'think>', status: '<' + 'status>', reasoning: '<' + 'reasoning>', content: '<' + 'content>', story: '<' + 'story>', nowplot: '<' + 'now_plot>' };
const CT = { think: '</' + 'think>', status: '</' + 'status>', reasoning: '</' + 'reasoning>', content: '</' + 'content>', story: '</' + 'story>', nowplot: '</' + 'now_plot>' };

test('M2 keep=content：剥壳取内，内部嵌套标签与文本逐字保留', () => {
  const source = [OT.content + '开场', OT.think + '秘密' + CT.think, OT.status + '更深噪声' + CT.status, '正文' + OT.reasoning + '推理' + CT.reasoning, CT.content].join('');
  assert.equal(sanitizeMemoryContent(source, { keepTags: 'content' }), '开场' + OT.think + '秘密' + CT.think + OT.status + '更深噪声' + CT.status + '正文' + OT.reasoning + '推理' + CT.reasoning);
});

test('M2 keep=content：keep 块之外的裸文本与其它块丢弃', () => {
  const source = [
    '故事[保留这段]',
    OT.think + '思考' + CT.think,
    OT.reasoning + '推理' + CT.reasoning,
    OT.status + '状态栏' + CT.status,
    '结尾',
  ].join('\n');
  assert.equal(sanitizeMemoryContent(source, { keepTags: 'content', extraTags: 'think' }), '');
});

test('M2 keep 内的非 keep 配对块：保留原标签壳与文本（对齐 SevenDaysCal 合同）', () => {
  const source = OT.content + OT.story + '剧情' + CT.story + OT.nowplot + '正文正文' + CT.nowplot + CT.content;
  assert.equal(sanitizeMemoryContent(source, { keepTags: 'content' }), OT.story + '剧情' + CT.story + OT.nowplot + '正文正文' + CT.nowplot);
});

test('标签列表规范化与 keep/extra 行为沿用构画合同', () => {
  assert.deepEqual(normalizeMemoryTagList(' Content, THINK,坏 标签,tag_2,foo~~,bar~, [[...]] '), ['content', 'think', 'tag_2', 'bar~', '[[...]]']);
  assert.equal(sanitizeMemoryContent(OT.story + '保留故事' + OT.think + '删除' + CT.think + CT.story, { keepTags: 'story', extraTags: 'think' }), '保留故事');
});

test('M3 混合：extra 穿透 keep 子树；keep 块外一切丢弃', () => {
  const options = { keepTags: 'content', extraTags: 'think,reasoning,[[...]]' };
  assert.equal(sanitizeMemoryContent('[[思维链]]\n正文', options), '');
  assert.equal(sanitizeMemoryContent('前[[第一段]]中[[第二段]]后', options), '');
  assert.equal(sanitizeMemoryContent(OT.think + '推理' + CT.think + '故事', options), '');  // 块外裸文本'故事'同样丢弃（对拍一致）
  assert.equal(sanitizeMemoryContent('正文[[未闭合', options), '');
  assert.equal(sanitizeMemoryContent('[[未配置]]正文'), '[[未配置]]正文');
  assert.equal(sanitizeMemoryContent('正文[单个左括号]与单个右括号]', options), '');
});

test('M3 extra 恒优先：外层 extra、同名 keep/extra 与双中括号均不得泄漏内容', () => {
  assert.equal(sanitizeMemoryContent(OT.think + OT.content + '秘密' + CT.content + CT.think, { keepTags: 'content', extraTags: 'think' }), '');
  assert.equal(sanitizeMemoryContent(OT.content + OT.think + '秘密' + CT.think + '正文' + CT.content, { keepTags: 'content,think', extraTags: 'think' }), '正文');
  assert.equal(sanitizeMemoryContent('[[<' + 'content>秘密</' + 'content>]]', { keepTags: 'content', extraTags: '[[...]]' }), '');
  assert.equal(sanitizeMemoryContent(OT.content + '秘密' + CT.content, { keepTags: 'content', extraTags: 'content' }), '');
});

test('真实形态短样本：extra 删思考块，keep 块剥壳保留正文', () => {
  const source = '[[思考]]\n<meta>说明</meta>\n@@[正文]@@\n' + OT.content + '故事' + CT.content;
  const result = sanitizeMemoryContent(source, { keepTags: 'content', extraTags: '[[...]]' });
  assert.doesNotMatch(result, /思考|说明/u);
  assert.match(result, /故事/u);
});

test('extraTags 字面规则改变 sanitizer 指纹；keep 无匹配时楼层候选为空', async () => {
  const previousOptions = { keepTags: 'content', extraTags: '' };
  const nextOptions = { keepTags: 'content', extraTags: '[[...]]' };
  assert.notEqual(await sanitizerFingerprint(previousOptions), await sanitizerFingerprint(nextOptions));
  const chat = [{ is_user: false, is_system: false, mes: '[[思考]]正文' }, { is_user: false, is_system: false, mes: '确认楼' }];
  const previous = await scanAssistantCandidates(chat, { sanitizerOptions: previousOptions });
  const next = await scanAssistantCandidates(chat, { sanitizerOptions: nextOptions });
  // keep=content：楼内没有 <content> 块 → 清洗为空 → 扫描器丢弃该楼
  assert.equal(previous.length, 0);
  assert.equal(next.length, 0);
  assert.equal(findEarliestCanonicalDivergence([], []), null);
});

test('M0 两栏皆空：不清洗，配对块逐字节保留，仅卫生处理', () => {
  assert.equal(sanitizeMemoryContent('before' + OT.content + '正文' + CT.content + 'after', { keepTags: '', extraTags: '' }), 'before' + OT.content + '正文' + CT.content + 'after');
});

test('M1 仅 extra：成对删除连内容，未闭合吞至 EOF，同名嵌套全删', () => {
  assert.equal(sanitizeMemoryContent('before' + OT.think + '孤儿尾部', { extraTags: 'think' }), 'before');
  assert.equal(sanitizeMemoryContent('before' + CT.think + '孤儿开头after', { extraTags: 'think' }), 'before孤儿开头after');
  assert.equal(sanitizeMemoryContent('before' + OT.think + 'A' + OT.think + 'B' + CT.think + 'C' + CT.think + 'after', { extraTags: 'think' }), 'beforeafter');
});

test('M2 同名嵌套 keep：嵌套 keep 继续剥壳；块外裸文本丢弃', () => {
  assert.equal(sanitizeMemoryContent('before' + OT.content + 'A' + OT.content + 'B' + CT.content + 'C' + CT.content + 'after', { keepTags: 'content' }), 'ABC');
});

test('属性引号内 > 不截断 token：M0 逐字节保留，M2 keep 取内无碎片', () => {
  const open = '<' + 'div title="a>b">';
  const close = '</' + 'div>';
  assert.equal(sanitizeMemoryContent(`前言${open}正文${close}尾`, { keepTags: '', extraTags: '' }), `前言${open}正文${close}尾`);
  assert.equal(sanitizeMemoryContent(`前言${open}正文${close}尾`, { keepTags: 'div', extraTags: '' }), '正文');
  assert.equal(sanitizeMemoryContent(`前言${open}正文${close}尾`, { keepTags: '', extraTags: 'div' }), '前言尾');
});

test('未闭合引号兜底（对齐 ST-SevenDaysCal bc06be1）：宽松分支接管，噪音不泄漏', () => {
  // M1：引号未闭合 + 后续 > → 兜底 token 止于首个 >，extra 照吞（旧实现此处整段泄漏）
  assert.equal(sanitizeMemoryContent('前' + OT.think.slice(0, -1) + ' data-x="oops>噪音尾巴', { keepTags: '', extraTags: 'think' }), '前');
  // M3：keep 子树内未闭合引号 extra → dropUnclosed 吞掉，keep 空块不产出
  assert.equal(sanitizeMemoryContent(OT.content + OT.think.slice(0, -1) + ' data-x="a>b噪音' + CT.content + '正文', { keepTags: 'content', extraTags: 'think' }), '');
  // 无后续 >（EOF）：不成 token、按原文保留（与 SevenDaysCal 一致）
  assert.equal(sanitizeMemoryContent('eguard habit' + OT.think.slice(0, -1) + ' data-x="oops tail', { keepTags: '', extraTags: 'think' }), 'eguard habit' + OT.think.slice(0, -1) + ' data-x="oops tail');
});

test('显式 sourceKeepTags=content 时正文格式不再被吞（回归案例）', () => {
  const raw = [
    '<erii_draft>思考</erii_draft>',
    '<scene_card>场景</scene_card>',
    '<!-- SDC-start -->',
    OT.content,
    OT.story + '剧情' + CT.story,
    OT.nowplot + '正文正文' + CT.nowplot,
    CT.content,
    '<!-- SDC-end -->',
    '<meanwhile>y</meanwhile>',
    '<options>o</options>',
    '<disclaimer>d</disclaimer>',
  ].join('\n');
  const result = sanitizeMemoryContent(raw, { keepTags: 'content' });
  assert.match(result, /正文正文/u);
  assert.match(result, /剧情/u);
  assert.doesNotMatch(result, /思考|场景|<meanwhile>|<options>|disclaimer/u);
});
