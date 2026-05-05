-- 20260508_0340_register_dropdown_options_db_driven.sql
--
-- Phase WS-Auth follow-up: the 4-step <dos-auth-register-card> dropdowns
-- (Company size, Country, Industry, Regulatory scope) shipped with
-- hardcoded TS arrays. Push the option vocabularies into the
-- /register binding's `props` jsonb so they are DB-table-driven; the
-- DynamicTemplatePage applies them as @Input() bindings to the
-- DosAuthRegisterPage wrapper which forwards them to the card.
--
-- Idempotent: jsonb_set with create_missing=true. Safe to re-run.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = props
       || jsonb_build_object(
            'companySizes', jsonb_build_array(
              '1-10','11-50','51-200','201-1000','1000+'
            ),
            'countries', jsonb_build_array(
              'Saudi Arabia','United Arab Emirates','Qatar','Kuwait',
              'Bahrain','Oman','Egypt','Jordan','Iraq','Lebanon',
              'Turkey','Other'
            ),
            'industries', jsonb_build_array(
              'Banking & Financial Services','Insurance','Capital Markets',
              'Energy & Utilities','Oil & Gas','Healthcare','Pharmaceuticals',
              'Telecommunications','Government','Defense','Retail',
              'Manufacturing','Technology','Education','Logistics','Other'
            ),
            'regulatoryScopes', jsonb_build_array(
              'SAMA Cyber Framework','SAMA BCM','NCA ECC','NCA CCC',
              'SDAIA AI Ethics','PDPL','ISO 27001','ISO 27701','ISO 22301',
              'SOC 2','PCI-DSS','GDPR','HIPAA','Other'
            )
          ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/register';

DO $$
DECLARE bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE route = '/register'
     AND (
       jsonb_typeof(props->'companySizes')     <> 'array'
    OR jsonb_typeof(props->'countries')        <> 'array'
    OR jsonb_typeof(props->'industries')       <> 'array'
    OR jsonb_typeof(props->'regulatoryScopes') <> 'array'
     );
  IF bad > 0 THEN
    RAISE EXCEPTION 'register dropdown options not seeded as arrays (% rows)', bad;
  END IF;
END $$;

COMMIT;
