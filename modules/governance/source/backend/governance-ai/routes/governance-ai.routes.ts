// Canonical governance-AI router lives in the sibling modules/governance-ai
// module, not inside governance/. The governance-policy-service mounts it
// via its own loadModuleRoute('governance-ai/governance-ai', '.../governance-ai/dist/...')
// entry — see services/governance-policy-service/src/routes/index.ts.
//
// This file existed only as a duplicate-import re-export and triggered a
// "Cannot find module ../../../governance-ai/routes/governance-ai.routes"
// at load time because the relative path attempted a same-module resolution.
// We expose an empty Router so the governance-policy-service's load-status
// diagnostic shows a clean entry while the canonical handler stays the
// authoritative one.
import { Router } from 'express';
const router = Router();
export default router;
