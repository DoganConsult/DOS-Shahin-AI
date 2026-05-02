import fs from 'node:fs';
import path from 'node:path';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { safeQuery } from '@dos/db';
import { toErrorMessage } from '@dos/module-sdk';
import { getCodeSearchConfig, getEnabledEngines } from '../config/code-search.js';
let localIndex = null;
function findRepoRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 12; i++) {
        const marker = path.join(dir, 'pnpm-workspace.yaml');
        if (fs.existsSync(marker))
            return dir;
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return startDir;
}
function shouldIgnoreDir(name) {
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
function isSearchableFile(file) {
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
function buildFileIndex(repoRoot, roots, maxFiles) {
    const out = [];
    const stack = roots.map((r) => path.join(repoRoot, r));
    while (stack.length > 0 && out.length < maxFiles) {
        const dir = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const e of entries) {
            if (out.length >= maxFiles)
                break;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (!shouldIgnoreDir(e.name))
                    stack.push(full);
                continue;
            }
            if (e.isFile() && isSearchableFile(full))
                out.push(full);
        }
    }
    return out;
}
async function getIndexedSurfacesFromDb() {
    const result = await safeQuery(`SELECT source_path FROM public.code_search_indexed_surface ORDER BY layer, surface_code`, []);
    const paths = (result.rows || [])
        .map((r) => String(r.source_path || '').trim())
        .filter(Boolean);
    return paths.length > 0 ? paths : null;
}
function relativeToRepo(repoRoot, fullPath) {
    const rel = path.relative(repoRoot, fullPath);
    return rel.startsWith('..') ? fullPath : rel;
}
function matchFileFilter(file, filter) {
    if (!filter)
        return true;
    const needle = filter.trim();
    if (!needle)
        return true;
    return file.includes(needle);
}
function searchInFile(engine, repoRoot, filePath, query, maxFileBytes, maxMatches) {
    let stat;
    try {
        stat = fs.statSync(filePath);
    }
    catch {
        return [];
    }
    if (!stat.isFile() || stat.size <= 0)
        return [];
    if (stat.size > maxFileBytes)
        return [];
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    }
    catch {
        return [];
    }
    const needle = query.trim();
    if (!needle)
        return [];
    const lines = content.split('\n');
    const results = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const idx = line.toLowerCase().indexOf(needle.toLowerCase());
        if (idx < 0)
            continue;
        const snippet = line.trim().slice(0, 500);
        const score = Math.max(0.1, 1 - idx / 500);
        results.push({
            engine,
            file: relativeToRepo(repoRoot, filePath),
            line: i + 1,
            content: snippet,
            score,
        });
        if (results.length >= maxMatches)
            break;
    }
    return results;
}
async function localSearch(q) {
    const cfg = getCodeSearchConfig().codesearch;
    const repoRoot = cfg.config?.repoRoot || findRepoRoot(process.cwd());
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
    const results = [];
    for (const f of localIndex.files) {
        if (results.length >= maxResults)
            break;
        if (!matchFileFilter(f, q.fileFilter))
            continue;
        const matches = searchInFile('codesearch', repoRoot, f, q.query, maxFileBytes, maxMatchesPerFile);
        for (const m of matches) {
            results.push(m);
            if (results.length >= maxResults)
                break;
        }
    }
    return results;
}
function httpJson(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const lib = u.protocol === 'https:' ? httpsRequest : httpRequest;
        const req = lib({
            method: 'GET',
            hostname: u.hostname,
            port: u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80),
            path: `${u.pathname}${u.search}`,
            timeout: timeoutMs,
        }, (res) => {
            let buf = '';
            res.on('data', (c) => { buf += c.toString(); });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(buf));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
        req.end();
    });
}
async function externalSearch(q) {
    const cfg = getCodeSearchConfig();
    const engine = q.engine;
    const engineCfg = cfg[engine];
    if (!engineCfg?.enabled || !engineCfg.url)
        return [];
    const url = new URL(engineCfg.url);
    const searchPath = engineCfg.searchEndpoint || '/search';
    const max = Math.min(q.maxResults || 50, 200);
    const qs = new URLSearchParams();
    qs.set('q', q.query);
    qs.set('max', String(max));
    if (q.fileFilter)
        qs.set('file', q.fileFilter);
    const full = `${url.toString().replace(/\/$/, '')}${searchPath}?${qs.toString()}`;
    try {
        const payload = await httpJson(full, 10_000);
        const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
        return items.slice(0, max).map((it) => ({
            engine,
            file: String(it.file || it.path || ''),
            line: Number(it.line || it.lineno || 0) || 0,
            content: String(it.content || it.snippet || '').slice(0, 500),
            score: Number(it.score || 0) || 0,
        })).filter((r) => r.file && r.content);
    }
    catch {
        return [];
    }
}
export async function searchCode(query) {
    const engine = (query.engine || 'codesearch');
    const enabled = getEnabledEngines().map((e) => e.engine || e.name);
    if (engine === 'all') {
        const results = [];
        const engines = enabled.length > 0 ? enabled : ['codesearch'];
        for (const e of engines) {
            const partial = e === 'codesearch'
                ? await localSearch({ ...query, engine: 'codesearch' })
                : await externalSearch({ ...query, engine: e });
            results.push(...partial);
            if (results.length >= (query.maxResults || 50))
                break;
        }
        return results.slice(0, query.maxResults || 50);
    }
    if (engine === 'codesearch')
        return localSearch(query);
    return externalSearch(query);
}
export async function checkCodeSearchHealth() {
    const cfg = getCodeSearchConfig();
    const enabled = getEnabledEngines();
    const engines = enabled.length > 0 ? enabled.map((e) => e.engine) : ['codesearch'];
    const checks = engines.map(async (engine) => {
        const start = Date.now();
        if (engine === 'codesearch') {
            return { engine, status: 'healthy', responseTimeMs: Date.now() - start };
        }
        const engineCfg = cfg[engine];
        if (!engineCfg?.url) {
            return { engine, status: 'unavailable', responseTimeMs: Date.now() - start };
        }
        const base = engineCfg.url.toString().replace(/\/$/, '');
        const endpoint = engineCfg.healthEndpoint || '/';
        const healthUrl = `${base}${endpoint}`;
        try {
            await httpJson(healthUrl, 3000);
            return { engine, status: 'healthy', responseTimeMs: Date.now() - start };
        }
        catch (e) {
            const msg = toErrorMessage(e);
            const status = msg.includes('timeout') ? 'degraded' : 'unavailable';
            return { engine, status, responseTimeMs: Date.now() - start };
        }
    });
    return Promise.all(checks);
}
//# sourceMappingURL=code-search.connector.js.map