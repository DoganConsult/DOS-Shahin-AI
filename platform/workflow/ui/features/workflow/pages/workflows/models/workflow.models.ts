import { GrcRecord } from '@app/core/models/shared.types';
/**
 * Workflow domain models shared across workflow sub-components.
 */

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'governance' | 'end' | 'api_call' | 'send_email' | 'webhook' | 'db_query' | 'approval' | 'notification' | 'create_task' | 'ai_agent' | 'escalation' | 'delay' | 'loop' | 'parallel';
  label: string;
  config: Record<string, any>;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface PredefinedTemplate {
  templateKey: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  definition: {
    nodes: GrcRecord[];
    edges: GrcRecord[];
    swimlanes: string[];
    escalationChain: string[];
  };
}

export interface ExtTemplate {
  templateId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  steps: GrcRecord[];
  notificationConfig: GrcRecord[];
  slaConfig: Record<string, any>;
}
