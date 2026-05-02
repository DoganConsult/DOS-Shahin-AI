/**
 * Packs Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner packs
 * @module packs
 * @since 2026-03-31
 */

import { z } from 'zod';
import { paginationQuery } from '../../../schemas/common.schemas';

// ---------------------------------------------------------------------------
// Pack Installation
// ---------------------------------------------------------------------------

/** Body for installing a content pack into a workspace. */
export const installPackBody = z.object({
  pack_code: z.string().min(1).max(100),
  applies_to_role: z.string().max(100).optional(),
  workspace_id: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Policy Evaluation
// ---------------------------------------------------------------------------

/** Body for evaluating pack policies against an onboarding session. */
export const evaluatePoliciesBody = z.object({
  session_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Pack Listing  
// ---------------------------------------------------------------------------

/** Query for listing available packs. */
export const listPacksQuery = paginationQuery.extend({
  category: z.string().max(100).optional(),
  installed: z.preprocess(
    (v) => v === 'true' || v === '1' || v === true,
    z.boolean(),
  ).optional(),
});

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type InstallPackBody = z.infer<typeof installPackBody>;
export type ListPacksQuery = z.infer<typeof listPacksQuery>;
export const updateSettingsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSyncBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRetryBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createForceUninstallBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createInstallBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createUninstallBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEvaluateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

