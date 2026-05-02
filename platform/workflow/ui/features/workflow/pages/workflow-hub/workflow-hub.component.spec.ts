// WorkflowHubComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'workflow-hub.component.ts'), 'utf-8');

describe('WorkflowHubComponent', () => {
  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-workflow-hub', () => {
    expect(src).toMatch(/selector:\s*['"]app-workflow-hub['"]/);
  });

  it('should export WorkflowHubComponent class', () => {
    expect(src).toContain('export class WorkflowHubComponent');
  });

  it('should implement OnInit', () => {
    expect(src).toContain('implements OnInit');
  });

  it('should inject I18nService for bilingual support', () => {
    expect(src).toContain('I18nService');
    expect(src).toContain('inject(I18nService)');
  });

  it('should inject ActivatedRoute for query param reading', () => {
    expect(src).toContain('ActivatedRoute');
    expect(src).toContain('inject(ActivatedRoute)');
  });

  it('should inject Router for navigation', () => {
    expect(src).toContain('inject(Router)');
  });

  it('should define TABS constant with all hub tabs', () => {
    expect(src).toContain("key: 'workflows'");
    expect(src).toContain("key: 'templates'");
    expect(src).toContain("key: 'autonomous'");
    expect(src).toContain("key: 'chains'");
    expect(src).toContain("key: 'automation'");
    expect(src).toContain("key: 'lifecycle'");
    expect(src).toContain("key: 'metrics'");
  });

  it('should have activeTab signal defaulting to workflows', () => {
    expect(src).toMatch(/activeTab\s*=\s*signal<string>\(['"]workflows['"]\)/);
  });

  it('should read tab from query params on init', () => {
    expect(src).toContain('queryParamMap');
    expect(src).toContain("p.get('tab')");
  });

  it('should set activeTab from query param when valid', () => {
    expect(src).toContain('TABS.some(t => t.key === tab)');
    expect(src).toContain('this.activeTab.set(tab)');
  });

  it('should have wfTab signal for sub-tab routing', () => {
    expect(src).toContain('wfTab = signal<string | null>(null)');
  });

  it('should have openDesigner method for canvas navigation', () => {
    expect(src).toContain('openDesigner');
    expect(src).toContain("wfTab: 'designer'");
  });

  it('should import child tab components', () => {
    expect(src).toContain('WorkflowsComponent');
    expect(src).toContain('WorkflowTemplatesComponent');
    expect(src).toContain('WorkflowChainsTabComponent');
    expect(src).toContain('AutomationRulesTabComponent');
    expect(src).toContain('LifecycleTabComponent');
    expect(src).toContain('WorkflowMetricsTabComponent');
  });

  it('should use AgentBadgeComponent for agent identity', () => {
    expect(src).toContain('AgentBadgeComponent');
    expect(src).toContain("agentId = 'A08'");
  });

  it('should render tab bar with role=tablist', () => {
    expect(src).toContain('role="tablist"');
    expect(src).toContain('role="tab"');
  });

  it('should use hub-connections-strip with workflow key', () => {
    expect(src).toContain('app-hub-connections-strip');
    expect(src).toContain("'workflow'");
  });
});
