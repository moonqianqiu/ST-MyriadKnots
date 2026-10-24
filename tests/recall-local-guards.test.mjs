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
import { createExtractorEnvelope, normalizeExtractorResponse } from '../src/v3/extractor.js';
import { CSE_RECALL_KNOWLEDGE_BOUNDARY, formatRecallInjection, selectRecall } from '../src/v3/recall-selector.js';
import { projectRecallSource } from '../src/v3/recall-source.js';
import { sha256 } from '../src/identity.js';

const fingerprint = async value => `h:${value}`;
const assistant = mes => ({ is_user: false, mes });
const user = mes => ({ is_user: true, mes });

test('CSE 知情边界独立锁定观察者、接收者、共同知情与 toward 非受众语义', () => {
  for (const pattern of [/private限标明主体/u, /authorial仅供作者参考/u,
    /observable、expressed、shared分别以正文证实的实际观察者、接收者、共同知情范围为限/u,
    /不得补出无依据受众/u, /不确定时不扩大范围/u, /toward仅指态度对象，不标信息接收者或知情者/u]) {
    assert.match(CSE_RECALL_KNOWLEDGE_BOUNDARY, pattern);
  }
  const common = { coverage: { memoryComplete: true, cseCurrent: true }, floors: [], entityById: new Map([['甲', { displayName: '甲' }]]) };
  const states = [{ subjectEntityId: '甲', category: 'core', item: { text: '只供作者参考', visibility: 'authorial', towardEntityId: null } }];
  for (const storylines of [undefined, [{ storylineId: 'recent', title: '近期剧情接续', basis: '已有来源' }]]) {
    const full = formatRecallInjection({ ...common, states, ...(storylines ? { storylines } : {}) });
    assert.ok(full.includes(CSE_RECALL_KNOWLEDGE_BOUNDARY), '有人物状态必须使用完整分类边界');
    const short = formatRecallInjection({ ...common, states: [], ...(storylines ? { storylines } : {}),
      timeReminders: [{ itemId: '提醒', text: '期限尚未确认' }] });
    assert.ok(!short.includes(CSE_RECALL_KNOWLEDGE_BOUNDARY), '无 CSE 时不消耗完整分类提示预算');
  }
});

function locationHarness({ saveChat = true } = {}) {
  const chatId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const message = user('继续'), body = assistant('前楼正文。<location>东区公寓·卧室</location>');
  const chat = [body, message];
  let selections = 0, saves = 0;
  const context = { chatId: 'host-location', chat, chatMetadata: { qianqianjie: { chatId } },
    setExtensionPrompt() {}, constants: {}, ...(saveChat ? { saveChat: async () => { saves += 1; } } : {}) };
  const reachable = { status: 'ready', rootRevision: 1,
    root: { chatId, narrativeGeneration: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', headCheckpointId: 'head' },
    checkpoint: { id: 'head' }, baseline: null, floors: [{ id: 'floor-one', assistantSeq: 1 }],
    floorMemories: [{ id: 'memory-one', floorId: 'floor-one', recordStatus: 'active', summary: { effectiveSource: 'ai', aiText: '早先在东区公寓等待。' },
      participants: [], locations: [], commitments: [], openLoops: [], exactAnchors: [], eventFragments: [], actions: [], observations: [], privateCognition: [], informationTransfers: [] }],
    entities: [], stateDeltas: [], currentStates: [] };
  const hostAdapter = { snapshot: () => ({ context, chat: context.chat, chatId: context.chatId }) };
  const runtime = createV3RecallRuntime({ store: { readReachable: async () => structuredClone(reachable) }, hostAdapter,
    sourceReader: async () => projectRecallSource(structuredClone(reachable), () => new Date('2026-10-23T00:00:00Z'), { reachableReads: 1, exitPoint: 'ready' }),
    selector: input => { selections += 1; return selectRecall(input); }, pluginVersion: 'local-location', logger: { warn() {} } });
  return { runtime, chat, message, body, context, get selections() { return selections; }, get saves() { return saves; } };
}

test('地点依赖只读触发 USER 前：追加 AI 不重选，真实前楼地点变化仍重选', async () => {
  for (const saveChat of [true, false]) {
    const h = locationHarness({ saveChat });
    const first = await h.runtime.intercept(h.chat, 12000, null, 'normal');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(first.lastRecall.status, 'ready', JSON.stringify(first.lastRecall.skipReasons));
    h.chat.push(assistant('后楼正文。<location>西区旅馆·客厅</location>'));
    const reused = await h.runtime.intercept(h.chat, 12000, null, 'regenerate');
    assert.equal(reused.lastRecall.reusedReceipt, true, '尾部 AI 不应污染同 USER 的冻结依赖');
    assert.equal(h.selections, 1);
    assert.doesNotMatch(reused.lastRecall.injectionText, /西区旅馆/u);
    h.body.mes = '前楼正文。<location>南区书房</location>';
    const changed = await h.runtime.intercept(h.chat, 12000, null, 'regenerate');
    assert.equal(changed.lastRecall.reusedReceipt, false, '真实地点依赖更新必须重选');
    assert.equal(h.selections, 2);
    assert.match(changed.lastRecall.injectionText, /南区书房/u);
  }
});

test('旧版空地点依赖归一为无依赖，损坏/非空依赖不误复用', async () => {
  const h = locationHarness(); h.body.mes = '没有地点标签的前楼。';
  await h.runtime.intercept(h.chat, 12000, null, 'normal');
  await new Promise(resolve => setImmediate(resolve));
  const receipt = h.message.extra[RECALL_RECEIPT_KEY];
  receipt.locationReferenceDependency = JSON.stringify({ values: [], hostLocator: { messageIndex: 0, swipeId: null, selectedSwipeIndex: null } });
  const material = [receipt.schemaVersion, receipt.pluginVersion, receipt.chatId, receipt.narrativeGeneration,
    receipt.headCheckpointId, receipt.rootRevision, receipt.userMessageIndex, receipt.userContentFingerprint,
    receipt.queryFingerprint, receipt.generationType, receipt.selectedFloors, receipt.selectedStates, receipt.coverage,
    receipt.injectionText, receipt.stages, receipt.skipReasons, receipt.completionStatus, receipt.createdAt,
    receipt.bodyMatchFingerprint, receipt.strategyVersion, receipt.selectedCseChanges, receipt.selectorDiagnostic,
    receipt.timings, receipt.storylines, receipt.timeDependencies, ...(receipt.qianshiProgress ? [receipt.qianshiProgress] : []),
    receipt.selectedLocationReferences, receipt.locationReferenceDependency,
    ...(receipt.qianshiDeletionWitness === undefined ? [] : [receipt.qianshiDeletionWitness])];
  if (receipt.prequelDependencyFingerprint !== undefined) material.push(receipt.prequelDependencyFingerprint);
  receipt.receiptFingerprint = `sha256:${await sha256(JSON.stringify(material))}`;
  h.runtime.invalidate('restart');
  const restored = await h.runtime.intercept(h.chat, 12000, null, 'regenerate');
  assert.equal(restored.lastRecall.reusedReceipt, true);
  assert.equal(h.selections, 1);
});

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


test('提取器时间兜底顺序：正文规范时间优先于弱参考文本（本地偏离守卫）', async () => {
  const floor = Object.freeze({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    chatId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    assistantSeq: 1,
    narrativeGeneration: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    hostLocator: Object.freeze({ messageIndex: 1 }),
    content: Object.freeze({ canonicalContent: '<StatusBar>当前时间：2026年5月6日 21:15</StatusBar>正文。', rawFingerprint: 'raw-1' }),
  });
  // 只有弱参考文本与正文当前时间；start-only 不算篇末。
  const storyClock = { complete: false, singleEnd: false, namespace: 'qqj',
    start: { raw: '2026-05-06 20:00', date: '2026-05-06', time: '20:00' }, end: null,
    referenceText: '参照旧稿：2026年1月1日 00:00' };
  const envelope = await createExtractorEnvelope({ batchId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    chatId: floor.chatId, narrativeGeneration: floor.narrativeGeneration, checkpointId: null,
    floor, entities: [], userIdentity: { displayName: '阿岚' }, storyClock });
  const compiled = await normalizeExtractorResponse({ response: { summary: '本楼摘要。' }, envelope, floor,
    existingEntities: [], now: '2026-05-06T00:00:00.000Z', expectedScope: envelope.scope });
  const entry = compiled.memory.chronology[0];
  assert.ok(entry, '正文有可确认时间时必须合成时间行');
  assert.match(entry.time.sourceText, /2026年5月6日/u, '正文规范时间不得被弱参考文本顶替');
  assert.doesNotMatch(entry.time.sourceText, /2026年1月1日/u);
  assert.equal(entry.time.precision, 'approximate', '正文规范时间按近似精度兜底，而不是 unresolved');
});
