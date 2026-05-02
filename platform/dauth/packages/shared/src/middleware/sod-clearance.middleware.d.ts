/**
 * requireSodClearance — HTTP middleware that gates a request on SoD evaluation.
 *
 * Reuses the canonical engine in services/auth-service/src/domain/sod/sod-engine.ts
 * via a thin in-process query (we cannot import the auth-service from a
 * platform package, so we duplicate the minimal SQL — same schema as
 * tenant migrations 131_sod_rules.sql / 132_sod_waivers.sql + the
 * module_sod_rules table seeded by the module-security-seeder).
 *
 * Behaviour matrix:
 *   - role-pair conflict in sod_rules            → consult waiver, else block/escalate/warn per rule
 *   - action-pair conflict in module_sod_rules   → resolution_strategy decides
 *   - active waiver covers blocking rule         → allow with audit reason
 *   - any DB / config error                      → fail-closed when DAUTH_SOD_FAIL_CLOSED=true,
 *                                                   otherwise log + allow (current rollout default)
 *
 * The middleware is a thin gate. The deeper decision-engine path that
 * writes to the ledger still runs; this is only the HTTP front edge.
 */
import type { RequestHandler } from 'express';
export interface SodClearanceOptions {
    /** Module code for module-level SoD lookup (module_sod_rules.module_code). */
    moduleCode: string;
    /**
     * The action(s) the route would perform. When two are supplied we look
     * for an action-pair conflict. When one is supplied we still evaluate
     * role-pair conflicts on the user's roles + waivers.
     */
    action: string;
    conflictingAction?: string;
    /**
     * When true (default) any blocking outcome returns 403. When false the
     * middleware annotates `req` with the SoD result and lets downstream
     * handlers decide.
     */
    enforce?: boolean;
}
export interface SodClearanceVerdict {
    passed: boolean;
    outcome: 'allow' | 'warn' | 'escalate' | 'block' | 'allow-with-audit';
    reason?: string;
    ruleCode?: string;
    waiverId?: string;
}
declare global {
    namespace Express {
        interface Request {
            sodClearance?: SodClearanceVerdict;
        }
    }
}
export declare function requireSodClearance(opts: SodClearanceOptions): RequestHandler;
