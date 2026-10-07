# tools/perf-audit

Equivalence + performance auditing for `src/v3/recall-selector.js`.

These two runners are the durable output of the 2026-10 recall-budget investigation, which
began as ~44 one-off scripts in a throwaway directory. The scripts are gone; the method is
here.

## Why this exists

`buildStorylinePlan()` inside `recall-selector.js` dominated recall cost: at 129 floor
memories it was **92.7–97.3%** of `selectRecall()` wall time, and a mid-length archive spent
~20 s in it on every regenerate. The fix is four pure-function memoizations. Proving "this
is faster" was never the hard part — proving "this changes nothing about what gets recalled"
was. That is what these runners mechanize.

## Usage

```bash
# Does the working tree recall exactly what <ref> recalled?
node tools/perf-audit/verify-equivalence.mjs HEAD

# How much faster is the working tree than <ref>?
node tools/perf-audit/benchmark.mjs HEAD
node tools/perf-audit/benchmark.mjs HEAD --scaling   # also fit the growth exponent

# Tuning
PERF_RUNS=5 PERF_CONTEXT=8192 node tools/perf-audit/benchmark.mjs HEAD
```

`verify-equivalence.mjs` exits non-zero on any divergence, so it is usable as a gate.

Both accept any git revision (`HEAD`, `HEAD~1`, a tag, a SHA, `origin/main`), which makes the
pre-change state the natural reference.

## What the fixtures are for

The matrix is not arbitrary — each shape exists to catch a specific way a "performance"
change silently alters behavior:

| Fixture | Catches |
| --- | --- |
| `uniqueText` | A memoization win that is really just duplicate-text luck. Every floor gets a distinct marker, so text reuse is 1.00x and the win must be structural. |
| `towardVariants` | Equal-text CSE states differing only in `towardEntityId`. Upstream `cseDuplicateKey` deliberately keeps those apart ("避免同文状态互相吞并"), so any cache keyed on `historyStableKey` alone can wrongly merge them. |
| `sparse` | A path that only shows up when some floors yield no facts. |
| `eventChars=40` | Long descriptions, where `compact()`/`tokenizeRecallText()` actually dominate. |
| `contextSize=400` | A budget tight enough that the selection/drop loop iterates instead of settling first pass. |

## Two rules that are easy to get wrong

**1. Variants must never be built across upstream verses.** During the original
investigation several variants were generated from v0.6.11 sources and then quietly compared
against a v0.6.12 baseline; the resulting "byte-identical ✓" verdicts were meaningless.
`assertUpstreamMarkers()` now throws if a build lacks markers only present from v0.6.12 on.

**2. Never write next to `src/`.** `recall-selector.js` imports its siblings with relative
specifiers, so a variant needs either to sit beside the original (mutating the working tree)
or to have those specifiers rewritten. `absolutizeImports()` does the latter and the scratch
area is `.perf-audit-scratch/` (gitignored).

## Reading a benchmark result

The exponent matters more than the multiplier when deciding whether a change is *the* fix or
merely *a* fix. The 2026-10 change bought ~17–35x but moved the exponent only from ~`n^1.76`
to ~`n^1.24`; the underlying `O(m²)` pair structure was untouched, so a large enough archive
would still slow down. Only reducing the candidate pool changes the asymptote — and that
alters what gets recalled, which is why it was left as separate work.

## Notes

- A scratch directory is created and reused; delete `.perf-audit-scratch/` freely.
- Sandboxes that confine stdio reject piped child output, so `loadSelectorFromGit()` redirects
  `git show` straight into an opened file descriptor instead of capturing a pipe.
- An unpatched build at 192 floors costs ~20 s per call. Keep the floor matrix small unless
  you specifically need the exponent.
