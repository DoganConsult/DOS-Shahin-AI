-- 20260425_0005_tenants_id_schema_guards_down.sql
-- Drop the two CHECK constraints. The 7 empty orphan schemas dropped by
-- the forward are NOT recreated — they were empty placeholders with no
-- application meaning; recreating them would only re-introduce the orphan
-- state we just cleaned up.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid='public.tenants'::regclass AND conname='tenants_id_format_check') THEN
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_id_format_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid='public.tenants'::regclass AND conname='tenants_schema_name_canonical_check') THEN
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_schema_name_canonical_check;
  END IF;
END $$;
