/**
 * Tenant Service HTTP Contracts
 * Owner: tenant-service (port 4002)
 * Source: extracted from monolith DOS platform (tenancy, foundation, provisioning)
 */

// --- Request DTOs ---

export interface CreateTenantRequest {
  name: string;
  slug: string;
  productCodes: string[];
  ownerUserId: string;
  config?: TenantConfigOverrides;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: 'active' | 'suspended' | 'decommissioned';
  config?: TenantConfigOverrides;
}

export interface TenantConfigOverrides {
  locale?: string;
  timezone?: string;
  enabledModules?: string[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
}

export interface ProvisionWorkspaceRequest {
  tenantId: string;
  workspaceName: string;
  templateId?: string;
}

// --- Response DTOs ---

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'decommissioned';
  schemaName: string;
  productCodes: string[];
  enabledModules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantConfig {
  tenantId: string;
  locale: string;
  timezone: string;
  enabledModules: string[];
  branding: {
    logoUrl: string;
    primaryColor: string;
  };
  featureFlags: Record<string, boolean>;
}

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  status: 'provisioning' | 'active' | 'archived';
  createdAt: string;
}

// --- API Route Contracts (enriched per DOS-AIO-Specs Law 5) ---

export const TENANT_API_ROUTES = {
  list: {
    method: 'GET' as const, path: '/api/tenants',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:tenants:list',
    requestType: 'StandardListParams', responseType: 'StandardListResponse<Tenant>',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  create: {
    method: 'POST' as const, path: '/api/tenants',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:tenants:create',
    requestType: 'CreateTenantRequest', responseType: 'Tenant',
    emitsEvent: 'provisioning.tenant_provisioned', errorModel: 'ServiceErrorResponse',
  },
  get: {
    method: 'GET' as const, path: '/api/tenants/:id',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:tenants:read',
    requestType: null, responseType: 'Tenant',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  update: {
    method: 'PUT' as const, path: '/api/tenants/:id',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:tenants:update',
    requestType: 'UpdateTenantRequest', responseType: 'Tenant',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  getConfig: {
    method: 'GET' as const, path: '/api/tenants/:id/config',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:config:read',
    requestType: null, responseType: 'TenantConfig',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  updateConfig: {
    method: 'PUT' as const, path: '/api/tenants/:id/config',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:config:update',
    requestType: 'TenantConfigOverrides', responseType: 'TenantConfig',
    emitsEvent: 'admin.config_updated', errorModel: 'ServiceErrorResponse',
  },
  provisionWorkspace: {
    method: 'POST' as const, path: '/api/tenants/:id/workspaces',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:workspaces:create',
    requestType: 'ProvisionWorkspaceRequest', responseType: 'Workspace',
    emitsEvent: 'provisioning.tenant_provisioned', errorModel: 'ServiceErrorResponse',
  },
  listWorkspaces: {
    method: 'GET' as const, path: '/api/tenants/:id/workspaces',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'authenticated' as const, permission: 'tenant:workspaces:list',
    requestType: null, responseType: 'StandardListResponse<Workspace>',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  navigationRegister: {
    method: 'POST' as const, path: '/api/tenants/navigation/register',
    contractVersion: 1, ownerService: 'tenant-service',
    authMode: 'service' as const, permission: 'tenant:navigation:register',
    requestType: 'NavigationRegisterRequest', responseType: 'StandardMutationResponse',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
} as const;

export interface NavigationRegisterRequest { product: string; entries: Array<{ label: string; icon: string; route: string; module: string; requiredPermissions: string[] }>; }
