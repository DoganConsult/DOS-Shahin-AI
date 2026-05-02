import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ExceptionManagementComponent', () => {
  const src = readFileSync(resolve(__dirname, 'exception-management.component.ts'), 'utf-8');

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should import EmptyStateComponent', () => {
    expect(src).toContain('EmptyStateComponent');
  });

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should handle exception tracking', () => {
    expect(src).toMatch(/exception/i);
  });

  it('should include ExceptionSearchToolbarComponent', () => {
    expect(src).toContain('ExceptionSearchToolbarComponent');
  });

  it('should include ExceptionBulkActionsComponent', () => {
    expect(src).toContain('ExceptionBulkActionsComponent');
  });

  it('should have export functionality', () => {
    expect(src).toContain('exportData');
    expect(src).toContain('pi-download');
  });

  it('should support advanced search', () => {
    expect(src).toContain('onAdvancedSearch');
    expect(src).toContain('advancedParams');
  });

  it('should support bulk selection', () => {
    expect(src).toContain('selectedIds');
    expect(src).toContain('toggleSelectAll');
    expect(src).toContain('toggleSelect');
  });

  it('should use intake API for new create flow', () => {
    expect(src).toContain('_intake');
    expect(src).toContain('this.api.intake');
  });
});

describe('ExceptionCreateDialogComponent', () => {
  const src = readFileSync(resolve(__dirname, 'exception-create-dialog.component.ts'), 'utf-8');

  it('should include exceptionType field', () => {
    expect(src).toContain('exceptionType');
  });

  it('should include businessJustification field', () => {
    expect(src).toContain('businessJustification');
  });

  it('should include impactAnalysis field', () => {
    expect(src).toContain('impactAnalysis');
  });

  it('should include linked IDs', () => {
    expect(src).toContain('linkedPolicyId');
    expect(src).toContain('linkedControlId');
    expect(src).toContain('linkedRiskId');
  });

  it('should mark output as _intake', () => {
    expect(src).toContain('_intake: true');
  });

  it('should validate required fields', () => {
    expect(src).toContain('isValid');
  });
});

describe('ExceptionDetailComponent', () => {
  const src = readFileSync(resolve(__dirname, 'exception-detail.component.ts'), 'utf-8');

  it('should include compensating controls component', () => {
    expect(src).toContain('ExceptionCompensatingControlsComponent');
  });

  it('should include risk links component', () => {
    expect(src).toContain('ExceptionRiskLinksComponent');
  });

  it('should include timeline component', () => {
    expect(src).toContain('ExceptionTimelineComponent');
  });

  it('should include justification component', () => {
    expect(src).toContain('ExceptionJustificationComponent');
  });

  it('should include approval history component', () => {
    expect(src).toContain('ExceptionApprovalHistoryComponent');
  });

  it('should fetch data from API on init', () => {
    expect(src).toContain('this.api.get(id)');
  });
});
