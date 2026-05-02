-- Down — additive only. We do NOT remove permission codes or role grants
-- because external callers may still depend on them; data preservation
-- trumps automated rollback for permission catalog changes.
SELECT 'no-op' AS rollback_status;
