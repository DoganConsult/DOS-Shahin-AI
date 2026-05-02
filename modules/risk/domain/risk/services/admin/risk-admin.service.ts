/**
 * Risk Module Admin Service
 * Enterprise-grade admin interface for SLA configuration, 
 * escalation policy, runbook links, and module settings
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '@dos/module-sdk';

export interface RiskAdminConfig {
  moduleCode: string;
  slaConfiguration: {
    reviewCadenceDays: number;
    assessmentTimeoutHours: number;
    approvalTimeoutHours: number;
    escalationThresholdHours: number;
  };
  escalationPolicy: {
    autoEscalateEnabled: boolean;
    escalationRoles: string[];
    escalationConditions: string[];
  };
  runbookLinks: {
    riskAssessment: string;
    incidentResponse: string;
    complianceReporting: string;
    systemMaintenance: string;
  };
  thresholds: {
    criticalRiskScore: number;
    highRiskScore: number;
    overdueReviewDays: number;
    staleAssessmentDays: number;
  };
  aiSettings: {
    enabled: boolean;
    modelConfig: string;
    confidenceThreshold: number;
    autoClassification: boolean;
  };
}

export async function getAdminConfig(tenantId: string): Promise<RiskAdminConfig> {
  const schema = tenantSchema(tenantId);
  
  try {
    // Get SLA configuration
    const slaResult = await safeQuery(`
      SELECT review_cadence_days, assessment_timeout_hours, approval_timeout_hours, 
             escalation_threshold_hours FROM "${schema}".risk_admin_config
      WHERE module_code = 'risk'
    `);
    
    // Get escalation policy
    const escalationResult = await safeQuery(`
      SELECT auto_escalate_enabled, escalation_roles, escalation_conditions 
      FROM "${schema}".risk_escalation_policy
      WHERE module_code = 'risk'
    `);
    
    // Get runbook links
    const runbookResult = await safeQuery(`
      SELECT link_type, url FROM "${schema}".risk_runbook_links
      WHERE module_code = 'risk'
    `);
    
    // Get thresholds
    const thresholdResult = await safeQuery(`
      SELECT critical_risk_score, high_risk_score, overdue_review_days, stale_assessment_days
      FROM "${schema}".risk_thresholds
      WHERE module_code = 'risk'
    `);
    
    // Get AI settings
    const aiResult = await safeQuery(`
      SELECT enabled, model_config, confidence_threshold, auto_classification
      FROM "${schema}".risk_ai_settings
      WHERE module_code = 'risk'
    `);
    
    // Build runbook links object
    const runbookLinks = {
      riskAssessment: '',
      incidentResponse: '',
      complianceReporting: '',
      systemMaintenance: ''
    };
    
    if (runbookResult.rows.length > 0) {
      runbookResult.rows.forEach(row => {
        switch (row.link_type) {
          case 'risk_assessment':
            runbookLinks.riskAssessment = row.url;
            break;
          case 'incident_response':
            runbookLinks.incidentResponse = row.url;
            break;
          case 'compliance_reporting':
            runbookLinks.complianceReporting = row.url;
            break;
          case 'system_maintenance':
            runbookLinks.systemMaintenance = row.url;
            break;
        }
      });
    }
    
    return {
      moduleCode: 'risk',
      slaConfiguration: {
        reviewCadenceDays: slaResult.rows[0]?.review_cadence_days || 90,
        assessmentTimeoutHours: slaResult.rows[0]?.assessment_timeout_hours || 48,
        approvalTimeoutHours: slaResult.rows[0]?.approval_timeout_hours || 72,
        escalationThresholdHours: slaResult.rows[0]?.escalation_threshold_hours || 24,
      },
      escalationPolicy: {
        autoEscalateEnabled: escalationResult.rows[0]?.auto_escalate_enabled || false,
        escalationRoles: escalationResult.rows[0]?.escalation_roles || ['risk.executive_owner'],
        escalationConditions: escalationResult.rows[0]?.escalation_conditions || ['critical_risk', 'overdue_review'],
      },
      runbookLinks,
      thresholds: {
        criticalRiskScore: thresholdResult.rows[0]?.critical_risk_score || 20,
        highRiskScore: thresholdResult.rows[0]?.high_risk_score || 15,
        overdueReviewDays: thresholdResult.rows[0]?.overdue_review_days || 30,
        staleAssessmentDays: thresholdResult.rows[0]?.stale_assessment_days || 90,
      },
      aiSettings: {
        enabled: aiResult.rows[0]?.enabled || false,
        modelConfig: aiResult.rows[0]?.model_config || 'azure-openai',
        confidenceThreshold: aiResult.rows[0]?.confidence_threshold || 0.8,
        autoClassification: aiResult.rows[0]?.auto_classification || false,
      }
    };
    
  } catch (error) {
    logger.warn('[risk-admin] Failed to fetch admin config, returning defaults', { 
      tenantId, 
      error: (error as Error).message 
    });
    
    // Return default configuration
    return {
      moduleCode: 'risk',
      slaConfiguration: {
        reviewCadenceDays: 90,
        assessmentTimeoutHours: 48,
        approvalTimeoutHours: 72,
        escalationThresholdHours: 24,
      },
      escalationPolicy: {
        autoEscalateEnabled: false,
        escalationRoles: ['risk.executive_owner'],
        escalationConditions: ['critical_risk', 'overdue_review'],
      },
      runbookLinks: {
        riskAssessment: '',
        incidentResponse: '',
        complianceReporting: '',
        systemMaintenance: '',
      },
      thresholds: {
        criticalRiskScore: 20,
        highRiskScore: 15,
        overdueReviewDays: 30,
        staleAssessmentDays: 90,
      },
      aiSettings: {
        enabled: false,
        modelConfig: 'azure-openai',
        confidenceThreshold: 0.8,
        autoClassification: false,
      }
    };
  }
}

export async function updateAdminConfig(
  tenantId: string, 
  config: Partial<RiskAdminConfig>, 
  userId: string
): Promise<RiskAdminConfig> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

export async function getModuleHealth(tenantId: string): Promise<{
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    lastChecked: string;
  }>;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
}> {
  const schema = tenantSchema(tenantId);
  const checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    lastChecked: string;
  }> = [];
  
  try {
    // Check database connectivity
    const dbResult = await safeQuery(`SELECT 1`).catch((): { rows: unknown[] } => ({ rows: [] }));
    checks.push({
      name: 'database_connectivity',
      status: dbResult.rows.length > 0 ? 'pass' : 'fail',
      message: dbResult.rows.length > 0 ? 'Database connection successful' : 'Database connection failed',
      lastChecked: new Date().toISOString()
    });
    
    // Check table existence
    const tableResult = await safeQuery(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name IN ('risks', 'risk_assessments', 'risk_kris')
    `, [schema]).catch(() => ({ rows: [{ count: 0 }] }));
    
    const tableCount = parseInt(String(tableResult.rows[0]?.count || 0));
    checks.push({
      name: 'core_tables_exist',
      status: tableCount >= 3 ? 'pass' : 'fail',
      message: `${tableCount}/3 core tables found`,
      lastChecked: new Date().toISOString()
    });
    
    // Check for overdue reviews
    const overdueResult = await safeQuery(`
      SELECT COUNT(*) as count FROM "${schema}".risk_reviews 
      WHERE status = 'pending' AND due_date < NOW()
    `).catch(() => ({ rows: [{ count: 0 }] }));
    
    const overdueCount = parseInt(String(overdueResult.rows[0]?.count || 0));
    checks.push({
      name: 'overdue_reviews',
      status: overdueCount === 0 ? 'pass' : overdueCount > 10 ? 'fail' : 'warn',
      message: `${overdueCount} overdue reviews`,
      lastChecked: new Date().toISOString()
    });
    
    // Check for critical risks
    const criticalResult = await safeQuery(`
      SELECT COUNT(*) as count FROM "${schema}".risks 
      WHERE risk_score >= 20 AND status != 'closed'
    `).catch(() => ({ rows: [{ count: 0 }] }));
    
    const criticalCount = parseInt(String(criticalResult.rows[0]?.count || 0));
    checks.push({
      name: 'critical_risks',
      status: criticalCount === 0 ? 'pass' : criticalCount > 5 ? 'fail' : 'warn',
      message: `${criticalCount} critical risks`,
      lastChecked: new Date().toISOString()
    });
    
    // Calculate summary
    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.status === 'pass').length;
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warn').length;
    const healthy = failedChecks === 0;
    
    return {
      healthy,
      checks,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks
      }
    };
    
  } catch (error) {
    logger.error('[risk-admin] Health check failed', { 
      tenantId, 
      error: (error as Error).message 
    });
    
    return {
      healthy: false,
      checks: [{
        name: 'health_check_error',
        status: 'fail',
        message: `Health check failed: ${(error as Error).message}`,
        lastChecked: new Date().toISOString()
      }],
      summary: {
        totalChecks: 1,
        passedChecks: 0,
        failedChecks: 1,
        warningChecks: 0
      }
    };
  }
}
