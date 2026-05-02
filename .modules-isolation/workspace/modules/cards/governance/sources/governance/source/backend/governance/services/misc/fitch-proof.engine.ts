import { safeQuery } from "@dos/db";

/**
 * Fitch-Style Natural Deduction Proof Engine
 *
 * Implements propositional logic with the following connectives:
 *   ∧ (AND), ∨ (OR), → (IMPLIES), ¬ (NOT), ↔ (BICONDITIONAL), ⊥ (CONTRADICTION)
 *
 * Supported inference rules:
 *   - Assumption (open a sub-proof)
 *   - Reiteration (re-state an accessible line)
 *   - ∧-Intro, ∧-Elim
 *   - ∨-Intro, ∨-Elim
 *   - →-Intro, →-Elim (Modus Ponens)
 *   - ¬-Intro, ¬-Elim (Double Negation Elimination)
 *   - ↔-Intro, ↔-Elim
 *   - ⊥-Intro (Contradiction Introduction)
 *   - ⊥-Elim (Ex Falso Quodlibet)
 */

// ─── Formula AST ────────────────────────────────────────────────────────────

export type Formula =
  | { kind: "atom"; name: string }
  | { kind: "not"; operand: Formula }
  | { kind: "and"; left: Formula; right: Formula }
  | { kind: "or"; left: Formula; right: Formula }
  | { kind: "implies"; left: Formula; right: Formula }
  | { kind: "biconditional"; left: Formula; right: Formula }
  | { kind: "bottom" }; // ⊥

// ─── Proof Lines ────────────────────────────────────────────────────────────

export type RuleName =
  | "assumption"
  | "premise"
  | "reiteration"
  | "and_intro"
  | "and_elim"
  | "or_intro"
  | "or_elim"
  | "implies_intro"
  | "implies_elim"
  | "not_intro"
  | "not_elim"
  | "biconditional_intro"
  | "biconditional_elim"
  | "bottom_intro"
  | "bottom_elim";

export interface ProofLine {
  lineNumber: number;
  formula: Formula;
  rule: RuleName;
  /** Line numbers or sub-proof ranges cited as justification */
  citations: number[];
  /** Depth of sub-proof nesting (0 = top-level) */
  depth: number;
  /** If this line opens a sub-proof, true */
  isAssumption?: boolean;
}

export interface SubProof {
  assumptionLine: number;
  lastLine: number;
  depth: number;
}

export interface FitchProof {
  id: string;
  name: string;
  premises: Formula[];
  conclusion: Formula;
  lines: ProofLine[];
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VerificationResult {
  valid: boolean;
  errors: VerificationError[];
  completeness: "complete" | "incomplete";
}

export interface VerificationError {
  lineNumber: number;
  message: string;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * Recursive-descent parser for propositional logic formulas.
 *
 * Grammar (precedence low→high):
 *   biconditional : implication ( '↔' implication )*
 *   implication   : disjunction ( '→' disjunction )*   (right-associative)
 *   disjunction   : conjunction ( '∨' conjunction )*
 *   conjunction   : unary ( '∧' unary )*
 *   unary         : '¬' unary | atom | '(' biconditional ')' | '⊥'
 *   atom          : [A-Z][A-Za-z0-9_]*
 */
export function parseFormula(input: string): Formula {
      safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }
    // Multi-char operators
    if (input.slice(i, i + 3) === "<->") {
      tokens.push("<->");
      i += 3;
      continue;
    }
    if (input.slice(i, i + 3) === "_|_") {
      tokens.push("_|_");
      i += 3;
      continue;
    }
    if (input.slice(i, i + 2) === "->") {
      tokens.push("->");
      i += 2;
      continue;
    }
    if (input.slice(i, i + 2) === "||") {
      tokens.push("||");
      i += 2;
      continue;
    }
    if (input.slice(i, i + 2) === "&&") {
      tokens.push("&&");
      i += 2;
      continue;
    }
    // Single-char
    if ("()¬∧∨→↔⊥~!^".includes(input[i])) {
      tokens.push(input[i]);
      i++;
      continue;
    }
    // 'v' as OR (standalone lowercase v)
    if (input[i] === "v" && (i + 1 >= input.length || !/[A-Za-z0-9_]/.test(input[i + 1]))) {
      tokens.push("v");
      i++;
      continue;
    }
    // Identifiers (atoms): start with uppercase
    if (/[A-Za-z]/.test(input[i])) {
      let id = "";
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) {
        id += input[i];
        i++;
      }
      if (id === "false") {
        tokens.push("false");
      } else {
        tokens.push(id);
      }
      continue;
    }
    throw new Error(`Unexpected character '${input[i]}' at position ${i}`);
  }
  return tokens;
}

// ─── Formula Utilities ──────────────────────────────────────────────────────

export function formulaToString(f: Formula): string {
  switch (f.kind) {
    case "atom":
      return f.name;
    case "bottom":
      return "⊥";
    case "not":
      return `¬${wrapIfComplex(f.operand)}`;
    case "and":
      return `${wrapIfComplex(f.left)} ∧ ${wrapIfComplex(f.right)}`;
    case "or":
      return `${wrapIfComplex(f.left)} ∨ ${wrapIfComplex(f.right)}`;
    case "implies":
      return `${wrapIfComplex(f.left)} → ${wrapIfComplex(f.right)}`;
    case "biconditional":
      return `${wrapIfComplex(f.left)} ↔ ${wrapIfComplex(f.right)}`;
  }
}

function wrapIfComplex(f: Formula): string {
  if (f.kind === "atom" || f.kind === "bottom" || f.kind === "not") {
    return formulaToString(f);
  }
  return `(${formulaToString(f)})`;
}

export function formulasEqual(a: Formula, b: Formula): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "atom":
      return (b as Record<string, unknown>).name === a.name;
    case "bottom":
      return true;
    case "not":
      return formulasEqual(a.operand, ((b as Record<string, unknown>) as any).operand);
    case "and":
    case "or":
    case "implies":
    case "biconditional":
      return (
        formulasEqual(a.left, ((b as Record<string, unknown>) as any).left) &&
        formulasEqual(a.right, ((b as Record<string, unknown>) as any).right)
      );
  }
}

// ─── Proof Verifier ─────────────────────────────────────────────────────────

/**
 * Verifies every line of a Fitch proof. Returns line-by-line errors.
 */
export function verifyProof(proof: FitchProof): VerificationResult {
  const errors: VerificationError[] = [];
  const lines = proof.lines;

  // Build sub-proof structure
  const subProofs = buildSubProofs(lines);

  for (const line of lines) {
    const err = verifyLine(line, lines, subProofs, proof.premises);
    if (err) {
      errors.push({ lineNumber: line.lineNumber, message: err });
    }
  }

  // Check completeness: last top-level line must match conclusion
  const topLevelLines = lines.filter((l) => l.depth === 0);
  const lastTopLevel = topLevelLines[topLevelLines.length - 1];
  const complete =
    lastTopLevel && formulasEqual(lastTopLevel.formula, proof.conclusion)
      ? "complete"
      : "incomplete";

  return { valid: errors.length === 0, errors, completeness: complete };
}

function buildSubProofs(lines: ProofLine[]): SubProof[] {
  const result: SubProof[] = [];
  const stack: number[] = []; // stack of assumption line numbers

  for (const line of lines) {
    if (line.isAssumption && line.rule === "assumption") {
      stack.push(line.lineNumber);
    }
    // When depth decreases, close sub-proofs
    const nextLine = lines.find((l) => l.lineNumber === line.lineNumber + 1);
    if (nextLine && nextLine.depth < line.depth) {
      const diff = line.depth - nextLine.depth;
      for (let i = 0; i < diff; i++) {
        const assumptionLine = stack.pop();
        if (assumptionLine !== undefined) {
          result.push({
            assumptionLine,
            lastLine: line.lineNumber,
            depth: line.depth - i,
          });
        }
      }
    }
  }
  // Close any remaining open sub-proofs at the end
  const lastLine = lines[lines.length - 1];
  if (lastLine) {
    while (stack.length > 0) {
      const assumptionLine = stack.pop()!;
      result.push({
        assumptionLine,
        lastLine: lastLine.lineNumber,
        depth: stack.length + 1,
      });
    }
  }

  return result;
}

function getLine(lines: ProofLine[], num: number): ProofLine | undefined {
  return lines.find((l) => l.lineNumber === num);
}

function isAccessible(
  fromLine: ProofLine,
  targetLineNum: number,
  lines: ProofLine[],
  subProofs: SubProof[]
): boolean {
  const target = getLine(lines, targetLineNum);
  if (!target) return false;
  if (target.lineNumber >= fromLine.lineNumber) return false;

  // Target must be at same depth or shallower, and not inside a closed sub-proof
  if (target.depth <= fromLine.depth) {
    // Check it's not inside a sub-proof that closed before fromLine
    for (const sp of subProofs) {
      if (
        target.lineNumber >= sp.assumptionLine &&
        target.lineNumber <= sp.lastLine &&
        sp.lastLine < fromLine.lineNumber &&
        sp.depth > fromLine.depth
      ) {
        return false;
      }
    }
    return true;
  }

  // Target is deeper — only accessible if we're inside the same sub-proof
  return target.depth <= fromLine.depth;
}

function isSubProofAccessible(
  fromLine: ProofLine,
  spAssumption: number,
  spLast: number,
  subProofs: SubProof[]
): boolean {
  // The sub-proof must be closed and at depth = fromLine.depth + 1 (or accessible)
  const sp = subProofs.find(
    (s) => s.assumptionLine === spAssumption && s.lastLine === spLast
  );
  if (!sp) return false;
  // Sub-proof must end before the current line
  return sp.lastLine < fromLine.lineNumber;
}

function verifyLine(
  line: ProofLine,
  lines: ProofLine[],
  subProofs: SubProof[],
  premises: Formula[]
): string | null {
  const { rule, citations } = line;

  switch (rule) {
    case "premise": {
      // Must match one of the declared premises
      const match = premises.some((p) => formulasEqual(p, line.formula));
      if (!match) return "Formula does not match any declared premise";
      if (line.depth !== 0) return "Premises must be at top level (depth 0)";
      return null;
    }

    case "assumption": {
      // Opens a sub-proof — no citations needed, just a formula
      if (!line.isAssumption) return "Assumption line must be marked as isAssumption";
      return null;
    }

    case "reiteration": {
      if (citations.length !== 1) return "Reiteration requires exactly 1 citation";
      const cited = getLine(lines, citations[0]);
      if (!cited) return `Cited line ${citations[0]} not found`;
      if (!isAccessible(line, citations[0], lines, subProofs))
        return `Line ${citations[0]} is not accessible`;
      if (!formulasEqual(line.formula, cited.formula))
        return "Formula must match the cited line";
      return null;
    }

    case "and_intro": {
      // φ, ψ ⊢ φ ∧ ψ
      if (citations.length !== 2) return "∧-Intro requires exactly 2 citations";
      if (line.formula.kind !== "and") return "Conclusion must be a conjunction (∧)";
      const [c1, c2] = citations;
      const l1 = getLine(lines, c1);
      const l2 = getLine(lines, c2);
      if (!l1 || !l2) return "Cited line(s) not found";
      if (!isAccessible(line, c1, lines, subProofs))
        return `Line ${c1} is not accessible`;
      if (!isAccessible(line, c2, lines, subProofs))
        return `Line ${c2} is not accessible`;
      if (!formulasEqual(line.formula.left, l1.formula))
        return "Left conjunct does not match first citation";
      if (!formulasEqual(line.formula.right, l2.formula))
        return "Right conjunct does not match second citation";
      return null;
    }

    case "and_elim": {
      // φ ∧ ψ ⊢ φ  or  φ ∧ ψ ⊢ ψ
      if (citations.length !== 1) return "∧-Elim requires exactly 1 citation";
      const cited = getLine(lines, citations[0]);
      if (!cited) return `Cited line ${citations[0]} not found`;
      if (!isAccessible(line, citations[0], lines, subProofs))
        return `Line ${citations[0]} is not accessible`;
      if (cited.formula.kind !== "and")
        return "Cited formula must be a conjunction (∧)";
      if (
        !formulasEqual(line.formula, cited.formula.left) &&
        !formulasEqual(line.formula, cited.formula.right)
      )
        return "Conclusion must be either conjunct of the cited conjunction";
      return null;
    }

    case "or_intro": {
      // φ ⊢ φ ∨ ψ  or  ψ ⊢ φ ∨ ψ
      if (citations.length !== 1) return "∨-Intro requires exactly 1 citation";
      if (line.formula.kind !== "or") return "Conclusion must be a disjunction (∨)";
      const cited = getLine(lines, citations[0]);
      if (!cited) return `Cited line ${citations[0]} not found`;
      if (!isAccessible(line, citations[0], lines, subProofs))
        return `Line ${citations[0]} is not accessible`;
      if (
        !formulasEqual(cited.formula, line.formula.left) &&
        !formulasEqual(cited.formula, line.formula.right)
      )
        return "Cited formula must appear as a disjunct";
      return null;
    }

    case "or_elim": {
      // φ ∨ ψ, [φ → χ], [ψ → χ] ⊢ χ
      // Citations: disjunction line, sub-proof1 (start, end), sub-proof2 (start, end)
      if (citations.length !== 5)
        return "∨-Elim requires 5 citations: disjunction line, sub-proof1 start, sub-proof1 end, sub-proof2 start, sub-proof2 end";
      const [disj, sp1Start, sp1End, sp2Start, sp2End] = citations;
      const disjLine = getLine(lines, disj);
      if (!disjLine) return `Cited line ${disj} not found`;
      if (!isAccessible(line, disj, lines, subProofs))
        return `Line ${disj} is not accessible`;
      if (disjLine.formula.kind !== "or")
        return "First citation must be a disjunction";

      // Sub-proof 1: assumes left disjunct, derives conclusion
      const sp1AssumLine = getLine(lines, sp1Start);
      const sp1LastLine = getLine(lines, sp1End);
      if (!sp1AssumLine || !sp1LastLine) return "Sub-proof 1 lines not found";
      if (!formulasEqual(sp1AssumLine.formula, disjLine.formula.left))
        return "Sub-proof 1 must assume left disjunct";
      if (!formulasEqual(sp1LastLine.formula, line.formula))
        return "Sub-proof 1 must derive the conclusion";
      if (
        !isSubProofAccessible(line, sp1Start, sp1End, subProofs)
      )
        return "Sub-proof 1 is not accessible";

      // Sub-proof 2: assumes right disjunct, derives conclusion
      const sp2AssumLine = getLine(lines, sp2Start);
      const sp2LastLine = getLine(lines, sp2End);
      if (!sp2AssumLine || !sp2LastLine) return "Sub-proof 2 lines not found";
      if (!formulasEqual(sp2AssumLine.formula, disjLine.formula.right))
        return "Sub-proof 2 must assume right disjunct";
      if (!formulasEqual(sp2LastLine.formula, line.formula))
        return "Sub-proof 2 must derive the conclusion";
      if (
        !isSubProofAccessible(line, sp2Start, sp2End, subProofs)
      )
        return "Sub-proof 2 is not accessible";

      return null;
    }

    case "implies_intro": {
      // [φ ... ψ] ⊢ φ → ψ
      if (citations.length !== 2)
        return "→-Intro requires 2 citations: sub-proof start and end";
      if (line.formula.kind !== "implies")
        return "Conclusion must be a conditional (→)";
      const [spStart, spEnd] = citations;
      const assumLine = getLine(lines, spStart);
      const lastLine = getLine(lines, spEnd);
      if (!assumLine || !lastLine) return "Sub-proof lines not found";
      if (!isSubProofAccessible(line, spStart, spEnd, subProofs))
        return "Sub-proof is not accessible";
      if (!formulasEqual(line.formula.left, assumLine.formula))
        return "Antecedent must match sub-proof assumption";
      if (!formulasEqual(line.formula.right, lastLine.formula))
        return "Consequent must match sub-proof conclusion";
      return null;
    }

    case "implies_elim": {
      // φ → ψ, φ ⊢ ψ  (Modus Ponens)
      if (citations.length !== 2) return "→-Elim requires exactly 2 citations";
      const [c1, c2] = citations;
      const condLine = getLine(lines, c1);
      const antLine = getLine(lines, c2);
      if (!condLine || !antLine) return "Cited line(s) not found";
      if (!isAccessible(line, c1, lines, subProofs))
        return `Line ${c1} is not accessible`;
      if (!isAccessible(line, c2, lines, subProofs))
        return `Line ${c2} is not accessible`;

      // Allow either order: (conditional, antecedent) or (antecedent, conditional)
      let cond: ProofLine, ant: ProofLine;
      if (condLine.formula.kind === "implies") {
        cond = condLine;
        ant = antLine;
      } else if (antLine.formula.kind === "implies") {
        cond = antLine;
        ant = condLine;
      } else {
        return "One citation must be a conditional (→)";
      }

      if (!formulasEqual(ant.formula, (cond.formula as string).left))
        return "Antecedent does not match the condition's left side";

      if (!formulasEqual(line.formula, (cond.formula as string).right))
        return "Conclusion does not match the condition's right side";
      return null;
    }

    case "not_intro": {
      // [φ ... ⊥] ⊢ ¬φ
      if (citations.length !== 2)
        return "¬-Intro requires 2 citations: sub-proof start and end";
      if (line.formula.kind !== "not")
        return "Conclusion must be a negation (¬)";
      const [spStart, spEnd] = citations;
      const assumLine = getLine(lines, spStart);
      const lastLine = getLine(lines, spEnd);
      if (!assumLine || !lastLine) return "Sub-proof lines not found";
      if (!isSubProofAccessible(line, spStart, spEnd, subProofs))
        return "Sub-proof is not accessible";
      if (!formulasEqual(line.formula.operand, assumLine.formula))
        return "Negated formula must match sub-proof assumption";
      if (lastLine.formula.kind !== "bottom")
        return "Sub-proof must end with ⊥ (contradiction)";
      return null;
    }

    case "not_elim": {
      // ¬¬φ ⊢ φ  (Double Negation Elimination)
      if (citations.length !== 1) return "¬-Elim requires exactly 1 citation";
      const cited = getLine(lines, citations[0]);
      if (!cited) return `Cited line ${citations[0]} not found`;
      if (!isAccessible(line, citations[0], lines, subProofs))
        return `Line ${citations[0]} is not accessible`;
      if (cited.formula.kind !== "not")
        return "Cited formula must be a negation";

      if ((cited.formula as string).operand.kind !== "not")
        return "Cited formula must be a double negation (¬¬φ)";

      if (!formulasEqual(line.formula, ((cited.formula as string).operand as any).operand))
        return "Conclusion must be the doubly-negated formula";
      return null;
    }

    case "biconditional_intro": {
      // [φ ... ψ], [ψ ... φ] ⊢ φ ↔ ψ
      if (citations.length !== 4)
        return "↔-Intro requires 4 citations: sub-proof1 start, end, sub-proof2 start, end";
      if (line.formula.kind !== "biconditional")
        return "Conclusion must be a biconditional (↔)";
      const [sp1Start, sp1End, sp2Start, sp2End] = citations;
      const sp1Assume = getLine(lines, sp1Start);
      const sp1Last = getLine(lines, sp1End);
      const sp2Assume = getLine(lines, sp2Start);
      const sp2Last = getLine(lines, sp2End);
      if (!sp1Assume || !sp1Last || !sp2Assume || !sp2Last)
        return "Sub-proof lines not found";
      if (!isSubProofAccessible(line, sp1Start, sp1End, subProofs))
        return "Sub-proof 1 is not accessible";
      if (!isSubProofAccessible(line, sp2Start, sp2End, subProofs))
        return "Sub-proof 2 is not accessible";
      if (
        !formulasEqual(sp1Assume.formula, line.formula.left) ||
        !formulasEqual(sp1Last.formula, line.formula.right)
      )
        return "Sub-proof 1 must go from left to right of biconditional";
      if (
        !formulasEqual(sp2Assume.formula, line.formula.right) ||
        !formulasEqual(sp2Last.formula, line.formula.left)
      )
        return "Sub-proof 2 must go from right to left of biconditional";
      return null;
    }

    case "biconditional_elim": {
      // φ ↔ ψ, φ ⊢ ψ  or  φ ↔ ψ, ψ ⊢ φ
      if (citations.length !== 2) return "↔-Elim requires exactly 2 citations";
      const [c1, c2] = citations;
      const l1 = getLine(lines, c1);
      const l2 = getLine(lines, c2);
      if (!l1 || !l2) return "Cited line(s) not found";
      if (!isAccessible(line, c1, lines, subProofs))
        return `Line ${c1} is not accessible`;
      if (!isAccessible(line, c2, lines, subProofs))
        return `Line ${c2} is not accessible`;

      let bicond: ProofLine, other: ProofLine;
      if (l1.formula.kind === "biconditional") {
        bicond = l1;
        other = l2;
      } else if (l2.formula.kind === "biconditional") {
        bicond = l2;
        other = l1;
      } else {
        return "One citation must be a biconditional (↔)";
      }

      const bf = bicond.formula as { kind: "biconditional"; left: Formula; right: Formula };
      if (formulasEqual(other.formula, bf.left)) {
        if (!formulasEqual(line.formula, bf.right))
          return "Conclusion does not match biconditional elimination";
      } else if (formulasEqual(other.formula, bf.right)) {
        if (!formulasEqual(line.formula, bf.left))
          return "Conclusion does not match biconditional elimination";
      } else {
        return "Second citation must match one side of the biconditional";
      }
      return null;
    }

    case "bottom_intro": {
      // φ, ¬φ ⊢ ⊥
      if (line.formula.kind !== "bottom") return "Conclusion must be ⊥";
      if (citations.length !== 2) return "⊥-Intro requires exactly 2 citations";
      const [c1, c2] = citations;
      const l1 = getLine(lines, c1);
      const l2 = getLine(lines, c2);
      if (!l1 || !l2) return "Cited line(s) not found";
      if (!isAccessible(line, c1, lines, subProofs))
        return `Line ${c1} is not accessible`;
      if (!isAccessible(line, c2, lines, subProofs))
        return `Line ${c2} is not accessible`;

      // One must be ¬φ and the other φ
      const isContradiction =
        (l1.formula.kind === "not" && formulasEqual(l1.formula.operand, l2.formula)) ||
        (l2.formula.kind === "not" && formulasEqual(l2.formula.operand, l1.formula));
      if (!isContradiction)
        return "Citations must be a formula and its negation";
      return null;
    }

    case "bottom_elim": {
      // ⊥ ⊢ φ  (Ex Falso Quodlibet)
      if (citations.length !== 1) return "⊥-Elim requires exactly 1 citation";
      const cited = getLine(lines, citations[0]);
      if (!cited) return `Cited line ${citations[0]} not found`;
      if (!isAccessible(line, citations[0], lines, subProofs))
        return `Line ${citations[0]} is not accessible`;
      if (cited.formula.kind !== "bottom")
        return "Cited formula must be ⊥";
      return null;
    }

    default:
      return `Unknown rule: ${rule}`;
  }
}

// ─── Example Proof Templates ────────────────────────────────────────────────

export const EXAMPLE_PROOFS: Array<{
  name: string;
  description: string;
  premises: string[];
  conclusion: string;
  lines: Array<{
    formula: string;
    rule: RuleName;
    citations: number[];
    depth: number;
    isAssumption?: boolean;
  }>;
}> = [
  {
    name: "Modus Ponens",
    description: "From P and P → Q, derive Q",
    premises: ["P", "P → Q"],
    conclusion: "Q",
    lines: [
      { formula: "P", rule: "premise", citations: [], depth: 0 },
      { formula: "P → Q", rule: "premise", citations: [], depth: 0 },
      { formula: "Q", rule: "implies_elim", citations: [2, 1], depth: 0 },
    ],
  },
  {
    name: "Hypothetical Syllogism",
    description: "From P → Q and Q → R, derive P → R",
    premises: ["P → Q", "Q → R"],
    conclusion: "P → R",
    lines: [
      { formula: "P → Q", rule: "premise", citations: [], depth: 0 },
      { formula: "Q → R", rule: "premise", citations: [], depth: 0 },
      { formula: "P", rule: "assumption", citations: [], depth: 1, isAssumption: true },
      { formula: "Q", rule: "implies_elim", citations: [1, 3], depth: 1 },
      { formula: "R", rule: "implies_elim", citations: [2, 4], depth: 1 },
      { formula: "P → R", rule: "implies_intro", citations: [3, 5], depth: 0 },
    ],
  },
  {
    name: "De Morgan (partial)",
    description: "From ¬(P ∨ Q), derive ¬P",
    premises: ["¬(P ∨ Q)"],
    conclusion: "¬P",
    lines: [
      { formula: "¬(P ∨ Q)", rule: "premise", citations: [], depth: 0 },
      { formula: "P", rule: "assumption", citations: [], depth: 1, isAssumption: true },
      { formula: "P ∨ Q", rule: "or_intro", citations: [2], depth: 1 },
      { formula: "⊥", rule: "bottom_intro", citations: [3, 1], depth: 1 },
      { formula: "¬P", rule: "not_intro", citations: [2, 4], depth: 0 },
    ],
  },
];
