// ── Shared connector type definitions ──────────────────────────────────────
// Used by both connector-manager and integration-marketplace components.

export interface CredentialField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'password' | 'url';
  placeholder?: string;
}

export interface PlatformDef {
  value: string;
  label: string;
  fields: CredentialField[];
  authMethod: string;
}

export interface ConnectorTypeDef {
  key: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  platforms: PlatformDef[];
  defaultSchedule: string;
}

export const CONNECTOR_TYPES: ConnectorTypeDef[] = [
  {
    key: 'siem', label: 'SIEM / EDR', icon: 'pi-shield', description: 'Security alerts from Splunk, Azure Sentinel, QRadar',
    color: '#dc2626', defaultSchedule: '*/15 * * * *',
    platforms: [
      { value: 'splunk', label: 'Splunk', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Splunk Base URL', required: true, type: 'url', placeholder: 'https://splunk.company.com:8089' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'sentinel', label: 'Azure Sentinel', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { key: 'subscriptionId', label: 'Subscription ID', required: true },
          { key: 'resourceGroup', label: 'Resource Group', required: true },
          { key: 'workspaceName', label: 'Workspace Name', required: true },
        ] },
      { value: 'generic', label: 'Generic SIEM API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'iam', label: 'IAM / Identity', icon: 'pi-users', description: 'User identity from Azure AD, Okta, Ping Identity',
    color: '#7c3aed', defaultSchedule: '0 */4 * * *',
    platforms: [
      { value: 'azure_ad', label: 'Azure AD / Entra ID', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'okta', label: 'Okta', authMethod: 'api_key',
        fields: [
          { key: 'domain', label: 'Okta Domain', required: true, placeholder: 'company.okta.com' },
          { key: 'apiToken', label: 'API Token', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic IAM API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'itsm', label: 'ITSM / Ticketing', icon: 'pi-ticket', description: 'Tickets from ServiceNow, Jira Service Management',
    color: '#0284c7', defaultSchedule: '*/30 * * * *',
    platforms: [
      { value: 'servicenow', label: 'ServiceNow', authMethod: 'oauth2',
        fields: [
          { key: 'instance', label: 'Instance', required: true, placeholder: 'company.service-now.com' },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'jira', label: 'Jira Service Management', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Jira Base URL', required: true, type: 'url', placeholder: 'https://company.atlassian.net' },
          { key: 'email', label: 'Email', required: true },
          { key: 'apiToken', label: 'API Token', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic ITSM API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'cmdb', label: 'CMDB / Assets', icon: 'pi-server', description: 'Asset inventory from ServiceNow CMDB, Device42',
    color: '#059669', defaultSchedule: '0 3 * * *',
    platforms: [
      { value: 'servicenow', label: 'ServiceNow CMDB', authMethod: 'basic',
        fields: [
          { key: 'instance', label: 'Instance', required: true, placeholder: 'company.service-now.com' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic CMDB API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'vuln', label: 'Vulnerability Scanner', icon: 'pi-exclamation-triangle', description: 'Scan results from Qualys, Tenable, Rapid7',
    color: '#ea580c', defaultSchedule: '0 4 * * *',
    platforms: [
      { value: 'qualys', label: 'Qualys', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Qualys API URL', type: 'url', placeholder: 'https://qualysapi.qualys.com' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'tenable', label: 'Tenable / Nessus', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'Tenable URL', type: 'url', placeholder: 'https://cloud.tenable.com' },
          { key: 'accessKey', label: 'Access Key', required: true, type: 'password' },
          { key: 'secretKey', label: 'Secret Key', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic Vuln API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
  {
    key: 'outlook', label: 'Microsoft 365', icon: 'pi-microsoft', description: 'Outlook, SharePoint, OneDrive, Teams, Power BI, Dynamics 365',
    color: '#2563eb', defaultSchedule: '0 2 * * *',
    platforms: [
      { value: 'azure_ad', label: 'Microsoft 365 (Graph API)', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID (App Registration)', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'teams', label: 'Microsoft Teams', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'power_bi', label: 'Power BI', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { key: 'workspaceId', label: 'Workspace ID', required: true },
        ] },
      { value: 'dynamics365', label: 'Dynamics 365', authMethod: 'oauth2',
        fields: [
          { key: 'tenantId', label: 'Azure Tenant ID', required: true },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
          { key: 'environmentUrl', label: 'Environment URL', required: true, type: 'url', placeholder: 'https://org.crm.dynamics.com' },
        ] },
    ],
  },
  {
    key: 'erp', label: 'ERP / Financial', icon: 'pi-chart-bar', description: 'Financial records from SAP S/4HANA, Oracle',
    color: '#b45309', defaultSchedule: '0 1 * * *',
    platforms: [
      { value: 'sap', label: 'SAP S/4HANA', authMethod: 'oauth2',
        fields: [
          { key: 'baseUrl', label: 'SAP Base URL', required: true, type: 'url' },
          { key: 'tokenUrl', label: 'OAuth Token URL', type: 'url' },
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true, type: 'password' },
        ] },
      { value: 'oracle', label: 'Oracle ERP Cloud', authMethod: 'basic',
        fields: [
          { key: 'baseUrl', label: 'Oracle Base URL', required: true, type: 'url' },
          { key: 'username', label: 'Username', required: true },
          { key: 'password', label: 'Password', required: true, type: 'password' },
        ] },
      { value: 'generic', label: 'Generic ERP API', authMethod: 'api_key',
        fields: [
          { key: 'baseUrl', label: 'API Base URL', required: true, type: 'url' },
          { key: 'apiKey', label: 'API Key', required: true, type: 'password' },
        ] },
    ],
  },
];

export const SCHEDULE_PRESETS = [
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'Daily at 2:00 AM', value: '0 2 * * *' },
  { label: 'Daily at 4:00 AM', value: '0 4 * * *' },
  { label: 'Custom', value: 'custom' },
];
