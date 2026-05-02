import { spawnSync } from 'node:child_process';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');

function runStep(label, command, args, extraEnv = {}) {
  console.log(`[security-audit] ${label}`);
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runStep('Running secrets audit', 'bash', ['ops/scripts/secrets-audit.sh']);
runStep('Running pnpm audit', 'pnpm', ['audit', '--audit-level=high']);

if (process.env.SNYK_TOKEN) {
  runStep(
    'Running Snyk test',
    'pnpm',
    ['dlx', 'snyk', 'test', '--severity-threshold=high'],
    { SNYK_TOKEN: process.env.SNYK_TOKEN },
  );
} else {
  console.log('[security-audit] Skipping Snyk test because SNYK_TOKEN is not set.');
}