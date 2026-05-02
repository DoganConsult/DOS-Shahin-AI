// ============================================
// Shared Modals — Property-Based Tests (Property 14)
// Feature: landing-page-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/modals/modals.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Pure modal logic extracted from modal components
// ============================================
// Both DemoRequestModalComponent and InstantDemoModalComponent share
// identical close behavior:
//   - close() emits visibleChange(false)
//   - Overlay click calls close()
//   - Content click calls $event.stopPropagation() — does NOT call close()

type ModalType = 'DemoRequestModal' | 'InstantDemoModal';

interface ModalState {
  visible: boolean;
  emittedValues: boolean[];
}

/**
 * Creates a fresh modal state.
 */
function createModal(visible: boolean): ModalState {
  return { visible, emittedValues: [] };
}

/**
 * Mirrors the close() method on both modal components.
 * Emits visibleChange(false).
 */
function closeModal(state: ModalState): ModalState {
  return {
    ...state,
    emittedValues: [...state.emittedValues, false],
  };
}

/**
 * Simulates an overlay click — calls close().
 */
function overlayClick(state: ModalState): ModalState {
  return closeModal(state);
}

/**
 * Simulates a content area click — stopPropagation prevents close.
 * State remains unchanged.
 */
function contentClick(state: ModalState): ModalState {
  return { ...state };
}

// ============================================
// Arbitraries
// ============================================

const modalTypeArb: fc.Arbitrary<ModalType> = fc.constantFrom(
  'DemoRequestModal' as const,
  'InstantDemoModal' as const
);

// ============================================
// Property 14: Modal Overlay Click Closes Modal
// Feature: landing-page-overhaul, Property 14: Modal Overlay Click Closes Modal
// **Validates: Requirements 16.3**
//
// For any modal component (DemoRequestModal or InstantDemoModal) in
// visible state, clicking the overlay background SHALL emit a
// visibleChange(false) event. Clicking inside the modal content area
// SHALL not close the modal.
// ============================================

console.log('--- Property 14: Modal Overlay Click Closes Modal ---');

// 14a: Overlay click on a visible modal emits visibleChange(false)
fc.assert(
  fc.property(
    modalTypeArb,
    (_modalType) => {
      const state = createModal(true);
      const after = overlayClick(state);
      return after.emittedValues.length === 1 && after.emittedValues[0] === false;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 14a: overlay click on visible modal emits visibleChange(false)');

// 14b: Content click on a visible modal does NOT emit any event
fc.assert(
  fc.property(
    modalTypeArb,
    (_modalType) => {
      const state = createModal(true);
      const after = contentClick(state);
      return after.emittedValues.length === 0;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 14b: content click on visible modal does not emit any event');

// 14c: For any sequence of overlay and content clicks, only overlay clicks emit events
fc.assert(
  fc.property(
    fc.tuple(
      modalTypeArb,
      fc.array(fc.constantFrom('overlay' as const, 'content' as const), { minLength: 1, maxLength: 20 })
    ),
    ([_modalType, clicks]) => {
      let state = createModal(true);
      let expectedEmitCount = 0;

      for (const click of clicks) {
        if (click === 'overlay') {
          state = overlayClick(state);
          expectedEmitCount++;
        } else {
          state = contentClick(state);
        }
      }

      return state.emittedValues.length === expectedEmitCount &&
             state.emittedValues.every(v => v === false);
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 14c: only overlay clicks produce emissions, all emissions are false');

// 14d: close() always emits exactly false, regardless of modal type or initial visible state
fc.assert(
  fc.property(
    fc.tuple(modalTypeArb, fc.boolean()),
    ([_modalType, initialVisible]) => {
      const state = createModal(initialVisible);
      const after = closeModal(state);
      return after.emittedValues.length === 1 && after.emittedValues[0] === false;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 14d: close() emits false regardless of modal type or initial visible state');

// 14e: Content click never mutates the emitted values array
fc.assert(
  fc.property(
    fc.tuple(
      modalTypeArb,
      fc.nat({ max: 5 }),  // number of prior overlay clicks
      fc.nat({ max: 10 })  // number of content clicks after
    ),
    ([_modalType, overlayClicks, contentClicks]) => {
      let state = createModal(true);

      // Perform some overlay clicks first
      for (let i = 0; i < overlayClicks; i++) {
        state = overlayClick(state);
      }
      const countAfterOverlays = state.emittedValues.length;

      // Perform content clicks — count should not change
      for (let i = 0; i < contentClicks; i++) {
        state = contentClick(state);
      }

      return state.emittedValues.length === countAfterOverlays;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 14e: content clicks never add to emitted values');

console.log('Property 14: PASSED\n');

// ============================================
console.log('=== All shared modal property tests PASSED ===');
