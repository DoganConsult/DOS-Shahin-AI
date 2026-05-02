export const ASSET_STATES = [
  'draft', 'registered', 'classified', 'active', 'under_review',
  'decommissioning', 'decommissioned', 'disposed', 'archived',
] as const;

export type AssetState = (typeof ASSET_STATES)[number];

export const ASSET_TRANSITIONS: Record<AssetState, AssetState[]> = {
  draft: ['registered'],
  registered: ['classified'],
  classified: ['active'],
  active: ['under_review', 'decommissioning'],
  under_review: ['active', 'decommissioning'],
  decommissioning: ['decommissioned'],
  decommissioned: ['disposed', 'archived'],
  disposed: ['archived'],
  archived: [],
};
