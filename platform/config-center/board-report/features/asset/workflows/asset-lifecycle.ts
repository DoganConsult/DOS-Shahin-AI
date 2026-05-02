import type { AssetStatus } from '../contracts/asset.contracts';
export const ASSET_STATES: readonly AssetStatus[] = ['draft', 'registered', 'active', 'under_review', 'decommissioning', 'decommissioned', 'archived'] as const;
export const ASSET_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  draft: ['registered', 'archived'], registered: ['active', 'archived'], active: ['under_review', 'decommissioning'],
  under_review: ['active', 'decommissioning'], decommissioning: ['decommissioned'], decommissioned: ['archived'], archived: [],
};
export const ASSET_TERMINAL_STATES: readonly AssetStatus[] = ['archived'];
export function isValidAssetTransition(from: AssetStatus, to: AssetStatus): boolean { return ASSET_TRANSITIONS[from]?.includes(to) ?? false; }
export function isAssetTerminal(state: AssetStatus): boolean { return ASSET_TERMINAL_STATES.includes(state); }
