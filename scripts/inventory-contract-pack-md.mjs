#!/usr/bin/env node
/**
 * MD-only inventory for module_ui_os_contract-pack/*-complete-direct-seed.md
 * Does not query DB.
 * Page matrix: resolved from §5 first; if weak/absent, §6 (e.g. config-center).
 * Summary counts use the resolved matrix (not raw §5 text only).
 * Appendix: extracts §1 identity + §2/§3/§4 supplementary + resolved page matrix rows.
 * Supplementary buckets include role→permission matrices (`role_code` + `permission_code`) vs permission catalogs (`permission_code` only).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACK = path.join(ROOT, 'platform/ui-system/module_ui_os_contract-pack');
const OUT = path.join(ROOT, 'platform/docs/phase-1-contract-pack-md-inventory.md');

const LINES_PER_PAGE = 52;

function extractSection(content, sectionNum) {
  const re = new RegExp(
    `^## ${sectionNum}\\.[^\\n]*\\r?\\n([\\s\\S]*?)(?=^## \\d)`,
    'm'
  );
  const m = content.match(re);
  return m ? m[1] : '';
}

function extractSection5(content) {
  return extractSection(content, 5);
}

function extractSection6(content) {
  return extractSection(content, 6);
}

function stripCell(c) {
  return String(c)
    .trim()
    .replace(/^`|`$/g, '')
    .trim();
}

function splitMdRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return [];
  const inner = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined);
  return inner.split('|').map(stripCell);
}

function isSeparatorRow(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return false;
  const inner = t.slice(1, t.endsWith('|') ? -1 : undefined);
  return /^[\s\-:|]+$/.test(inner.replace(/\|/g, ''));
}

/** Split § text into contiguous markdown table line blocks */
function gatherTables(sectionText) {
  const lines = sectionText.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim().startsWith('|')) {
      i++;
      continue;
    }
    const start = i;
    while (i < lines.length && lines[i].trim().startsWith('|')) i++;
    blocks.push(lines.slice(start, i));
  }
  return blocks;
}

function parseMdTable(blockLines) {
  if (!blockLines || blockLines.length < 2) return null;
  let hdrLineIdx = 0;
  let bodyStart = 1;
  if (
    blockLines.length >= 2 &&
    isSeparatorRow(blockLines[1])
  ) {
    bodyStart = 2;
  }
  const headers = splitMdRow(blockLines[hdrLineIdx]);
  if (!headers.length) return null;
  const rows = [];
  for (let j = bodyStart; j < blockLines.length; j++) {
    if (isSeparatorRow(blockLines[j])) continue;
    const cells = splitMdRow(blockLines[j]);
    if (!cells.length) continue;
    rows.push(cells);
  }
  return { headers, rows };
}

function normalizeHeader(h) {
  return stripCell(h)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()'"/]/g, '');
}

/**
 * Strength score for choosing among page-matrix candidates (§5 vs §6).
 * Tier A: numbered spine (# or col0) + page_key/page_code + route.
 * Tier B: page_code/page_key + route, no numeric spine (e.g. config-center §6).
 */
function pageMatrixStrengthScore(t) {
  if (!t || !t.rows.length) return -1;
  const hn = t.headers.map(normalizeHeader);
  const hasPageKey =
    hn.some(h => h.includes('page_key')) ||
    hn.some(h => h.includes('page_code'));
  const hasRoute =
    hn.some(h => h === 'route' || h === 'route_path' || h.includes('route_path'));
  const idxHash = columnIndex(t.headers, ['#']);
  const idxNumCol = idxHash >= 0 ? idxHash : 0;
  let numberedCount = 0;
  for (const row of t.rows) {
    const c = stripCell(row[idxNumCol] || '');
    if (/^\d+$/.test(c)) numberedCount++;
  }
  if (numberedCount > 0 && (hasPageKey || hasRoute))
    return (
      1000 +
      numberedCount +
      (hasPageKey ? 10 : 0) +
      (hasRoute ? 5 : 0)
    );
  if (hasPageKey && hasRoute) return 500 + t.rows.length;
  return -1;
}

/** Score table blocks as candidate page matrices */
function pickPageMatrixTable(tables) {
  let best = null;
  let bestScore = -1;
  for (const block of tables) {
    const t = parseMdTable(block);
    if (!t) continue;
    const s = pageMatrixStrengthScore(t);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return bestScore >= 500 ? best : null;
}

/** Fallback: Component/surface summary tables (workspace-shell style) */
function pickSurfaceBindingTable(tables) {
  let best = null;
  let bestRows = 0;
  for (const block of tables) {
    const t = parseMdTable(block);
    if (!t || t.headers.length < 2) continue;
    const hn = t.headers.map(normalizeHeader);
    const c0 = hn[0] || '';
    if (
      c0.includes('component') &&
      (hn[1].includes('key_props') ||
        hn[1].includes('props') ||
        hn.some(h => h.includes('props')))
    ) {
      if (t.rows.length > bestRows) {
        bestRows = t.rows.length;
        best = t;
      }
    }
  }
  return best;
}

function columnIndex(headers, matchers) {
  const hn = headers.map(normalizeHeader);
  for (let i = 0; i < hn.length; i++) {
    for (const m of matchers) {
      if (typeof m === 'function') {
        if (m(hn[i])) return i;
      } else if (hn[i].includes(m)) return i;
    }
  }
  return -1;
}

function buildExtractedRows(parsedTable) {
  const { headers, rows } = parsedTable;
  const idxNum =
    columnIndex(headers, ['#']) >= 0
      ? columnIndex(headers, ['#'])
      : 0;
  const idxPage = columnIndex(headers, ['page_key', 'page_code']);
  const idxRoute = columnIndex(headers, ['route_path', 'route']);
  const idxArch = columnIndex(headers, ['archetype']);
  const idxLoader = columnIndex(headers, [
    'template_export',
    'loader',
    h =>
      h.includes('template_export') ||
      (h.includes('loader') && !h.includes('permission')),
  ]);
  const idxAng = columnIndex(headers, [
    'angular_component',
    'component',
    h => h.includes('angular') && h.includes('component'),
  ]);
  const out = [];
  let synthSeq = 0;
  for (const row of rows) {
    const numCell = stripCell(row[idxNum] || '');
    const pageId =
      idxPage >= 0 ? stripCell(row[idxPage] || '') : '';
    const route =
      idxRoute >= 0 ? stripCell(row[idxRoute] || '') : '';
    let loader = '';
    if (idxLoader >= 0) loader = stripCell(row[idxLoader] || '');
    let ang = '';
    if (idxAng >= 0) ang = stripCell(row[idxAng] || '');
    const arche =
      idxArch >= 0 ? stripCell(row[idxArch] || '') : '';
    const componentOrLoader =
      ang || loader || (arche ? `(${arche})` : '');

    const numbered = /^\d+$/.test(numCell);
    const manifestRow =
      idxPage >= 0 &&
      idxRoute >= 0 &&
      pageId &&
      route &&
      !/^\.{3}$/.test(pageId); // skip ellipsis placeholder rows

    if (numbered) {
      out.push({
        row: numCell,
        page_id: pageId,
        route,
        archetype: arche,
        component_or_loader: componentOrLoader,
      });
    } else if (manifestRow) {
      synthSeq += 1;
      out.push({
        row: `(seq ${synthSeq})`,
        page_id: pageId,
        route,
        archetype: arche,
        component_or_loader: componentOrLoader,
      });
    }
  }
  return out;
}

function buildSurfaceRows(parsedTable) {
  const { headers, rows } = parsedTable;
  const hn = headers.map(normalizeHeader);
  const idxComp = hn.findIndex(h => h.includes('component'));
  if (idxComp < 0) return [];
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const name = stripCell(rows[i][idxComp] || '');
    if (!name || /^component$/i.test(name)) continue;
    out.push({ surface_component: name });
  }
  return out;
}

/** Markdown table as pipe rows (aligned columns preserved). */
function renderMarkdownTable(headers, rows) {
  const esc = c => mdEscapeCell(stripCell(String(c ?? '')));
  let md =
    '| ' + headers.map(h => esc(h)).join(' | ') + ' |\n';
  md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  for (const row of rows) {
    const cells = [...row];
    while (cells.length < headers.length) cells.push('');
    md +=
      '| ' +
      headers.map((_, i) => esc(cells[i])).join(' | ') +
      ' |\n';
  }
  return md;
}

function filterNumberedPageMatrixRows(parsedTable) {
  if (!parsedTable) return null;
  const { headers, rows } = parsedTable;
  let idxNum = columnIndex(headers, ['#']);
  if (idxNum < 0) idxNum = 0;
  const filtered = [];
  for (const row of rows) {
    const numCell = stripCell(row[idxNum] || '');
    if (/^\d+$/.test(numCell)) filtered.push(row);
  }
  return { headers, rows: filtered };
}

function hasPermissionCodeColumn(hn) {
  return hn.some(
    h =>
      h === 'permission_code' ||
      h === 'permissioncode' ||
      /^permission_?code$/i.test(h)
  );
}

function hasRoleCodeColumn(hn) {
  return hn.some(h => h.includes('role_code'));
}

/**
 * Classify markdown tables from §2 (+ §4 navigation when present).
 */
function classifySupplementaryTable(headers) {
  const hn = headers.map(normalizeHeader);
  const hasNavKey = hn.some(h => h.includes('nav_key'));
  const hasNavItem = hn.some(h => h.includes('nav_item_code'));
  const hasComponentKey = hn.some(h => h.includes('component_key'));
  const hasCarbon = hn.some(h => h.includes('carbon_key'));
  const hasModuleCode = hn.some(h => h.includes('module_code'));
  const hasProductKey = hn.some(h => h.includes('product_key'));
  const hasRoutePath = hn.some(
    h => h.includes('route_path') || h === 'route'
  );

  if (hasNavKey || hasNavItem) return 'navigation';
  if (hasComponentKey && hasRoutePath) return 'dyn_ui';
  if (
    hasModuleCode &&
    hasProductKey &&
    hn.some(h => h.includes('title_en') || h.includes('category'))
  )
    return 'module_registry';
  if (hasRoleCodeColumn(hn) && hasPermissionCodeColumn(hn))
    return 'role_bindings';
  if (hasPermissionCodeColumn(hn)) return 'permissions';
  if (hasComponentKey && hasCarbon) return 'carbon_registry';
  return null;
}

function mergeCompatibleParsedTables(arr) {
  const groups = new Map();
  for (const t of arr) {
    const sig = t.headers.map(normalizeHeader).join('\x00');
    if (!groups.has(sig))
      groups.set(sig, { headers: [...t.headers], rows: [] });
    groups.get(sig).rows.push(...t.rows);
  }
  return [...groups.values()];
}

/** Tables under ## 4. whose headers look like navigation registries. */
function gatherNavigationTablesFromSection4(content) {
  const s4 = extractSection(content, 4);
  if (!s4.trim()) return [];
  const blocks = [];
  for (const block of gatherTables(s4)) {
    const t = parseMdTable(block);
    if (!t) continue;
    const hn = t.headers.map(normalizeHeader);
    if (
      hn.some(h => h.includes('nav_key')) ||
      hn.some(h => h.includes('nav_item_code'))
    )
      blocks.push(block);
  }
  return blocks;
}

/** Tables under ## 3. whose headers look like navigation registries (config-center). */
function gatherNavigationTablesFromSection3(content) {
  const s3 = extractSection(content, 3);
  if (!s3.trim()) return [];
  const blocks = [];
  for (const block of gatherTables(s3)) {
    const t = parseMdTable(block);
    if (!t) continue;
    const hn = t.headers.map(normalizeHeader);
    if (
      hn.some(h => h.includes('nav_key')) ||
      hn.some(h => h.includes('nav_item_code'))
    )
      blocks.push(block);
  }
  return blocks;
}

function extractSupplementaryBuckets(content) {
  const blocks = [
    ...gatherTables(extractSection(content, 2)),
    ...gatherNavigationTablesFromSection3(content),
    ...gatherNavigationTablesFromSection4(content),
  ];
  const raw = {
    navigation: [],
    dyn_ui: [],
    permissions: [],
    role_bindings: [],
    module_registry: [],
    carbon_registry: [],
  };
  for (const block of blocks) {
    const t = parseMdTable(block);
    if (!t) continue;
    const kind = classifySupplementaryTable(t.headers);
    if (kind && raw[kind]) raw[kind].push(t);
  }
  return {
    navigation: mergeCompatibleParsedTables(raw.navigation),
    dyn_ui: mergeCompatibleParsedTables(raw.dyn_ui),
    permissions: mergeCompatibleParsedTables(raw.permissions),
    role_bindings: mergeCompatibleParsedTables(raw.role_bindings),
    module_registry: mergeCompatibleParsedTables(raw.module_registry),
    carbon_registry: mergeCompatibleParsedTables(raw.carbon_registry),
  };
}

function emitSupplementaryBucket(title, mergedTables) {
  if (!mergedTables.length) return '';
  let md = '';
  for (let i = 0; i < mergedTables.length; i++) {
    const t = mergedTables[i];
    const suffix =
      mergedTables.length > 1 ? ` (${i + 1}/${mergedTables.length})` : '';
    md += `#### §2 / §3 / §4 — ${title}${suffix}\n\n`;
    md += renderMarkdownTable(t.headers, t.rows);
    md += '\n';
  }
  return md;
}

function extractSection1Identity(content) {
  const block = extractSection(content, 1);
  if (!block.trim()) return { map: {}, pairs: [] };
  const identity = {};
  const pairs = [];
  for (const line of block.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    if (isSeparatorRow(line)) continue;
    const cells = splitMdRow(line);
    if (cells.length < 2) continue;
    const key = stripCell(cells[0]).replace(/^`|`$/g, '').trim();
    const val = stripCell(cells[1]).replace(/^`|`$/g, '').trim();
    if (/^field$/i.test(key) || /^-+$/i.test(key)) continue;
    identity[key] = val;
    pairs.push([key, val]);
  }
  return { map: identity, pairs };
}

function mdEscapeCell(s) {
  return String(s)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/** Avoid nested backticks breaking Markdown when §1 values contain `code`. */
function identityDisplayValue(v) {
  return mdEscapeCell(String(v).replace(/`/g, ''));
}

/** One-line summary from §1 map (for summary table cross-links). */
function formatIdentitySnippet(map) {
  const keys = [
    'module_code',
    'routeBase',
    'route_base',
    'entitlementKey',
    'entitlement_key',
    'version',
    'tier',
  ];
  const parts = [];
  for (const k of keys) {
    if (map[k]) parts.push(`${k}=\`${identityDisplayValue(map[k])}\``);
  }
  if (!parts.length && Object.keys(map).length) {
    const first = Object.entries(map).slice(0, 6);
    for (const [k, v] of first)
      parts.push(`${k}=\`${identityDisplayValue(v)}\``);
  }
  return parts.length ? parts.join(', ') : '_No §1 pipe-table identity parsed._';
}

/** Full §1 Field | Value markdown table (preserves pair order when pairs present). */
function renderIdentityFullMarkdown(identity) {
  const { map, pairs } = identity;
  let rows = pairs.length
    ? pairs.map(([k, v]) => [k, v])
    : Object.entries(map);
  if (!rows.length) return '_No §1 pipe-table identity parsed._\n';
  return renderMarkdownTable(['Field', 'Value'], rows);
}

/** Resolved page matrix: all columns; numbered rows only when # column exists, else all body rows. */
function renderResolvedPageMatrixMarkdown(pageMatrixParsed) {
  if (!pageMatrixParsed) return '';
  const filt = filterNumberedPageMatrixRows(pageMatrixParsed);
  const bodyRows =
    filt.rows.length > 0 ? filt.rows : pageMatrixParsed.rows;
  return renderMarkdownTable(pageMatrixParsed.headers, bodyRows);
}

/**
 * Counts for summary table from resolved page matrix (not raw §5 text).
 * numbered: rows where # column (if any) or column 0 matches /^\d+$/.
 * total: all body rows.
 */
function pageMatrixCountsFromParsed(parsed) {
  if (!parsed || !parsed.rows.length)
    return { numbered: 0, total: 0 };
  const idxHash = columnIndex(parsed.headers, ['#']);
  const idxNumCol = idxHash >= 0 ? idxHash : 0;
  let numbered = 0;
  for (const row of parsed.rows) {
    const c = stripCell(row[idxNumCol] || '');
    if (/^\d+$/.test(c)) numbered++;
  }
  return { numbered, total: parsed.rows.length };
}

/** Pick best page matrix from §5 and §6 slices (§6 wins when §5 has no manifest-style grid). */
function resolvePageMatrix(content) {
  const s5 = extractSection5(content);
  const s6 = extractSection6(content);
  const t5 = gatherTables(s5);
  const t6 = gatherTables(s6);
  const pm5 = pickPageMatrixTable(t5);
  const pm6 = pickPageMatrixTable(t6);
  const sc5 = pageMatrixStrengthScore(pm5);
  const sc6 = pageMatrixStrengthScore(pm6);
  if (sc6 > sc5) return { parsed: pm6, sourceSection: 6 };
  if (sc5 >= 500) return { parsed: pm5, sourceSection: 5 };
  if (sc6 >= 500) return { parsed: pm6, sourceSection: 6 };
  return { parsed: pm5 || pm6 || null, sourceSection: pm5 ? 5 : pm6 ? 6 : null };
}

function proseCount(content, re) {
  const m = content.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function extractRoutesComponents(content) {
  let routes = proseCount(
    content,
    /`dos\.dynamic_ui_routes`[^\n]*?(?:=>\s*|claims?\s+)(\d+)\s+customer-bound\s+rows/i
  );
  if (routes == null)
    routes = proseCount(
      content,
      /dynamic_ui_routes[^\n]{0,120}?(\d+)\s+(?:customer-bound\s+)?rows/i
    );

  let components = proseCount(
    content,
    /`dos\.dynamic_ui_component_registry`[^\n]*?(?:=>\s*|claims?\s+)(\d+)\s+customer-bound\s+rows/i
  );
  if (components == null)
    components = proseCount(
      content,
      /dynamic_ui_component_registry[^\n]{0,160}?(\d+)\s+(?:customer-bound\s+)?rows/i
    );

  return { routes, components };
}

function navTableRows(content) {
  const blocks = [...content.matchAll(/^###[^\n]*\n([\s\S]*?)(?=^#{2,3}\s)/gm)];
  let total = 0;
  for (const b of blocks) {
    const title = b[0].split('\n')[0];
    if (!/navigation|nav_registry|sidebar/i.test(title)) continue;
    const tbl = b[1];
    const lines = tbl.split('\n').filter(l => /^\|/.test(l));
    const body = lines.filter(
      l =>
        !/^\|[\s\-:|]+$/.test(l) &&
        !/^\|\s*#\s*\|/.test(l) &&
        !/^\|\s*route_key/i.test(l)
    );
    total += body.length;
  }
  if (total === 0) {
    const m = content.match(
      /### 2\.2[^\n]*navigation[\s\S]*?(\n(\|[^\n]+\n)+)/i
    );
    if (m) {
      const lines = m[0].split('\n').filter(l => /^\|/.test(l));
      const body = lines.filter(
        l =>
          !/^\|[\s\-:|]+$/.test(l) &&
          !/^\|\s*#\s*\|/.test(l) &&
          !/^\|\s*kind\s*\|/i.test(l)
      );
      total = body.length;
    }
  }
  return total;
}

function h2Count(content) {
  const m = content.match(/^## /gm);
  return m ? m.length : 0;
}

function renderAppendix(rows, extractedByFile) {
  let md = `
## Appendix A — Named extracts (§1 full + §2/§3/§4 supplementary + resolved page matrix)

Parsed mechanically from markdown **§1** pipe tables (\`| Field | Value |\`), **§2** supplementary tables (navigation, Dynamic UI, permissions, role bindings, module registry, carbon/component bindings), **§3** and **§4** tables that look like navigation (\`nav_key\` / \`nav_item_code\`), and the **resolved** page matrix: best-scoring table from **§5** or **§6** (config-center uses §6 when §5 is API-only).

Cells are copied from the seed MD (pipes escaped; newlines flattened). Use the authoritative \`.json\` if MD drift is suspected.

`;

  for (const r of rows) {
    const ex = extractedByFile[r.f];
    md += `### ${r.f}\n\n`;
    md += `**§1 summary:** ${formatIdentitySnippet(ex.identity.map)}\n\n`;
    md += '#### §1 — Identity (full)\n\n';
    md += renderIdentityFullMarkdown(ex.identity);
    md += '\n';

    const sup = ex.supplementary || {};
    md += emitSupplementaryBucket('Navigation registry', sup.navigation || []);
    md += emitSupplementaryBucket(
      'Dynamic UI (component_key + route_path)',
      sup.dyn_ui || []
    );
    md += emitSupplementaryBucket('Permissions', sup.permissions || []);
    md += emitSupplementaryBucket(
      'Role bindings (role_code + permission_code)',
      sup.role_bindings || []
    );
    md += emitSupplementaryBucket(
      'Module registry (module_code + product_key)',
      sup.module_registry || []
    );
    md += emitSupplementaryBucket(
      'Carbon / component registry (component_key + carbon_key)',
      sup.carbon_registry || []
    );

    const pmSrc = ex.pageMatrixSourceSection;
    md += `#### §5 / §6 — Page matrix (full columns)${pmSrc ? ` — source §${pmSrc}` : ''}\n\n`;
    if (ex.pageMatrixParsed) {
      md += renderResolvedPageMatrixMarkdown(ex.pageMatrixParsed);
      md += '\n';
    } else if (ex.surfaceRows.length) {
      const hasCarbon =
        sup.carbon_registry && sup.carbon_registry.length > 0;
      if (!hasCarbon) {
        md +=
          '_No resolved page matrix._ Shell / binding-style table (first column):\n\n';
        md += '| surface_component |\n';
        md += '|-------------------|\n';
        for (const s of ex.surfaceRows) {
          md += `| ${mdEscapeCell(s.surface_component)} |\n`;
        }
        md += '\n';
      } else {
        md +=
          '_No resolved page matrix._ Prefer **§2 / §3 / §4 — Carbon / component registry** above for shell surfaces.\n\n';
      }
    } else {
      md +=
        '_No §5/§6 page matrix table and no Component|props binding table detected._\n\n';
    }
  }

  return md;
}

function main() {
  const files = fs
    .readdirSync(PACK)
    .filter(f => f.endsWith('-complete-direct-seed.md'))
    .sort();

  const rows = [];
  const extractedByFile = {};

  for (const f of files) {
    const full = path.join(PACK, f);
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n').length;
    const { parsed: pageMatrixParsed, sourceSection: pageMatrixSrc } =
      resolvePageMatrix(content);
    const pmCounts = pageMatrixCountsFromParsed(pageMatrixParsed);
    const pmNumbered = pmCounts.numbered;
    const pmTotal = pmCounts.total;
    const { routes, components } = extractRoutesComponents(content);
    const nav = navTableRows(content);
    const h2 = h2Count(content);
    const identity = extractSection1Identity(content);
    const supplementary = extractSupplementaryBuckets(content);

    const s5 = extractSection5(content);
    const tables = gatherTables(s5);
    let pageRows = [];
    let surfaceRows = [];
    if (pageMatrixParsed) pageRows = buildExtractedRows(pageMatrixParsed);
    if (!pageRows.length) {
      const surf = pickSurfaceBindingTable(tables);
      if (surf) surfaceRows = buildSurfaceRows(surf);
    }

    extractedByFile[f] = {
      identity,
      supplementary,
      pageMatrixParsed: pageMatrixParsed || null,
      pageMatrixSourceSection: pageMatrixSrc,
      pageRows,
      surfaceRows,
    };

    let notes = '';
    if (f.includes('workspace-shell'))
      notes =
        'Shell surfaces (not tenant page matrix); §5 documents shell registry.';
    if (f.includes('config-center') && pageMatrixSrc === 6)
      notes =
        (notes ? notes + ' ' : '') +
        'Page matrix resolved from §6 (§5 is API/config tables).';
    else if (f.includes('config-center'))
      notes =
        (notes ? notes + ' ' : '') +
        '§5 often lists API/config surface; verify §6 for UI page grid.';
    if (f.includes('risk') && pmNumbered === 9)
      notes =
        (notes ? notes + ' ' : '') +
        'Doc narrative may cite 10 routes; §5 table shows 9 numbered rows.';

    rows.push({
      f,
      lines,
      estPages: Math.max(1, Math.ceil(lines / LINES_PER_PAGE)),
      h2,
      pageMatrixNumbered: pmNumbered,
      pageMatrixTotal: pmTotal,
      pageMatrixSrc: pageMatrixSrc ? `§${pageMatrixSrc}` : '—',
      navRows: nav || null,
      routes,
      components,
      notes,
    });
  }

  let md = `# Phase 1 — Contract-pack MD full inventory

**Scope:** Markdown only — \`platform/ui-system/module_ui_os_contract-pack/*-complete-direct-seed.md\` (no DB queries).

**Purpose:** Per-file size estimate, resolved page-matrix counts (§5 vs §6), navigation table rows (heuristic), documented route/component row claims where prose states counts — plus **Appendix A** with **named** §1 identity fields and resolved matrix rows (routes, page keys, components/loaders) extracted from the markdown.

## Methodology

| Column | Rule |
|--------|------|
| **md_lines** | Line count of the file |
| **est_print_pages** | \`ceil(md_lines / ${LINES_PER_PAGE})\` (~52 lines/page, rough) |
| **h2_sections** | Count of top-level \`## \` headings |
| **§5_page_matrix_rows** | Numbered spine rows in the **resolved** page matrix: best table from §5 or §6 by strength score (numbered \`#\`/col0 + \`page_code\`/\`page_key\` + \`route\`; or manifest-style \`page_code\` + \`route\` without numeric spine). Count cells where \`#\` column or column 0 matches \`/^\\d+$/\` (digit-only). |
| **page_matrix_total_rows** | All body rows in the resolved matrix (includes unnumbered manifest rows). |
| **page_matrix_src** | \`§5\`, \`§6\`, or \`—\` — which section supplied the resolved matrix. |
| **nav_table_rows_heuristic** | Under \`###\` headings whose title mentions navigation/nav_registry/sidebar, count markdown table body rows (excludes separator/header rows). Fallback: \`### 2.2\` navigation block for compliance-style seeds. |
| **routes_doc_claim** | First integer before “rows” near \`dynamic_ui_routes\`, if present |
| **components_doc_claim** | First integer before “rows” near \`dynamic_ui_component_registry\`, if present |

**Appendix A:** **§1** — full \`| Field | Value |\` table (order preserved). **§2** — supplementary markdown tables merged by identical headers into buckets: navigation (\`nav_key\` / \`nav_item_code\`), Dynamic UI (\`component_key\` + \`route_path\`), permissions (\`permission_code\` alone — catalog rows), **role bindings** (\`role_code\` + \`permission_code\` — matrix rows), module registry (\`module_code\` + \`product_key\`), carbon registry (\`component_key\` + \`carbon_key\`). **§3** / **§4** — navigation-shaped tables merged into the navigation bucket (e.g. config-center §3, foundation §4). **§5 / §6** — full markdown table from the resolved page matrix (numbered rows when \`#\` column exists; otherwise all manifest rows). Unnumbered \`page_code\`+\`route\` rows appear in extracts as \`(seq N)\`. If no matrix: **Component | props** surfaces list unless §2 carbon bucket already documents shell bindings.

**Limits:** Stubs may omit explicit route/component prose (\`—\`). Nav counts vary by seed format.

## Summary table

| md_file | md_lines | est_print_pages | h2_sections | §5_page_matrix_rows | page_matrix_total_rows | page_matrix_src | nav_table_rows_heuristic | routes_doc_claim | components_doc_claim | notes |
|---------|----------|-----------------|-------------|---------------------|------------------------|-----------------|---------------------------|------------------|----------------------|-------|
`;

  for (const r of rows) {
    md += `| ${r.f} | ${r.lines} | ${r.estPages} | ${r.h2} | ${r.pageMatrixNumbered} | ${r.pageMatrixTotal} | ${r.pageMatrixSrc} | ${r.navRows ?? '—'} | ${r.routes ?? '—'} | ${r.components ?? '—'} | ${r.notes || '—'} |\n`;
  }

  const sumPages = rows.reduce((a, r) => a + r.estPages, 0);
  const sumMatrixNumbered = rows.reduce((a, r) => a + r.pageMatrixNumbered, 0);
  const sumMatrixTotal = rows.reduce((a, r) => a + r.pageMatrixTotal, 0);

  md += `
## Totals (${files.length} files)

| Metric | Value |
|--------|-------|
| Sum of est_print_pages | ${sumPages} |
| Sum of §5_page_matrix_rows (numbered spine, resolved matrix) | ${sumMatrixNumbered} |
| Sum of page_matrix_total_rows (all body rows, resolved matrix) | ${sumMatrixTotal} |

`;

  md += renderAppendix(rows, extractedByFile);

  md += `_Generated by \`scripts/inventory-contract-pack-md.mjs\`._\n`;

  fs.writeFileSync(OUT, md);
  console.log('Wrote', OUT);
}

main();
