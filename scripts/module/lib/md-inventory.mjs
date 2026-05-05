// scripts/module/lib/md-inventory.mjs — deterministic pipe-table extraction + MD↔JSON parity.
import { readFileSync, existsSync } from 'node:fs';

/** @param {string} line */
function splitPipeRow(line) {
  const cells = line.split('|');
  if (cells.length < 2) return [];
  return cells.slice(1, -1).map(c => c.trim());
}

/** @param {string} md */
export function parseMarkdownPipeTables(md) {
  const lines = md.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) continue;
    const next = lines[i + 1];
    if (!next || !next.includes('---')) continue;
    const headerLine = line;
    const headers = splitPipeRow(headerLine).map(h =>
      h.replace(/`/g, '').trim(),
    );
    if (!headers.length || !headers.some(Boolean)) continue;
    i += 2;
    const rows = [];
    while (i < lines.length) {
      const rowLine = lines[i];
      if (!rowLine.trim().startsWith('|')) break;
      if (/^\|[\s|:-]+\|$/.test(rowLine.replace(/\s/g, ''))) {
        i++;
        continue;
      }
      const cells = splitPipeRow(rowLine);
      if (cells.length && cells.some(c => c !== '')) {
        const obj = {};
        headers.forEach((h, idx) => {
          if (!h) return;
          obj[h] = cells[idx] ?? '';
          obj[h] = obj[h].replace(/^`|`$/g, '').trim();
        });
        rows.push(obj);
      }
      i++;
    }
    tables.push({ headers, rows });
  }
  return tables;
}

function normHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Tables whose header includes permissionCode (MD §2.1 style).
 * @param {string} mdText
 */
export function extractMdPermissionCodes(mdText) {
  const tables = parseMarkdownPipeTables(mdText);
  const codes = new Set();
  for (const { headers, rows } of tables) {
    const nh = headers.map(normHeader);
    const pcIdx = nh.findIndex(x => x === 'permissioncode');
    if (pcIdx < 0) continue;
    for (const row of rows) {
      const raw = row[headers[pcIdx]];
      if (!raw) continue;
      const code = raw.replace(/^`|`$/g, '').trim();
      if (code && !code.includes('|')) codes.add(code);
    }
  }
  return codes;
}

/**
 * Tables whose header includes nav_item_code.
 * @param {string} mdText
 */
export function extractMdNavigationRows(mdText) {
  const tables = parseMarkdownPipeTables(mdText);
  const out = [];
  for (const { headers, rows } of tables) {
    const nh = headers.map(normHeader);
    const niIdx = nh.findIndex(x => x === 'nav_item_code');
    if (niIdx < 0) continue;
    const routeIdx = nh.findIndex(x => x === 'route');
    const permIdx = nh.findIndex(x => x === 'permission');
    for (const row of rows) {
      const nav_item_code = row[headers[niIdx]]?.replace(/^`|`$/g, '').trim();
      if (!nav_item_code) continue;
      out.push({
        nav_item_code,
        route:
          routeIdx >= 0
            ? row[headers[routeIdx]]?.replace(/^`|`$/g, '').trim() || null
            : null,
        permission:
          permIdx >= 0
            ? row[headers[permIdx]]?.replace(/^`|`$/g, '').trim() || null
            : null,
      });
    }
  }
  return out;
}

/**
 * @param {string} moduleCode
 * @param {string} mdPath
 * @param {object | null} contract — null if JSON missing
 */
export function compareMdToJson(moduleCode, mdPath, contract) {
  if (!existsSync(mdPath)) {
    return {
      ok: false,
      mdOnlyCodes: [],
      jsonOnlyCodes: [],
      navConflicts: [],
      navMdOnly: [],
      navJsonOnly: [],
      unparsedTableCount: 0,
      message: `MD missing: ${mdPath}`,
    };
  }
  const mdText = readFileSync(mdPath, 'utf8');
  const mdPermCodes = extractMdPermissionCodes(mdText);
  const mdNav = extractMdNavigationRows(mdText);

  const tables = parseMarkdownPipeTables(mdText);
  let classified = 0;
  for (const { headers } of tables) {
    const nh = headers.map(normHeader);
    if (nh.includes('permissioncode') || nh.includes('nav_item_code')) classified++;
  }
  const unparsedTableCount = Math.max(0, tables.length - classified);

  if (!contract) {
    return {
      ok: false,
      mdOnlyCodes: [...mdPermCodes],
      jsonOnlyCodes: [],
      navConflicts: [],
      navMdOnly: mdNav.map(r => r.nav_item_code),
      navJsonOnly: [],
      unparsedTableCount,
      message: 'JSON contract missing — markdown-only module',
    };
  }

  const jsonPermCodes = new Set((contract.permissions ?? []).map(p => p.code));
  const mdOnlyCodes = [...mdPermCodes].filter(c => !jsonPermCodes.has(c));
  const jsonOnlyCodes = [...jsonPermCodes].filter(c => !mdPermCodes.has(c));

  const jsonNavMap = new Map(
    (contract.navigation ?? []).map(n => [n.nav_item_code, n]),
  );
  const mdNavMap = new Map(mdNav.map(r => [r.nav_item_code, r]));

  const navConflicts = [];
  for (const [code, mdRow] of mdNavMap) {
    const j = jsonNavMap.get(code);
    if (!j) continue;
    if (
      (mdRow.route ?? '') !== (j.route ?? '') ||
      (mdRow.permission ?? '') !== (j.permission ?? '')
    ) {
      navConflicts.push({
        nav_item_code: code,
        md: mdRow,
        json: {
          route: j.route,
          permission: j.permission,
        },
      });
    }
  }
  const navMdOnly = [...mdNavMap.keys()].filter(k => !jsonNavMap.has(k));
  const navJsonOnly = [...jsonNavMap.keys()].filter(k => !mdNavMap.has(k));

  const hasGap =
    mdOnlyCodes.length > 0 ||
    jsonOnlyCodes.length > 0 ||
    navConflicts.length > 0 ||
    navMdOnly.length > 0 ||
    navJsonOnly.length > 0;

  return {
    ok: !hasGap && unparsedTableCount === 0,
    mdOnlyCodes,
    jsonOnlyCodes,
    navConflicts,
    navMdOnly,
    navJsonOnly,
    unparsedTableCount,
    message: hasGap
      ? 'MD↔JSON parity gaps detected'
      : unparsedTableCount
        ? `${unparsedTableCount} pipe table(s) not classified (no permissionCode / nav_item_code headers)`
        : 'MD↔JSON parity OK',
  };
}

export function formatMdJsonDiffReport(moduleCode, cmp) {
  const lines = [
    `# MD↔JSON parity — ${moduleCode}`,
    '',
    `Status: ${cmp.ok ? 'OK' : 'GAPS'}`,
    cmp.message ? `Summary: ${cmp.message}` : '',
    '',
    '## Permission codes',
    '',
    '| Issue | Codes |',
    '|---|---|',
    `| In MD §2.1 only (missing from JSON permissions[]) | ${cmp.mdOnlyCodes?.join(', ') || '—'} |`,
    `| In JSON only (missing from MD §2.1 table) | ${cmp.jsonOnlyCodes?.join(', ') || '—'} |`,
    '',
    '## Navigation',
    '',
  ];
  if (cmp.navConflicts?.length) {
    lines.push('### Field conflicts (same nav_item_code)');
    for (const c of cmp.navConflicts) {
      lines.push(`- **${c.nav_item_code}**: route MD=${JSON.stringify(c.md.route)} vs JSON=${JSON.stringify(c.json.route)}; permission MD=${JSON.stringify(c.md.permission)} vs JSON=${JSON.stringify(c.json.permission)}`);
    }
    lines.push('');
  }
  lines.push(`| In MD nav table only | ${cmp.navMdOnly?.join(', ') || '—'} |`);
  lines.push(`| In JSON navigation[] only | ${cmp.navJsonOnly?.join(', ') || '—'} |`);
  lines.push('');
  lines.push(`## Unclassified pipe tables (no permissionCode / nav_item_code header): ${cmp.unparsedTableCount ?? 0}`);
  return lines.filter(Boolean).join('\n');
}

/**
 * Merge MD-only permission codes into contract (minimal objects).
 * Does not resolve conflicts — caller must have cmp.navConflicts empty for safe merge.
 * @param {object} contract
 * @param {string[]} mdOnlyCodes
 */
export function patchContractPermissionsFromMd(contract, mdOnlyCodes) {
  const next = structuredClone(contract);
  const have = new Set((next.permissions ?? []).map(p => p.code));
  for (const code of mdOnlyCodes) {
    if (have.has(code)) continue;
    have.add(code);
    next.permissions = next.permissions ?? [];
    next.permissions.push({
      code,
      description: `Patched from MD inventory (${code})`,
      sensitive: false,
    });
  }
  return next;
}
