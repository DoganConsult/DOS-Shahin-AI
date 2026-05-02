#!/usr/bin/env node
/**
 * Qiyas boot harness — proves the module wires up standalone with stub adapters.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import express from 'express';

const mod = require('../../dist/bootstrap.js');
const app = express();
const result = mod.registerQiyas({
  app,
  database: { safeQuery: async () => ({ rows: [], rowCount: 0 }) },
  logger: { info: console.log, error: console.error, warn: console.warn },
});
console.log('[boot-harness] registered:', JSON.stringify({
  moduleCode: result.moduleCode,
  routeBase: result.routeBase,
  version: result.manifest.version,
}, null, 2));
console.log('[boot-harness] OK');
