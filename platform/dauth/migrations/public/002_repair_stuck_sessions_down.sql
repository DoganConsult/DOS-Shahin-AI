-- 002_repair_stuck_sessions_down.sql
-- The forward script is a one-shot data repair (no schema changes), so an
-- automated revert is not safely possible: we don't know which rows the
-- forward run actually touched. Reverting blindly would corrupt
-- legitimately-progressed sessions and orphan provisioning jobs.
--
-- This down is intentionally a no-op. If you need to undo a specific
-- repair pass, restore from the appropriate point-in-time DB snapshot.

DO $$
BEGIN
  RAISE NOTICE '002_repair_stuck_sessions_down: no-op (forward script is a data repair; revert via PITR snapshot if needed).';
END $$;
