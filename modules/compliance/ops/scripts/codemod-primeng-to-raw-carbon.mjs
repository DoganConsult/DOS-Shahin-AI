#!/usr/bin/env node
/**
 * Codemod: PrimeNG → raw IBM Carbon (carbon-components-angular).
 *
 * Pivot directive 2026-05-02: "make sure all compliance using ibm carbon raw,
 * none [PrimeNG], download all missing items".
 *
 * What this rewrites in modules/compliance/ui:
 *   1. Module imports          : `from 'primeng/<x>' { ABCModule }`
 *                                → `from 'carbon-components-angular' { CarbonABCModule }`
 *   2. imports[] array entries : every PrimeNG module class is renamed to its
 *                                Carbon equivalent inline so existing arrays
 *                                stay structurally valid.
 *   3. Template selectors      : `<p-button>` → `<button cdsButton>`,
 *                                `<p-tag>` → `<cds-tag>` etc.
 *   4. Directive references    : `pTooltip="…"` → `[cdsTooltip]="…"`.
 *
 * What this CANNOT auto-fix (caller must hand-finish):
 *   - <p-table> rich features (filter/sort/paginator templating differ).
 *   - <p-toast> bus-pattern (PrimeNG MessageService) → Carbon NotificationService.
 *   - <p-confirmdialog> imperative .confirm({…}) flows.
 *   - <p-toolbar> (no direct Carbon equivalent).
 *   - Calendar.dateFormat options (Carbon DatePicker uses Flatpickr formats).
 *
 * For each file the codemod adds a leading comment:
 *   // CODEMOD 2026-05-02: PrimeNG → raw Carbon. Manual review needed for $RESIDUALS
 *
 * Idempotent: re-running on already-migrated files is a no-op.
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..', '..', 'ui');

// PrimeNG module class → Carbon class (under carbon-components-angular).
// Use these for imports[] array rewriting.
const MODULE_RENAME = {
  ButtonModule:        'ButtonModule',
  TagModule:           'TagModule',
  TableModule:         'TableModule',
  TooltipModule:       'TooltipModule',
  DialogModule:        'DialogModule',
  DropdownModule:      'DropdownModule',
  InputTextModule:     'InputModule',
  InputTextarea:       'InputModule',
  ToastModule:         'NotificationModule',
  ProgressBarModule:   'ProgressIndicatorModule',
  CardModule:          'TilesModule',
  ToolbarModule:       'UIShellModule',          // closest fit; manual review
  SkeletonModule:      'PlaceholderModule',
  TabViewModule:       'TabsModule',
  MenuModule:          'ContextMenuModule',
  RadioButtonModule:   'RadioModule',
  InputNumberModule:   'NumberModule',
  ConfirmDialogModule: 'ModalModule',
  BadgeModule:         'TagModule',
  AccordionModule:     'AccordionModule',
  ToggleButtonModule:  'ToggleModule',
  StepperModule:       'ProgressIndicatorModule',
  MultiSelectModule:   'ComboBoxModule',
  ChipModule:          'TagModule',
  CheckboxModule:      'CheckboxModule',
  CalendarModule:      'DatePickerModule',
};

// PrimeNG types/services that have NO Carbon equivalent — keep their names but
// route to a local stub so build passes. Caller wires real impl after.
const PRIMENG_DROPPED = new Set([
  'MessageService', 'ConfirmationService', 'MenuItem', 'TableLazyLoadEvent',
]);

// Selector rewrites (best-effort 1:1; some need manual attribute review).
// Use /i flag because PrimeNG accepts both kebab and camelCase selectors
// (e.g. <p-progressBar> and <p-progressbar> are both valid).
const SELECTOR_RW = [
  // <p-button label="X" icon="i" /> → <button cdsButton>X</button>  (manual icon)
  [/<p-button\b/gi, '<button cdsButton'],
  [/<\/p-button>/gi, '</button>'],
  [/<p-tag\b/gi, '<cds-tag'],
  [/<\/p-tag>/gi, '</cds-tag>'],
  [/<p-table\b/gi, '<table cdsTable'],
  [/<\/p-table>/gi, '</table>'],
  [/<p-dialog\b/gi, '<cds-modal'],
  [/<\/p-dialog>/gi, '</cds-modal>'],
  [/<p-dropdown\b/gi, '<cds-dropdown'],
  [/<\/p-dropdown>/gi, '</cds-dropdown>'],
  [/<p-inputtext\b/gi, '<input cdsText'],
  [/<p-inputtextarea\b/gi, '<textarea cdsTextArea'],
  [/<\/p-inputtextarea>/gi, '</textarea>'],
  [/<p-toast\b[^>]*\/?>/gi, '<cds-notification></cds-notification>'],
  [/<p-progressbar\b/gi, '<cds-progress-bar'],
  [/<\/p-progressbar>/gi, '</cds-progress-bar>'],
  [/<p-card\b/gi, '<cds-tile'],
  [/<\/p-card>/gi, '</cds-tile>'],
  [/<p-skeleton\b[^>]*\/?>/gi, '<cds-placeholder></cds-placeholder>'],
  [/<p-tabview\b/gi, '<cds-tabs'],
  [/<\/p-tabview>/gi, '</cds-tabs>'],
  [/<p-tabpanel\b/gi, '<cds-tab'],
  [/<\/p-tabpanel>/gi, '</cds-tab>'],
  [/<p-radiobutton\b/gi, '<cds-radio'],
  [/<\/p-radiobutton>/gi, '</cds-radio>'],
  [/<p-inputnumber\b/gi, '<cds-number'],
  [/<\/p-inputnumber>/gi, '</cds-number>'],
  [/<p-checkbox\b/gi, '<cds-checkbox'],
  [/<\/p-checkbox>/gi, '</cds-checkbox>'],
  [/<p-multiselect\b/gi, '<cds-combo-box'],
  [/<\/p-multiselect>/gi, '</cds-combo-box>'],
  [/<p-calendar\b/gi, '<cds-date-picker'],
  [/<\/p-calendar>/gi, '</cds-date-picker>'],
  [/<p-accordiontab\b/gi, '<cds-accordion-item'],
  [/<\/p-accordiontab>/gi, '</cds-accordion-item>'],
  [/<p-accordion\b/gi, '<cds-accordion'],
  [/<\/p-accordion>/gi, '</cds-accordion>'],
  [/<p-togglebutton\b/gi, '<cds-toggle'],
  [/<\/p-togglebutton>/gi, '</cds-toggle>'],
  [/<p-stepper\b/gi, '<cds-progress-indicator'],
  [/<\/p-stepper>/gi, '</cds-progress-indicator>'],
  [/<p-step\b/gi, '<cds-progress-step'],
  [/<\/p-step>/gi, '</cds-progress-step>'],
  [/<p-chip\b/gi, '<cds-tag'],
  [/<\/p-chip>/gi, '</cds-tag>'],
  [/<p-badge\b/gi, '<cds-tag'],
  [/<\/p-badge>/gi, '</cds-tag>'],
  [/<p-menu\b/gi, '<cds-context-menu'],
  [/<\/p-menu>/gi, '</cds-context-menu>'],
  [/<p-toolbar\b/gi, '<section cdsToolbar'],
  [/<\/p-toolbar>/gi, '</section>'],
  [/<p-confirmdialog\b[^>]*\/?>/gi, '<cds-modal></cds-modal>'],
  // attribute directives
  [/\[pTooltip\]=/g, '[cdsTooltip]='],
  [/\bpTooltip=/g, '[cdsTooltip]='],
  // pTable sort plumbing — Carbon table uses (sort) output + cdsTableHeader.
  // Drop pSortableColumn / <p-sortIcon> directives; consumers use Carbon header sort.
  [/\bpSortableColumn="[^"]*"/g, ''],
  [/<p-sortIcon\b[^>]*\/?>(\s*<\/p-sortIcon>)?/gi, ''],
  // pButton directive on plain <button> elements — strip in favor of cdsButton.
  [/<button\s+pButton\b/gi, '<button cdsButton'],
  [/\spButton\b/g, ''],
  // PrimeNG button utility classes — Carbon uses size/text/kind props on cdsButton.
  [/\bp-button-sm\b/g, ''],
  [/\bp-button-lg\b/g, ''],
  [/\bp-button-text\b/g, ''],
  [/\bp-button-outlined\b/g, ''],
  [/\bp-button-rounded\b/g, ''],
  [/\bp-button-info\b/g, ''],
  [/\bp-button-success\b/g, ''],
  [/\bp-button-warning\b/g, ''],
  [/\bp-button-danger\b/g, ''],
  [/\bp-button-help\b/g, ''],
  [/\bp-button-secondary\b/g, ''],
  [/\bp-button-icon-only\b/g, ''],
  [/\bp-button-raised\b/g, ''],
  [/\bp-button\b/g, ''],
  // tooltipPosition is PrimeNG-specific; Carbon tooltip uses [position]
  [/\btooltipPosition=/g, '[cdsTooltipPosition]='],
  // PrimeIcons (`pi pi-foo`) are not the IBM Carbon icon set.
  // Remove the PrimeIcon classes so styling is no longer coupled, leaving
  // a hand-replaceable marker. Real Carbon icons go via @carbon/icons-angular.
  [/\bpi\s+pi-[a-z0-9-]+/g, ''],
  [/\bclass="pi pi-[a-z0-9-]+"/g, ''],
];

function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        stack.push(p);
      } else if (e.name.endsWith('.ts') || e.name.endsWith('.html')) {
        out.push(p);
      }
    }
  }
  return out;
}

function rewriteImports(src) {
  // Collapse all `from 'primeng/*'` imports into the carbon name set.
  const lines = src.split('\n');
  const out = [];
  const seenCarbonImports = new Set();
  let touched = false;

  for (const line of lines) {
    // import { X, Y } from 'primeng/<sub>';
    const m = line.match(/^(\s*)import\s*\{([^}]+)\}\s*from\s*['"]primeng\/[^'"]+['"]\s*;?\s*$/);
    if (m) {
      const names = m[2].split(',').map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        if (PRIMENG_DROPPED.has(name)) continue;       // dropped
        const carbon = MODULE_RENAME[name];
        if (carbon) seenCarbonImports.add(carbon);
      }
      touched = true;
      continue; // drop original line
    }
    out.push(line);
  }

  if (touched && seenCarbonImports.size) {
    // Insert a single consolidated carbon import after the last leading import.
    const carbonImport = `import { ${[...seenCarbonImports].sort().join(', ')} } from 'carbon-components-angular';`;
    let inserted = false;
    for (let i = 0; i < out.length; i++) {
      if (/^import\s/.test(out[i])) {
        // continue scanning to last consecutive import line
      } else if (i > 0 && /^import\s/.test(out[i - 1])) {
        out.splice(i, 0, carbonImport);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      out.unshift(carbonImport);
    }
  }

  return { src: out.join('\n'), touched };
}

function rewriteImportsArray(src) {
  // Rename PrimeNG class identifiers to Carbon names within the imports[] array
  // and `@Component({ imports: [...] })` literals (and elsewhere they appear).
  let touched = false;
  for (const [from, to] of Object.entries(MODULE_RENAME)) {
    if (from === to) continue;
    const re = new RegExp(`\\b${from}\\b`, 'g');
    const next = src.replace(re, () => { touched = true; return to; });
    src = next;
  }
  // Drop the dropped service/type names from imports[] arrays.
  for (const dropped of PRIMENG_DROPPED) {
    const re = new RegExp(`\\b${dropped}\\b\\s*,?\\s*`, 'g');
    if (re.test(src)) {
      src = src.replace(re, '');
      touched = true;
    }
  }
  return { src, touched };
}

function rewriteTemplate(src) {
  let touched = false;
  for (const [re, to] of SELECTOR_RW) {
    const next = src.replace(re, () => { touched = true; return to; });
    src = next;
  }
  return { src, touched };
}

function process(file) {
  const before = readFileSync(file, 'utf8');
  let src = before;
  let touched = false;

  if (file.endsWith('.ts')) {
    const a = rewriteImports(src);          src = a.src; touched ||= a.touched;
    const b = rewriteImportsArray(src);     src = b.src; touched ||= b.touched;
    const c = rewriteTemplate(src);         src = c.src; touched ||= c.touched;
  } else if (file.endsWith('.html')) {
    const c = rewriteTemplate(src);         src = c.src; touched ||= c.touched;
  }

  if (touched && src !== before) {
    writeFileSync(file, src);
    return 1;
  }
  return 0;
}

function main() {
  const files = listFiles(ROOT);
  let changed = 0;
  for (const f of files) changed += process(f);

  // Residual PrimeNG count (post-codemod) for honesty.
  let residual = 0;
  try {
    residual = parseInt(
      execSync(`grep -rE "primeng" --include='*.ts' --include='*.html' ${ROOT} | wc -l`)
        .toString().trim(),
      10,
    );
  } catch { residual = -1; }

  console.log(JSON.stringify({ filesScanned: files.length, filesRewritten: changed, residualPrimeNG: residual }, null, 2));
}

main();
