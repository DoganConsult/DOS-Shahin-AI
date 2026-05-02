/**
 * Operation Metadata — semantic classification of HTTP mutations.
 *
 * Replaces hardcoded module lists with intent-based operation semantics.
 * The CSRF recovery engine uses this to make risk-scored decisions about
 * retry strategy, instead of matching URL patterns to lists of modules.
 *
 * Classification hierarchy:
 *   idempotent        → PUT/PATCH to single resource, safe to replay
 *   non-idempotent    → POST creates, cannot safely replay
 *   bulk              → batch/bulk ops, replay causes duplicates
 *   compensatable     → has undo path, retry with caution
 *   privileged        → approval/sign-off, never auto-retry
 *   pre-auth          → auth flow, no CSRF needed
 *   public            → public endpoint, no CSRF needed
 *   export-only       → blob generation, safe to retry (read-heavy)
 *   upload-with-write → FormData with side effects
 *   async-triggering  → kicks off background job, replay spawns duplicates
 */

export type OperationSemantic =
  | 'idempotent'
  | 'non-idempotent'
  | 'bulk'
  | 'compensatable'
  | 'privileged'
  | 'pre-auth'
  | 'public'
  | 'export-only'
  | 'upload-with-write'
  | 'async-triggering';

export type ReplayRisk = 'safe' | 'cautious' | 'unsafe' | 'forbidden';

export interface OperationProfile {
  semantic: OperationSemantic;
  replayRisk: ReplayRisk;
  csrfRequired: boolean;
  autoRetryAllowed: boolean;
  userConfirmOnRetry: boolean;
}

// ── Classification rules (evaluated in order, first match wins) ──

interface ClassificationRule {
  test: (method: string, url: string) => boolean;
  profile: OperationProfile;
}

const RULES: ClassificationRule[] = [
  // ── Pre-auth / exempt (no CSRF needed) ──
  {
    test: (_, url) => /\/csrf\/(token|session-health)/.test(url),
    profile: { semantic: 'pre-auth', replayRisk: 'safe', csrfRequired: false, autoRetryAllowed: false, userConfirmOnRetry: false },
  },
  {
    test: (_, url) => /\/api\/public\//.test(url),
    profile: { semantic: 'public', replayRisk: 'safe', csrfRequired: false, autoRetryAllowed: false, userConfirmOnRetry: false },
  },
  {
    test: (_, url) => /\/api\/onboarding\/new-user\//.test(url),
    profile: {
      semantic: 'non-idempotent',
      replayRisk: 'cautious',
      csrfRequired: true,
      autoRetryAllowed: false,
      userConfirmOnRetry: false,
    },
  },

  // ── Privileged operations (approval, sign-off, escalation) — never auto-retry ──
  {
    test: (_, url) => /\/(approve|reject|sign-off|escalate|revoke|delegate|close-out)/.test(url),
    profile: { semantic: 'privileged', replayRisk: 'forbidden', csrfRequired: true, autoRetryAllowed: false, userConfirmOnRetry: true },
  },

  // ── Bulk / batch operations — replay causes duplicates ──
  {
    test: (_, url) => /\/(bulk|batch|ingest-batch|bulk-assign|bulk-compute|bulk-generate|bulk-activate|bulk-deactivate)/.test(url),
    profile: { semantic: 'bulk', replayRisk: 'unsafe', csrfRequired: true, autoRetryAllowed: false, userConfirmOnRetry: false },
  },

  // ── Async-triggering operations — replay spawns duplicate jobs ──
  {
    test: (_, url) => /\/(provision|trigger|schedule|dispatch|generate-report|run-assessment|execute|reboot|seed)/.test(url),
    profile: { semantic: 'async-triggering', replayRisk: 'unsafe', csrfRequired: true, autoRetryAllowed: false, userConfirmOnRetry: false },
  },

  // ── Export / download (POST-based) — read-heavy, safe to retry ──
  {
    test: (_, url) => /\/(export|download|render-pdf|print)/.test(url),
    profile: { semantic: 'export-only', replayRisk: 'safe', csrfRequired: true, autoRetryAllowed: true, userConfirmOnRetry: false },
  },

  // ── Idempotent updates (PUT/PATCH to a specific resource) ──
  {
    test: (method, url) => (method === 'PUT' || method === 'PATCH') && /\/[a-f0-9-]{36}$/.test(url),
    profile: { semantic: 'idempotent', replayRisk: 'safe', csrfRequired: true, autoRetryAllowed: true, userConfirmOnRetry: false },
  },

  // ── DELETE (idempotent by HTTP spec) ──
  {
    test: (method) => method === 'DELETE',
    profile: { semantic: 'idempotent', replayRisk: 'safe', csrfRequired: true, autoRetryAllowed: true, userConfirmOnRetry: false },
  },

  // ── Default: non-idempotent POST (create) — cautious ──
  {
    test: (method) => method === 'POST',
    profile: { semantic: 'non-idempotent', replayRisk: 'cautious', csrfRequired: true, autoRetryAllowed: true, userConfirmOnRetry: false },
  },

  // ── Fallback for PUT/PATCH without UUID (bulk-ish) ──
  {
    test: () => true,
    profile: { semantic: 'non-idempotent', replayRisk: 'cautious', csrfRequired: true, autoRetryAllowed: true, userConfirmOnRetry: false },
  },
];

/**
 * Classify an HTTP request by its operation semantics.
 * Returns a profile describing replay risk, CSRF requirements, and retry policy.
 */
export function classifyOperation(method: string, url: string): OperationProfile {
  for (const rule of RULES) {
    if (rule.test(method, url)) {
      return rule.profile;
    }
  }
  return RULES[RULES.length - 1].profile;
}
