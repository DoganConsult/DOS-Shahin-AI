// @ts-nocheck — module-layer imports not yet extracted
import type { CanonicalModuleCode } from '../../config/canonical-modules';

interface PermissionMapping {
  permissionCode: string;
  moduleCode: string;
}

export const AGRC_PERMISSION_MAP: Record<string, PermissionMapping> = {
  'foundation.org.read':  { permissionCode: 'foundation.structure.read', moduleCode: 'foundation' },
  'foundation.org.write': { permissionCode: 'foundation.structure.update', moduleCode: 'foundation' },
  'organization:read':  { permissionCode: 'foundation.organization.read', moduleCode: 'foundation' },
  'organization:write': { permissionCode: 'foundation.organization.update', moduleCode: 'foundation' },
  'business_unit:read':  { permissionCode: 'foundation.business_unit.read', moduleCode: 'foundation' },
  'business_unit:write': { permissionCode: 'foundation.business_unit.update', moduleCode: 'foundation' },
  'department:read':  { permissionCode: 'foundation.department.read', moduleCode: 'foundation' },
  'department:write': { permissionCode: 'foundation.department.update', moduleCode: 'foundation' },
  'location:read':    { permissionCode: 'foundation.location.read', moduleCode: 'foundation' },
  'location:write':   { permissionCode: 'foundation.location.update', moduleCode: 'foundation' },
  'tenant.config.read':  { permissionCode: 'foundation.tenant_config.read', moduleCode: 'foundation' },
  'tenant.config.write': { permissionCode: 'foundation.tenant_config.update', moduleCode: 'foundation' },

  'risk.record.read':        { permissionCode: 'risk.record.read', moduleCode: 'risk' },
  'risk.record.write':       { permissionCode: 'risk.record.update', moduleCode: 'risk' },
  'risk:delete':              { permissionCode: 'risk.record.delete', moduleCode: 'risk' },

  'compliance.program.read':  { permissionCode: 'compliance.program.read', moduleCode: 'compliance' },
  'compliance.program.write': { permissionCode: 'compliance.program.update', moduleCode: 'compliance' },
  'compliance:delete':        { permissionCode: 'compliance.program.delete', moduleCode: 'compliance' },

  'policy.record.read':  { permissionCode: 'policy.record.read', moduleCode: 'policy' },
  'policy.record.write': { permissionCode: 'policy.record.update', moduleCode: 'policy' },
  'policy:delete':       { permissionCode: 'policy.record.delete', moduleCode: 'policy' },

  'evidence.item.read':  { permissionCode: 'evidence.item.read', moduleCode: 'evidence' },
  'evidence.item.write': { permissionCode: 'evidence.item.write', moduleCode: 'evidence' },
  'evidence:delete':     { permissionCode: 'evidence.item.delete', moduleCode: 'evidence' },

  'audit.record.read':   { permissionCode: 'audit.record.read', moduleCode: 'audit' },
  'audit.record.write':  { permissionCode: 'audit.record.write', moduleCode: 'audit' },
  'audit.record.manage': { permissionCode: 'audit.record.manage', moduleCode: 'audit' },
  'audit:delete':        { permissionCode: 'audit.record.delete', moduleCode: 'audit' },

  'incident.record.read':  { permissionCode: 'incident.record.read', moduleCode: 'incident' },
  'incident.record.write': { permissionCode: 'incident.record.update', moduleCode: 'incident' },
  'incident:delete':       { permissionCode: 'incident.record.delete', moduleCode: 'incident' },

  'exception.record.read':  { permissionCode: 'exception.record.read', moduleCode: 'exception' },
  'exception.record.write': { permissionCode: 'exception.record.update', moduleCode: 'exception' },
  'exception:delete':       { permissionCode: 'exception.record.delete', moduleCode: 'exception' },

  'governance.record.read':  { permissionCode: 'governance.record.read', moduleCode: 'governance' },
  'governance.record.write': { permissionCode: 'governance.record.update', moduleCode: 'governance' },
  'governance:delete':       { permissionCode: 'governance.record.delete', moduleCode: 'governance' },

  'vendor.record.read':   { permissionCode: 'vendor.record.read', moduleCode: 'vendor' },
  'vendor.record.write':  { permissionCode: 'vendor.record.update', moduleCode: 'vendor' },
  'vendor.record.manage': { permissionCode: 'vendor.record.manage', moduleCode: 'vendor' },
  'vendor:delete':        { permissionCode: 'vendor.record.delete', moduleCode: 'vendor' },

  'bcp.plan.read':  { permissionCode: 'bcp.plan.read', moduleCode: 'bcp' },
  'bcp.plan.write': { permissionCode: 'bcp.plan.write', moduleCode: 'bcp' },
  'bcp:delete':     { permissionCode: 'bcp.plan.delete', moduleCode: 'bcp' },

  'asset.record.read':       { permissionCode: 'asset.record.read', moduleCode: 'asset' },
  'asset.record.write':      { permissionCode: 'asset.record.update', moduleCode: 'asset' },
  'asset:delete':     { permissionCode: 'asset.record.update', moduleCode: 'asset' },

  'remediation.task.read': { permissionCode: 'remediation.task.read', moduleCode: 'remediation' },
  'remediation:write':{ permissionCode: 'remediation.task.update', moduleCode: 'remediation' },
  'remediation:delete':{ permissionCode: 'remediation.task.delete', moduleCode: 'remediation' },

  'action.item.read':      { permissionCode: 'action.item.read', moduleCode: 'action' },
  'action:write':     { permissionCode: 'action.item.update', moduleCode: 'action' },
  'action:delete':    { permissionCode: 'action.item.delete', moduleCode: 'action' },

  'training.record.read':    { permissionCode: 'training.program.read', moduleCode: 'training' },
  'training.record.write':   { permissionCode: 'training.program.manage', moduleCode: 'training' },
  'training:delete':         { permissionCode: 'training.program.delete', moduleCode: 'training' },

  'controls.record.read':  { permissionCode: 'controls.record.read', moduleCode: 'controls' },
  'controls.record.write': { permissionCode: 'controls.record.update', moduleCode: 'controls' },
  'controls:delete':       { permissionCode: 'controls.record.delete', moduleCode: 'controls' },

  'issues.record.read':  { permissionCode: 'issues.record.read', moduleCode: 'issues' },
  'issues.record.write': { permissionCode: 'issues.record.update', moduleCode: 'issues' },
  'issues:delete':       { permissionCode: 'issues.record.delete', moduleCode: 'issues' },

  'privacy.record.read':  { permissionCode: 'privacy.record.read', moduleCode: 'privacy' },
  'privacy.record.write': { permissionCode: 'privacy.record.update', moduleCode: 'privacy' },
  'privacy:delete':       { permissionCode: 'privacy.record.delete', moduleCode: 'privacy' },

  'dora.record.read':  { permissionCode: 'dora.record.read', moduleCode: 'dora' },
  'dora.record.write': { permissionCode: 'dora.record.update', moduleCode: 'dora' },
  'dora:delete':       { permissionCode: 'dora.record.delete', moduleCode: 'dora' },

  'qiyas.record.read':  { permissionCode: 'qiyas.record.read', moduleCode: 'qiyas' },
  'qiyas.record.write': { permissionCode: 'qiyas.record.update', moduleCode: 'qiyas' },
  'qiyas:delete':       { permissionCode: 'qiyas.record.delete', moduleCode: 'qiyas' },

  'report.document.read':     { permissionCode: 'report.document.read', moduleCode: 'reporting' },
  'report.document.write':    { permissionCode: 'report.document.write', moduleCode: 'reporting' },
  'report.document.download': { permissionCode: 'report.document.download', moduleCode: 'reporting' },
  'report.document.share':    { permissionCode: 'report.document.share', moduleCode: 'reporting' },

  'ai.agent.write':         { permissionCode: 'ai.governance.write', moduleCode: 'ai' },
  'ai.agent.approve':       { permissionCode: 'ai.governance.approve.agent', moduleCode: 'ai' },
  'ai.model.approve':       { permissionCode: 'ai.governance.approve.model', moduleCode: 'ai' },
  'ai.prompt.approve':      { permissionCode: 'ai.governance.approve.prompt', moduleCode: 'ai' },
  'ai.governance.approve':  { permissionCode: 'ai.governance.approve', moduleCode: 'ai' },

  'admin.system.manage': { permissionCode: 'admin.system.manage', moduleCode: 'admin' },
};

export function resolvePermission(legacyCode: string): PermissionMapping | undefined {
  return AGRC_PERMISSION_MAP[legacyCode];
}

export function getModulePermissions(moduleCode: string): PermissionMapping[] {
  return Object.values(AGRC_PERMISSION_MAP).filter(p => p.moduleCode === moduleCode);
}
