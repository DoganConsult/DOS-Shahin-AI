import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Governance OS Learning Engine API Routes
// Phase I: API endpoints for learning engine
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { AuthenticatedRequest } from '@dos/types';
import {
  getCases,
  getCaseById,
} from '../../../governance-os/services/learning/governance-os-learning-memory.service';
import {
  getLearningScores,
  computeLearningScore,
} from '../../../governance-os/services/learning/governance-os-learning-score-persistence.service';
import {
  getLessonCandidates,
} from '../../../governance-os/services/governance/governance-os-reflection-engine.service';
import {
  reviewLessonCandidate,
  approvePlaybookVersion,
  getPlaybookVersions,
} from '../../../governance-os/services/governance-os-playbook-learning.service';
import {
  getKnowledgeArticles,
} from '../../../governance-os/services/governance/governance-os-knowledge-publisher.service';
import {
  getInitiativeEffectiveness,
} from '../../../governance-os/services/cases/governance-os-case-outcome.service';

import { validate, auditMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { createComputeBody, createReviewBody, createApproveBody } from '../../schemas/governance.schemas';
import {
  getLearningEngineHealth,
  getQuickHealthStatus,
} from '../../../governance-os/services/learning/governance-os-learning-health.service';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));

/**
 * GET /api/governance-os/learning/cases
 * Get learning cases with filters
 */
router.get(
  '/learning/cases', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const filters: Parameters<typeof getCases>[1] = {
        caseType: req.query.caseType as any,
        moduleCode: req.query.moduleCode as string | undefined,
        effectivenessMin: req.query.effectivenessMin
          ? parseFloat(req.query.effectivenessMin as string)
          : undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      };

      const cases = await getCases(tenantId, filters);
      res.json({ cases });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/cases/:caseId
 * Get case details with timeline
 */
router.get(
  '/learning/cases/:caseId', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const caseId = req.params.caseId;
      const case_ = await getCaseById(tenantId, caseId);

      if (!case_) {
        return res.status(404).json({ error: 'case_not_found' });
      }

      // Get timeline
      const { getCaseTimeline } = await import('../../../governance-os/services/learning/governance-os-learning-memory.service.js');
      const timeline = await getCaseTimeline(tenantId, caseId);

      res.json({
        case: case_,
        timeline,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/scores
 * Get learning scores with filters
 */
router.get(
  '/learning/scores', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const filters: Parameters<typeof getLearningScores>[1] = {
        scopeType: req.query.scopeType as any,
        scopeKey: req.query.scopeKey as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const scores = await getLearningScores(tenantId, filters);
      res.json({ scores });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/governance-os/learning/scores/compute
 * Compute learning score for a scope
 */
router.post(
  '/learning/scores/compute',
  authenticate,
  requirePermission('governance.record.write'),
  validate({ body: createComputeBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const { scopeType, scopeKey, periodStart, periodEnd } = req.body;

      if (!scopeType || !scopeKey || !periodStart || !periodEnd) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }

      const score = await computeLearningScore(
        tenantId,
        scopeType,
      );

      res.json({ score });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/lessons
 * Get lesson candidates
 */
router.get(
  '/learning/lessons', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const _filters = {
        status: req.query.status as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const lessons = await getLessonCandidates(tenantId);
      res.json({ lessons });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/patterns
 * Get detected patterns
 */
router.get(
  '/learning/patterns', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const { detectRepeatedPatterns } = await import('../../../governance-os/services/misc/reflection-detection.service.js');
      const patterns = await detectRepeatedPatterns(tenantId);

      res.json({ patterns });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/initiative-effectiveness
 * Get initiative effectiveness metrics
 */
router.get(
  '/learning/initiative-effectiveness', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const effectiveness = await getInitiativeEffectiveness(tenantId, {
        initiativeCode: req.query.initiativeCode as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      });

      res.json({ effectiveness });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/governance-os/learning/lessons/:candidateId/review
 * Review a lesson candidate (approve/reject)
 */
router.post(
  '/learning/lessons/:candidateId/review',
  authenticate,
  requirePermission('governance.record.write'),
  validate({ body: createReviewBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const candidateId = req.params.candidateId;
      const { action, reviewNotes } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'invalid_action' });
      }

      const userId = (req as AuthenticatedRequest).user?.userId;
      const result = await reviewLessonCandidate(
        tenantId,
        candidateId,

        { action, reviewNotes },
        userId,
      );

      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * POST /api/governance-os/learning/playbooks/:versionId/approve
 * Approve a playbook version
 */
router.post(
  '/learning/playbooks/:versionId/approve',
  authenticate,
  requirePermission('governance.record.write'),
  validate({ body: createApproveBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const versionId = req.params.versionId;
      const userId = (req as AuthenticatedRequest).user?.userId;

      const success = await approvePlaybookVersion(tenantId, versionId, userId);

      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/playbooks
 * Get playbook versions
 */
router.get(
  '/learning/playbooks', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const playbookId = (req.query.playbookId as string) || '';

      const versions = await getPlaybookVersions(tenantId, playbookId);
      res.json({ versions });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/knowledge
 * Get knowledge articles
 */
router.get(
  '/learning/knowledge', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const filters: Parameters<typeof getKnowledgeArticles>[1] = {
        knowledgeStore: req.query.knowledgeStore as any,
        tags: req.query.tags
          ? (req.query.tags as string).split(',')
          : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const articles = await getKnowledgeArticles(tenantId, filters);
      res.json({ articles });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

/**
 * GET /api/governance-os/learning/health
 * Get learning engine health status
 */
router.get(
  '/learning/health', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('governance.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'no_tenant' });

      const quick = req.query.quick === 'true';
      const health = quick
        ? await getQuickHealthStatus(tenantId)
        : await getLearningEngineHealth(tenantId);

      res.json({ health });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

export default router;

