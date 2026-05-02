export declare const ASSET_STATES: readonly ["draft", "registered", "classified", "active", "under_review", "decommissioning", "decommissioned", "disposed", "archived"];
export type AssetState = (typeof ASSET_STATES)[number];
export declare const ASSET_TRANSITIONS: Record<AssetState, AssetState[]>;
