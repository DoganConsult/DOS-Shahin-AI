#!/usr/bin/env node
/**
 * Boot harness — instantiates the Foundation module standalone with
 * inert default ports and prints the registered routes. Used to prove
 * the module boots without any host platform.
 */
import express from 'express';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let mod;
try {
  mod = require('../../dist/bootstrap.js');
} catch (err) {
  console.error('[boot-harness] dist/bootstrap.js missing — run `pnpm build` first');
  process.exit(2);
}

const app = express();

// Stub adapters proving DB / events / auth / telemetry bind correctly.
const dbCalls = [];
const events = [];
const result = mod.registerFoundation({
  app,
  database: {
    safeQuery: async (sql, params) => {
      dbCalls.push({ sql: sql.slice(0, 80), params: (params ?? []).length });
      return { rows: [], rowCount: 0 };
    },
    query: async (sql, params) => {
      dbCalls.push({ sql: sql.slice(0, 80), params: (params ?? []).length });
      return { rows: [], rowCount: 0 };
    },
    tenantSchema: (t) => `tenant_${t}`,
    getClient: async () => ({
      query: async () => ({ rows: [], rowCount: 0 }),
      release() {},
    }),
  },
  logger: {
    logger: {
      debug() {}, info() {}, warn() {},
      error: (m, meta) => console.error('[host-error]', m, meta ?? ''),
    },
  },
  resilience: {
    catchHandler: (cat, ctx) => (err) => events.push({ kind: 'error', cat, ctx, err: String(err) }),
  },
  aggregatorDeps: {
    userRouter: express.Router(),
    teamRouter: express.Router(),
    roleRouter: express.Router(),
    departmentRouter: express.Router(),
  },
});

const routes = [];
function walk(stack, prefix = '') {
  for (const layer of stack) {
    if (layer.route) {
      routes.push(Object.keys(layer.route.methods).map((m) => m.toUpperCase()).join(',') + ' ' + prefix + layer.route.path);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const seg = layer.regexp?.source?.match(/\^\\\/([^\\?]+)/)?.[1] ?? '';
      walk(layer.handle.stack, prefix + (seg ? '/' + seg : ''));
    }
  }
}
walk(app._router?.stack ?? []);
console.log(JSON.stringify({
  moduleCode: result.moduleCode,
  routeBase: result.routeBase,
  version: result.manifest.version,
  boundAdapters: { database: 'stub', logger: 'stub', resilience: 'stub' },
  routeCount: routes.length,
  sampleRoutes: routes.slice(0, 5),
  dbCallsObserved: dbCalls.length,
  events,
}, null, 2));
