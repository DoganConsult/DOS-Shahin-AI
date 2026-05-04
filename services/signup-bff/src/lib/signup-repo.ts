import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export async function listFlows(productCode: string) {
  const r = await masterQuery(
    `SELECT flow_code, product_code, display_name, enabled
       FROM dos_master.signup_flow
      WHERE product_code = $1 AND enabled = true
      ORDER BY flow_code`,
    [productCode],
  );
  return r.rows;
}

export async function listSteps(flowCode: string) {
  const r = await masterQuery(
    `SELECT step_order, step_kind, payload
       FROM dos_master.signup_flow_step
      WHERE flow_code = $1
      ORDER BY step_order`,
    [flowCode],
  );
  return r.rows;
}

export async function startAttempt(input: {
  flow_code: string;
  email: string;
  device_fp?: string | null;
  ip_addr?: string | null;
}): Promise<string> {
  await actor();
  const r = await masterQuery(
    `INSERT INTO dos_master.signup_attempt (flow_code, email, device_fp, ip_addr, status)
     VALUES ($1,$2,$3,$4::inet,'pending')
     RETURNING id`,
    [input.flow_code, input.email, input.device_fp ?? null, input.ip_addr ?? null],
  );
  return String(r.rows[0].id);
}

export async function completeAttempt(attemptId: string, edition = 'standard'): Promise<{ tenantId: string; jobId: string }> {
  await actor();
  const att = await masterQuery(
    `SELECT a.id, a.flow_code, a.email, f.product_code
       FROM dos_master.signup_attempt a
       JOIN dos_master.signup_flow f ON f.flow_code = a.flow_code
      WHERE a.id = $1`,
    [attemptId],
  );
  if (!att.rows.length) throw new Error('attempt_not_found');
  const productCode = String(att.rows[0].product_code);

  // Mint tenant id and provisioning job. Real Temporal kickoff lands in M7 D2.
  const t = await masterQuery(`SELECT gen_random_uuid() AS id`);
  const tenantId = String(t.rows[0].id);

  await masterQuery(
    `UPDATE dos_master.signup_attempt
        SET status='succeeded', tenant_id=$2::uuid, completed_at=now()
      WHERE id=$1`,
    [attemptId, tenantId],
  );

  const j = await masterQuery(
    `INSERT INTO dos_master.provisioning_job (tenant_id, product_code, edition, status)
     VALUES ($1::uuid, $2, $3, 'queued') RETURNING id`,
    [tenantId, productCode, edition],
  );
  const jobId = String(j.rows[0].id);

  // Trigger workspace-bootstrap MV invalidation for the new tenant.
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
     VALUES ('tenant', $1, 'tenant_provisioned', 'v1', 0)`,
    [tenantId],
  );

  return { tenantId, jobId };
}
