// Performance benchmark for recall-selector.js.
//
//   node tools/perf-audit/benchmark.mjs                    # working tree vs HEAD
//   node tools/perf-audit/benchmark.mjs 2344a0d            # vs a specific revision
//   node tools/perf-audit/benchmark.mjs HEAD --scaling     # also fit the growth exponent
//
// Reports median-of-N wall time per floor count, plus the log-log exponent so a change can
// be classified as "moved the constant" vs "moved the asymptote" — the distinction that
// decided the 2026-10 investigation (a 30x constant win, exponent barely moved).
//
// Keep floor counts modest. An unpatched build at n=192 already costs ~20 s per call, so a
// large matrix turns a quick check into minutes. Scale up only when you need the exponent.
import { loadCurrentSelector, loadSelectorFromGit, buildSource, DEFAULT_QUERIES, median, fittedExponent, selectionSummary } from './lib/recall-audit.mjs';

const args = process.argv.slice(2);
const scaling = args.includes('--scaling');
const referenceRef = args.find(arg => !arg.startsWith('--')) ?? 'HEAD';

const SIZES = scaling ? [48, 96, 192, 384] : [48, 96, 129, 192];
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const CONTEXT_SIZE = Number(process.env.PERF_CONTEXT ?? 8192);
const QUERY = DEFAULT_QUERIES[0];

const reference = await loadSelectorFromGit(referenceRef, {});
const current = await loadCurrentSelector({});

console.log(`reference: git ${referenceRef}`);
console.log(`current  : working tree`);
console.log(`budget   : contextSize=${CONTEXT_SIZE}, runs=${RUNS} (median reported)\n`);

const measure = (selectRecall, floors) => {
  const samples = [];
  for (let index = 0; index < RUNS; index += 1) {
    const source = buildSource(floors);
    const started = performance.now();
    selectRecall({ source, queryContext: QUERY, contextSize: CONTEXT_SIZE });
    samples.push(performance.now() - started);
  }
  return median(samples);
};

console.log('  floors     reference       current      speedup');
const referencePoints = [];
const currentPoints = [];
const rows = [];
for (const floors of SIZES) {
  const before = measure(reference.selectRecall, floors);
  const after = measure(current.selectRecall, floors);
  referencePoints.push([floors, before]);
  currentPoints.push([floors, after]);
  rows.push({ floors, before, after });
  console.log(`  ${String(floors).padStart(6)}  ${before.toFixed(0).padStart(9)} ms  ${after.toFixed(0).padStart(9)} ms  ${(before / after).toFixed(2)}x`);
}

if (rows.length >= 2) {
  console.log(`\n  exponent (floors ${SIZES[0]}..${SIZES.at(-1)}):  reference n^${fittedExponent(referencePoints).toFixed(2)}   current n^${fittedExponent(currentPoints).toFixed(2)}`);
  console.log('  (a large speedup with an unchanged exponent means the constant moved, not the asymptote)');
}

// Sanity: report what was actually selected, so a timing run can never silently be
// measuring an empty or degenerate selection.
const probe = current.selectRecall({ source: buildSource(SIZES[0]), queryContext: QUERY, contextSize: CONTEXT_SIZE });
console.log(`\n  selection sanity at floors=${SIZES[0]}: ${JSON.stringify(selectionSummary(probe))}`);
