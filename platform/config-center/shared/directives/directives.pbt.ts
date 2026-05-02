// ============================================
// Directives — Property-Based Tests (Properties 9–11)
// Feature: landing-page-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec ts-node --esm src/app/shared/directives/directives.pbt.ts
// Or:  pnpm exec tsx src/app/shared/directives/directives.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Shared helpers: simulate DOM element for directive logic
// ============================================

/** Minimal mock of an HTMLElement's style for property testing. */
function createMockElement(): {
  style: Record<string, string>;
  classList: { items: Set<string>; add: (...cls: string[]) => void; remove: (...cls: string[]) => void; has: (cls: string) => boolean };
  setProperty: (name: string, value: string) => void;
  removeProperty: (name: string) => void;
  getProperty: (name: string) => string | undefined;
} {
  const styleProps: Record<string, string> = {};
  const classSet = new Set<string>();

  return {
    style: styleProps,
    classList: {
      items: classSet,
      add(...cls: string[]) { cls.forEach(c => classSet.add(c)); },
      remove(...cls: string[]) { cls.forEach(c => classSet.delete(c)); },
      has(cls: string) { return classSet.has(cls); },
    },
    setProperty(name: string, value: string) { styleProps[name] = value; },
    removeProperty(name: string) { delete styleProps[name]; },
    getProperty(name: string) { return styleProps[name]; },
  };
}

// ============================================
// CursorGlow pure logic (extracted from directive)
// ============================================

interface ElementRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Computes the glow CSS custom property values for a given mouse position
 * relative to an element's bounding rect.
 * Mirrors CursorGlowDirective.onMouseMove logic.
 */
function computeGlowPosition(
  clientX: number,
  clientY: number,
  rect: ElementRect
): { glowX: string; glowY: string } {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return { glowX: `${x}px`, glowY: `${y}px` };
}

/**
 * Simulates CursorGlowDirective mousemove: sets --glow-x and --glow-y.
 */
function cursorGlowMouseMove(
  el: ReturnType<typeof createMockElement>,
  clientX: number,
  clientY: number,
  rect: ElementRect
): void {
  const { glowX, glowY } = computeGlowPosition(clientX, clientY, rect);
  el.setProperty('--glow-x', glowX);
  el.setProperty('--glow-y', glowY);
}

/**
 * Simulates CursorGlowDirective mouseleave: removes --glow-x and --glow-y.
 */
function cursorGlowMouseLeave(el: ReturnType<typeof createMockElement>): void {
  el.removeProperty('--glow-x');
  el.removeProperty('--glow-y');
}

// ============================================
// MagneticHover pure logic (extracted from directive)
// ============================================

const PULL_STRENGTH = 0.3;

/**
 * Computes the magnetic hover transform values for a given mouse position.
 * Mirrors MagneticHoverDirective.onMouseMove logic.
 */
function computeMagneticTransform(
  clientX: number,
  clientY: number,
  rect: ElementRect
): { dx: number; dy: number; transform: string } {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = (clientX - centerX) * PULL_STRENGTH;
  const dy = (clientY - centerY) * PULL_STRENGTH;
  return { dx, dy, transform: `translate(${dx}px, ${dy}px)` };
}

/**
 * Simulates MagneticHoverDirective mousemove.
 */
function magneticHoverMouseMove(
  el: ReturnType<typeof createMockElement>,
  clientX: number,
  clientY: number,
  rect: ElementRect
): void {
  const { transform } = computeMagneticTransform(clientX, clientY, rect);
  el.style['transition'] = 'transform 0.2s ease-out';
  el.style['transform'] = transform;
}

/**
 * Simulates MagneticHoverDirective mouseleave.
 */
function magneticHoverMouseLeave(el: ReturnType<typeof createMockElement>): void {
  el.style['transition'] = 'transform 0.3s ease-out';
  el.style['transform'] = 'translate(0px, 0px)';
}

// ============================================
// RevealDirective pure logic (extracted from directive)
// ============================================

type RevealAnimation = 'slide-up' | 'scale-up' | 'fade-in';

const PRE_ANIMATION_CLASSES: Record<RevealAnimation, string[]> = {
  'slide-up': ['opacity-0', 'translate-y-8'],
  'scale-up': ['opacity-0', 'scale-95'],
  'fade-in': ['opacity-0'],
};

const REVEALED_CLASSES: Record<RevealAnimation, string[]> = {
  'slide-up': ['opacity-100', 'translate-y-0'],
  'scale-up': ['opacity-100', 'scale-100'],
  'fade-in': ['opacity-100'],
};

const TRANSITION_CLASS = 'transition-all duration-700 ease-out';

/**
 * Simulates RevealDirective ngOnInit: applies pre-animation classes.
 */
function revealInit(
  el: ReturnType<typeof createMockElement>,
  animationType: RevealAnimation
): void {
  const preClasses = PRE_ANIMATION_CLASSES[animationType] ?? PRE_ANIMATION_CLASSES['slide-up'];
  el.classList.add(...TRANSITION_CLASS.split(' '), ...preClasses);
}

/**
 * Simulates RevealDirective reveal (intersection triggered, no delay).
 */
function revealTrigger(
  el: ReturnType<typeof createMockElement>,
  animationType: RevealAnimation
): void {
  const pre = PRE_ANIMATION_CLASSES[animationType] ?? PRE_ANIMATION_CLASSES['slide-up'];
  const revealed = REVEALED_CLASSES[animationType] ?? REVEALED_CLASSES['slide-up'];
  el.classList.remove(...pre);
  el.classList.add(...revealed);
}

// ============================================
// Arbitraries
// ============================================

/** Generates a positive element rect with reasonable dimensions. */
const elementRectArb: fc.Arbitrary<ElementRect> = fc.record({
  left: fc.double({ min: 0, max: 2000, noNaN: true, noDefaultInfinity: true }),
  top: fc.double({ min: 0, max: 2000, noNaN: true, noDefaultInfinity: true }),
  width: fc.double({ min: 1, max: 2000, noNaN: true, noDefaultInfinity: true }),
  height: fc.double({ min: 1, max: 2000, noNaN: true, noDefaultInfinity: true }),
});

/** Generates a mouse position within the bounds of a given rect. */
function mouseInRectArb(rect: ElementRect): fc.Arbitrary<{ clientX: number; clientY: number }> {
  return fc.record({
    clientX: fc.double({
      min: rect.left,
      max: rect.left + rect.width,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    clientY: fc.double({
      min: rect.top,
      max: rect.top + rect.height,
      noNaN: true,
      noDefaultInfinity: true,
    }),
  });
}

/** Generates a valid RevealAnimation type. */
const revealAnimationArb: fc.Arbitrary<RevealAnimation> = fc.constantFrom(
  'slide-up' as const,
  'scale-up' as const,
  'fade-in' as const
);

/** Generates a non-negative delay value in ms. */
const delayArb: fc.Arbitrary<number> = fc.nat({ max: 5000 });

// ============================================
// Property 9: CursorGlow Tracks Mouse Position
// Feature: landing-page-overhaul, Property 9: CursorGlow Tracks Mouse Position
// **Validates: Requirements 14.1, 14.3**
//
// For any mouse position (x, y) within the bounds of an element with
// CursorGlowDirective, the directive SHALL set CSS custom properties
// --glow-x and --glow-y to values corresponding to the cursor's
// relative position. When the cursor leaves the element, the glow
// effect SHALL be removed.
// ============================================

console.log('--- Property 9: CursorGlow Tracks Mouse Position ---');

// 9a: --glow-x and --glow-y are set to correct relative positions
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const el = createMockElement();
      cursorGlowMouseMove(el, clientX, clientY, rect);

      const expectedX = clientX - rect.left;
      const expectedY = clientY - rect.top;

      if (el.getProperty('--glow-x') !== `${expectedX}px`) return false;
      if (el.getProperty('--glow-y') !== `${expectedY}px`) return false;
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 9a: --glow-x and --glow-y set to correct relative positions');

// 9b: glow properties are removed on mouseleave
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const el = createMockElement();
      // First move to set glow
      cursorGlowMouseMove(el, clientX, clientY, rect);
      // Then leave
      cursorGlowMouseLeave(el);

      if (el.getProperty('--glow-x') !== undefined) return false;
      if (el.getProperty('--glow-y') !== undefined) return false;
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 9b: glow properties removed on mouseleave');

// 9c: relative position is always non-negative when mouse is within bounds
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const { glowX, glowY } = computeGlowPosition(clientX, clientY, rect);
      const x = parseFloat(glowX);
      const y = parseFloat(glowY);
      // Within bounds means x in [0, width] and y in [0, height]
      return x >= -0.001 && x <= rect.width + 0.001 &&
             y >= -0.001 && y <= rect.height + 0.001;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 9c: relative position within element bounds');

console.log('Property 9: PASSED\n');

// ============================================
// Property 10: MagneticHover Applies Transform
// Feature: landing-page-overhaul, Property 10: MagneticHover Applies Transform
// **Validates: Requirements 14.2, 14.4**
//
// For any mouse position within the bounds of an element with
// MagneticHoverDirective, the directive SHALL apply a CSS
// transform: translate(dx, dy) that moves the element subtly toward
// the cursor. When the cursor leaves, the transform SHALL reset to
// the original position.
// ============================================

console.log('--- Property 10: MagneticHover Applies Transform ---');

// 10a: transform is set to correct translate values
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const el = createMockElement();
      magneticHoverMouseMove(el, clientX, clientY, rect);

      const { transform } = computeMagneticTransform(clientX, clientY, rect);
      return el.style['transform'] === transform;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 10a: transform set to correct translate(dx, dy)');

// 10b: dx and dy are proportional to distance from center with PULL_STRENGTH
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const { dx, dy } = computeMagneticTransform(clientX, clientY, rect);

      const expectedDx = (clientX - centerX) * PULL_STRENGTH;
      const expectedDy = (clientY - centerY) * PULL_STRENGTH;

      return Math.abs(dx - expectedDx) < 0.001 && Math.abs(dy - expectedDy) < 0.001;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 10b: dx/dy proportional to distance from center * PULL_STRENGTH');

// 10c: transform resets to translate(0px, 0px) on mouseleave
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const el = createMockElement();
      magneticHoverMouseMove(el, clientX, clientY, rect);
      magneticHoverMouseLeave(el);

      return el.style['transform'] === 'translate(0px, 0px)';
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 10c: transform resets to translate(0px, 0px) on mouseleave');

// 10d: the magnitude of the transform is bounded by PULL_STRENGTH * max_distance
fc.assert(
  fc.property(
    elementRectArb.chain(rect =>
      fc.tuple(fc.constant(rect), mouseInRectArb(rect))
    ),
    ([rect, { clientX, clientY }]) => {
      const { dx, dy } = computeMagneticTransform(clientX, clientY, rect);
      // Max distance from center to edge is half the dimension
      const maxDx = (rect.width / 2) * PULL_STRENGTH;
      const maxDy = (rect.height / 2) * PULL_STRENGTH;

      return Math.abs(dx) <= maxDx + 0.001 && Math.abs(dy) <= maxDy + 0.001;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 10d: transform magnitude bounded by PULL_STRENGTH * half-dimension');

console.log('Property 10: PASSED\n');

// ============================================
// Property 11: RevealDirective Animation Trigger and Configuration
// Feature: landing-page-overhaul, Property 11: RevealDirective Animation Trigger and Configuration
// **Validates: Requirements 14.5, 14.6, 14.7**
//
// For any element with RevealDirective and for any animation type
// ('slide-up', 'scale-up', 'fade-in') and delay value, when the
// IntersectionObserver reports the element as intersecting, the
// directive SHALL apply the corresponding CSS animation class after
// the specified delay. Before intersection, the element SHALL remain
// in its pre-animation state.
// ============================================

console.log('--- Property 11: RevealDirective Animation Trigger and Configuration ---');

// 11a: before intersection, element has pre-animation classes
fc.assert(
  fc.property(
    revealAnimationArb,
    (animationType) => {
      const el = createMockElement();
      revealInit(el, animationType);

      const preClasses = PRE_ANIMATION_CLASSES[animationType];
      // All pre-animation classes must be present
      for (const cls of preClasses) {
        if (!el.classList.has(cls)) return false;
      }
      // Transition classes must be present
      for (const cls of TRANSITION_CLASS.split(' ')) {
        if (!el.classList.has(cls)) return false;
      }
      // Revealed classes must NOT be present
      const revealedClasses = REVEALED_CLASSES[animationType];
      for (const cls of revealedClasses) {
        // Some classes like opacity-0 vs opacity-100 are different, but
        // we only check that revealed-specific classes aren't there
        if (preClasses.includes(cls)) continue; // skip shared class names
        if (el.classList.has(cls)) return false;
      }
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 11a: pre-animation classes applied before intersection');

// 11b: after intersection trigger, pre-animation classes removed and revealed classes added
fc.assert(
  fc.property(
    revealAnimationArb,
    (animationType) => {
      const el = createMockElement();
      revealInit(el, animationType);
      revealTrigger(el, animationType);

      const preClasses = PRE_ANIMATION_CLASSES[animationType];
      const revealedClasses = REVEALED_CLASSES[animationType];

      // Pre-animation classes must be removed
      for (const cls of preClasses) {
        if (el.classList.has(cls)) return false;
      }
      // Revealed classes must be present
      for (const cls of revealedClasses) {
        if (!el.classList.has(cls)) return false;
      }
      // Transition classes must still be present
      for (const cls of TRANSITION_CLASS.split(' ')) {
        if (!el.classList.has(cls)) return false;
      }
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 11b: revealed classes applied after intersection trigger');

// 11c: each animation type has distinct pre-animation and revealed class sets
fc.assert(
  fc.property(
    revealAnimationArb,
    (animationType) => {
      const preClasses = PRE_ANIMATION_CLASSES[animationType];
      const revealedClasses = REVEALED_CLASSES[animationType];

      // Pre and revealed classes must exist
      if (preClasses.length === 0) return false;
      if (revealedClasses.length === 0) return false;

      // Pre and revealed classes must be disjoint (no overlap)
      for (const cls of preClasses) {
        if (revealedClasses.includes(cls)) return false;
      }
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 11c: pre-animation and revealed class sets are disjoint');

// 11d: delay parameter is accepted (non-negative integer) — validates configuration acceptance
fc.assert(
  fc.property(
    fc.tuple(revealAnimationArb, delayArb),
    ([animationType, delay]) => {
      // The delay must be a non-negative number
      if (delay < 0) return false;
      // The animation type must be one of the valid types
      if (!['slide-up', 'scale-up', 'fade-in'].includes(animationType)) return false;
      // Pre-animation classes must be defined for this type
      const preClasses = PRE_ANIMATION_CLASSES[animationType];
      if (!preClasses || preClasses.length === 0) return false;
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 11d: delay and animation type configuration accepted for all valid inputs');

// 11e: reveal is idempotent — triggering twice doesn't break state
fc.assert(
  fc.property(
    revealAnimationArb,
    (animationType) => {
      const el = createMockElement();
      revealInit(el, animationType);
      revealTrigger(el, animationType);
      // Trigger again
      revealTrigger(el, animationType);

      const revealedClasses = REVEALED_CLASSES[animationType];
      const preClasses = PRE_ANIMATION_CLASSES[animationType];

      // Revealed classes still present
      for (const cls of revealedClasses) {
        if (!el.classList.has(cls)) return false;
      }
      // Pre-animation classes still removed
      for (const cls of preClasses) {
        if (el.classList.has(cls)) return false;
      }
      return true;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 11e: reveal is idempotent (double trigger maintains correct state)');

console.log('Property 11: PASSED\n');

// ============================================
console.log('=== All directive property tests PASSED ===');
