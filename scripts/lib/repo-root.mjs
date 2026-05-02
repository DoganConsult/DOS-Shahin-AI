import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_SOURCE_ROOT = '/home/Dr-Dogan-AGRC-OS';
export const SOURCE_ROOT = process.env.DOS_AIO_SOURCE_ROOT
  || (fs.existsSync(DEFAULT_SOURCE_ROOT) ? DEFAULT_SOURCE_ROOT : REPO_ROOT);

export function resolveRepoPath(...segments) {
  return path.join(REPO_ROOT, ...segments);
}
