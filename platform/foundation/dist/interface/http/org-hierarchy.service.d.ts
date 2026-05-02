export interface OrgTreeNode {
    node_id: string;
    name_en: string;
    name_ar: string | null;
    code: string | null;
    node_type: string;
    parent_id: string | null;
    depth: number;
    path?: string[];
}
export declare function getOrgTree(tenantId: string): Promise<OrgTreeNode[]>;
export interface ManagerChainEntry {
    position_id: string;
    title_en: string;
    title_ar: string | null;
    code: string | null;
    level: number | null;
    bu_id: string | null;
    holder_user_id: string | null;
    depth: number;
}
/**
 * Walk the manager chain UPWARDS from a user's primary position via
 * dos.positions.reports_to until either the chain ends (reports_to IS NULL)
 * or MAX_DEPTH is hit. At each level, attach the current active holder
 * (position_assignments where ended_at IS NULL).
 *
 * Returns [] when the user has no active position assignment.
 */
export declare function getManagerChain(tenantId: string, userId: string): Promise<ManagerChainEntry[]>;
export declare function getSubtree(tenantId: string, rootId: string): Promise<OrgTreeNode[]>;
