-- TIER 1 — drop test scaffolding tables in schema dos
-- Generated 2026-04-30T03:47:41.251Z
-- Idempotent: IF EXISTS guards every DROP.

\set ON_ERROR_STOP on
BEGIN;

DROP TABLE IF EXISTS "dos"."_test_idempotent_1777175520394";
DROP TABLE IF EXISTS "dos"."_test_idempotent_1777175883798";
DROP TABLE IF EXISTS "dos"."_test_idempotent_1777176053723";
DROP TABLE IF EXISTS "dos"."_test_idempotent_1777176770358";
DROP TABLE IF EXISTS "dos"."_test_idempotent_1777177122725";
DROP TABLE IF EXISTS "dos"."_test_idempotent_1777177739829";

COMMIT;
