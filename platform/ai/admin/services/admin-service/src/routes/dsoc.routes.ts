import { Router } from 'express';
import { q, one, exec } from '../db';
import { asyncHandler, paginate, audit, AdminRequest } from '../middleware';

const r = Router();

// ── audit-log ─────────────────────────────────────────
r.get('/audit-log', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  const tenant = req.query.tenant_id as string | undefined;
  const category = req.query.category as string | undefined;
  const severity = req.query.severity as string | undefined;
  const conds: string[] = []; const params: any[] = [];
  if (tenant) { params.push(tenant); conds.push(`tenant_id=$${params.length}`); }
  if (category) { params.push(category); conds.push(`category=$${params.length}`); }
  if (severity) { params.push(severity); conds.push(`severity=$${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  params.push(limit); params.push(offset);
  res.json({ data: await q(`SELECT * FROM platform_dsoc.audit_log ${where} ORDER BY occurred_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params) });
}));

// ── alerts ────────────────────────────────────────────
r.get('/alerts', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  const status = (req.query.status as string) || 'open';
  res.json({ data: await q('SELECT * FROM platform_dsoc.alerts WHERE status=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [status, limit, offset]) });
}));
r.patch('/alerts/:id', asyncHandler(async (req: AdminRequest, res) => {
  const { status } = req.body;
  if (status === 'acknowledged') {
    await exec(`UPDATE platform_dsoc.alerts SET status='acknowledged', acknowledged_by=$1, acknowledged_at=NOW() WHERE id=$2`, [req.actor?.userId || 'system', req.params.id]);
  } else if (status === 'resolved') {
    await exec(`UPDATE platform_dsoc.alerts SET status='resolved', resolved_by=$1, resolved_at=NOW() WHERE id=$2`, [req.actor?.userId || 'system', req.params.id]);
  } else if (status === 'suppressed') {
    await exec(`UPDATE platform_dsoc.alerts SET status='suppressed' WHERE id=$1`, [req.params.id]);
  } else {
    return res.status(400).json({ error: 'invalid status' });
  }
  await audit('dsoc', `alert.${status}`, req.actor, { type: 'alert', id: req.params.id });
  res.json({ ok: true });
}));

// ── incidents ─────────────────────────────────────────
r.get('/incidents', asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  const where = status ? 'WHERE status=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dsoc.incidents ${where} ORDER BY opened_at DESC LIMIT 200`, status ? [status] : []) });
}));
r.get('/incidents/:id', asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM platform_dsoc.incidents WHERE incident_id=$1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const notes = await q('SELECT * FROM platform_dsoc.investigation_notes WHERE incident_id=$1 ORDER BY created_at DESC', [req.params.id]);
  res.json({ data: { ...row, notes } });
}));
r.post('/incidents', asyncHandler(async (req: AdminRequest, res) => {
  const { incident_id, tenant_id, title, severity, category, assigned_to, attributes = {} } = req.body;
  await exec(
    `INSERT INTO platform_dsoc.incidents(incident_id,tenant_id,title,severity,category,assigned_to,attributes) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [incident_id, tenant_id, title, severity, category, assigned_to ?? null, JSON.stringify(attributes)]
  );
  await audit('dsoc', 'incident.create', req.actor, { type: 'incident', id: incident_id });
  res.status(201).json({ ok: true });
}));
r.patch('/incidents/:id', asyncHandler(async (req: AdminRequest, res) => {
  const { status, severity, assigned_to } = req.body;
  const sets: string[] = []; const params: any[] = [];
  if (status) { params.push(status); sets.push(`status=$${params.length}`); if (status === 'resolved' || status === 'closed') sets.push(`closed_at=NOW()`); }
  if (severity) { params.push(severity); sets.push(`severity=$${params.length}`); }
  if (assigned_to !== undefined) { params.push(assigned_to); sets.push(`assigned_to=$${params.length}`); }
  if (!sets.length) return res.status(400).json({ error: 'no changes' });
  params.push(req.params.id);
  await exec(`UPDATE platform_dsoc.incidents SET ${sets.join(', ')} WHERE incident_id=$${params.length}`, params);
  await audit('dsoc', 'incident.update', req.actor, { type: 'incident', id: req.params.id }, 'success', { status, severity, assigned_to });
  res.json({ ok: true });
}));
r.post('/incidents/:id/notes', asyncHandler(async (req: AdminRequest, res) => {
  const { note, note_type = 'comment' } = req.body;
  await exec(
    `INSERT INTO platform_dsoc.investigation_notes(incident_id, author_id, note, note_type) VALUES($1,$2,$3,$4)`,
    [req.params.id, req.actor?.userId || 'system', note, note_type]
  );
  await audit('dsoc', 'incident.note', req.actor, { type: 'incident', id: req.params.id });
  res.status(201).json({ ok: true });
}));

// ── detection-rules ──────────────────────────────────
r.get('/detection-rules', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dsoc.detection_rules ORDER BY enabled DESC, rule_id') });
}));
r.post('/detection-rules', asyncHandler(async (req: AdminRequest, res) => {
  const { rule_id, tenant_id, name, description, rule_type, expression, severity = 'medium' } = req.body;
  await exec(
    `INSERT INTO platform_dsoc.detection_rules(rule_id,tenant_id,name,description,rule_type,expression,severity)
     VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)
     ON CONFLICT(rule_id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, rule_type=EXCLUDED.rule_type, expression=EXCLUDED.expression, severity=EXCLUDED.severity, updated_at=NOW()`,
    [rule_id, tenant_id ?? null, name, description ?? null, rule_type, JSON.stringify(expression), severity]
  );
  await audit('dsoc', 'detection_rule.upsert', req.actor, { type: 'detection_rule', id: rule_id });
  res.status(201).json({ ok: true });
}));
r.patch('/detection-rules/:id/toggle', asyncHandler(async (req: AdminRequest, res) => {
  await exec(`UPDATE platform_dsoc.detection_rules SET enabled = NOT enabled, updated_at=NOW() WHERE rule_id=$1`, [req.params.id]);
  await audit('dsoc', 'detection_rule.toggle', req.actor, { type: 'detection_rule', id: req.params.id });
  res.json({ ok: true });
}));

// ── anomaly-signals ─────────────────────────────────
r.get('/anomaly-signals', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  const minScore = parseFloat((req.query.min_score as string) || '0');
  res.json({ data: await q('SELECT * FROM platform_dsoc.anomaly_signals WHERE score >= $1 ORDER BY detected_at DESC LIMIT $2 OFFSET $3', [minScore, limit, offset]) });
}));

// ── sod-violations ──────────────────────────────────
r.get('/sod-violations', asyncHandler(async (req, res) => {
  const open = req.query.open !== 'false';
  const where = open ? 'WHERE resolved_at IS NULL' : '';
  res.json({ data: await q(`SELECT * FROM platform_dsoc.sod_violations ${where} ORDER BY detected_at DESC LIMIT 500`) });
}));
r.post('/sod-violations/:id/waiver', asyncHandler(async (req: AdminRequest, res) => {
  const { waiver_id } = req.body;
  await exec(`UPDATE platform_dsoc.sod_violations SET resolved_at=NOW(), waiver_id=$1 WHERE id=$2`, [waiver_id, req.params.id]);
  await audit('dsoc', 'sod_violation.waiver', req.actor, { type: 'sod_violation', id: req.params.id }, 'success', { waiver_id });
  res.json({ ok: true });
}));

// ── threat-indicators ───────────────────────────────
r.get('/threat-indicators', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dsoc.threat_indicators ORDER BY last_seen DESC LIMIT 500') });
}));
r.post('/threat-indicators', asyncHandler(async (req: AdminRequest, res) => {
  const { ioc_type, ioc_value, source, confidence = 50, severity = 'medium', expires_at } = req.body;
  await exec(
    `INSERT INTO platform_dsoc.threat_indicators(ioc_type,ioc_value,source,confidence,severity,expires_at) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(ioc_type,ioc_value,source) DO UPDATE SET confidence=EXCLUDED.confidence, severity=EXCLUDED.severity, last_seen=NOW(), expires_at=EXCLUDED.expires_at`,
    [ioc_type, ioc_value, source, confidence, severity, expires_at ?? null]
  );
  await audit('dsoc', 'threat.upsert', req.actor, { type: 'threat_indicator', id: `${ioc_type}:${ioc_value}` });
  res.status(201).json({ ok: true });
}));

// ── posture ─────────────────────────────────────────
r.get('/posture-snapshots', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dsoc.posture_snapshots ${where} ORDER BY captured_at DESC LIMIT 200`, tenant ? [tenant] : []) });
}));
r.get('/posture-findings', asyncHandler(async (req, res) => {
  const snapshot = req.query.snapshot_id as string | undefined;
  const where = snapshot ? 'WHERE snapshot_id=$1' : '';
  res.json({ data: await q(`SELECT * FROM platform_dsoc.posture_findings ${where} ORDER BY severity DESC LIMIT 500`, snapshot ? [snapshot] : []) });
}));

// ── overview ────────────────────────────────────────
r.get('/overview', asyncHandler(async (_req, res) => {
  const [openAlerts, openIncidents, openSod, activeRules, anomalies24h, audit24h] = await Promise.all([
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dsoc.alerts WHERE status='open'`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dsoc.incidents WHERE status IN ('open','investigating','contained')`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dsoc.sod_violations WHERE resolved_at IS NULL`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dsoc.detection_rules WHERE enabled`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dsoc.anomaly_signals WHERE detected_at > NOW() - INTERVAL '24 hours'`),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dsoc.audit_log WHERE occurred_at > NOW() - INTERVAL '24 hours'`),
  ]);
  res.json({
    data: {
      open_alerts: +openAlerts!.c, open_incidents: +openIncidents!.c, open_sod_violations: +openSod!.c,
      active_detection_rules: +activeRules!.c, anomalies_24h: +anomalies24h!.c, audit_events_24h: +audit24h!.c,
    },
  });
}));

export default r;
