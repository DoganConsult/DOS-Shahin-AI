#!/usr/bin/env node
/**
 * Boot harness — instantiates the Compliance module standalone with stub
 * adapters and prints registration result. Proves the module boots
 * without any host platform.
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
const result = mod.registerCompliance({
  app,
  database: { safeQuery: async () => ({ rows: [], rowCount: 0 }) },
  logger: { logger: { info() {}, warn() {}, error() {}, debug() {} } },
});

console.log(JSON.stringify({
  moduleCode: result.moduleCode,
  routeBase: result.routeBase,
  version: result.manifest.version,
  ownedTables: result.manifest.ownedTables?.length ?? 0,
  publishedEvents: result.manifest.events?.publishes?.length ?? 0,
  consumedEvents: result.manifest.events?.subscribes?.length ?? 0,
  routeBases: result.manifest.routeBases?.length ?? 0,
}, null, 2));
