/**
 * AI OS Sub-Router Shared Infrastructure
 * Query schemas, pagination helpers, cache headers, rate limiters.
 */
import { z } from 'zod';
import { moduleRateLimiter } from '../../ports/middleware.port';
// ── Reusable Zod Query Schemas ──────────────────────────────────────────────
export const paginationQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export const hoursQuery = z.object({
    hours: z.coerce.number().int().min(1).max(720).default(24),
});
export const daysBackQuery = z.object({
    daysBack: z.coerce.number().int().min(1).max(365).default(30),
});
export const agentFilterQuery = z.object({
    agentId: z.string().optional(),
});
export const entityFilterQuery = z.object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
});
export const statusFilterQuery = z.object({
    status: z.string().optional(),
});
export const severityFilterQuery = z.object({
    severity: z.string().optional(),
});
// ── Pagination Helper ───────────────────────────────────────────────────────
export function extractPagination(query) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}
// ── Cache Header Helpers ────────────────────────────────────────────────────
export function setCacheHeaders(res, maxAge = 30) {
    res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
}
export function setNoCacheHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
}
// ── Rate Limiter Instances (tenant-scoped via moduleRateLimiter) ────────────
export const aiReadLimiter = moduleRateLimiter('ai', { maxRequests: 200, windowMs: 60_000 });
export const aiWriteLimiter = moduleRateLimiter('ai', { maxRequests: 50, windowMs: 60_000 });
export const aiDeleteLimiter = moduleRateLimiter('ai', { maxRequests: 10, windowMs: 60_000 });
export const aiApproveLimiter = moduleRateLimiter('ai', { maxRequests: 30, windowMs: 60_000 });
export const aiExportLimiter = moduleRateLimiter('ai', { maxRequests: 5, windowMs: 60_000 });
//# sourceMappingURL=shared.js.map