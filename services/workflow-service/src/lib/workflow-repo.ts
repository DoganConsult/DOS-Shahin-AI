import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export interface WorkflowDefinitionRow {
  id: string;
  workflow_key: string;
  version: number;
  title: string;
  kind: string;
  trust_zone: string;
  status: string;
  schema_version: number;
  created_by: string;
  created_at: string;
  published_at: string | null;
}

export async function listDefinitions(status?: string): Promise<WorkflowDefinitionRow[]> {
  const r = await masterQuery(
    `SELECT id, workflow_key, version, title, kind, trust_zone, status,
            schema_version, created_by, created_at, published_at
       FROM dos.workflow_definition
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY workflow_key, version DESC`,
    [status ?? null],
  );
  return r.rows as unknown as WorkflowDefinitionRow[];
}

export async function getDefinition(workflowKey: string, version?: number) {
  const r = version
    ? await masterQuery(
        `SELECT * FROM dos.workflow_definition WHERE workflow_key=$1 AND version=$2`,
        [workflowKey, version],
      )
    : await masterQuery(
        `SELECT * FROM dos.workflow_definition WHERE workflow_key=$1
          ORDER BY version DESC LIMIT 1`,
        [workflowKey],
      );
  return r.rows[0] ?? null;
}

export async function createDefinition(input: {
  workflow_key: string;
  title: string;
  kind: string;
  trust_zone: 'public' | 'tenant' | 'admin';
  definition: unknown;
  created_by: string;
}): Promise<WorkflowDefinitionRow> {
  await actor();
  const versionRow = await masterQuery(
    `SELECT COALESCE(MAX(version),0)::int + 1 AS next FROM dos.workflow_definition WHERE workflow_key=$1`,
    [input.workflow_key],
  );
  const version = (versionRow.rows[0] as { next: number }).next;
  const r = await masterQuery(
    `INSERT INTO dos.workflow_definition
       (workflow_key, version, title, kind, trust_zone, status, definition, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7)
     RETURNING id, workflow_key, version, title, kind, trust_zone, status,
               schema_version, created_by, created_at, published_at`,
    [input.workflow_key, version, input.title, input.kind, input.trust_zone,
     JSON.stringify(input.definition), input.created_by],
  );
  return r.rows[0] as unknown as WorkflowDefinitionRow;
}

export async function publishDefinition(workflowKey: string, version: number): Promise<WorkflowDefinitionRow> {
  await actor();
  const r = await masterQuery(
    `UPDATE dos.workflow_definition
        SET status='published', published_at=now()
      WHERE workflow_key=$1 AND version=$2 AND status='draft'
      RETURNING id, workflow_key, version, title, kind, trust_zone, status,
                schema_version, created_by, created_at, published_at`,
    [workflowKey, version],
  );
  if (!r.rows.length) throw new Error('not_found_or_not_draft');
  return r.rows[0] as unknown as WorkflowDefinitionRow;
}

export interface WorkflowInstanceRow {
  id: string;
  workflow_id: string;
  tenant_id: string | null;
  initiated_by: string;
  status: string;
  current_step: string | null;
  context: Record<string, unknown>;
  started_at: string;
  ended_at: string | null;
  correlation_id: string | null;
}

export async function startInstance(input: {
  workflow_key: string;
  initiated_by: string;
  tenant_id?: string | null;
  context?: Record<string, unknown>;
  correlation_id?: string | null;
}): Promise<WorkflowInstanceRow> {
  await actor();
  const def = await getDefinition(input.workflow_key);
  if (!def) throw new Error('workflow_not_found');
  if ((def as { status: string }).status !== 'published') throw new Error('workflow_not_published');
  const startStep = ((def as { definition: { start?: string } }).definition.start) ?? null;
  const r = await masterQuery(
    `INSERT INTO dos.workflow_instance
       (workflow_id, tenant_id, initiated_by, status, current_step, context, correlation_id)
     VALUES ($1::uuid,$2::uuid,$3,'running',$4,$5::jsonb,$6)
     RETURNING id, workflow_id, tenant_id, initiated_by, status, current_step,
               context, started_at, ended_at, correlation_id`,
    [(def as { id: string }).id, input.tenant_id ?? null, input.initiated_by,
     startStep, JSON.stringify(input.context ?? {}), input.correlation_id ?? null],
  );
  const instance = r.rows[0] as unknown as WorkflowInstanceRow;
  if (startStep) {
    await masterQuery(
      `INSERT INTO dos.workflow_step_run (instance_id, step_id, step_kind, status, attempt)
       VALUES ($1::uuid,$2,'task','started',1)`,
      [instance.id, startStep],
    );
  }
  await masterQuery(
    `INSERT INTO dos.workflow_event (instance_id, workflow_key, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,'started',$3::jsonb,$4)`,
    [instance.id, input.workflow_key, JSON.stringify({ start_step: startStep }), input.initiated_by],
  );
  return instance;
}

export async function listInstances(workflowKey?: string, status?: string, limit = 100) {
  const r = await masterQuery(
    `SELECT i.id, i.workflow_id, d.workflow_key, d.version,
            i.tenant_id, i.initiated_by, i.status, i.current_step,
            i.started_at, i.ended_at, i.error, i.correlation_id
       FROM dos.workflow_instance i
       JOIN dos.workflow_definition d ON d.id = i.workflow_id
      WHERE ($1::text IS NULL OR d.workflow_key = $1)
        AND ($2::text IS NULL OR i.status = $2)
      ORDER BY i.started_at DESC
      LIMIT $3`,
    [workflowKey ?? null, status ?? null, limit],
  );
  return r.rows;
}

export async function instanceComposition(instanceId: string) {
  const inst = await masterQuery(
    `SELECT i.*, d.workflow_key, d.version, d.definition
       FROM dos.workflow_instance i
       JOIN dos.workflow_definition d ON d.id = i.workflow_id
      WHERE i.id=$1::uuid`,
    [instanceId],
  );
  if (!inst.rows.length) return null;
  const steps = await masterQuery(
    `SELECT id, step_id, step_kind, status, attempt, started_at, ended_at, error
       FROM dos.workflow_step_run WHERE instance_id=$1::uuid ORDER BY started_at`,
    [instanceId],
  );
  const events = await masterQuery(
    `SELECT id, kind, payload, emitted_by, emitted_at
       FROM dos.workflow_event WHERE instance_id=$1::uuid ORDER BY emitted_at`,
    [instanceId],
  );
  return { instance: inst.rows[0], steps: steps.rows, events: events.rows };
}

export async function emitSignal(input: {
  instance_id: string;
  kind: string;
  payload?: Record<string, unknown>;
  emitted_by: string;
}) {
  await actor();
  const r = await masterQuery(
    `INSERT INTO dos.workflow_event (instance_id, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,$3::jsonb,$4)
     RETURNING id, instance_id, kind, payload, emitted_by, emitted_at`,
    [input.instance_id, input.kind, JSON.stringify(input.payload ?? {}), input.emitted_by],
  );
  return r.rows[0];
}

export async function completeStep(instanceId: string, stepId: string, output?: Record<string, unknown>): Promise<void> {
  await actor();
  await masterQuery(
    `UPDATE dos.workflow_step_run
        SET status='completed', ended_at=now(), output=$3::jsonb
      WHERE instance_id=$1::uuid AND step_id=$2 AND status='started'`,
    [instanceId, stepId, JSON.stringify(output ?? {})],
  );
}
