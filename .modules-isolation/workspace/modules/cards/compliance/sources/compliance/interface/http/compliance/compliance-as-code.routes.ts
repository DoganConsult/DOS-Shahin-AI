import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { logger } from '../../../ports/logger.port';

const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance-as-Code Routes
 * 
 * API endpoints for test definition DSL, automated test execution,
 * and control.failed event publishing.
 */

import { authenticate, requirePermission } from '../../../ports/auth.port';
import * as ComplianceAsCodeService from '../../services/compliance/compliance-as-code.service';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, validate, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { storeTestDefinitionBody, createExecuteBody, createControlBody } from "../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(mutationEventHook('compliance'));
router.use(auditMiddleware('compliance-as-code'));

/**
 * POST /compliance-as-code/test-definition
 * Store a test definition (DSL).
 * 
 * Body: ComplianceTestDefinition
 */
router.post('/test-definition', authenticate, requirePermission('compliance.program.write'), validate({ body: storeTestDefinitionBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const definition = req.body;

    if (!definition.testId || !definition.controlId || !definition.steps || !Array.isArray(definition.steps)) {
      return res.status(400).json({
        error: 'Missing required fields: testId, controlId, steps',
        error_ar: 'الحقول المطلوبة مفقودة: معرف الاختبار، معرف الضابط، الخطوات'
      });
    }

    await ComplianceAsCodeService.storeTestDefinition(tenantId, definition);

    setAuditData(res as any, { action: 'create', entityType: 'compliance_test_definition', entityId: definition.testId, afterState: { controlId: definition.controlId } });
    return res.json({
      message: 'Test definition stored',
      message_ar: 'تم حفظ تعريف الاختبار',
      testId: definition.testId
    });
  } catch (error) {
    logger.error('[ComplianceAsCode] Store definition error:', error);
    return res.status(500).json({
      error: toErrorMessage(error),
      error_ar: 'خطأ في حفظ تعريف الاختبار'
    });
  }
});

/**
 * GET /compliance-as-code/test-definition/:testId
 * Get a test definition.
 */
router.get('/test-definition/:testId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { testId } = req.params;

    const definition = await ComplianceAsCodeService.getTestDefinition(tenantId, testId);

    if (!definition) {
      return res.status(404).json({
        error: 'Test definition not found',
        error_ar: 'تعريف الاختبار غير موجود'
      });
    }

    return res.json(definition);
  } catch (error) {
    logger.error('[ComplianceAsCode] Get definition error:', error);
    return res.status(500).json({
      error: toErrorMessage(error),
      error_ar: 'خطأ في استرجاع تعريف الاختبار'
    });
  }
});

/**
 * GET /compliance-as-code/test-definitions/control/:controlId
 * Get all test definitions for a control.
 */
router.get('/test-definitions/control/:controlId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { controlId } = req.params;

    const definitions = await ComplianceAsCodeService.getTestDefinitionsForControl(tenantId, controlId);

    return res.json({
      definitions,
      count: definitions.length
    });
  } catch (error) {
    logger.error('[ComplianceAsCode] Get definitions error:', error);
    return res.status(500).json({
      error: toErrorMessage(error),
      error_ar: 'خطأ في استرجاع تعريفات الاختبار'
    });
  }
});

/**
 * POST /compliance-as-code/execute/:testId
 * Execute a compliance test.
 * 
 * Query params:
 * - dryRun: boolean (optional)
 * - failOnFirstError: boolean (optional)
 */
router.post('/execute/:testId', authenticate, requirePermission('compliance.program.write'), validate({ body: createExecuteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { testId } = req.params;
    const { dryRun, failOnFirstError } = req.query;

    const result = await ComplianceAsCodeService.executeTest(tenantId, testId, {
      dryRun: dryRun === 'true',
      failOnFirstError: failOnFirstError === 'true',
    });

    setAuditData(res as any, { action: 'execute', entityType: 'compliance_test', entityId: testId, afterState: { overallResult: result?.overallResult } });
    return res.json(result);
  } catch (error) {
    logger.error('[ComplianceAsCode] Execute test error:', error);
    return res.status(500).json({
      error: toErrorMessage(error),
      error_ar: 'خطأ في تنفيذ الاختبار'
    });
  }
});

/**
 * POST /compliance-as-code/execute/control/:controlId
 * Execute all tests for a control.
 * 
 * Query params:
 * - dryRun: boolean (optional)
 */
router.post('/execute/control/:controlId', authenticate, requirePermission('compliance.program.write'), validate({ body: createControlBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { controlId } = req.params;
    const { dryRun } = req.query;

    const results = await ComplianceAsCodeService.executeTestsForControl(tenantId, controlId, {
      dryRun: dryRun === 'true',
    });

    return res.json({
      results,
      count: results.length,
      passed: results.filter((r) => r.overallResult === 'pass').length,
      failed: results.filter((r) => r.overallResult === 'fail').length,
    });
  } catch (error) {
    logger.error('[ComplianceAsCode] Execute tests error:', error);
    return res.status(500).json({
      error: toErrorMessage(error),
      error_ar: 'خطأ في تنفيذ الاختبارات'
    });
  }
});

/**
 * GET /compliance-as-code/history
 * Get test execution history.
 * 
 * Query params:
 * - testId: string (optional)
 * - controlId: string (optional)
 * - limit: number (optional, default 50)
 */
router.get('/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { testId, controlId, limit } = req.query;

    const history = await ComplianceAsCodeService.getTestExecutionHistory(
      tenantId,
      testId as string | undefined,
      controlId as string | undefined,
      limit ? parseInt(limit as string, 10) : 50
    );

    return res.json({
      history,
      count: history.length
    });
  } catch (error) {
    logger.error('[ComplianceAsCode] Get history error:', error);
    return res.status(500).json({
      error: toErrorMessage(error),
      error_ar: 'خطأ في استرجاع تاريخ التنفيذ'
    });
  }
});

export default router;

