export interface ActionRequest {
    type: string;
    tenantId: string;
    payload: Record<string, unknown>;
    correlationId?: string;
    source?: string;
    actor?: string;
    idempotencyKey?: string;
    _depth?: number;
    _chain?: string[];
}
export interface ActionResult {
    executed: boolean;
    actionId: string;
    reason?: string;
}
export declare function dispatchAction(req: ActionRequest): Promise<ActionResult>;
