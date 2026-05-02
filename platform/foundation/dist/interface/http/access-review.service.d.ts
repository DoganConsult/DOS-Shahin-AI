export interface AccessReview {
    review_id: string;
    tenant_id: string;
    campaign_name: string;
    description: string | null;
    scope: unknown;
    status: 'draft' | 'active' | 'closed' | 'cancelled';
    due_date: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
}
export interface AccessReviewItem {
    item_id: string;
    tenant_id: string;
    review_id: string;
    user_id: string;
    resource_type: string;
    resource_id: string;
    entitlement: string | null;
    decision: string | null;
    decided_by: string | null;
    decided_at: string | null;
    notes: string | null;
}
export interface CreateAccessReviewInput {
    campaign_name?: string;
    title?: string;
    description?: string;
    scope?: unknown;
    due_date?: string;
    review_type?: 'periodic' | 'event_triggered' | 'ad_hoc';
}
export type UpdateAccessReviewInput = Partial<CreateAccessReviewInput>;
export declare function listReviews(tenantId: string, opts?: {
    page?: number;
    pageSize?: number;
    status?: string;
}): Promise<{
    data: AccessReview[];
    total: any;
}>;
export declare function getReview(tenantId: string, id: string): Promise<AccessReview | null>;
export declare function listItems(tenantId: string, reviewId: string): Promise<any[]>;
export declare function createReview(tenantId: string, input: CreateAccessReviewInput, actorId: string): Promise<AccessReview>;
export declare function updateReview(tenantId: string, id: string, input: UpdateAccessReviewInput): Promise<AccessReview | null>;
export declare function startReview(tenantId: string, id: string): Promise<AccessReview | null>;
export declare function deleteReview(tenantId: string, id: string): Promise<boolean>;
export declare function decideItem(tenantId: string, reviewId: string, itemId: string, decision: 'approve' | 'revoke' | 'flag', comment: string | null, actorId: string): Promise<AccessReviewItem | null>;
export declare function closeReview(tenantId: string, id: string): Promise<AccessReview | null>;
