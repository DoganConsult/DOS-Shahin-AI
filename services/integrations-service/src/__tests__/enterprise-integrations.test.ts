import { describe, it, expect, vi } from 'vitest';
import { cisoAssistant, openProject, govReady } from '../domain/connectors/enterprise-integrations';
import { logger } from '@dos/platform-core/observability';

describe('Enterprise Integrations', () => {
  it('should initialize successfully', () => {
    expect(cisoAssistant).toBeDefined();
    expect(openProject).toBeDefined();
    expect(govReady).toBeDefined();
  });

  it('should safely sync without exploding (Failsafe execution wrapper)', async () => {
    // We expect the integrations to execute without throwing TypeErrors,
    // thereby proving our syntax, export map, and typescript paths are sound.
    
    // Silence logger temporarily to keep test trace clean during success path
    const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    
    await expect(cisoAssistant.syncRiskEvent('test-audit', 'critical')).resolves.not.toThrow();
    await expect(openProject.createRemediationTask('task-op', 'Test Task')).resolves.not.toThrow();
    await expect(govReady.auditComplianceBaseline('tenant-test')).resolves.not.toThrow();
    
    loggerSpy.mockRestore();
  });
});
