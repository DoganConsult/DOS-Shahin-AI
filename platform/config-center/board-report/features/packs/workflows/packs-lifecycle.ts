import type { PackStatus } from '../contracts/packs.contracts';

export const PACK_STATES: readonly PackStatus[] = [
  'draft', 'published', 'installed', 'deprecated', 'archived',
] as const;

export const PACK_TRANSITIONS: Record<PackStatus, PackStatus[]> = {
  draft: ['published', 'archived'],
  published: ['installed', 'deprecated', 'archived'],
  installed: ['deprecated', 'archived'],
  deprecated: ['archived'],
  archived: [],
};

export const PACK_TERMINAL_STATES: readonly PackStatus[] = ['archived'];

export function isValidPackTransition(from: PackStatus, to: PackStatus): boolean {
  return PACK_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isPackTerminal(state: PackStatus): boolean {
  return PACK_TERMINAL_STATES.includes(state);
}
