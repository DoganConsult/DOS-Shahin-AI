-- Reverting drift reconciliation does NOT restore the 0307 legacy schema.
-- The canonical §16 tables remain owned by 0123/0124 _down.
BEGIN;
COMMIT;
