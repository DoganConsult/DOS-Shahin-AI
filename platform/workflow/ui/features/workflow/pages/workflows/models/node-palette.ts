/**
 * Node palette metadata and builder for the workflow designer.
 * Combines types from the shared workflow-types package with action sub-types.
 */
import { WORKFLOW_NODE_TYPES_EXECUTED, WORKFLOW_NODE_TYPES_UI_ONLY } from '../../../../../../packages/shared-workflow-types-grc/src/index';

/** Palette node types: executed + UI-only (mirrors ALL_PALETTE_NODE_TYPES when package is used). */
export const ALL_PALETTE_NODE_TYPES: readonly string[] = [...WORKFLOW_NODE_TYPES_EXECUTED, ...WORKFLOW_NODE_TYPES_UI_ONLY];

export const NODE_TYPE_PALETTE_META: Record<string, { label: string; piIcon: string; category: string }> = {
  trigger: { label: 'Trigger', piIcon: 'pi pi-play', category: 'flow' },
  start: { label: 'Start', piIcon: 'pi pi-play', category: 'flow' },
  end: { label: 'End', piIcon: 'pi pi-stop-circle', category: 'flow' },
  condition: { label: 'Condition', piIcon: 'pi pi-question-circle', category: 'flow' },
  decision: { label: 'Decision', piIcon: 'pi pi-question-circle', category: 'flow' },
  approval: { label: 'Approval', piIcon: 'pi pi-check-square', category: 'governance' },
  notification: { label: 'Notification', piIcon: 'pi pi-bell', category: 'action' },
  action: { label: 'Action', piIcon: 'pi pi-bolt', category: 'action' },
  task: { label: 'Task', piIcon: 'pi pi-list-check', category: 'action' },
  governance: { label: 'Governance', piIcon: 'pi pi-building', category: 'governance' },
  delay: { label: 'Delay', piIcon: 'pi pi-clock', category: 'flow' },
  loop: { label: 'Loop', piIcon: 'pi pi-replay', category: 'flow' },
  parallel: { label: 'Parallel', piIcon: 'pi pi-arrows-h', category: 'flow' },
};

/** Build the full palette node type list from the shared package types + action sub-types. */
export function buildNodeTypesFromPackage(): { type: string; label: string; piIcon: string; category: string }[] {
  const fromPackage = ALL_PALETTE_NODE_TYPES.map((type: string) => {
    const meta = NODE_TYPE_PALETTE_META[type] ?? {
      label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
      piIcon: 'pi pi-circle',
      category: 'action',
    };
    return { type, ...meta };
  });
  const actionSubTypes = [
    { type: 'api_call', label: 'API Call', piIcon: 'pi pi-globe', category: 'action' },
    { type: 'send_email', label: 'Send Email', piIcon: 'pi pi-envelope', category: 'action' },
    { type: 'webhook', label: 'Webhook', piIcon: 'pi pi-link', category: 'action' },
    { type: 'db_query', label: 'DB Query', piIcon: 'pi pi-database', category: 'action' },
    { type: 'create_task', label: 'Create Task', piIcon: 'pi pi-list-check', category: 'action' },
    { type: 'ai_agent', label: 'AI Agent', piIcon: 'pi pi-microchip-ai', category: 'action' },
    { type: 'escalation', label: 'Escalation', piIcon: 'pi pi-exclamation-triangle', category: 'governance' },
  ];
  return [...fromPackage, ...actionSubTypes];
}
