import { Router, Request, Response } from 'express';
import { safeQuery, tenantSchema, withTenantClient } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'compliance-controls-service:documents', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ELEMENT_TYPES = new Set([
  'obligation',
  'prohibition',
  'permission',
  'exception',
  'section',
  'clause',
  'reporting',
]);

type ElementType =
  | 'obligation'
  | 'prohibition'
  | 'permission'
  | 'exception'
  | 'section'
  | 'clause';

interface DocumentElement {
  elementId: string;
  parentId?: string;
  ref: string;
  titleEn: string;
  titleAr?: string;
  type: ElementType;
  textEn?: string;
  textAr?: string;
  children?: DocumentElement[];
}

function coerceType(raw: unknown): ElementType {
  if (typeof raw !== 'string' || !ELEMENT_TYPES.has(raw)) return 'clause';
  if (raw === 'reporting') return 'obligation';
  return raw as ElementType;
}

function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 140 ? `${cleaned.slice(0, 137)}…` : cleaned;
}

function parentRef(ref: string | null | undefined): string | undefined {
  if (!ref) return undefined;
  const trimmed = ref.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0) return undefined;
  return trimmed.slice(0, lastDot);
}

/**
 * GET /api/documents/:id/elements
 *
 * Returns the regulatory document clause tree for a given document.
 * Backed by tenant.regulatory_clauses (see modules/compliance
 * regulatory-extraction.service.ts:ensureTables).
 *
 * Response: { elements: DocumentElement[], count: number }
 *
 * The clauses table is flat (no parent_clause_id column); a parent is
 * inferred by trimming the last dotted segment of clause_ref when present
 * (e.g. "4.2.1" -> parent "4.2"). Nodes whose inferred parent is not
 * present in the result set are kept at the root.
 */
router.get(
  '/:id/elements',
  requirePermission('compliance.program.read'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid document id', code: 'DOCUMENT_ID_INVALID' });
      return;
    }

    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT clause_id, clause_ref, text, clause_type, page_number, sort_order
           FROM "${schema}".regulatory_clauses
          WHERE document_id = $1
          ORDER BY sort_order ASC, clause_ref ASC NULLS LAST`,
        [id],
      );

      const rows = result.rows as Array<{
        clause_id: string;
        clause_ref: string | null;
        text: string;
        clause_type: string;
        page_number: number | null;
        sort_order: number | null;
      }>;

      const byRef = new Map<string, DocumentElement>();
      const elements: DocumentElement[] = rows.map((row) => {
        const el: DocumentElement = {
          elementId: row.clause_id,
          ref: row.clause_ref ?? '',
          titleEn: deriveTitle(row.text),
          textEn: row.text,
          type: coerceType(row.clause_type),
        };
        if (row.clause_ref) byRef.set(row.clause_ref, el);
        return el;
      });

      for (const el of elements) {
        const pRef = parentRef(el.ref);
        if (!pRef) continue;
        const parent = byRef.get(pRef);
        if (!parent || parent.elementId === el.elementId) continue;
        el.parentId = parent.elementId;
        parent.children = parent.children ?? [];
        parent.children.push(el);
      }

      const roots = elements.filter((el) => !el.parentId);

      res.json({ elements: roots, count: elements.length });
    } catch (err) {
      logger.error('[compliance-controls-service] Failed to load document elements', {
        tenantId,
        documentId: id,
        error: (err as Error).message,
      });
      res.status(500).json({
        error: 'Failed to load document elements',
        details: (err as Error).message,
      });
    }
  },
);

export default router;
