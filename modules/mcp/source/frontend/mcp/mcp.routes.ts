import { Routes } from '@angular/router';
import { McpHubComponent } from './pages/mcp-hub.component';

export const MCP_ROUTES: Routes = [
  { path: '', component: McpHubComponent, data: { breadcrumb: 'Mcp', permission: 'mcp.read' } }
];
