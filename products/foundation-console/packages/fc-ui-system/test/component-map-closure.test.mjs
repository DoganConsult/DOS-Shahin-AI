// F7 Component Map Closure Test
// Doctrine asserts:
//   1. Every approved componentKey is present in FC_DEFAULT_COMPONENT_MAP.
//   2. Every mapped value is a real component constructor (not a placeholder).
//   3. No mapped class name contains "Placeholder" (zero placeholder rule).
//   4. DosSurfaceRendererComponent resolves a known key from the map to a constructor,
//      and an unknown key resolves to null (diagnostic state).
//
// Run: node test/component-map-closure.test.mjs
import '@angular/compiler';
import assert from 'node:assert/strict';

const mod = await import('../dist/index.js');
const { FC_APPROVED_COMPONENT_KEYS, FC_DEFAULT_COMPONENT_MAP } = mod;

assert.ok(Array.isArray(FC_APPROVED_COMPONENT_KEYS), 'FC_APPROVED_COMPONENT_KEYS is an array');
assert.ok(FC_DEFAULT_COMPONENT_MAP instanceof Map, 'FC_DEFAULT_COMPONENT_MAP is a Map');

const failures = [];
for (const key of FC_APPROVED_COMPONENT_KEYS) {
  const cmp = FC_DEFAULT_COMPONENT_MAP.get(key);
  if (!cmp) { failures.push(`missing: ${key}`); continue; }
  if (typeof cmp !== 'function') { failures.push(`not a constructor: ${key}`); continue; }
  if (/placeholder/i.test(cmp.name)) { failures.push(`placeholder naming: ${key} -> ${cmp.name}`); continue; }
}

if (failures.length) {
  console.error('F7 closure FAIL:'); failures.forEach((f) => console.error('  ' + f));
  process.exit(1);
}

// Renderer resolution simulation (mirrors DosSurfaceRendererComponent.resolved logic).
function resolve(map, surface) { return map.get(surface.componentKey) ?? null; }
const known   = resolve(FC_DEFAULT_COMPONENT_MAP, { componentKey: 'workspace.shell',   surfaceId: 's1', zone: 'main', props: {} });
const unknown = resolve(FC_DEFAULT_COMPONENT_MAP, { componentKey: 'workspace.unknown', surfaceId: 's2', zone: 'main', props: {} });
assert.equal(typeof known, 'function', 'known componentKey resolves to constructor');
assert.equal(unknown, null, 'unknown componentKey resolves to null (diagnostic)');

// Doctrine: closure size matches approved set (no silent extras unbound to approved keys).
for (const k of FC_DEFAULT_COMPONENT_MAP.keys()) {
  if (!FC_APPROVED_COMPONENT_KEYS.includes(k)) failures.push(`extra unapproved key: ${k}`);
}
if (failures.length) { console.error('F7 closure FAIL (extras):'); failures.forEach((f) => console.error('  ' + f)); process.exit(1); }

const summary = {
  approvedKeys: FC_APPROVED_COMPONENT_KEYS.length,
  mappedKeys: FC_DEFAULT_COMPONENT_MAP.size,
  components: Array.from(FC_DEFAULT_COMPONENT_MAP.entries()).map(([k, c]) => ({ key: k, ctor: c.name })),
  knownResolves: known.name,
  unknownResolves: unknown,
};
console.log('F7 closure GREEN');
console.log(JSON.stringify(summary, null, 2));
