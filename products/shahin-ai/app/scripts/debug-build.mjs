#!/usr/bin/env node
/**
 * Debug build wrapper: logs build start/end to NDJSON for debug session a5e220.
 * Run from repo root: node frontend/scripts/debug-build.mjs
 * Or from frontend: node scripts/debug-build.mjs
 */
import { spawn } from 'child_process';
import { appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const LOG_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../.cursor/debug-a5e220.log');
const SESSION_ID = 'a5e220';

function writeLog(obj) {
  appendFileSync(LOG_PATH, JSON.stringify({ ...obj, sessionId: SESSION_ID, timestamp: Date.now() }) + '\n');
}

// #region agent log
writeLog({ location: 'debug-build.mjs:start', message: 'Build started', data: { runId: 'build-1' }, hypothesisId: 'H1' });
// #endregion
const startMs = Date.now();
const child = spawn('pnpm', ['run', 'build'], {
  cwd: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  shell: true,
  stdio: 'inherit',
});
child.on('close', (code, signal) => {
  const durationMs = Date.now() - startMs;
  // #region agent log
  writeLog({
    location: 'debug-build.mjs:end',
    message: 'Build finished',
    data: { exitCode: code, signal: signal || null, durationMs, runId: 'build-1' },
    hypothesisId: 'H2',
  });
  // #endregion
  process.exitCode = code != null ? code : signal ? 128 + 9 : 0;
});
child.on('error', (err) => {
  // #region agent log
  writeLog({
    location: 'debug-build.mjs:error',
    message: 'Build spawn error',
    data: { error: String(err.message), runId: 'build-1' },
    hypothesisId: 'H3',
  });
  // #endregion
  process.exit(1);
});
