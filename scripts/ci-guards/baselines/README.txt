Baselines for the Wave-1 Platform UI OS guards.

Each <guard>.json captures the current per-file violation count so
existing CSS debt is grandfathered. New files or higher counts on
existing files hard-fail the guard.

Regenerate explicitly with:
  UI_GUARD_UPDATE_BASELINE=1 node scripts/ci-guards/<guard>.mjs

Never edit by hand without a paired migration PR.
