// Scope-allowlist enforcement for the Foundation-AI program.
// A wave may only touch paths declared in its spec; anything else = drift = block.

import { execSync } from 'node:child_process';

export function gitDirtyFiles() {
  // -uall expands untracked directories to individual files so allowlist matching is precise.
  const out = execSync('git status --porcelain -uall', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((line) => line.slice(3));
}

export function withinAllowlist(path, allowlist) {
  return allowlist.some((rule) => {
    if (rule.endsWith('/**')) return path.startsWith(rule.slice(0, -3));
    if (rule.endsWith('/*')) return path.startsWith(rule.slice(0, -2)) && !path.slice(rule.length - 1).includes('/');
    return path === rule || path.startsWith(rule + '/');
  });
}

export function classifyDirty(allowlist) {
  const inScope = [];
  const outOfScope = [];
  for (const f of gitDirtyFiles()) {
    (withinAllowlist(f, allowlist) ? inScope : outOfScope).push(f);
  }
  return { inScope, outOfScope };
}
