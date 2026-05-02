-- 20260425_0006_tenants_country_of_incorporation_down.sql
ALTER TABLE public.tenants DROP COLUMN IF EXISTS country_of_incorporation;
