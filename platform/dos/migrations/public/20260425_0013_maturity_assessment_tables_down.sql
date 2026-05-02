-- Rollback for 20260425_0013_maturity_assessment_tables.sql
BEGIN;
DROP TABLE IF EXISTS dos.framework_branching_rules CASCADE;
DROP TABLE IF EXISTS dos.framework_recommendation_rules CASCADE;
DROP TABLE IF EXISTS dos.maturity_dimension_definitions CASCADE;
DROP TABLE IF EXISTS dos.maturity_questions CASCADE;
DROP TABLE IF EXISTS dos.maturity_signals CASCADE;
DROP TABLE IF EXISTS dos.maturity_assessment_responses CASCADE;
COMMIT;
