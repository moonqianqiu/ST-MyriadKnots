// Shared library for recall-selector perf/equivalence audits.
//
// Why this exists: the 2026-10 recall investigation produced ~44 one-off scripts, each
// re-declaring the same fixture builder and the same canonical comparator. This module is
// that shared part, distilled. The individual scripts then shrink to a few lines of intent.
//
// The important hard-won details encoded here:
//
//  1. LINEAGE GUARD. An audit that compares two builds of recall-selector.js is worthless
//     if one of them is stale. During the original investigation a set of variants was
//     generated from v0.6.11 text and then silently compared against a v0.6.12 baseline;
//     the resulting "byte-identical ✓" verdicts were meaningless. `assertUpstreamMarkers`
//     below fails loudly instead.
//
//  2. IMPORTS MUST BE ABSOLUTIZED. recall-selector.js imports its siblings with relative
//     specifiers, so a copy placed outside src/v3/ cannot be imported as-is. Instead of
//     copying next to the original (which mutates the working tree), we rewrite the three
//     sibling specifiers to file:// URLs and keep the variant outside the repository, in
//     the OS temp directory, so an audit never leaves anything behind in the checkout.
//
//  3. CRLF. src/v3/recall-selector.js is stored with CRLF line endings on Windows. Any
//     text substitution must normalize to LF first, or anchor matching silently fails.
//
//  4. FIXTURE SHAPE MUST MIRROR THE REAL CONTRACT. tests/v3-recall.test.mjs builds memory
//     objects in a specific shape, and recall-selector.js dereferences fields
//     unconditionally (e.g. src/v3/recall-selector.js reads `value.targetEntityIds.length`
//     for every commitment). A fixture that omits a field throws deep inside the selector
//     rather than reporting a useful error.
import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// Variants are materialized here rather than next to the original, so an audit never
// mutates src/. Deliberately OUTSIDE the repository (OS temp dir): the checkout stays
// clean and no .gitignore entry is needed. Fully regenerable — delete it any time.
export const SCRATCH_DIR = resolve(tmpdir(), 'qqj-recall-perf-audit');
export const SELECTOR_REL = 'src/v3/recall-selector.js';
export const SELECTOR_ABS = resolve(REPO_ROOT, SELECTOR_REL);

// Markers that only exist once upstream v0.6.12's dedupe work is present. If a variant is
// missing these it came from an older tree, and any comparison against it is void.
const UPSTREAM_MARKERS = Object.freeze(['cseDuplicateKey', 'sideCoveredByHistory', 'sameSelectionDuplicate']);
const UPSTREAM_MINIMUM = Object.freeze({ cseDuplicateKey: 4, sideCoveredByHistory: 2, sameSelectionDuplicate: 1 });

export function assertUpstreamMarkers(text, label) {
  for (const marker of UPSTREAM_MARKERS) {
    const found = text.split(marker).length - 1;
    const minimum = UPSTREAM_MINIMUM[marker];
    if (found < minimum) {
      throw new Error(
        `${label} is not based on upstream v0.6.12+: expected >=${minimum} "${marker}", found ${found}. ` +
        'Comparing builds from different upstream verses produces meaningless verdicts.',
      );
    }
  }
  return text;
}

// Rewrite the three sibling imports to absolute file:// URLs so a variant can live anywhere.
export function absolutizeImports(text, sourceDir = resolve(REPO_ROOT, 'src', 'v3')) {
  const siblings = ['recall-ranking.js', 'recall-source.js', 'vector-source.js'];
  return siblings.reduce((acc, name) => {
    const specifier = `'./${name}'`;
    if (!acc.includes(specifier)) throw new Error(`import specifier not found: ${specifier}`);
    return acc.replace(specifier, `'${pathToFileURL(resolve(sourceDir, name)).href}'`);
  }, text);
}

export const toLf = text => text.replace(/\r\n/g, '\n');

// Load a recall-selector build from raw source text, asserting its lineage.
export async function loadSelectorFromSource(text, { label, scratchDir = SCRATCH_DIR } = {}) {
  assertUpstreamMarkers(text, label);
  await mkdir(scratchDir, { recursive: true });
  const dest = resolve(scratchDir, `${label.replace(/[^A-Za-z0-9._-]/g, '_')}.mjs`);
  await writeFile(dest, absolutizeImports(toLf(text)), 'utf8');
  const module = await import(pathToFileURL(dest).href);
  return { selectRecall: module.selectRecall, path: dest, source: text };
}

// Load the working-tree build.
export async function loadCurrentSelector({ scratchDir = SCRATCH_DIR } = {}) {
  const text = await readFile(SELECTOR_ABS, 'utf8');
  return loadSelectorFromSource(text, { label: 'current', scratchDir });
}

// Load a build from any git revision, e.g. 'HEAD', 'HEAD~1', 'origin/main', a tag or SHA.
// Note this reads the selector at that revision; its sibling imports are resolved from the
// WORKING TREE, which is correct for the usual "did my edit change behavior/perf" question.
//
// Implementation note: git's stdout is redirected straight into a real file descriptor
// rather than captured through a pipe. Sandboxes that confine stdio reject piped child
// output ("spawn EPERM"), while writing to an opened file works everywhere.
export async function loadSelectorFromGit(ref, { scratchDir = SCRATCH_DIR } = {}) {
  await mkdir(scratchDir, { recursive: true });
  const label = `git-${ref.replace(/[^A-Za-z0-9._-]/g, '_')}`;
  const rawPath = resolve(scratchDir, `${label}.src`);
  const handle = await open(rawPath, 'w');
  try {
    execFileSync('git', ['show', `${ref}:${SELECTOR_REL}`], {
      cwd: REPO_ROOT,
      stdio: ['ignore', handle.fd, 'inherit'],
    });
  } finally {
    await handle.close();
  }
  const text = await readFile(rawPath, 'utf8');
  await unlink(rawPath).catch(() => {});
  return loadSelectorFromSource(text, { label, scratchDir });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERSON = id => `${String(id).padStart(8, '0')}-0000-4000-8000-000000000000`;
const TOPICS = ['钟楼', '钥匙', '灰匣', '雨夜', '约定', '渡口', '旧书', '铜铃', '雪原', '灯会', '船票', '药铺', '祠堂', '信笺'];
const repeat = (make, count) => Array.from({ length: count }, make);

/**
 * Build a recall `source` object.
 *
 * @param {number} floors        number of floor memories (this is "n" in the reports)
 * @param {object} [options]
 * @param {number} [options.eventChars]   repeat factor for event description length; larger
 *                                        values make compact()/tokenize() more expensive,
 *                                        which is what the hot path scales with
 * @param {number} [options.entityCount]  size of the entity table (the real archive had 92)
 * @param {boolean} [options.uniqueText]  append a per-floor marker so no two floors share a
 *                                        text; use this to prove a memoization win is
 *                                        structural rather than text-reuse luck
 * @param {number} [options.towardVariants] add equal-text CSE states that differ only in
 *                                        `towardEntityId`; this is the collision shape that
 *                                        a content-keyed record cache must not merge
 * @param {boolean} [options.dense]       whether every floor yields every fact type
 *                                        (dense = the reproducer for the reported hang)
 */
export function buildSource(floors, {
  eventChars = 1,
  entityCount = 92,
  uniqueText = false,
  towardVariants = 0,
  dense = true,
} = {}) {
  const entities = Array.from({ length: entityCount }, (_, index) => ({
    entityId: PERSON(index + 1),
    entityType: 'person',
    displayName: index === 0 ? '裴晚生' : `人物${index}号`,
    aliases: index === 0 ? ['阿裴'] : [],
    specialRole: index === 0 ? 'char' : 'none',
  }));

  const floorMemories = Array.from({ length: floors }, (_, index) => {
    const seq = index + 1;
    const topicA = TOPICS[index % TOPICS.length];
    const topicB = TOPICS[(index + 1) % TOPICS.length];
    const actor = PERSON((index % entityCount) + 1);
    const target = PERSON(((index + 1) % entityCount) + 1);
    const tag = uniqueText ? `#${seq}` : '';
    const many = count => (dense ? count : (index % 3 === 0 ? count : 0));
    return {
      floorId: `floor-${seq}`,
      floorMemoryId: `memory-${seq}`,
      assistantSeq: seq,
      summary: `第 ${seq} 楼：${topicA}${topicB}相关的${'情节细节'.repeat(6)}记录${seq}${tag}`,
      chronology: [{ time: { kind: 'explicit', sourceText: `${seq}日夜`, normalized: null, precision: 'approximate', relativeToAssistantSeq: null }, description: '' }],
      participants: [{ entityId: actor }, { entityId: target }],
      locations: [],
      exactAnchors: [],
      // Field shapes mirror the real consumers in src/v3/recall-selector.js: a commitment
      // is dereferenced as `value.targetEntityIds.length`, an open loop as
      // `ownerEntityIds`, an observation as `subjectEntityId`, etc.
      commitments: repeat(() => ({ content: `${topicA}的约定${tag}`, kind: 'promise', status: 'accepted', speakerEntityId: actor, targetEntityIds: [target] }), many(1)),
      openLoops: repeat(() => ({ description: `${topicB}未决${tag}`, ownerEntityIds: [actor] }), many(1)),
      events: repeat(() => ({ title: `${topicA}事件${tag}`, description: `${topicA}与${topicB}在${seq}楼发生。${'详细描述'.repeat(eventChars)}${tag}`, candidateStatus: 'accepted' }), 1),
      actions: repeat(() => ({ actorEntityId: actor, targetEntityIds: [target], action: `${topicA}同行${tag}`, completion: 'completed', result: '' }), 1),
      observations: repeat(() => ({ description: `${topicA}的观察${tag}`, subjectEntityId: actor }), 1),
      privateCognition: [],
      informationTransfers: repeat(() => ({ claimText: `${topicA}的消息${tag}`, channel: 'tell', fromEntityId: actor, toEntityIds: [target] }), 1),
    };
  });

  const currentState = [{
    subjectEntityId: PERSON(1),
    core: [
      ...Array.from({ length: 40 }, (_, index) => ({
        text: `人物状态 ${index + 1}：${TOPICS[index % TOPICS.length]}`,
        visibility: 'authorial',
        reason: '旧状态',
        origin: 'baseline',
        towardEntityId: null,
        sourceAssistantSeq: floors,
      })),
      // Same text, different `towardEntityId`: upstream's cseDuplicateKey keeps these apart
      // ("避免同文状态互相吞并"), so anything caching by historyStableKey alone must be
      // checked against this shape.
      ...Array.from({ length: towardVariants }, (_, index) => ({
        text: '对钟楼守夜人的态度',
        reason: `因为${TOPICS[index % TOPICS.length]}`,
        visibility: 'observable',
        origin: 'baseline',
        towardEntityId: PERSON(index + 2),
        sourceAssistantSeq: floors,
      })),
    ],
    adaptive: [],
    situational: [],
  }];

  return {
    status: 'ready',
    chatId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    narrativeGeneration: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    headCheckpointId: 'head',
    rootRevision: 1,
    coverage: {
      stableAiFloors: floors,
      stableThroughAssistantSeq: floors,
      rememberedAiFloors: floors,
      missingAssistantSeq: [],
      cseThroughAssistantSeq: floors,
      memoryComplete: true,
      cseCurrent: true,
    },
    entities,
    floorMemories,
    currentState,
  };
}

export const DEFAULT_QUERIES = Object.freeze([
  { text: '钟楼的钥匙与灰匣，雨夜的约定', latestUserText: '钟楼的钥匙与灰匣，雨夜的约定', messageCount: 1 },
  { text: '渡口的船票', latestUserText: '渡口的船票', messageCount: 1 },
  { text: '钟楼守夜人的态度', latestUserText: '钟楼守夜人的态度', messageCount: 1 },
  { text: '', latestUserText: '', messageCount: 1 },
]);

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

// Deterministic serialization: object keys sorted, Sets turned into sorted arrays so set
// iteration order cannot masquerade as a behavioral difference.
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Set) return [...value].map(canonicalize).sort();
  if (value instanceof Map) return [...value.entries()].map(([k, v]) => [canonicalize(k), canonicalize(v)]).sort();
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

export const sameResult = (a, b) => JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));

// First differing character, for a readable failure message.
export function firstTextDifference(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  const limit = Math.max(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    if (left[index] !== right[index]) {
      return {
        index,
        left: left.slice(Math.max(0, index - 60), index + 80),
        right: right.slice(Math.max(0, index - 60), index + 80),
        leftLength: left.length,
        rightLength: right.length,
      };
    }
  }
  return null;
}

export function selectionSummary(result) {
  const items = result.floors.reduce((sum, floor) => sum + floor.items.length, 0);
  return {
    chars: result.injectionText.length,
    floors: result.floors.length,
    items,
    states: result.states.length,
    changes: result.cseChanges.length,
    storylines: (result.storylines ?? []).length,
  };
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

export const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

export function timeCall(selectRecall, { source, queryContext, contextSize, runs = 5 }) {
  const samples = [];
  for (let index = 0; index < runs; index += 1) {
    const started = performance.now();
    selectRecall({ source, queryContext, contextSize });
    samples.push(performance.now() - started);
  }
  return { median: median(samples), samples, min: Math.min(...samples), max: Math.max(...samples) };
}

// Log-log slope of cost vs floors, so a change can be judged by whether it moved the
// EXPONENT or merely the constant.
export function fittedExponent(points) {
  const xs = points.map(point => Math.log(point[0]));
  const ys = points.map(point => Math.log(point[1]));
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < xs.length; index += 1) {
    numerator += (xs[index] - meanX) * (ys[index] - meanY);
    denominator += (xs[index] - meanX) ** 2;
  }
  return numerator / denominator;
}
