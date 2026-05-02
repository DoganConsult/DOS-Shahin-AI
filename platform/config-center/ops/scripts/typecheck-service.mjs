import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');

function fail(message) {
  console.error(`[typecheck-service] ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveServicePath(input) {
  const normalized = input.startsWith('services/') ? input : path.posix.join('services', input);
  const absolutePath = path.join(workspaceRoot, normalized);

  if (!existsSync(absolutePath)) {
    fail(`Service path does not exist: ${normalized}`);
  }

  const tsconfigPath = path.join(absolutePath, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    fail(`Missing tsconfig.json for ${normalized}`);
  }

  return { normalized, tsconfigPath };
}

const serviceArg = process.argv[2];

if (!serviceArg) {
  fail('Usage: node ops/scripts/typecheck-service.mjs <service-name|services/path>');
}

const { normalized, tsconfigPath } = resolveServicePath(serviceArg);
console.log(`[typecheck-service] Typechecking ${normalized}`);
run('pnpm', ['exec', 'tsc', '-p', tsconfigPath, '--noEmit']);