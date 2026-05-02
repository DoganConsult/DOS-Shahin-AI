#!/usr/bin/env node
/**
 * dynamic-ui-registry.mjs — Phase 2 codegen
 *
 * Reads platform/dynamic-ui/contracts/registry.yaml and emits TypeScript
 * fragments suitable for inclusion in:
 *   - widget-key-map.ts  (WIDGET_KEY_MAP)
 *   - component-map.ts   (COMPONENT_MAP)
 *
 * Default behaviour: prints fragments to stdout for review.
 * With --write: emits two files at platform/dynamic-ui/contracts/.generated/
 * for diffing against the live SPA registries (the coverage gate compares
 * the YAML rows against the live files; full TS-overwrite is gated until
 * all modules have migrated).
 *
 * Intentionally bare-metal: no YAML library dependency; uses a small
 * loader sufficient for the schema we control. Keeps the codegen runnable
 * in any CI environment without npm install.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

const REGISTRY = 'platform/dynamic-ui/contracts/registry.yaml';
const OUT_DIR = 'platform/dynamic-ui/contracts/.generated';

// ─── Minimal YAML loader (handles only the schema this file uses) ─────────
function parseYaml(src) {
  const lines = src.split('\n');
  const out = {};
  const stack = [{ obj: out, indent: -1 }];

  let currentList = null;
  let currentListIndent = null;

  function setOnTop(key, value) {
    const top = stack[stack.length - 1].obj;
    top[key] = value;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.replace(/#.*$/, '').trimEnd();
    if (!stripped.trim()) continue;

    const indent = raw.match(/^\s*/)[0].length;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();

    if (currentList && indent <= currentListIndent) {
      currentList = null;
      currentListIndent = null;
    }

    const listMatch = stripped.match(/^(\s*)-\s*(.*)$/);
    if (listMatch && currentList) {
      const itemBody = listMatch[2];
      const obj = {};
      currentList.push(obj);
      const inlineKv = itemBody.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
      if (inlineKv) obj[inlineKv[1]] = parseScalar(inlineKv[2]);
      stack.push({ obj, indent });
      continue;
    }

    const kv = stripped.match(/^(\s*)([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const [, , key, val] = kv;

    if (val === '') {
      // Could be an object or a list (inspect next semantically-non-blank line,
      // skipping over comments and pure whitespace).
      let nextIdx = i + 1;
      while (
        nextIdx < lines.length &&
        !lines[nextIdx].replace(/#.*$/, '').trim()
      ) nextIdx++;
      if (nextIdx < lines.length && /^\s*-\s/.test(lines[nextIdx])) {
        const arr = [];
        setOnTop(key, arr);
        currentList = arr;
        currentListIndent = indent;
      } else {
        const obj = {};
        setOnTop(key, obj);
        stack.push({ obj, indent });
      }
    } else {
      setOnTop(key, parseScalar(val));
    }
  }
  return out;
}
function parseScalar(s) {
  const t = s.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === '~') return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

// ─── Render TS fragments ──────────────────────────────────────────────────
function renderWidgetEntries(widgets) {
  const lines = [];
  for (const w of widgets) {
    lines.push(
      `  '${w.key}': () => import('${w.import_path}').then(m => m.${w.export_name} as unknown as Type<unknown>),`,
    );
  }
  return lines.join('\n');
}
function renderComponentEntries(components) {
  const lines = [];
  for (const c of components) {
    lines.push(
      `  '${c.key}': () => import('${c.import_path}').then(m => m.${c.export_name}),`,
    );
  }
  return lines.join('\n');
}

// ─── Run ──────────────────────────────────────────────────────────────────
const data = parseYaml(readFileSync(REGISTRY, 'utf8'));
const widgets = data.widgets ?? [];
const components = data.components ?? [];

const writeMode = process.argv.includes('--write');

const widgetFragment =
  '// AUTO-GENERATED from platform/dynamic-ui/contracts/registry.yaml — do not hand-edit.\n' +
  '// Regenerate with: pnpm dynamic-ui:codegen --write\n\n' +
  `import type { Type } from '@angular/core';\n\n` +
  `export const YAML_WIDGET_KEY_MAP_FRAGMENT: Record<string, () => Promise<Type<unknown>>> = {\n` +
  renderWidgetEntries(widgets) + '\n};\n';

const componentFragment =
  '// AUTO-GENERATED from platform/dynamic-ui/contracts/registry.yaml — do not hand-edit.\n' +
  '// Regenerate with: pnpm dynamic-ui:codegen --write\n\n' +
  `export const YAML_COMPONENT_MAP_FRAGMENT: Record<string, () => Promise<unknown>> = {\n` +
  renderComponentEntries(components) + '\n};\n';

if (writeMode) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'widget-key-map.fragment.ts'), widgetFragment);
  writeFileSync(join(OUT_DIR, 'component-map.fragment.ts'), componentFragment);
  console.log(`[codegen] wrote ${join(OUT_DIR, 'widget-key-map.fragment.ts')} (${widgets.length} widgets)`);
  console.log(`[codegen] wrote ${join(OUT_DIR, 'component-map.fragment.ts')} (${components.length} components)`);
} else {
  console.log('// ─── widget-key-map.fragment.ts ──────────────────────────');
  console.log(widgetFragment);
  console.log('// ─── component-map.fragment.ts ──────────────────────────');
  console.log(componentFragment);
}
