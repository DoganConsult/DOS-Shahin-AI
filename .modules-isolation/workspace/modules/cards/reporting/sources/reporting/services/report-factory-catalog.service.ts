import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AgrcReport {
  id: string;
  reportId: string;
  title: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  moduleCode: string;
  templateId: string;
  generatedAt: string;
  icon: string;
  gradient: string;
  priority: string;
  estimatedPages: number;
  frequency: string;
  formats: string[];
  charts: string[];
  roles: string[];
  hubs: string[];
  stages: string[];
}

export interface RoleProfile {
  key: string;
  roleCode: string;
  label: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  color: string;
  reportAccess: string[];
}

export interface WorkspaceHub {
  key: string;
  hubId: string;
  label: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  color: string;
  modules: string[];
}

export interface LifecycleStage {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  color: string;
}

/* ── Static catalog data (role-based, workspace-based, lifecycle-based reports) ── */

const ROLES: RoleProfile[] = [
  { key: 'ceo', roleCode: 'ceo', label: 'CEO', labelEn: 'CEO', labelAr: 'الرئيس التنفيذي', icon: 'pi-building', color: '#1d4ed8', reportAccess: [] },
  { key: 'ciso', roleCode: 'ciso', label: 'CISO', labelEn: 'CISO', labelAr: 'مسؤول أمن المعلومات', icon: 'pi-shield', color: '#991b1b', reportAccess: [] },
  { key: 'compliance', roleCode: 'compliance', label: 'Compliance', labelEn: 'Compliance Officer', labelAr: 'مسؤول الامتثال', icon: 'pi-check-circle', color: '#065f46', reportAccess: [] },
  { key: 'risk', roleCode: 'risk', label: 'Risk Manager', labelEn: 'Risk Manager', labelAr: 'مدير المخاطر', icon: 'pi-exclamation-triangle', color: '#b45309', reportAccess: [] },
  { key: 'auditor', roleCode: 'auditor', label: 'Auditor', labelEn: 'Internal Auditor', labelAr: 'مدقق داخلي', icon: 'pi-search', color: '#6d28d9', reportAccess: [] },
  { key: 'control-owner', roleCode: 'control-owner', label: 'Control Owner', labelEn: 'Control Owner', labelAr: 'مالك الضابط', icon: 'pi-cog', color: '#0f766e', reportAccess: [] },
];

const WORKSPACE_HUBS: WorkspaceHub[] = [
  { key: 'governance', hubId: 'governance', label: 'Governance', labelEn: 'Governance', labelAr: 'الحوكمة', icon: 'pi-building', color: 'var(--hub-governance)', modules: [] },
  { key: 'risk', hubId: 'risk', label: 'Risk', labelEn: 'Risk', labelAr: 'المخاطر', icon: 'pi-exclamation-triangle', color: 'var(--hub-risk)', modules: [] },
  { key: 'compliance', hubId: 'compliance', label: 'Compliance', labelEn: 'Compliance', labelAr: 'الامتثال', icon: 'pi-shield', color: 'var(--hub-compliance)', modules: [] },
  { key: 'audit', hubId: 'audit', label: 'Audit', labelEn: 'Audit', labelAr: 'التدقيق', icon: 'pi-search', color: 'var(--success)', modules: [] },
];

const LIFECYCLE_STAGES: LifecycleStage[] = [
  { key: 'planning', labelEn: 'Planning', labelAr: 'التخطيط', icon: 'pi-calendar', color: '#3b82f6' },
  { key: 'execution', labelEn: 'Execution', labelAr: 'التنفيذ', icon: 'pi-play', color: '#f59e0b' },
  { key: 'monitoring', labelEn: 'Monitoring', labelAr: 'المراقبة', icon: 'pi-eye', color: '#8b5cf6' },
  { key: 'review', labelEn: 'Review', labelAr: 'المراجعة', icon: 'pi-check-square', color: '#22c55e' },
];

const REPORTS: AgrcReport[] = [];

@Injectable({ providedIn: 'root' })
export class ReportFactoryCatalogService {
  private http = inject(HttpClient);

  readonly roles = ROLES;
  readonly workspaceHubs = WORKSPACE_HUBS;
  readonly lifecycleStages = LIFECYCLE_STAGES;

  getCatalog(): Observable<AgrcReport[]> { return this.http.get<AgrcReport[]>('/api/reports/catalog'); }
  getRoleProfiles(): Observable<RoleProfile[]> { return this.http.get<RoleProfile[]>('/api/reports/role-profiles'); }
  getHubs(): Observable<WorkspaceHub[]> { return this.http.get<WorkspaceHub[]>('/api/reports/hubs'); }

  getTotalReportCount(): number { return REPORTS.length; }
  getRoleReportCount(): number { return REPORTS.filter(r => r.roles?.length > 0).length; }
  getWorkspaceReportCount(): number { return REPORTS.filter(r => r.hubs?.length > 0).length; }
  getLifecycleReportCount(): number { return REPORTS.filter(r => r.stages?.length > 0).length; }

  getReportsByRole(roleKey: string): AgrcReport[] { return REPORTS.filter(r => r.roles?.includes(roleKey)); }
  getAllRoleReports(): AgrcReport[] { return REPORTS.filter(r => r.roles?.length > 0); }

  getReportsByWorkspace(hubKey: string): AgrcReport[] { return REPORTS.filter(r => r.hubs?.includes(hubKey)); }
  getAllWorkspaceReports(): AgrcReport[] { return REPORTS.filter(r => r.hubs?.length > 0); }

  getReportsByLifecycle(stageKey: string): AgrcReport[] { return REPORTS.filter(r => r.stages?.includes(stageKey)); }
  getAllLifecycleReports(): AgrcReport[] { return REPORTS.filter(r => r.stages?.length > 0); }
}
