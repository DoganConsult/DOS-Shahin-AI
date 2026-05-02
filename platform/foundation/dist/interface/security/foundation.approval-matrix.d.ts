/**
 * foundation — Approval Matrix
 * Defines approval rules for foundation (org hierarchy) entity lifecycle transitions.
 *
 * Entity types:
 *   - organizations: Organization record changes
 *   - business_units: Business unit creation and restructuring
 *   - departments: Department lifecycle
 *   - positions: Position definition changes
 *   - legal_entities: Legal entity governance transitions
 *
 * Foundation is a platform-core module owned by DOS. Approval rules here
 * govern structural changes to the organization hierarchy which may have
 * cascading impact on scope resolution and access control.
 *
 * Consumed by platform approval-enforcer via dynamic import.
 * @see platform/dos/workflows/orchestration/approval-enforcer.ts
 */
import type { ApprovalRule } from '@dos/types';
export declare const FOUNDATION_APPROVAL_MATRIX: ApprovalRule[];
