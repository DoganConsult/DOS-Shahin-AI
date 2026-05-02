// ============================================
// RACI Matrix — Property-Based Tests (Property 9)
// Feature: smart-seeding-quick-wins, Property 9: RACI edit round-trip
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/raci-matrix/raci-matrix.pbt.ts
//
// **Validates: Requirements 4.3**

import * as fc from 'fast-check';

// ── Re-declare types (avoid Angular DI / decorator imports) ──────────

interface RACIEntry {
  controlId: string;
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
}

interface RACIRow {
  controlId: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
}

// ── Pure logic extracted from RACIMatrixComponent ────────────────────

/**
 * Convert API RACIEntry to display row (arrays → comma-separated strings).
 * Mirrors RACIMatrixComponent.entryToRow().
 */
function entryToRow(entry: RACIEntry): RACIRow {
  return {
    controlId: entry.controlId || '',
    responsible: entry.responsible || '',
    accountable: entry.accountable || '',
    consulted: Array.isArray(entry.consulted) ? entry.consulted.join(', ') : '',
    informed: Array.isArray(entry.informed) ? entry.informed.join(', ') : '',
  };
}

/**
 * Convert display rows back to RACIEntry[] for API payload.
 * Mirrors RACIMatrixComponent.rowsToEntries().
 */
function rowsToEntries(rows: RACIRow[]): RACIEntry[] {
  return rows
    .filter(r => r.controlId)
    .map(r => ({
      controlId: r.controlId,
      responsible: r.responsible,
      accountable: r.accountable,
      consulted: r.consulted.split(',').map(s => s.trim()).filter(Boolean),
      informed: r.informed.split(',').map(s => s.trim()).filter(Boolean),
    }));
}

/**
 * Apply a RACI patch to an existing matrix.
 * For each patch entry, if a matching controlId exists, update it; otherwise append.
 * This mirrors the edit round-trip: user edits → save (rowsToEntries) → API persists → load (entryToRow).
 */
function applyPatch(existing: RACIEntry[], patch: RACIEntry[]): RACIEntry[] {
  const result = existing.map(e => ({ ...e, consulted: [...e.consulted], informed: [...e.informed] }));
  for (const p of patch) {
    const idx = result.findIndex(e => e.controlId === p.controlId);
    if (idx >= 0) {
      result[idx] = { ...p, consulted: [...p.consulted], informed: [...p.informed] };
    } else {
      result.push({ ...p, consulted: [...p.consulted], informed: [...p.informed] });
    }
  }
  return result;
}

// ── Arbitraries ──────────────────────────────────────────────────────

/** Simple role name — no commas, no leading/trailing whitespace (matches trim() in rowsToEntries) */
const arbRole = fc.stringMatching(/^[A-Za-z0-9_][A-Za-z0-9_ -]{0,28}[A-Za-z0-9_]$/)
  .filter(s => s.trim() === s && s.length > 0 && !s.includes(','));

/** Non-empty controlId (no commas) */
const arbControlId = fc.stringMatching(/^[a-z][a-z0-9_-]{0,29}$/).filter(s => s.length > 0);

/** Array of role names for consulted/informed */
const arbRoleArray = fc.array(arbRole, { minLength: 0, maxLength: 5 });

/** A single RACIEntry with valid data */
const arbRACIEntry: fc.Arbitrary<RACIEntry> = fc.record({
  controlId: arbControlId,
  responsible: arbRole,
  accountable: arbRole,
  consulted: arbRoleArray,
  informed: arbRoleArray,
});

/** A RACI matrix (array of entries with unique controlIds) */
const arbRACIMatrix: fc.Arbitrary<RACIEntry[]> = fc
  .array(arbRACIEntry, { minLength: 1, maxLength: 10 })
  .map(entries => {
    // Deduplicate by controlId, keeping last occurrence
    const seen = new Map<string, RACIEntry>();
    for (const e of entries) seen.set(e.controlId, e);
    return Array.from(seen.values());
  })
  .filter(arr => arr.length > 0);

/** A patch (subset of entries to update or add) */
const arbPatch: fc.Arbitrary<RACIEntry[]> = fc
  .array(arbRACIEntry, { minLength: 1, maxLength: 5 })
  .map(entries => {
    const seen = new Map<string, RACIEntry>();
    for (const e of entries) seen.set(e.controlId, e);
    return Array.from(seen.values());
  })
  .filter(arr => arr.length > 0);

// ============================================
// Property 9a: Entry → Row → Entry round-trip preserves data
// Feature: smart-seeding-quick-wins, Property 9: RACI edit round-trip
// **Validates: Requirements 4.3**
//
// For any valid RACIEntry, converting to a display row and back
// to an entry should produce an equivalent RACIEntry.
// ============================================

console.log('--- Property 9a: Entry → Row → Entry round-trip preserves data ---');

fc.assert(
  fc.property(arbRACIEntry, (entry) => {
    const row = entryToRow(entry);
    const [roundTripped] = rowsToEntries([row]);

    if (!roundTripped) return false;
    if (roundTripped.controlId !== entry.controlId) return false;
    if (roundTripped.responsible !== entry.responsible) return false;
    if (roundTripped.accountable !== entry.accountable) return false;

    // Compare consulted arrays (empty strings filtered out during split)
    const expectedConsulted = entry.consulted.filter(Boolean);
    const expectedInformed = entry.informed.filter(Boolean);

    if (roundTripped.consulted.length !== expectedConsulted.length) return false;
    if (roundTripped.informed.length !== expectedInformed.length) return false;

    for (let i = 0; i < expectedConsulted.length; i++) {
      if (roundTripped.consulted[i] !== expectedConsulted[i]) return false;
    }
    for (let i = 0; i < expectedInformed.length; i++) {
      if (roundTripped.informed[i] !== expectedInformed[i]) return false;
    }

    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Entry → Row → Entry round-trip preserves data');

// ============================================
// Property 9b: Patch apply → persist → read returns updated entries
// Feature: smart-seeding-quick-wins, Property 9: RACI edit round-trip
// **Validates: Requirements 4.3**
//
// For any valid RACI matrix and patch, applying the patch then
// converting through the display layer (entryToRow → rowsToEntries)
// should return entries matching the patched matrix.
// ============================================

console.log('--- Property 9b: Patch apply → persist → read returns updated entries ---');

fc.assert(
  fc.property(arbRACIMatrix, arbPatch, (matrix, patch) => {
    // 1. Apply patch to existing matrix
    const patched = applyPatch(matrix, patch);

    // 2. Simulate persist: convert to rows (display layer) then back to entries (API payload)
    const rows = patched.map(e => entryToRow(e));
    const persisted = rowsToEntries(rows);

    // 3. Simulate read: convert persisted entries back to rows then to entries again
    const readRows = persisted.map(e => entryToRow(e));
    const readEntries = rowsToEntries(readRows);

    // 4. Verify: read entries should match persisted entries
    if (readEntries.length !== persisted.length) return false;

    for (let i = 0; i < persisted.length; i++) {
      const p = persisted[i];
      const r = readEntries[i];
      if (r.controlId !== p.controlId) return false;
      if (r.responsible !== p.responsible) return false;
      if (r.accountable !== p.accountable) return false;
      if (r.consulted.length !== p.consulted.length) return false;
      if (r.informed.length !== p.informed.length) return false;
      for (let j = 0; j < p.consulted.length; j++) {
        if (r.consulted[j] !== p.consulted[j]) return false;
      }
      for (let j = 0; j < p.informed.length; j++) {
        if (r.informed[j] !== p.informed[j]) return false;
      }
    }

    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Patch apply → persist → read returns updated entries');

// ============================================
// Property 9c: Patched entries are present in result
// Feature: smart-seeding-quick-wins, Property 9: RACI edit round-trip
// **Validates: Requirements 4.3**
//
// For any valid RACI matrix and patch, after applying the patch
// and round-tripping through the display layer, every patch entry
// should be findable in the result by controlId with matching fields.
// ============================================

console.log('--- Property 9c: Patched entries are present in result ---');

fc.assert(
  fc.property(arbRACIMatrix, arbPatch, (matrix, patch) => {
    const patched = applyPatch(matrix, patch);
    const rows = patched.map(e => entryToRow(e));
    const result = rowsToEntries(rows);

    // Every patch entry should be in the result
    for (const p of patch) {
      const found = result.find(r => r.controlId === p.controlId);
      if (!found) return false;
      if (found.responsible !== p.responsible) return false;
      if (found.accountable !== p.accountable) return false;

      const expectedConsulted = p.consulted.filter(Boolean);
      const expectedInformed = p.informed.filter(Boolean);
      if (found.consulted.length !== expectedConsulted.length) return false;
      if (found.informed.length !== expectedInformed.length) return false;
    }

    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Patched entries are present in result');

// ============================================
// Property 9d: Non-patched entries are preserved
// Feature: smart-seeding-quick-wins, Property 9: RACI edit round-trip
// **Validates: Requirements 4.3**
//
// For any valid RACI matrix and patch, entries not targeted by the
// patch should remain unchanged after the round-trip.
// ============================================

console.log('--- Property 9d: Non-patched entries are preserved ---');

fc.assert(
  fc.property(arbRACIMatrix, arbPatch, (matrix, patch) => {
    const patchIds = new Set(patch.map(p => p.controlId));
    const untouched = matrix.filter(e => !patchIds.has(e.controlId));

    const patched = applyPatch(matrix, patch);
    const rows = patched.map(e => entryToRow(e));
    const result = rowsToEntries(rows);

    for (const orig of untouched) {
      const found = result.find(r => r.controlId === orig.controlId);
      if (!found) return false;
      if (found.responsible !== orig.responsible) return false;
      if (found.accountable !== orig.accountable) return false;

      const expectedConsulted = orig.consulted.filter(Boolean);
      const expectedInformed = orig.informed.filter(Boolean);
      if (found.consulted.length !== expectedConsulted.length) return false;
      if (found.informed.length !== expectedInformed.length) return false;
      for (let j = 0; j < expectedConsulted.length; j++) {
        if (found.consulted[j] !== expectedConsulted[j]) return false;
      }
      for (let j = 0; j < expectedInformed.length; j++) {
        if (found.informed[j] !== expectedInformed[j]) return false;
      }
    }

    return true;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Non-patched entries are preserved');

// ============================================
// Property 9e: Empty rows are filtered out during persist
// Feature: smart-seeding-quick-wins, Property 9: RACI edit round-trip
// **Validates: Requirements 4.3**
//
// Rows with empty controlId should be excluded from the persisted
// entries, matching the component's filter(r => r.controlId) logic.
// ============================================

console.log('--- Property 9e: Empty rows are filtered out during persist ---');

fc.assert(
  fc.property(arbRACIMatrix, (matrix) => {
    // Add some rows with empty controlId
    const rows = matrix.map(e => entryToRow(e));
    const emptyRows: RACIRow[] = [
      { controlId: '', responsible: 'someone', accountable: 'someone', consulted: 'a, b', informed: 'c' },
      { controlId: '', responsible: '', accountable: '', consulted: '', informed: '' },
    ];
    const allRows = [...rows, ...emptyRows];

    const entries = rowsToEntries(allRows);

    // No entry should have an empty controlId
    if (entries.some(e => !e.controlId)) return false;

    // Count should match only the non-empty rows
    return entries.length === matrix.length;
  }),
  { numRuns: 100 },
);
console.log('  ✓ Empty rows are filtered out during persist');

console.log('\n=== All RACI Matrix property tests (P9) PASSED ===');
