// ============================================
// Shahin-Ai — Evidence Routes (Barrel)
// Mounts domain-specific sub-routers so all external paths remain unchanged.
// Parent mounts this at /api/evidence, so sub-router prefixes are relative.
// ============================================

import { Router } from "express";

// Sub-routers
import coreRouter from "./evidence-core.routes";
import collectorsRouter from "../collection/evidence-collectors.routes";
import schedulesRouter from "../collection/evidence-schedules.routes";
import filesRouter from "./evidence-files.routes";
import requirementsRouter from "../workflow/evidence-requirements.routes";
import entityIntegrationRouter from "./evidence-entity-integration.routes";
import attachmentsRouter from "./evidence-attachments.routes";
import { reviewsListRouter, reviewSubmitRouter } from "../workflow/evidence-reviews.routes";
import requestsRouter from "../workflow/evidence-requests.routes";
import analysisRouter from "./evidence-analysis.routes";
import aiRouter from "./evidence-ai.routes";
import healthRouter from "./evidence-health.routes";
import freshnessRouter from "../collection/evidence-freshness.routes";
import reuseRouter from "../reporting/evidence-reuse.routes";
import packagesRouter from "../reporting/evidence-packages.routes";
import reportsRouter from "../reporting/evidence-reports.routes";

import adminRouter from "./evidence-admin.routes";
import dashboardRouter from "../reporting/evidence-dashboard.routes";
import diagnosticsRouter from "../evidence-diagnostics.routes";

import { auditMiddleware, automationMiddleware, fieldRbac, mandatoryFields as _mandatoryFields, scopeContext, moduleStack } from '../../ports/middleware.port';
import { authenticate } from '../../ports/auth.port';


const router = Router();
router.use(authenticate);
router.use(moduleStack('evidence'));

// Shared middleware applied to all evidence routes
router.use(auditMiddleware("evidence"));
router.use(automationMiddleware("evidence"));
router.use(fieldRbac({ module: "evidence" }));
router.use(scopeContext);

// Mount sub-routers — named prefixes first, then root-level parameterised segments
router.use("/", healthRouter);                       // GET /api/evidence/health, GET /api/evidence/completeness
router.use("/freshness", freshnessRouter);           // /api/evidence/freshness/*
router.use("/reuse", reuseRouter);                   // /api/evidence/reuse/*
router.use("/packages", packagesRouter);             // /api/evidence/packages/*
router.use("/reports", reportsRouter);               // /api/evidence/reports/*
router.use("/admin", adminRouter);                   // /api/evidence/admin/*
router.use("/", dashboardRouter);                    // GET /api/evidence/overview, /work-queue, /source-health, /recent-activity, /by-status, /by-source
router.use("/collectors", collectorsRouter);         // /api/evidence/collectors/*
router.use("/schedules", schedulesRouter);           // /api/evidence/schedules/*
router.use("/requirements", requirementsRouter);     // /api/evidence/requirements/*
router.use("/attachments", attachmentsRouter);       // /api/evidence/attachments/*
router.use("/reviews", reviewsListRouter);           // GET /api/evidence/reviews
router.use("/requests", requestsRouter);             // /api/evidence/requests/*

// Entity integration (policies, controls, risks, frameworks) — all at root level
router.use("/", entityIntegrationRouter);

// Analysis: POST /batch-analyze, POST /:evidenceId/analyze, GET /:evidenceId/analysis
router.use("/", analysisRouter);

// AI suggestions: POST /ai/suggest-metadata, GET /ai/suggest-linkages/:id, POST /ai/detect-duplicates, GET /ai/status
router.use("/ai", aiRouter);

// File routes: POST /:id/upload, GET /:id/download, GET /:id/files
router.use("/", filesRouter);

// Review submit: POST /:id/review (at root, not under /reviews prefix)
router.use("/", reviewSubmitRouter);

// Diagnostics: GET /api/evidence/diagnostics
router.use("/", diagnosticsRouter);

// Core routes: GET /, GET /expiring, GET /expired, GET /control/:controlId,
//   GET /suggest-reuse, POST /, POST /:id/version, GET /verify, POST /collect,
//   GET /connectors, GET /status, POST /policy-check, PATCH /:id/status,
//   GET /:id/status-history, GET /overview/stats, GET /coverage-dashboard,
//   GET /mappings, GET /breakdown
router.use("/", coreRouter);

export default router;
