import fs from 'node:fs';
import path from 'node:path';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { safeQuery } from '@dos/db';
import { toErrorMessage } from '@dos/module-sdk';
import { getCodeSearchConfig, getEnabledEngines } from '../config/code-search';

export interface CodeSearchQuery {
  query: string;
  engine: 'zoekt' | 'hound' | 'seagoat' | 'opengrok' | 'codesearch' | 'all' | string;
  fileFilter?: string;
  maxResults?: number;
}

export interface CodeSearchResult {
  engine: string;
  file: string;
  line: number;
  content: string;
  score: number;
}

export interface CodeSearchEngineHealth {
  engine: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  responseTimeMs: number;
}

type LocalIndex = { root: string; files: string[]; builtAt: number };
let localIndex: LocalIndex | null = null;

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    const marker = path.join(dir, 'pnpm-workspace.yaml');
    if (fs.existsSync(marker)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

function shouldIgnoreDir(name: string): boolean {
  return name === 'node_modules'
    || name === '.git'
    || name === '.pnpm'
    || name === 'dist'
    || name === 'coverage'
    || name === '.next'
    || name === '.angular'
    || name === 'tmp'
    || name === '.cache';
}

function isSearchableFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase();
  return ext === '.ts'
    || ext === '.tsx'
    || ext === '.js'
    || ext === '.mjs'
    || ext === '.cjs'
    || ext === '.json'
    || ext === '.md'
    || ext === '.sql'
    || ext === '.yaml'
    || ext === '.yml'
    || ext === '.txt';
}

function buildFileIndex(repoRoot: string, roots: string[], maxFiles: number): string[] {
  const out: string[] = [];
  const stack: string[] = roots.map((r) => path.join(repoRoot, r));

  while (stack.length > 0 && out.length < maxFiles) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (out.length >= maxFiles) break;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!shouldIgnoreDir(e.name)) stack.push(full);
        continue;
      }
      if (e.isFile() && isSearchableFile(full)) out.push(full);
    }
  }

  return out;
}

async function getIndexedSurfacesFromDb(): Promise<string[] | null> {
  const result = await safeQuery(
    `SELECT source_path FROM public.code_search_indexed_surface ORDER BY layer, surface_code`,
    [],
  );
  const paths = (result.rows || [])
    .map((r: any) => String(r.source_path || '').trim())
    .filter(Boolean);
  return paths.length > 0 ? paths : null;
}

function relativeToRepo(repoRoot: string, fullPath: string): string {
  const rel = path.relative(repoRoot, fullPath);
  return rel.startsWith('..') ? fullPath : rel;
}

function matchFileFilter(file: string, filter?: string): boolean {
  if (!filter) return true;
  const needle = filter.trim();
  if (!needle) return true;
  return file.includes(needle);
}

function searchInFile(
  engine: string,
  repoRoot: string,
  filePath: string,
  query: string,
  maxFileBytes: number,
  maxMatches: number,
): CodeSearchResult[] {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return [];
  }
  if (!stat.isFile() || stat.size <= 0) return [];
  if (stat.size > maxFileBytes) return [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const needle = query.trim();
  if (!needle) return [];
  const lines = content.split('\n');
  const results: CodeSearchResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const idx = line.toLowerCase().indexOf(needle.toLowerCase());
    if (idx < 0) continue;

    const snippet = line.trim().slice(0, 500);
    const score = Math.max(0.1, 1 - idx / 500);
    results.push({
      engine,
      file: relativeToRepo(repoRoot, filePath),
      line: i + 1,
      content: snippet,
      score,
    });
    if (results.length >= maxMatches) break;
  }

  return results;
}

async function localSearch(q: CodeSearchQuery): Promise<CodeSearchResult[]> {
  const cfg = getCodeSearchConfig().codesearch;
  const repoRoot = (cfg.config?.repoRoot as string) || findRepoRoot(process.cwd());
  const maxFiles = Number(cfg.config?.maxFiles || 6000);
  const maxFileBytes = Number(cfg.config?.maxFileBytes || 200000);
  const maxResults = Math.min(q.maxResults || 50, 200);
  const maxMatchesPerFile = 5;

  const dbSurfaces = await safeQuery(`SELECT 1`, []).then(async () => getIndexedSurfacesFromDb()).catch(() => null);
  const surfaceRoots = dbSurfaces
    ? dbSurfaces.map((p) => (path.isAbsolute(p) ? path.relative(repoRoot, p) : p)).filter(Boolean)
    : (cfg.indexedSurfaces || []);

  const now = Date.now();
  if (!localIndex || localIndex.root !== repoRoot || now - localIndex.builtAt > 10 * 60 * 1000) {
    const files = buildFileIndex(repoRoot, surfaceRoots, maxFiles);
    localIndex = { root: repoRoot, files, builtAt: now };
  }

  const results: CodeSearchResult[] = [];
  for (const f of localIndex.files) {
    if (results.length >= maxResults) break;
    if (!matchFileFilter(f, q.fileFilter)) continue;
    const matches = searchInFile('codesearch', repoRoot, f, q.query, maxFileBytes, maxMatchesPerFile);
    for (const m of matches) {
      results.push(m);
      if (results.length >= maxResults) break;
    }
  }

  return results;
}

function httpJson<T>(url: string, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = lib(
      {
        method: 'GET',
        hostname: u.hostname,
        port: u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        timeout: timeoutMs,
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c.toString(); });
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf) as T);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function externalSearch(q: CodeSearchQuery): Promise<CodeSearchResult[]> {
  const cfg = getCodeSearchConfig() as any;
  const engine = q.engine as string;
  const engineCfg = cfg[engine];
  if (!engineCfg?.enabled || !engineCfg.url) return [];

  const url = new URL(engineCfg.url);
  const searchPath = engineCfg.searchEndpoint || '/search';
  const max = Math.min(q.maxResults || 50, 200);
  const qs = new URLSearchParams();
  qs.set('q', q.query);
  qs.set('max', String(max));
  if (q.fileFilter) qs.set('file', q.fileFilter);
  const full = `${url.toString().replace(/\/$/, '')}${searchPath}?${qs.toString()}`;

  try {
    const payload = await httpJson<any>(full, 10_000);
    const items: any[] = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
    return items.slice(0, max).map((it) => ({
      engine,
      file: String(it.file || it.path || ''),
      line: Number(it.line || it.lineno || 0) || 0,
      content: String(it.content || it.snippet || '').slice(0, 500),
      score: Number(it.score || 0) || 0,
    })).filter((r) => r.file && r.content);
  } catch {
    return [];
  }
}

export async function searchCode(query: CodeSearchQuery): Promise<CodeSearchResult[]> {
  const engine = (query.engine || 'codesearch') as string;
  const enabled = getEnabledEngines().map((e) => (e as any).engine || (e as any).name);

  if (engine === 'all') {
    const results: CodeSearchResult[] = [];
    const engines = enabled.length > 0 ? enabled : ['codesearch'];
    for (const e of engines) {
      const partial = e === 'codesearch'
        ? await localSearch({ ...query, engine: 'codesearch' })
        : await externalSearch({ ...query, engine: e });
      results.push(...partial);
      if (results.length >= (query.maxResults || 50)) break;
    }
    return results.slice(0, query.maxResults || 50);
  }

  if (engine === 'codesearch') return localSearch(query);
  return externalSearch(query);
}

export async function checkCodeSearchHealth(): Promise<CodeSearchEngineHealth[]> {
  const cfg = getCodeSearchConfig() as any;
  const enabled = getEnabledEngines() as any[];
  const engines = enabled.length > 0 ? enabled.map((e) => e.engine) : ['codesearch'];

  const checks = engines.map(async (engine: string) => {
    const start = Date.now();
    if (engine === 'codesearch') {
      return { engine, status: 'healthy', responseTimeMs: Date.now() - start } as CodeSearchEngineHealth;
    }

    const engineCfg = cfg[engine];
    if (!engineCfg?.url) {
      return { engine, status: 'unavailable', responseTimeMs: Date.now() - start } as CodeSearchEngineHealth;
    }
    const base = engineCfg.url.toString().replace(/\/$/, '');
    const endpoint = engineCfg.healthEndpoint || '/';
    const healthUrl = `${base}${endpoint}`;
    try {
      await httpJson<any>(healthUrl, 3000);
      return { engine, status: 'healthy', responseTimeMs: Date.now() - start } as CodeSearchEngineHealth;
    } catch (e) {
      const msg = toErrorMessage(e);
      const status = msg.includes('timeout') ? 'degraded' : 'unavailable';
      return { engine, status, responseTimeMs: Date.now() - start } as CodeSearchEngineHealth;
    }
  });

  return Promise.all(checks);
}
