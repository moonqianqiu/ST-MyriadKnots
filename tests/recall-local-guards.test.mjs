// 本地 fork 专属守卫（上游无此文件）。
// tests/v3-recall.test.mjs 按 AGENTS.md §2 与上游逐字相同，不允许加本地断言；
// 因此本地对上游文件的三件套补丁（captureCoreBodyWitness 触发楼截断 / invalidate 持久收据联动 /
// floor-binding locatorEquivalent）+ extra-only 清洗合同 + 时间参考标签探针，集中在此文件回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { RECALL_RECEIPT_KEY, captureCoreBodyWitness, createV3RecallRuntime } from '../src/v3/recall-runtime.js';
import { matchFloorCandidates } from '../src/v3/floor-binding.js';
import { extraOnlySanitizerOptions, sanitizeMemoryContent } from '../src/memory-content-sanitizer.js';
import { clockContentFingerprint } from '../src/v3/time-body.js';

const fingerprint = async value => `h:${value}`;
const assistant = mes => ({ is_user: false, mes });
const user = mes => ({ is_user: true, mes });

test('captureCoreBodyWitness：给了触发用户楼就只向前采集，尾部重生成残留不再污染指纹', async () => {
  const chat = [
    user('u0'),
    assistant('<content>a1</content>'),
    assistant('<content>a2</content>'),
    user('u1'),
    assistant('<content>a3</content>'),
    assistant('<content>a4</content>'),
  ];
  const options = { keepTags: 'content' };
  // 4 参旧签名：从尾部倒推，会把触发楼之后的 a3/a4 也算进来
  const legacy = await captureCoreBodyWitness(chat, options, fingerprint, 3);
  assert.deepEqual(legacy.map(item => item.coreIndex), [2, 4, 5]);
  // 5 参本地签名：以触发楼为界向前采集
  const bounded = await captureCoreBodyWitness(chat, options, fingerprint, 3, chat[3]);
  assert.deepEqual(bounded.map(item => item.coreIndex), [1, 2]);
  assert.deepEqual(bounded.map(item => item.canonicalContent), ['a1', 'a2']);
  assert.deepEqual(bounded.map(item => item.rawFingerprint), ['h:<content>a1</content>', 'h:<content>a2</content>']);
  // 宿主重建对象时按 mes 反查同一楼（对象身份不同）
  const cloned = await captureCoreBodyWitness(chat, options, fingerprint, 3, user('u1'));
  assert.deepEqual(cloned.map(item => item.coreIndex), [1, 2]);
  // 触发楼之后没有正文时行为与旧签名一致（不存在过度截断）
  const tailTrigger = await captureCoreBodyWitness([user('u0'), assistant('<content>a1</content>'), user('u1')], options, fingerprint, 3, user('u1'));
  assert.deepEqual(tailTrigger.map(item => item.coreIndex), [1]);
});

test('matchFloorCandidates：locatorEquivalent 探针只在同 locator 且指纹不同时兜底，省略参数行为不变', () => {
  const locator = { messageIndex: 4, swipeId: 0, selectedSwipeIndex: 0 };
  const floor = { id: 'f1', assistantSeq: 1, hostLocator: { ...locator }, content: { rawFingerprint: 'r1', canonicalFingerprint: 'c1', sanitizerFingerprint: 's1' } };
  const candidate = { assistantSeq: 2, hostLocator: { ...locator }, rawFingerprint: 'r2', canonicalFingerprint: 'c2', sanitizerFingerprint: 's2', messageAnchor: { status: 'none' } };
  // 省略探针：指纹不一致即不绑定
  const omitted = matchFloorCandidates([floor], [candidate]);
  assert.equal(omitted.matches.length, 0);
  assert.deepEqual(omitted.unmatchedCandidateIndexes, [0]);
  assert.equal(omitted.issue, null);
  // 探针拒绝：与省略行为等价
  const denied = matchFloorCandidates([floor], [candidate], { equivalentContent: () => false });
  assert.equal(denied.matches.length, 0);
  assert.equal(denied.issue, null);
  // 探针命中：绑定种类为 locatorEquivalent
  const probed = matchFloorCandidates([floor], [candidate], { equivalentContent: (left, right) => left.id === 'f1' && right.canonicalFingerprint === 'c2' });
  assert.equal(probed.matches.length, 1);
  assert.equal(probed.matches[0].kind, 'locatorEquivalent');
  assert.equal(probed.matches[0].locatorMatches, true);
  assert.equal(probed.matches[0].canonicalFingerprintMatches, false);
  // 指纹已一致时不得调用探针（默认契约不被削弱）
  const calls = [];
  const matched = matchFloorCandidates([floor], [{ ...candidate, rawFingerprint: 'r1' }], { equivalentContent: () => { calls.push(1); return false; } });
  assert.equal(matched.matches.length, 1);
  assert.equal(matched.matches[0].kind, 'locatorRaw');
  assert.deepEqual(calls, []);
});

test('extraOnlySanitizerOptions：非 AI 来源恒为 only-extra，本地严格 M2 不会把纯文本洗空', () => {
  assert.deepEqual(extraOnlySanitizerOptions({ keepTags: 'content', extraTags: 'think' }), { keepTags: '', extraTags: 'think' });
  assert.deepEqual(extraOnlySanitizerOptions(), { keepTags: '', extraTags: '' });
  assert.deepEqual(extraOnlySanitizerOptions(null), { keepTags: '', extraTags: '' });
  assert.equal(sanitizeMemoryContent('普通无标签正文', { keepTags: 'content' }), '');
  assert.equal(sanitizeMemoryContent('普通无标签正文', extraOnlySanitizerOptions({ keepTags: 'content' })), '普通无标签正文');
  assert.equal(sanitizeMemoryContent('<think>噪音</think>正文', extraOnlySanitizerOptions({ keepTags: 'content', extraTags: 'think' })), '正文');
});

test('invalidate：默认不删持久收据，clearPersisted 才删最新用户楼收据并落盘', () => {
  const receipt = { schemaVersion: 16, signature: 'sig' };
  const message = { is_user: true, mes: 'u1', extra: { [RECALL_RECEIPT_KEY]: receipt, untouched: 1 } };
  const host = {
    chat: [{ is_user: false, mes: 'a1' }, message],
    context: { chatMetadata: {}, setExtensionPrompt() {}, constants: {} },
  };
  const saves = [];
  host.context.saveChat = () => saves.push('save');
  const runtime = createV3RecallRuntime({
    store: { readReachable: async () => ({}) },
    hostAdapter: { snapshot: () => host },
    fingerprint,
    logger: { warn() {} },
  });
  runtime.invalidate('manualMemoryEdit');
  assert.equal(Object.hasOwn(message.extra, RECALL_RECEIPT_KEY), true, '默认失效不得动持久层');
  assert.deepEqual(saves, []);
  runtime.invalidate('foundationFullRebuild', 'foundationFullRebuild', { clearPersisted: true });
  assert.equal(Object.hasOwn(message.extra, RECALL_RECEIPT_KEY), false);
  assert.equal(message.extra.untouched, 1, '只删收据键');
  assert.deepEqual(saves, ['save']);
  // 最新用户楼没有收据时早退：不触碰 extra，也不落盘
  host.chat = [{ is_user: false, mes: 'a2' }, { is_user: true, mes: 'u2', extra: { other: 2 } }];
  runtime.invalidate('peopleProfileSaved', 'peopleProfileSaved', { clearPersisted: true });
  assert.deepEqual(host.chat[1].extra, { other: 2 });
  assert.deepEqual(saves, ['save']);
  // 宿主没有 snapshot 能力时非致命
  const bare = createV3RecallRuntime({ store: { readReachable: async () => ({}) }, hostAdapter: { snapshot: () => ({ chat: [], context: {} }) }, fingerprint, logger: { warn() {} } });
  assert.doesNotThrow(() => bare.invalidate('manualMemoryEdit', 'manualMemoryEdit', { clearPersisted: true }));
});

test('时间参考标签探针：未配置引用标签时不读取标签内容，配置后才参与正文指纹', async () => {
  const before = '正文<Slate>子时三刻</Slate>其余';
  const after = '正文<Slate>午时一刻</Slate>其余';
  assert.equal(await clockContentFingerprint(before, ''), await clockContentFingerprint(after, ''), '未配置引用标签＝探针关闭');
  assert.notEqual(await clockContentFingerprint(before, 'Slate'), await clockContentFingerprint(after, 'Slate'), '配置后标签正文参与指纹');
  assert.equal(await clockContentFingerprint(before, 'Slate'), await clockContentFingerprint(before, 'Slate'), '同一输入指纹稳定');
  assert.equal(await clockContentFingerprint(before, 'SLATE'), await clockContentFingerprint(before, 'slate'), '标签名大小写不敏感');
  assert.equal(await clockContentFingerprint(before, 'Slate,其它'), await clockContentFingerprint(before, 'Slate'), '多标签配置不改变已含标签的结果');
  assert.equal(await clockContentFingerprint(before, ''), await clockContentFingerprint('正文其余', ''), '未配置时标签整段不计入指纹');
});
