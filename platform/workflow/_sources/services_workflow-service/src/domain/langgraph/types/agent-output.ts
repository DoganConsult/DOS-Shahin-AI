// ============================================
// LangGraph Agent Output Schema
// Zod schema for structured agent output
// ============================================

import { z } from 'zod';

const actionTypes = ['create_task', 'send_notification', 'publish_event', 'flag_risk', 'request_evidence', 'update_record', 'escalate'] as const;
const priorities = ['critical', 'high', 'medium', 'low'] as const;
const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;

export const AgentActionSchema = z.object({
  type: z.enum(actionTypes),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(priorities).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export const AgentDiscoverySchema = z.object({
  type: z.string(),
  summary: z.string(),
  severity: z.enum(severities),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const AgentOutputSchema = z.object({
  reasoning: z.string().describe('Brief explanation of analysis and conclusions'),
  discoveries: z.array(AgentDiscoverySchema).default([]),
  actions: z.array(AgentActionSchema).default([]),
  handoffMessage: z.string().optional().describe('Message for downstream agents'),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentDiscoveryOutput = z.infer<typeof AgentDiscoverySchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
