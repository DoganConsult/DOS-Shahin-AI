"use strict";
/**
 * Phase G T3 — trial-lifecycle-sync.
 *
 * Iterates dos.tenant_trials and applies the locked state machine:
 *
 *   trial_active      ── days≤T-N    ──► trial_expiring   (notify expiring)
 *   trial_expiring    ── now>endsAt  ──► trial_grace      (notify grace)
 *   trial_grace       ── now>graceEnds ► trial_suspended  (notify suspended,
 *                                                        deactivate trial
 *                                                        entitlements; Foundation
 *                                                        platform_dna entitlement
 *                                                        is left ACTIVE — DNA)
 *
 * Subscription rows track the parallel state (trialing → grace → suspended).
 * Every transition appends a `dos.trial_audit_log` row and best-effort emits
 * a notification via notification-service. Foundation entitlement
 * (`source='platform_dna'`) is NEVER deactivated by this sweeper — that's
 * the §G locked rule.
 *
 * Driven by setInterval inside tenant-service's main(). When the platform
 * workflow-service ships in Phase J, lift this body into a Temporal handler
 * registered against the `trial-lifecycle-check` schedule. The data model
 * stays identical.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTrialLifecycleSweeper = exports.runTrialLifecycleSweep = void 0;
const NOTIFY_BEFORE_END_DAYS = 3; // T-N day at which active → expiring
const DEFAULT_INTERVAL_MS = 60_000; // sweep every 60s; cron equiv = `* * * * *`
async function appendAudit(client, row) {
    await client.query(`INSERT INTO dos.trial_audit_log
       (tenant_id, trial_id, user_id, product_code, action,
        old_status, new_status, reason, metadata_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [row.tenantId, row.trialId, row.userId, row.productCode, row.action,
        row.oldStatus, row.newStatus, row.reason ?? null,
        JSON.stringify(row.metadata ?? {})]);
}
async function tryNotify(tenantId, userId, type, daysLeft, productCode) {
    if (!userId)
        return false;
    const url = (process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:4005') + '/api/notifications';
    const titleByType = {
        trial_expiring: `Your Shahin-AI trial ends in ${daysLeft ?? 0} day${daysLeft === 1 ? '' : 's'}`,
        trial_grace: `Your trial has entered the grace period`,
        trial_suspended: `Your trial has been suspended`,
        trial_activated: `Your Shahin-AI workspace is active`,
    };
    const bodyByType = {
        trial_expiring: `Convert to a paid plan to keep all modules and data without interruption.`,
        trial_grace: `Limited access remains during the grace window. Convert to restore full access.`,
        trial_suspended: `Trial entitlements are now disabled. Contact sales to re-activate.`,
        trial_activated: `All trial-allowed modules are available. Welcome aboard.`,
    };
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-tenant-id': tenantId,
                // Best-effort: lifecycle sweeper uses platform-internal HMAC origin.
                'x-dos-internal': process.env.GATEWAY_ORIGIN_HMAC_SECRET || '',
            },
            body: JSON.stringify({
                userId,
                title: titleByType[type],
                body: bodyByType[type],
                type: 'trial-lifecycle',
                channel: 'inapp',
                module: productCode,
                entityType: 'trial',
                metadata: { lifecycle: type, daysLeft },
            }),
        });
        return resp.ok;
    }
    catch {
        return false;
    }
}
/**
 * Run a single sweep pass. Safe to call on demand; mutually exclusive
 * via a Postgres advisory lock so two concurrent tenant-service replicas
 * don't double-process the same row.
 */
async function runTrialLifecycleSweep(pool, logger = console) {
    const stats = {
        scanned: 0, expiringMarked: 0, graceMarked: 0, suspendedMarked: 0,
        notificationsTried: 0, auditRows: 0, errors: 0,
    };
    const client = await pool.connect();
    try {
        // Advisory lock — fixed key; non-blocking try.
        const lockQ = await client.query(`SELECT pg_try_advisory_lock(8675309) AS got`);
        if (!lockQ.rows[0]?.got) {
            return stats; // another replica owns the lock
        }
        try {
            const beforeEndsCutoff = new Date(Date.now() + NOTIFY_BEFORE_END_DAYS * 86_400_000).toISOString();
            // 1. trial_active → trial_expiring (≤ N days remaining)
            const expQ = await client.query(`SELECT trial_id, tenant_id, product_code, status, starts_at, ends_at,
                grace_ends_at, created_by_user_id
           FROM dos.tenant_trials
          WHERE status='trial_active' AND ends_at <= $1
          ORDER BY ends_at ASC LIMIT 200`, [beforeEndsCutoff]);
            stats.scanned += expQ.rows.length;
            for (const row of expQ.rows) {
                await client.query('BEGIN');
                try {
                    await client.query(`UPDATE dos.tenant_trials SET status='trial_expiring', updated_at=now()
              WHERE trial_id=$1 AND status='trial_active'`, [row.trial_id]);
                    await appendAudit(client, {
                        tenantId: row.tenant_id, trialId: row.trial_id, productCode: row.product_code,
                        userId: row.created_by_user_id, action: 'trial_expiring_notice',
                        oldStatus: 'trial_active', newStatus: 'trial_expiring',
                        reason: `<= ${NOTIFY_BEFORE_END_DAYS} days remaining`,
                    });
                    await client.query('COMMIT');
                    stats.expiringMarked += 1;
                    stats.auditRows += 1;
                    const daysLeft = Math.max(0, Math.ceil((new Date(row.ends_at).getTime() - Date.now()) / 86_400_000));
                    if (await tryNotify(row.tenant_id, row.created_by_user_id, 'trial_expiring', daysLeft, row.product_code)) {
                        stats.notificationsTried += 1;
                    }
                }
                catch (err) {
                    await client.query('ROLLBACK');
                    stats.errors += 1;
                    logger.warn(`[trial-lifecycle] expiring transition failed for ${row.trial_id}: ${err.message}`);
                }
            }
            // 2. trial_expiring → trial_grace (now > endsAt)
            const grQ = await client.query(`SELECT trial_id, tenant_id, product_code, status, starts_at, ends_at,
                grace_ends_at, created_by_user_id
           FROM dos.tenant_trials
          WHERE status='trial_expiring' AND ends_at < now()
          ORDER BY ends_at ASC LIMIT 200`);
            stats.scanned += grQ.rows.length;
            for (const row of grQ.rows) {
                await client.query('BEGIN');
                try {
                    await client.query(`UPDATE dos.tenant_trials SET status='trial_grace', updated_at=now()
              WHERE trial_id=$1 AND status='trial_expiring'`, [row.trial_id]);
                    await client.query(`UPDATE dos.tenant_subscriptions SET status='grace', updated_at=now()
              WHERE trial_id=$1 AND status='trialing'`, [row.trial_id]);
                    await appendAudit(client, {
                        tenantId: row.tenant_id, trialId: row.trial_id, productCode: row.product_code,
                        userId: row.created_by_user_id, action: 'trial_grace_started',
                        oldStatus: 'trial_expiring', newStatus: 'trial_grace',
                        reason: 'past trial.ends_at',
                    });
                    await client.query('COMMIT');
                    stats.graceMarked += 1;
                    stats.auditRows += 1;
                    if (await tryNotify(row.tenant_id, row.created_by_user_id, 'trial_grace', null, row.product_code)) {
                        stats.notificationsTried += 1;
                    }
                }
                catch (err) {
                    await client.query('ROLLBACK');
                    stats.errors += 1;
                    logger.warn(`[trial-lifecycle] grace transition failed for ${row.trial_id}: ${err.message}`);
                }
            }
            // 3. trial_grace → trial_suspended (now > graceEndsAt) +
            //    deactivate trial entitlements (NOT platform_dna rows).
            const suQ = await client.query(`SELECT trial_id, tenant_id, product_code, status, starts_at, ends_at,
                grace_ends_at, created_by_user_id
           FROM dos.tenant_trials
          WHERE status='trial_grace' AND grace_ends_at IS NOT NULL AND grace_ends_at < now()
          ORDER BY grace_ends_at ASC LIMIT 200`);
            stats.scanned += suQ.rows.length;
            for (const row of suQ.rows) {
                await client.query('BEGIN');
                try {
                    await client.query(`UPDATE dos.tenant_trials SET status='trial_suspended', suspended_at=now(), updated_at=now()
              WHERE trial_id=$1 AND status='trial_grace'`, [row.trial_id]);
                    await client.query(`UPDATE dos.tenant_subscriptions SET status='suspended', updated_at=now()
              WHERE trial_id=$1 AND status='grace'`, [row.trial_id]);
                    // Deactivate trial-source entitlements only. Foundation is platform DNA
                    // (source='platform_dna') and stays active.
                    await client.query(`UPDATE dos.tenant_module_entitlements
                SET entitlement_status='expired', updated_at=now()
              WHERE trial_id=$1 AND source='trial' AND entitlement_status='active'`, [row.trial_id]);
                    await client.query(`UPDATE dos.tenant_product_entitlements
                SET entitlement_status='expired', updated_at=now()
              WHERE trial_id=$1 AND source='trial' AND entitlement_status='active'`, [row.trial_id]);
                    await appendAudit(client, {
                        tenantId: row.tenant_id, trialId: row.trial_id, productCode: row.product_code,
                        userId: row.created_by_user_id, action: 'trial_suspended',
                        oldStatus: 'trial_grace', newStatus: 'trial_suspended',
                        reason: 'past grace_ends_at',
                    });
                    await client.query('COMMIT');
                    stats.suspendedMarked += 1;
                    stats.auditRows += 1;
                    if (await tryNotify(row.tenant_id, row.created_by_user_id, 'trial_suspended', null, row.product_code)) {
                        stats.notificationsTried += 1;
                    }
                }
                catch (err) {
                    await client.query('ROLLBACK');
                    stats.errors += 1;
                    logger.warn(`[trial-lifecycle] suspend transition failed for ${row.trial_id}: ${err.message}`);
                }
            }
            logger.info('[trial-lifecycle] sweep complete', stats);
            return stats;
        }
        finally {
            await client.query(`SELECT pg_advisory_unlock(8675309)`);
        }
    }
    finally {
        client.release();
    }
}
exports.runTrialLifecycleSweep = runTrialLifecycleSweep;
/**
 * Hook into tenant-service main(). Default cadence 60s; override via
 * env `TRIAL_LIFECYCLE_INTERVAL_MS`. First run fires after 5s so app
 * boot isn't blocked.
 */
function startTrialLifecycleSweeper(pool) {
    const interval = Math.max(15_000, Number(process.env.TRIAL_LIFECYCLE_INTERVAL_MS) || DEFAULT_INTERVAL_MS);
    const t = setTimeout(() => {
        void runTrialLifecycleSweep(pool).catch(err => console.warn('[trial-lifecycle] initial sweep failed:', err?.message));
        setInterval(() => {
            void runTrialLifecycleSweep(pool).catch(err => console.warn('[trial-lifecycle] sweep failed:', err?.message));
        }, interval).unref();
    }, 5_000);
    t.unref?.();
    return t;
}
exports.startTrialLifecycleSweeper = startTrialLifecycleSweeper;
//# sourceMappingURL=trial-lifecycle.js.map