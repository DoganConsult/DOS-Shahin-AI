/**
 * Minimal nginx config parser — sufficient for the auth-host consistency lint
 * and the contract tests that share the same invariants.
 *
 * Approach: brace-depth scan. nginx allows `{` / `}` to appear inside
 * single-quoted, double-quoted, and `if (...)` contexts; we tolerate quotes
 * but not nested string-internal braces because dos-platform.conf doesn't use
 * them. If a future edit introduces embedded Lua / map regex with literal
 * braces in strings, swap to a tokeniser.
 */

export interface NginxLocation {
  /** The full text after `location` and before the opening `{`, e.g. "= /api/auth/oidc/start" or "/api/auth/". */
  pattern: string;
  /** Block body between the matching braces, excluding the braces themselves. */
  body: string;
  /** 1-based line number where the location directive starts. */
  startLine: number;
}

export interface NginxServerBlock {
  /** Hosts listed on `server_name`; empty array if absent. */
  serverNames: string[];
  /** Block body between the matching braces, excluding the braces themselves. */
  body: string;
  /** Top-level location blocks inside this server block. */
  locations: NginxLocation[];
  /** 1-based line number where the server directive starts. */
  startLine: number;
}

interface BlockSpan {
  body: string;
  startLine: number;
}

/**
 * Walk `text` for top-level blocks introduced by a directive matching
 * `directiveRe`. Returns each block's body (between `{` and matching `}`)
 * along with the 1-based start line.
 *
 * `directiveRe` MUST be anchored to capture only the directive name and any
 * arguments preceding `{` (without the `{` itself). Example:
 *   /^\s*server\b([^{}]*)\{/
 */
function findTopLevelBlocks(
  text: string,
  directiveRe: RegExp,
): Array<BlockSpan & { args: string }> {
  const out: Array<BlockSpan & { args: string }> = [];
  let i = 0;
  let line = 1;
  const len = text.length;
  while (i < len) {
    const slice = text.slice(i);
    const match = directiveRe.exec(slice);
    if (!match || match.index === undefined) break;
    // advance line counter to the directive start
    const before = text.slice(i, i + match.index);
    line += (before.match(/\n/g) || []).length;
    const directiveStartLine = line;
    const args = (match[1] ?? '').trim();
    // position cursor at the opening `{`
    const openIdx = i + match.index + match[0].length - 1; // index of `{`
    let depth = 1;
    let j = openIdx + 1;
    let inLineComment = false;
    while (j < len && depth > 0) {
      const ch = text[j];
      if (inLineComment) {
        if (ch === '\n') {
          inLineComment = false;
          line++;
        }
        j++;
        continue;
      }
      if (ch === '#') {
        inLineComment = true;
        j++;
        continue;
      }
      if (ch === '\n') line++;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) break;
      j++;
    }
    if (depth !== 0) break; // unbalanced — bail, lint will catch
    const body = text.slice(openIdx + 1, j);
    out.push({ body, startLine: directiveStartLine, args });
    // Inner walk already advanced `line` for every newline inside the body;
    // just step the cursor past the closing `}`.
    i = j + 1;
  }
  return out;
}

export function parseServerBlocks(text: string): NginxServerBlock[] {
  const blocks: NginxServerBlock[] = [];
  for (const { body, startLine } of findTopLevelBlocks(text, /^\s*server\b([^{}]*)\{/m)) {
    const sn = /^\s*server_name\s+([^;]+);/m.exec(body);
    const serverNames = sn ? sn[1].trim().split(/\s+/).filter(Boolean) : [];
    const locations = findTopLevelBlocks(body, /^\s*location\b([^{}]*)\{/m).map(
      (loc) => ({
        pattern: loc.args,
        body: loc.body,
        startLine: startLine + (body.slice(0, body.indexOf(loc.body)).match(/\n/g) || []).length,
      }),
    );
    blocks.push({ serverNames, body, locations, startLine });
  }
  return blocks;
}

/**
 * Find a location by exact pattern match (e.g. "= /api/auth/oidc/start").
 * Returns null if not present.
 */
export function findLocation(
  block: NginxServerBlock,
  pattern: string,
): NginxLocation | null {
  return block.locations.find((l) => l.pattern === pattern) ?? null;
}

/**
 * Extract the value of a `proxy_set_header NAME VALUE;` directive from a
 * location body (case-sensitive header name, as nginx stores them verbatim).
 * Returns null when the directive is missing.
 */
export function getProxySetHeader(
  loc: NginxLocation,
  headerName: string,
): string | null {
  const re = new RegExp(
    `^\\s*proxy_set_header\\s+${headerName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s+([^;]+);`,
    'm',
  );
  const match = re.exec(loc.body);
  return match ? match[1].trim() : null;
}

/**
 * Extract the upstream from `proxy_pass <url>;` in a location body.
 * Returns null when the directive is missing.
 */
export function getProxyPass(loc: NginxLocation): string | null {
  const match = /^\s*proxy_pass\s+([^;]+);/m.exec(loc.body);
  return match ? match[1].trim() : null;
}
