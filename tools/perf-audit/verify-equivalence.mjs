// Equivalence verifier for recall-selector.js changes.
//
// Answers one question: does the working tree still produce byte-identical recall output
// to a reference revision? Run it BEFORE trusting any performance change.
//
//   node tools/perf-audit/verify-equivalence.mjs                 # HEAD vs working tree
//   node tools/perf-audit/verify-equivalence.mjs origin/main     # custom reference
//
// Exit code 0 = equivalent everywhere, 1 = a divergence was found.
//
// The fixture matrix deliberately includes the shapes that broke naive caching attempts:
//   - uniqueText:      proves a memoization win is not just text-reuse luck
//   - towardVariants:  equal-text CSE states differing only in `towardEntityId`, which
//                      upstream cseDuplicateKey deliberately keeps separate
//   - contextSize 400: a tight budget, where the selection/drop loop actually iterates
import { loadCurrentSelector, loadSelectorFromGit, buildSource, DEFAULT_QUERIES, sameResult, firstTextDifference, selectionSummary } from './lib/recall-audit.mjs';

const referenceRef = process.argv[2] ?? 'HEAD';

const FIXTURES = [
  { label: 'n=24  dense', floors: 24 },
  { label: 'n=48  dense', floors: 48 },
  { label: 'n=96  dense', floors: 96 },
  { label: 'n=48  dense, unique text', floors: 48, uniqueText: true },
  { label: 'n=96  dense, unique text', floors: 96, uniqueText: true },
  { label: 'n=192 dense, unique text', floors: 192, uniqueText: true },
  { label: 'n=64  dense, toward x3', floors: 64, towardVariants: 3 },
  { label: 'n=64  dense, toward x8', floors: 64, towardVariants: 8 },
  { label: 'n=129 dense, unique+toward', floors: 129, uniqueText: true, towardVariants: 4 },
  { label: 'n=192 dense, unique+toward', floors: 192, uniqueText: true, towardVariants: 6 },
  { label: 'n=96  sparse (fewer facts/floor)', floors: 96, dense: false },
  { label: 'n=64  long events (eventChars=40)', floors: 64, eventChars: 40 },
];
const BUDGETS = [400, 8192, 20000];

const reference = await loadSelectorFromGit(referenceRef, { scratchDir: undefined });
const current = await loadCurrentSelector({ scratchDir: undefined });

console.log(`reference: git ${referenceRef}`);
console.log(`current  : working tree\n`);

let cases = 0;
let divergences = 0;

for (const fixture of FIXTURES) {
  let fixtureFailures = 0;
  for (const query of DEFAULT_QUERIES) {
    for (const contextSize of BUDGETS) {
      cases += 1;
      const source = () => buildSource(fixture.floors, fixture);
      const expected = reference.selectRecall({ source: source(), queryContext: query, contextSize });
      const actual = current.selectRecall({ source: source(), queryContext: query, contextSize });
      if (sameResult(expected, actual)) continue;

      fixtureFailures += 1;
      divergences += 1;
      if (divergences <= 5) {
        const diff = firstTextDifference(expected.injectionText, actual.injectionText);
        console.log(`DIVERGENCE  ${fixture.label} | query="${query.text || '(empty)'}" | contextSize=${contextSize}`);
        console.log(`  reference: ${JSON.stringify(selectionSummary(expected))}`);
        console.log(`  current  : ${JSON.stringify(selectionSummary(actual))}`);
        if (diff) {
          console.log(`  first difference at char ${diff.index} (len ${diff.leftLength} vs ${diff.rightLength})`);
          console.log(`    reference: ${JSON.stringify(diff.left)}`);
          console.log(`    current  : ${JSON.stringify(diff.right)}`);
        }
      }
    }
  }
  console.log(`${fixtureFailures === 0 ? 'ok  ' : 'FAIL'}  ${fixture.label}`);
}

console.log(`\n${cases - divergences}/${cases} cases byte-identical`);
if (divergences > 0) {
  console.log(`RESULT: ${divergences} divergence(s) — the change is NOT output-preserving.`);
  process.exit(1);
}
console.log('RESULT: output-preserving against the reference.');
