import type { AccessReviewRequest } from '../types/dauth.types';
export declare function createAccessReview(tenantId: string, userId: string, reviewerId: string, reviewType: 'periodic' | 'triggered' | 'offboarding'): Promise<AccessReviewRequest>;
export declare function completeAccessReview(tenantId: string, reviewId: string, decision: 'approved' | 'revoked', reviewerId: string): Promise<boolean>;
export declare function getPendingAccessReviews(tenantId: string, reviewerId?: string): Promise<AccessReviewRequest[]>;
export declare function getAccessReviewHistory(tenantId: string, userId: string): Promise<AccessReviewRequest[]>;
