-- Down for 20260425_0600 — remove demo seed rows (idempotent).
-- Only deletes rows tagged as demo via metadata->>'_seed' = 'foundation_demo'
-- so real tenant data is never affected.
BEGIN;

DELETE FROM dos.committee_members  WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.committees         WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.location_bu_map    WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.locations          WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.position_assignments WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.positions          WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.business_units     WHERE metadata->>'_seed' = 'foundation_demo';
DELETE FROM dos.organizations      WHERE metadata->>'_seed' = 'foundation_demo';

COMMIT;
