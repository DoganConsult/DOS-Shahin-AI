import { Router, Request, Response } from 'express';
import { z } from "zod";
import { v4 as uuid } from 'uuid';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { AuthenticatedRequest } from '@dos/types';
import {

  validate,
  auditMiddleware,
  moduleStack,
  mutationEventHook,
} from '../../ports/middleware.port';

const genericPayloadSchema = z.record(z.unknown());
/**
 * Fitch Natural Deduction Proof API Routes
 *
 * Endpoints:
 *   GET    /api/fitch/proofs         - List all proofs for tenant
 *   GET    /api/fitch/proofs/:id     - Get proof by ID
 *   POST   /api/fitch/proofs         - Create new proof
 *   PUT    /api/fitch/proofs/:id     - Update proof
 *   DELETE /api/fitch/proofs/:id     - Delete proof
 *   POST   /api/fitch/verify         - Verify a proof
 *   POST   /api/fitch/parse          - Parse a formula string
 *   GET    /api/fitch/examples       - Get example proof templates
 *   GET    /api/fitch/rules          - List all inference rules
 */
import { createProofsBody, updateProofsBody, createVerifyBody, createParseBody } from '../../schemas/governance.schemas';
import {
  FitchProof,
  ProofLine,
  RuleName,
  parseFormula,
  formulaToString,
  verifyProof,
  EXAMPLE_PROOFS,
} from "../../services/misc/fitch-proof.engine";
const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));
router.use(authenticate);

// ─── In-memory store (per-tenant) ───────────────────────────────────────────

const proofStore: Map<string, FitchProof[]> = new Map();

function getTenantProofs(tenantId: string): FitchProof[] {
  if (!proofStore.has(tenantId)) {
    proofStore.set(tenantId, []);
  }
  return proofStore.get(tenantId)!;
}

// ─── Inference Rule Descriptions ────────────────────────────────────────────

const RULE_DESCRIPTIONS: Array<{
  name: RuleName;
  symbol: string;
  label: string;
  description: string;
  citationsRequired: string;
}> = [
  {
    name: "premise",
    symbol: "",
    label: "Premise",
    description: "A given statement accepted without proof",
    citationsRequired: "None",
  },
  {
    name: "assumption",
    symbol: "",
    label: "Assumption",
    description: "Opens a sub-proof by assuming a formula",
    citationsRequired: "None (opens sub-proof)",
  },
  {
    name: "reiteration",
    symbol: "R",
    label: "Reiteration",
    description: "Re-state an accessible formula from a previous line",
    citationsRequired: "1 accessible line",
  },
  {
    name: "and_intro",
    symbol: "∧I",
    label: "∧-Introduction",
    description: "From φ and ψ, derive φ ∧ ψ",
    citationsRequired: "2 accessible lines",
  },
  {
    name: "and_elim",
    symbol: "∧E",
    label: "∧-Elimination",
    description: "From φ ∧ ψ, derive φ or ψ",
    citationsRequired: "1 accessible line (conjunction)",
  },
  {
    name: "or_intro",
    symbol: "∨I",
    label: "∨-Introduction",
    description: "From φ, derive φ ∨ ψ for any ψ",
    citationsRequired: "1 accessible line",
  },
  {
    name: "or_elim",
    symbol: "∨E",
    label: "∨-Elimination",
    description:
      "From φ ∨ ψ and sub-proofs [φ→χ] and [ψ→χ], derive χ",
    citationsRequired: "1 disjunction + 2 sub-proof ranges (5 line numbers)",
  },
  {
    name: "implies_intro",
    symbol: "→I",
    label: "→-Introduction",
    description: "Close a sub-proof [φ...ψ] to derive φ → ψ",
    citationsRequired: "Sub-proof range (start, end)",
  },
  {
    name: "implies_elim",
    symbol: "→E",
    label: "→-Elimination (Modus Ponens)",
    description: "From φ → ψ and φ, derive ψ",
    citationsRequired: "2 accessible lines (conditional + antecedent)",
  },
  {
    name: "not_intro",
    symbol: "¬I",
    label: "¬-Introduction",
    description: "Close a sub-proof [φ...⊥] to derive ¬φ",
    citationsRequired: "Sub-proof range (start, end — must end with ⊥)",
  },
  {
    name: "not_elim",
    symbol: "¬E",
    label: "¬-Elimination (Double Negation)",
    description: "From ¬¬φ, derive φ",
    citationsRequired: "1 accessible line (double negation)",
  },
  {
    name: "biconditional_intro",
    symbol: "↔I",
    label: "↔-Introduction",
    description:
      "From sub-proofs [φ→ψ] and [ψ→φ], derive φ ↔ ψ",
    citationsRequired: "2 sub-proof ranges (4 line numbers)",
  },
  {
    name: "biconditional_elim",
    symbol: "↔E",
    label: "↔-Elimination",
    description: "From φ ↔ ψ and φ, derive ψ (or from ψ, derive φ)",
    citationsRequired: "2 accessible lines (biconditional + one side)",
  },
  {
    name: "bottom_intro",
    symbol: "⊥I",
    label: "⊥-Introduction",
    description: "From φ and ¬φ, derive ⊥",
    citationsRequired: "2 accessible lines (formula + its negation)",
  },
  {
    name: "bottom_elim",
    symbol: "⊥E",
    label: "⊥-Elimination (Ex Falso)",
    description: "From ⊥, derive any formula φ",
    citationsRequired: "1 accessible line (⊥)",
  },
];

// ─── Helper: deserialize proof lines ────────────────────────────────────────

function deserializeLines(
  rawLines: Array<{
    formula: string;
    rule: RuleName;
    citations: number[];
    depth: number;
    isAssumption?: boolean;
  }>
): ProofLine[] {
  return rawLines.map((raw, idx) => ({
    lineNumber: idx + 1,
    formula: parseFormula(raw.formula),
    rule: raw.rule,
    citations: raw.citations,
    depth: raw.depth,
    isAssumption: raw.isAssumption,
  }));
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/** List all proofs */
router.get('/proofs', validate({ query: z.record(z.unknown()) }), requirePermission('governance.record.read'), (req: Request, res: Response) => {
  const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
  const proofs = getTenantProofs(tenantId);
  res.json({
    proofs: proofs.map((p) => ({
      id: p.id,
      name: p.name,
      premises: p.premises.map(formulaToString),
      conclusion: formulaToString(p.conclusion),
      lineCount: p.lines.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
});

/** Get proof by ID */
router.get('/proofs/:id', validate({ query: z.record(z.unknown()) }), requirePermission('governance.record.read'), (req: Request, res: Response) => {
  const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
  const proofs = getTenantProofs(tenantId);
  const proof = proofs.find((p) => p.id === req.params.id);
  if (!proof) {
    res.status(404).json({ error: "Proof not found" });
    return;
  }
  res.json({
    ...proof,
    premises: proof.premises.map(formulaToString),
    conclusion: formulaToString(proof.conclusion),
    lines: proof.lines.map((l) => ({
      lineNumber: l.lineNumber,
      formula: formulaToString(l.formula),
      rule: l.rule,
      citations: l.citations,
      depth: l.depth,
      isAssumption: l.isAssumption,
    })),
  });
});

/** Create new proof */
router.post('/proofs', requirePermission('governance.record.write'), validate({ body: createProofsBody }), (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { name, premises, conclusion, lines } = req.body;

    if (!name || !premises || !conclusion) {
      res.status(400).json({ error: "name, premises, and conclusion are required" });
      return;
    }

    const proof: FitchProof = {
      id: uuid().slice(0, 12),
      name,
      premises: (premises as string[]).map(parseFormula),
      conclusion: parseFormula(conclusion),
      lines: lines ? deserializeLines(lines) : [],
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    getTenantProofs(tenantId).push(proof);
    res.status(201).json({ id: proof.id, message: "Proof created" });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Update proof */
router.put('/proofs/:id', requirePermission('governance.record.write'), validate({ body: updateProofsBody }), (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const proofs = getTenantProofs(tenantId);
    const idx = proofs.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Proof not found" });
      return;
    }

    const { name, premises, conclusion, lines } = req.body;
    if (name) proofs[idx].name = name;
    if (premises) proofs[idx].premises = (premises as string[]).map(parseFormula);
    if (conclusion) proofs[idx].conclusion = parseFormula(conclusion);
    if (lines) proofs[idx].lines = deserializeLines(lines);
    proofs[idx].updatedAt = new Date().toISOString();

    res.json({ message: "Proof updated" });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Delete proof */
router.delete('/proofs/:id', validate({ body: genericPayloadSchema }), requirePermission('governance.record.delete'), (req: Request, res: Response) => {
  const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
  const proofs = getTenantProofs(tenantId);
  const idx = proofs.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Proof not found" });
    return;
  }
  proofs.splice(idx, 1);
  res.json({ message: "Proof deleted" });
});

/** Verify a proof (stateless — does not require stored proof) */
router.post('/verify', requirePermission('governance.record.read'), validate({ body: createVerifyBody }), (req: Request, res: Response) => {
  try {
    const { premises, conclusion, lines } = req.body;
    if (!premises || !conclusion || !lines) {
      res.status(400).json({ error: "premises, conclusion, and lines are required" });
      return;
    }

    const proof: FitchProof = {
      id: "verify",
      name: "verify",
      premises: (premises as string[]).map(parseFormula),
      conclusion: parseFormula(conclusion),
      lines: deserializeLines(lines),
    };

    const result = verifyProof(proof);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Parse a formula string and return the AST + formatted string */
router.post('/parse', requirePermission('governance.record.read'), validate({ body: createParseBody }), (req: Request, res: Response) => {
  try {
    const { formula } = req.body;
    if (!formula) {
      res.status(400).json({ error: "formula is required" });
      return;
    }
    const parsed = parseFormula(formula);
    res.json({ ast: parsed, formatted: formulaToString(parsed) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Get example proof templates */
router.get('/examples', validate({ query: z.record(z.unknown()) }), requirePermission('governance.record.read'), (_req: Request, res: Response) => {
  res.json({ examples: EXAMPLE_PROOFS });
});

/** List all inference rules with descriptions */
router.get('/rules', validate({ query: z.record(z.unknown()) }), requirePermission('governance.record.read'), (_req: Request, res: Response) => {
  res.json({ rules: RULE_DESCRIPTIONS });
});

export default router;

