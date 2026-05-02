import { z } from 'zod';

// ── Agent Cycle (orchestrator run) ──────────────────────────────────

export const startCycleBody = z.object({
  mode: z.enum(['autonomous', 'hybrid', 'supervised']).optional().default('hybrid'),
  agents: z.array(z.string()).optional(),
  context: z.record(z.unknown()).optional(),
});

export const listCyclesQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Agent Discovery ─────────────────────────────────────────────────

export const listDiscoveriesQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  agentId: z.string().optional(),
  cycleId: z.string().optional(),
  severity: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Agent Run ───────────────────────────────────────────────────────

export const invokeAgentBody = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  task: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  mode: z.enum(['autonomous', 'hybrid', 'supervised']).optional().default('hybrid'),
});

export const approveActionBody = z.object({
  actionId: z.string().min(1, 'actionId is required'),
  approved: z.boolean(),
  reason: z.string().optional(),
});

// ── Handoff ─────────────────────────────────────────────────────────

export const createHandoffBody = z.object({
  fromAgent: z.string().min(1),
  toAgent: z.string().min(1),
  payload: z.record(z.unknown()),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium'),
});
