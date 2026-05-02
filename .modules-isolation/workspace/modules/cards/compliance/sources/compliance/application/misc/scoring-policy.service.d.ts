export declare function createScoringPolicy(tenantId: string, data: {
    name: string;
    weights: Record<string, number>;
    is_default?: boolean;
}): Promise<unknown>;
export declare function getScoringPolicies(tenantId: string): Promise<Record<string, unknown>[]>;
export declare function getScoringPolicyById(tenantId: string, policyId: string): Promise<any | null>;
export declare function updateScoringPolicy(tenantId: string, policyId: string, data: Partial<{
    name: string;
    weights: Record<string, number>;
    is_default: boolean;
}>): Promise<unknown>;
export declare function deleteScoringPolicy(tenantId: string, policyId: string): Promise<boolean>;
/**
 * Pure function: calculates a weighted assessment score from items and policy weights.
 *
 * Each item has a `control_node_id` (used to look up its category) and a `status`.
 * `categoryMap` maps control_node_id → category name.
 * `weights` maps category name → weight decimal.
 *
 * For each category present in weights:
 *   categoryScore = (compliant * 1.0 + partially_compliant * 0.5) / applicable
 * Final score = sum(categoryScore * weight) / sum(weights) * 100
 *
 * Items whose category is not in the weights map are ignored.
 * Returns 0 when there are no applicable items or no matching weights.
 */
export declare function calculateWeightedScorePure(items: {
    control_node_id: string;
    status: string;
}[], categoryMap: Record<string, string>, weights: Record<string, number>): number;
/**
 * Applies a scoring policy to an assessment:
 * 1. Fetches the scoring policy weights
 * 2. Fetches all assessment items
 * 3. Builds a category map from control_node_id → category (using instrument_structure)
 * 4. Calculates the weighted score
 * 5. Updates the assessment's score field
 * 6. Returns the new score
 */
export declare function applyPolicy(tenantId: string, assessmentId: string, policyId: string): Promise<number>;
