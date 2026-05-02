export declare const WORKFLOW_NODE_TYPES_EXECUTED: readonly ["start", "end", "approval", "task", "condition", "parallel", "timer", "notification", "escalation", "subprocess", "script"];
export declare const WORKFLOW_NODE_TYPES_UI_ONLY: readonly ["note", "group", "swimlane", "label"];
export declare const ALL_PALETTE_NODE_TYPES: readonly ["start", "end", "approval", "task", "condition", "parallel", "timer", "notification", "escalation", "subprocess", "script", "note", "group", "swimlane", "label"];
export type ExecutedNodeType = typeof WORKFLOW_NODE_TYPES_EXECUTED[number];
export type UiOnlyNodeType = typeof WORKFLOW_NODE_TYPES_UI_ONLY[number];
export type PaletteNodeType = typeof ALL_PALETTE_NODE_TYPES[number];
export declare function isExecutedNodeType(value: unknown): value is ExecutedNodeType;
export declare const WORKFLOW_ACTION_SUBTYPES_EXECUTED: readonly ["api_call", "send_email", "webhook", "db_query", "script_run", "approval", "task", "script", "subprocess"];
export type ExecutableActionSubType = typeof WORKFLOW_ACTION_SUBTYPES_EXECUTED[number];
export declare function isExecutableActionSubType(value: unknown): boolean;
export declare function isTenantWideExecutionRole(role: string): boolean;
export interface WorkflowNode {
    id: string;
    type: PaletteNodeType;
    label: string;
    position: {
        x: number;
        y: number;
    };
    data?: Record<string, unknown>;
}
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    condition?: string;
}
export interface WorkflowDefinition {
    id: string;
    code: string;
    name: string;
    version: number;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    status: 'draft' | 'active' | 'deprecated';
}
