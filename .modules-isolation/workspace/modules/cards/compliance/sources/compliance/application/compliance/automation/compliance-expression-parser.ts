import { logger } from '../../../ports/logger.port';
// ============================================
// Shahin — Compliance Expression Parser
// Safe recursive descent parser for compliance condition evaluation.
// Does NOT use eval(), new Function(), or the vm module.
// ============================================
//
// Supports:
//   - Field references: control.status, risk.score, ${controlId}
//   - Comparisons: ==, !=, >, <, >=, <=
//   - Logical: AND, OR, NOT (case-insensitive)
//   - Arithmetic: +, -, *, /
//   - String ops: contains(), startsWith(), endsWith(), matches()
//   - Parentheses for grouping
//   - String literals ('...', "..."), numbers, booleans (true/false)

import { TokenType, Token } from './compliance-as-code.types';

// ── Regex Safety ──────────────────────────────────────────────────────────

/** Maximum allowed regex pattern length to mitigate ReDoS attacks */
const MAX_REGEX_PATTERN_LENGTH = 200;

/**
 * Safely test a regex pattern against a string.
 * Rejects patterns longer than MAX_REGEX_PATTERN_LENGTH to limit complexity.
 * Wraps execution in a try/catch to handle invalid or catastrophic patterns.
 */
function safeRegexTest(pattern: string, subject: string): boolean {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    throw new Error(
      `Regex pattern exceeds maximum allowed length of ${MAX_REGEX_PATTERN_LENGTH} characters (got ${pattern.length}). ` +
      'Simplify the pattern to reduce ReDoS risk.'
    );
  }
  try {
    return new RegExp(pattern).test(subject);
  } catch (_err) {
    // Invalid regex syntax or other RegExp error
    return false;
  }
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function compareComparable(left: unknown, right: unknown, op: 'GT' | 'LT' | 'GTE' | 'LTE'): boolean {
  const a = toComparableNumber(left);
  const b = toComparableNumber(right);
  if (a == null || b == null) return false;
  switch (op) {
    case 'GT': return a > b;
    case 'LT': return a < b;
    case 'GTE': return a >= b;
    case 'LTE': return a <= b;
  }
}

/** Tokenize an expression string into a stream of tokens */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const start = i;
    const ch = input[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let str = '';
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < len) { i++; }
        str += input[i++];
      }
      i++;
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let num = '';
      if (ch === '-') { num += '-'; i++; }
      while (i < len && /[0-9.]/.test(input[i])) num += input[i++];
      tokens.push({ type: 'NUMBER', value: parseFloat(num), pos: start });
      continue;
    }

    if (ch === '=' && input[i + 1] === '=') { tokens.push({ type: 'EQ', value: '==', pos: start }); i += 2; continue; }
    if (ch === '!' && input[i + 1] === '=') { tokens.push({ type: 'NEQ', value: '!=', pos: start }); i += 2; continue; }
    if (ch === '>' && input[i + 1] === '=') { tokens.push({ type: 'GTE', value: '>=', pos: start }); i += 2; continue; }
    if (ch === '<' && input[i + 1] === '=') { tokens.push({ type: 'LTE', value: '<=', pos: start }); i += 2; continue; }
    if (ch === '|' && input[i + 1] === '|') { tokens.push({ type: 'OR', value: '||', pos: start }); i += 2; continue; }
    if (ch === '&' && input[i + 1] === '&') { tokens.push({ type: 'AND', value: '&&', pos: start }); i += 2; continue; }

    const singleMap: Record<string, TokenType> = {
      '>': 'GT', '<': 'LT', '+': 'PLUS', '-': 'MINUS',
      '*': 'STAR', '/': 'SLASH', '.': 'DOT',
      '(': 'LPAREN', ')': 'RPAREN', ',': 'COMMA',
    };
    if (ch in singleMap) { tokens.push({ type: singleMap[ch]!, value: ch, pos: start }); i++; continue; }
    if (ch === '!') { tokens.push({ type: 'NOT', value: '!', pos: start }); i++; continue; }

    if (/[a-zA-Z_$]/.test(ch)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_$]/.test(input[i])) ident += input[i++];
      const upper = ident.toUpperCase();
      if (upper === 'AND') { tokens.push({ type: 'AND', value: ident, pos: start }); continue; }
      if (upper === 'OR')  { tokens.push({ type: 'OR',  value: ident, pos: start }); continue; }
      if (upper === 'NOT') { tokens.push({ type: 'NOT', value: ident, pos: start }); continue; }
      if (upper === 'TRUE')  { tokens.push({ type: 'BOOLEAN', value: true,  pos: start }); continue; }
      if (upper === 'FALSE') { tokens.push({ type: 'BOOLEAN', value: false, pos: start }); continue; }
      tokens.push({ type: 'IDENT', value: ident, pos: start });
      continue;
    }

    i++;
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

/**
 * Recursive descent parser and evaluator.
 * Grammar (precedence low->high):
 *   expr       = orExpr
 *   orExpr     = andExpr ( (OR | '||') andExpr )*
 *   andExpr    = notExpr ( (AND | '&&') notExpr )*
 *   notExpr    = (NOT | '!') notExpr | comparison
 *   comparison = addExpr ( (== | != | > | < | >= | <=) addExpr )?
 *   addExpr    = mulExpr ( (+ | -) mulExpr )*
 *   mulExpr    = unary ( (* | /) unary )*
 *   unary      = ('-') unary | callOrAccess
 *   callOrAccess = primary ( '.' IDENT ( '(' args ')' )? )*
 *   primary    = STRING | NUMBER | BOOLEAN | IDENT | '(' expr ')'
 *              | IDENT '(' args ')'   -- standalone function call
 */
export class ExpressionParser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private context: Record<string, unknown>,
  ) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) throw new Error(`Expected ${type} but got ${t.type} at pos ${t.pos}`);
    return this.advance();
  }
  private match(...types: TokenType[]): Token | null {
    if (types.includes(this.peek().type)) return this.advance();
    return null;
  }

  parse(): unknown {
    const result = this.orExpr();
    if (this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return result;
  }

  private orExpr(): unknown {
    let left = this.andExpr();
    while (this.match('OR')) {
      // Short-circuit: if left is truthy, skip evaluating right
      if (left) {
        this.andExpr(); // consume tokens but discard result
      } else {
        left = this.andExpr();
      }
      left = !!left;
    }
    return left;
  }

  private andExpr(): unknown {
    let left = this.notExpr();
    while (this.match('AND')) {
      // Short-circuit: if left is falsy, skip evaluating right
      if (!left) {
        this.notExpr(); // consume tokens but discard result
        left = false;
      } else {
        left = !!this.notExpr();
      }
    }
    return left;
  }

  private notExpr(): unknown {
    if (this.match('NOT')) {
      return !this.notExpr();
    }
    return this.comparison();
  }

  private comparison(): unknown {
    let left = this.addExpr();
    const op = this.match('EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE');
    if (op) {
      const right = this.addExpr();
      switch (op.type) {
        case 'EQ':  return left == right;  // intentional loose equality for cross-type compare
        case 'NEQ': return left != right;
        case 'GT':  return compareComparable(left, right, 'GT');
        case 'LT':  return compareComparable(left, right, 'LT');
        case 'GTE': return compareComparable(left, right, 'GTE');
        case 'LTE': return compareComparable(left, right, 'LTE');
      }
    }
    return left;
  }

  private addExpr(): unknown {
    let left = this.mulExpr();
    let op: Token | null;
    while ((op = this.match('PLUS', 'MINUS'))) {
      const right = this.mulExpr();

      left = op.type === 'PLUS' ? (left as any) + right : left - right;
    }
    return left;
  }

  private mulExpr(): unknown {
    let left = this.unary();
    let op: Token | null;
    while ((op = this.match('STAR', 'SLASH'))) {
      const right = this.unary();

      left = op.type === 'STAR' ? left * right : (right !== 0 ? left / right : 0);
    }
    return left;
  }

  private unary(): unknown {
    if (this.match('MINUS')) {
      return -this.unary();
    }
    return this.callOrAccess();
  }

  /** Handle property access (a.b.c) and method calls (a.contains('x')) */
  private callOrAccess(): unknown {
    let value = this.primary();

    while (this.peek().type === 'DOT') {
      this.advance(); // consume '.'
      const prop = this.expect('IDENT');
      const propName = prop.value as string;

      // Check if it is a method call: ident '(' args ')'
      if (this.peek().type === 'LPAREN') {
        this.advance(); // consume '('
        const args = this.parseArgs();
        this.expect('RPAREN');
        value = this.callStringMethod(value, propName, args);
      } else {
        // Property access
        value = value != null ? (value as Record<string, unknown>)[propName] : undefined;
      }
    }

    return value;
  }

  private primary(): unknown {
    const t = this.peek();

    if (t.type === 'STRING')  { this.advance(); return t.value; }
    if (t.type === 'NUMBER')  { this.advance(); return t.value; }
    if (t.type === 'BOOLEAN') { this.advance(); return t.value; }

    if (t.type === 'LPAREN') {
      this.advance();
      const val = this.orExpr();
      this.expect('RPAREN');
      return val;
    }

    if (t.type === 'IDENT') {
      this.advance();
      const name = t.value as string;

      // Standalone function call: contains(str, substr)
      if (this.peek().type === 'LPAREN') {
        this.advance();
        const args = this.parseArgs();
        this.expect('RPAREN');
        return this.callStandaloneFunction(name, args);
      }

      // Variable lookup from context
      return this.resolveVariable(name);
    }

    throw new Error(`Unexpected token '${t.value}' (${t.type}) at position ${t.pos}`);
  }

  private parseArgs(): unknown[] {
    const args: unknown[] = [];
    if (this.peek().type === 'RPAREN') return args;
    args.push(this.orExpr());
    while (this.match('COMMA')) {
      args.push(this.orExpr());
    }
    return args;
  }

  /** Resolve a variable name from the context, supporting nested dotted paths */
  private resolveVariable(name: string): unknown {
    if (name in this.context) return this.context[name];
    // Not found at top level — return undefined (property access via DOT will handle nesting)
    return undefined;
  }

  /** Execute a string method on a value */
  private callStringMethod(target: any, method: string, args: unknown[]): unknown {
    const str = target != null ? String(target) : '';
    switch (method) {
      case 'contains':
        return str.includes(String(args[0] ?? ''));
      case 'startsWith':
        return str.startsWith(String(args[0] ?? ''));
      case 'endsWith':
        return str.endsWith(String(args[0] ?? ''));
      case 'matches': {
        const pattern = String(args[0] ?? '');
        return safeRegexTest(pattern, str);
      }
      case 'length':
        return str.length;
      case 'toLowerCase':
        return str.toLowerCase();
      case 'toUpperCase':
        return str.toUpperCase();
      case 'trim':
        return str.trim();
      default:
        throw new Error(`Unknown method '${method}'`);
    }
  }

  /** Execute a standalone function call */
  private callStandaloneFunction(name: string, args: unknown[]): unknown {
    switch (name) {
      case 'contains':
        return String(args[0] ?? '').includes(String(args[1] ?? ''));
      case 'startsWith':
        return String(args[0] ?? '').startsWith(String(args[1] ?? ''));
      case 'endsWith':
        return String(args[0] ?? '').endsWith(String(args[1] ?? ''));
      case 'matches': {
        const pattern = String(args[1] ?? '');
        const subject = String(args[0] ?? '');
        return safeRegexTest(pattern, subject);
      }
      case 'len':
      case 'length':
        return args[0] != null ? String(args[0]).length : 0;
      case 'abs':
        return Math.abs(Number(args[0]) || 0);
      case 'min':
        return Math.min(...args.map(a => Number(a) || 0));
      case 'max':
        return Math.max(...args.map(a => Number(a) || 0));
      case 'round':
        return Math.round(Number(args[0]) || 0);
      case 'floor':
        return Math.floor(Number(args[0]) || 0);
      case 'ceil':
        return Math.ceil(Number(args[0]) || 0);
      default:
        throw new Error(`Unknown function '${name}'`);
    }
  }
}

/**
 * Evaluate a condition expression safely without eval/Function/vm.
 * Supports field references, comparisons, logical ops, arithmetic,
 * and string methods (contains, startsWith, endsWith, matches).
 *
 * @param condition - Expression string, e.g. "control.status == 'active' AND risk.score > 5"
 * @param variables - Context object with field values
 * @returns boolean result of the expression
 */
export function evalCondition(condition: string, variables: Record<string, unknown>): boolean {
  // Substitute ${var} placeholders with actual values before parsing
  let expr = condition;
  for (const [key, value] of Object.entries(variables)) {
    const replacement = typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
    expr = expr.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacement);
  }

  try {
    const tokens = tokenize(expr);
    const parser = new ExpressionParser(tokens, variables);
    const result = parser.parse();
    return !!result;
  } catch (err) {
    logger.error(`Safe expression evaluation failed for: ${condition}`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Compare test result with expected value
 */
export function compareResult(actual: unknown, expected: unknown): boolean {
  if (expected === undefined) return true; // No expectation = always pass

  // Simple equality check
  if (typeof expected === 'boolean') {
    return (actual as Record<string, unknown>)?.passed === expected;
  }

  if (typeof expected === 'object' && expected !== null) {
    // Deep comparison for objects
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  return actual === expected;
}
