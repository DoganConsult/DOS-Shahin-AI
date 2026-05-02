/**
 * Admin barrel — Sprint 4 Law 9 domain cluster.
 */
export { AdminApiService } from './admin-api.service';
export { AdminTenantDto, AdminHealthDto, ProfileDto, AdminConfigApiService } from './admin-config-api.service';
export { AdminUserDto, InvitationDto, MemberDirectoryDto, AdminUserApiService } from './admin-user-api.service';
export { McpAgentDto, McpToolDto, McpPromptDto, McpAdminApiService } from './mcp-admin-api.service';
export { RegulatorDto, SectorDto, SimulationDto } from './platform-api.service';
export { PlatformBootstrapService } from './platform-bootstrap.service';
export { PlatformMode, PlatformModeConfig, AgentRbacEntry, PlatformModeService } from './platform-mode.service';
export { PlatformStatsService } from '../services/platform/platform-stats.service';
export type { PlatformSummary, ModuleLOC, ModuleFunctionalityEval } from '../services/platform/platform-stats.service';
export * from './platform-api.types';
