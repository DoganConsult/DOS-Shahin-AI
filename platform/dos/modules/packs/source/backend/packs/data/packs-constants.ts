/**
 * Packs -- Module Constants
 *
 * Canonical limits, timeouts, SLA defaults, and business thresholds
 * for the packs module.
 *
 * @owner DOS
 * @module packs
 */

// ── Limits ──────────────────────────────────────────────────────────
export const PACKS_LIMITS = {
  MAX_PACKS_PER_TENANT: 200,
  MAX_CONCURRENT_INSTALLS: 3,
  MAX_ARTIFACTS_PER_PACK: 50,
  MAX_PACK_FILE_SIZE_MB: 100,
  MAX_DEPENDENCY_DEPTH: 5,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_PACK_VERSION_LENGTH: 20,
  MAX_PACK_CODE_LENGTH: 100,
} as const;

// ── Timeouts ────────────────────────────────────────────────────────
export const PACKS_TIMEOUTS = {
  INSTALL_TIMEOUT_MINUTES: 15,
  UNINSTALL_TIMEOUT_MINUTES: 10,
  SYNC_TIMEOUT_MINUTES: 30,
  COMPATIBILITY_CHECK_TIMEOUT_MS: 5000,
  HEALTH_CHECK_INTERVAL_MINUTES: 60,
  STALE_INSTALL_AFTER_HOURS: 24,
} as const;

// ── SLA Defaults ────────────────────────────────────────────────────
export const PACKS_SLA_DEFAULTS = {
  install_completion: 10,       // minutes -- target install time
  compatibility_check: 2000,    // ms -- target compatibility check time
  catalog_refresh: 300,         // seconds -- catalog cache TTL
  health_check: 60,             // minutes -- health check interval
} as const;

// ── Business Thresholds ─────────────────────────────────────────────
export const PACKS_THRESHOLDS = {
  SLOW_INSTALL_MINUTES: 10,
  CRITICAL_INSTALL_MINUTES: 20,
  MAX_FAILED_INSTALLS_BEFORE_ALERT: 3,
  OUTDATED_PACK_WARNING_DAYS: 30,
  STALE_INSTALLATION_DAYS: 90,
  MAX_DEPENDENCY_CONFLICTS: 0,
} as const;

// ── Pack Layer Installation Order ───────────────────────────────────
export const PACK_INSTALL_ORDER: Record<string, number> = {
  base: 0,
  country: 100,
  sector: 200,
  regulator: 300,
  standard: 350,
  maturity: 400,
  module: 450,
  integration: 500,
  demo: 600,
} as const;

// ── Default Pack Settings ───────────────────────────────────────────
export const PACKS_DEFAULT_SETTINGS: Record<string, unknown> = {
  auto_update_enabled: false,
  notify_on_new_packs: true,
  install_approval_required: true,
  uninstall_approval_required: true,
  max_concurrent_installs: 3,
  compatibility_check_before_install: true,
} as const;
