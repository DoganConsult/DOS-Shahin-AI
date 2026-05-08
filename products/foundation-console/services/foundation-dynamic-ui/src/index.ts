// foundation-dynamic-ui — Dynamic UI runtime (pages/routes/surfaces from fc_dynamic_ui.*).
// Doctrine: zero hardcoded pages. Empty DB → empty UI.
import express from 'express';
import { loadFcConfig } from '@fc/config';
import { createLogger } from '@fc/logger';
import { createPool, pingDb, ensureSchemas } from '@fc/db';

const cfg = loadFcConfig();
const log = createLogger({ service: 'foundation-dynamic-ui' });
const pool = createPool(cfg);
const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'foundation-dynamic-ui' });
});

app.get('/readyz', async (_req, res) => {
  const ping = await pingDb(pool);
  if (!ping.ok) return res.status(503).json({ status: 'down', reason: 'db unreachable' });
  res.json({ status: 'ready', service: 'foundation-dynamic-ui', db: ping.serverVersion });
});

// Real DUI endpoints land in F4/F7. Empty for now — DB is empty.
app.get('/pages', (_req, res) => res.json({ pages: [] }));
app.get('/components', (_req, res) => res.json({ components: [] }));

(async () => {
  await ensureSchemas(pool, ['fc_dynamic_ui']);
  app.listen(cfg.dynamicUi.port, () => {
    log.info({ port: cfg.dynamicUi.port }, 'foundation-dynamic-ui listening');
  });
})().catch((e) => {
  log.error({ err: e instanceof Error ? e.message : String(e) }, 'boot failed');
  process.exit(1);
});
