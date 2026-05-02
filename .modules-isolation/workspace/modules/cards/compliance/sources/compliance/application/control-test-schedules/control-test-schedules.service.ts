/**
 * Control-Test-Schedules service — recurring control test schedules over
 * `<tenant_schema>.control_test_schedules`. CRUD + recordExecution PATCH.
 */
import type { DbClient } from '../../db/runner';

export type TestFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
const FREQUENCIES: ReadonlyArray<TestFrequency> = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];

export type TestResult = 'pass' | 'fail' | 'error';
const RESULTS: ReadonlyArray<TestResult> = ['pass', 'fail', 'error'];

export interface ControlTestScheduleRow {
  scheduleId: string;
  controlId: string;
  testType: string | null;
  frequency: TestFrequency;
  nextExecutionDate: string | null;
  lastExecutedAt: string | null;
  lastResult: TestResult | null;
  assignedTo: string | null;
  autoExecute: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListSchedulesInput {
  tenantSchema: string;
  controlId?: string;
  frequency?: TestFrequency;
  lastResult?: TestResult;
  dueBefore?: string;
  limit?: number;
  offset?: number;
}

export interface CreateScheduleInput {
  tenantSchema: string;
  actorId: string;
  controlId: string;
  testType?: string | null;
  frequency?: TestFrequency;
  nextExecutionDate?: string | null;
  assignedTo?: string | null;
  autoExecute?: boolean;
}

export interface UpdateScheduleInput {
  tenantSchema: string;
  actorId: string;
  scheduleId: string;
  testType?: string | null;
  frequency?: TestFrequency;
  nextExecutionDate?: string | null;
  assignedTo?: string | null;
  autoExecute?: boolean;
}

export interface RecordExecutionInput {
  tenantSchema: string;
  actorId: string;
  scheduleId: string;
  result: TestResult;
  nextExecutionDate?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `schedule_id, control_id, test_type, frequency, next_execution_date,
              last_executed_at, last_result, assigned_to, auto_execute,
              created_at, updated_at`;

const mapRow = (x: {
  schedule_id: string; control_id: string; test_type: string | null;
  frequency: string; next_execution_date: string | null;
  last_executed_at: string | null; last_result: string | null;
  assigned_to: string | null; auto_execute: boolean;
  created_at: string; updated_at: string;
}): ControlTestScheduleRow => ({
  scheduleId: x.schedule_id, controlId: x.control_id, testType: x.test_type,
  frequency: x.frequency as TestFrequency, nextExecutionDate: x.next_execution_date,
  lastExecutedAt: x.last_executed_at,
  lastResult: x.last_result === null ? null : x.last_result as TestResult,
  assignedTo: x.assigned_to, autoExecute: x.auto_execute,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listSchedules(
  client: DbClient,
  input: ListSchedulesInput,
): Promise<{ rows: ControlTestScheduleRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.frequency) { params.push(input.frequency); where += ` AND frequency = $${params.length}`; }
  if (input.lastResult) { params.push(input.lastResult); where += ` AND last_result = $${params.length}`; }
  if (input.dueBefore) { params.push(input.dueBefore); where += ` AND next_execution_date <= $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_test_schedules
     WHERE ${where} ORDER BY next_execution_date ASC NULLS LAST, created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".control_test_schedules WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getSchedule(
  client: DbClient,
  input: { tenantSchema: string; scheduleId: string },
): Promise<ControlTestScheduleRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_test_schedules
     WHERE schedule_id = $1`,
    [input.scheduleId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createSchedule(
  client: DbClient,
  input: CreateScheduleInput,
): Promise<ControlTestScheduleRow> {
  assertSchema(input.tenantSchema);
  if (!input.controlId) {
    throw Object.assign(new Error('controlId required'), { code: 'bad_input' });
  }
  if (input.frequency && !FREQUENCIES.includes(input.frequency)) {
    throw Object.assign(new Error(`bad frequency: ${input.frequency}`), { code: 'bad_frequency' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".control_test_schedules
       (control_id, test_type, frequency, next_execution_date, assigned_to, auto_execute)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.controlId,
      input.testType ?? null,
      input.frequency ?? 'annually',
      input.nextExecutionDate ?? null,
      input.assignedTo ?? null,
      input.autoExecute ?? false,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateSchedule(
  client: DbClient,
  input: UpdateScheduleInput,
): Promise<ControlTestScheduleRow | null> {
  assertSchema(input.tenantSchema);
  if (input.frequency && !FREQUENCIES.includes(input.frequency)) {
    throw Object.assign(new Error(`bad frequency: ${input.frequency}`), { code: 'bad_frequency' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".control_test_schedules
        SET test_type = COALESCE($2, test_type),
            frequency = COALESCE($3, frequency),
            next_execution_date = COALESCE($4, next_execution_date),
            assigned_to = COALESCE($5, assigned_to),
            auto_execute = COALESCE($6, auto_execute),
            updated_at = NOW()
      WHERE schedule_id = $1
      RETURNING ${COLS}`,
    [
      input.scheduleId,
      input.testType ?? null,
      input.frequency ?? null,
      input.nextExecutionDate ?? null,
      input.assignedTo ?? null,
      input.autoExecute === undefined ? null : input.autoExecute,
    ],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function recordExecution(
  client: DbClient,
  input: RecordExecutionInput,
): Promise<ControlTestScheduleRow | null> {
  assertSchema(input.tenantSchema);
  if (!RESULTS.includes(input.result)) {
    throw Object.assign(new Error(`bad result: ${input.result}`), { code: 'bad_result' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".control_test_schedules
        SET last_executed_at = NOW(),
            last_result = $2,
            next_execution_date = COALESCE($3, next_execution_date),
            updated_at = NOW()
      WHERE schedule_id = $1
      RETURNING ${COLS}`,
    [input.scheduleId, input.result, input.nextExecutionDate ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteSchedule(
  client: DbClient,
  input: { tenantSchema: string; scheduleId: string },
): Promise<ControlTestScheduleRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".control_test_schedules
      WHERE schedule_id = $1
      RETURNING ${COLS}`,
    [input.scheduleId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
