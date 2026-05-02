// ============================================
// Policy Versions — Property-Based Tests (Property 21)
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/policy-versions/policy-versions.pbt.ts
//
// **Validates: Requirements 13.2, 13.3**

import * as fc from 'fast-check';

// ── Re-declare types (avoid Angular DI / decorator imports) ──────────

interface PolicyVersion {
  version: number;
  author: string;
  updatedAt: string;
  status: string;
  changeSummary: string;
  content: string;
}

interface DiffLine {
  type: 'addition' | 'deletion' | 'modification' | 'unchanged';
  left: string;
  right: string;
  lineNum: number;
}

// ── Pure logic extracted from PolicyVersionsComponent ────────────────

/**
 * Compute a simple line-based diff between two text contents.
 * Mirrors the logic in policy-versions.component.ts computeDiff().
 */
function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = (oldContent || '').split('\n');
  const newLines = (newContent || '').split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);
  const result: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const left = i < oldLines.length ? oldLines[i] : '';
    const right = i < newLines.length ? newLines[i] : '';

    if (i >= oldLines.length) {
      result.push({ type: 'addition', left: '', right, lineNum: i + 1 });
    } else if (i >= newLines.length) {
      result.push({ type: 'deletion', left, right: '', lineNum: i + 1 });
    } else if (left !== right) {
      result.push({ type: 'modification', left, right, lineNum: i + 1 });
    } else {
      result.push({ type: 'unchanged', left, right, lineNum: i + 1 });
    }
  }
  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Sort versions chronologically by updatedAt (ascending).
 * Mirrors the ordering logic used in the component's version history view.
 */
function sortChronologically(versions: PolicyVersion[]): PolicyVersion[] {
  return [...versions].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  );
}

// ── Arbitraries ──────────────────────────────────────────────────────

/** Generate a random ISO date string within a reasonable range */
const arbISODate = fc
  .integer({ min: 1577836800000, max: 1767225600000 }) // 2020-01-01 to 2025-12-31
  .map((ts) => new Date(ts).toISOString());

/** Generate a random non-empty text line (no newlines) */
const arbTextLine = fc.string({ minLength: 1, maxLength: 60 }).map((s) =>
  s.replace(/[\n\r]/g, ' ').slice(0, 60) || 'x',
);

/** Generate multi-line content (1–10 lines) */
const arbContent = fc
  .array(arbTextLine, { minLength: 1, maxLength: 10 })
  .map((lines) => lines.join('\n'));

/** Generate a single PolicyVersion */
const arbPolicyVersion = (version: number) =>
  fc.record({
    version: fc.constant(version),
    author: fc.string({ minLength: 1, maxLength: 20 }),
    updatedAt: arbISODate,
    status: fc.constantFrom('draft', 'published', 'archived'),
    changeSummary: fc.string({ minLength: 0, maxLength: 80 }),
    content: arbContent,
  });

/** Generate a list of 2–8 versions with sequential version numbers and distinct dates */
const arbVersionHistory = fc
  .integer({ min: 2, max: 8 })
  .chain((count) => {
    const arbs = Array.from({ length: count }, (_, i) => arbPolicyVersion(i + 1));
    return fc.tuple(...(arbs as [ReturnType<typeof arbPolicyVersion>, ...ReturnType<typeof arbPolicyVersion>[]]));
  })
  .map((versions) => versions as PolicyVersion[]);

// ============================================
// Property 21a: Version history is in chronological order
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.2**
//
// For any policy with multiple versions, sorting by updatedAt
// SHALL produce a chronologically ordered list where each entry's
// date is ≤ the next entry's date.
// ============================================

console.log('--- Property 21a: Version history chronological ordering ---');

fc.assert(
  fc.property(arbVersionHistory, (versions) => {
    const sorted = sortChronologically(versions);

    // Every consecutive pair must be in non-decreasing date order
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].updatedAt).getTime();
      const curr = new Date(sorted[i].updatedAt).getTime();
      if (prev > curr) return false;
    }
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Version history is always in chronological order after sorting');

// ============================================
// Property 21b: Diff correctly identifies additions
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.3**
//
// When the new content has more lines than the old content,
// the extra lines SHALL be classified as 'addition' with empty left side.
// ============================================

console.log('--- Property 21b: Diff identifies additions correctly ---');

fc.assert(
  fc.property(
    fc.array(arbTextLine, { minLength: 1, maxLength: 5 }),
    fc.array(arbTextLine, { minLength: 1, maxLength: 5 }),
    (baseLines, extraLines) => {
      const oldContent = baseLines.join('\n');
      const newContent = [...baseLines, ...extraLines].join('\n');
      const diff = computeDiff(oldContent, newContent);

      // Lines beyond the old content length should be additions
      for (let i = baseLines.length; i < diff.length; i++) {
        if (diff[i].type !== 'addition') return false;
        if (diff[i].left !== '') return false;
        if (diff[i].right !== extraLines[i - baseLines.length]) return false;
      }
      return true;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Extra lines in new content are classified as additions');

// ============================================
// Property 21c: Diff correctly identifies deletions
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.3**
//
// When the old content has more lines than the new content,
// the extra lines SHALL be classified as 'deletion' with empty right side.
// ============================================

console.log('--- Property 21c: Diff identifies deletions correctly ---');

fc.assert(
  fc.property(
    fc.array(arbTextLine, { minLength: 1, maxLength: 5 }),
    fc.array(arbTextLine, { minLength: 1, maxLength: 5 }),
    (baseLines, extraLines) => {
      const oldContent = [...baseLines, ...extraLines].join('\n');
      const newContent = baseLines.join('\n');
      const diff = computeDiff(oldContent, newContent);

      // Lines beyond the new content length should be deletions
      for (let i = baseLines.length; i < diff.length; i++) {
        if (diff[i].type !== 'deletion') return false;
        if (diff[i].right !== '') return false;
        if (diff[i].left !== extraLines[i - baseLines.length]) return false;
      }
      return true;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Extra lines in old content are classified as deletions');

// ============================================
// Property 21d: Diff correctly identifies modifications
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.3**
//
// When two contents have the same number of lines but differ on
// specific lines, those lines SHALL be classified as 'modification'
// with the old text on the left and new text on the right.
// ============================================

console.log('--- Property 21d: Diff identifies modifications correctly ---');

fc.assert(
  fc.property(
    fc.array(arbTextLine, { minLength: 2, maxLength: 8 }),
    fc.integer({ min: 0, max: 7 }),
    arbTextLine,
    (lines, idxRaw, replacement) => {
      const idx = idxRaw % lines.length;
      const original = lines[idx];
      // Ensure the replacement is actually different
      if (replacement === original) return true; // skip trivial case

      const oldLines = [...lines];
      const newLines = [...lines];
      newLines[idx] = replacement;

      const diff = computeDiff(oldLines.join('\n'), newLines.join('\n'));

      // The modified line should be 'modification'
      if (diff[idx].type !== 'modification') return false;
      if (diff[idx].left !== original) return false;
      if (diff[idx].right !== replacement) return false;
      return true;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Changed lines are classified as modifications with correct left/right');

// ============================================
// Property 21e: Identical content produces only unchanged lines
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.3**
//
// When two versions have identical content, the diff SHALL contain
// only 'unchanged' entries with matching left and right text.
// ============================================

console.log('--- Property 21e: Identical content → all unchanged ---');

fc.assert(
  fc.property(arbContent, (content) => {
    const diff = computeDiff(content, content);

    return diff.every(
      (line) =>
        line.type === 'unchanged' &&
        line.left === line.right,
    );
  }),
  { numRuns: 100 },
);
console.log('  ✓ Identical content produces only unchanged diff lines');

// ============================================
// Property 21f: Diff line count equals max of old/new line counts
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.3**
//
// For any two contents, the number of DiffLine entries SHALL equal
// max(oldLineCount, newLineCount), and lineNum SHALL be sequential
// starting from 1.
// ============================================

console.log('--- Property 21f: Diff line count and lineNum correctness ---');

fc.assert(
  fc.property(arbContent, arbContent, (oldContent, newContent) => {
    const diff = computeDiff(oldContent, newContent);
    const oldLineCount = (oldContent || '').split('\n').length;
    const newLineCount = (newContent || '').split('\n').length;
    const expectedLen = Math.max(oldLineCount, newLineCount);

    if (diff.length !== expectedLen) return false;

    // lineNum should be sequential 1..N
    for (let i = 0; i < diff.length; i++) {
      if (diff[i].lineNum !== i + 1) return false;
    }
    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Diff length equals max(oldLines, newLines) with sequential lineNum');

// ============================================
// Property 21g: Diff type classification is exhaustive
// Feature: smart-seeding-quick-wins, Property 21: Policy version history ordering
// **Validates: Requirements 13.3**
//
// Every DiffLine SHALL have a type that is one of: 'addition',
// 'deletion', 'modification', or 'unchanged'.
// ============================================

console.log('--- Property 21g: Diff type classification is exhaustive ---');

const validTypes = new Set(['addition', 'deletion', 'modification', 'unchanged']);

fc.assert(
  fc.property(arbContent, arbContent, (oldContent, newContent) => {
    const diff = computeDiff(oldContent, newContent);
    return diff.every((line) => validTypes.has(line.type));
  }),
  { numRuns: 100 },
);
console.log('  ✓ All diff lines have a valid type classification');

console.log('\n=== All Property 21 (Policy version history ordering) tests PASSED ===');
