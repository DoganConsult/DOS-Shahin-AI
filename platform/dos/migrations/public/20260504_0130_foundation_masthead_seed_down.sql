-- =====================================================================
-- 0130 DOWN — null-out foundation masthead text columns.
-- =====================================================================
BEGIN;

UPDATE dos.ui_route_template_binding
   SET title_en=NULL, title_ar=NULL, subtitle_en=NULL, subtitle_ar=NULL,
       eyebrow_en=NULL, eyebrow_ar=NULL,
       ai_headline_en=NULL, ai_headline_ar=NULL,
       version = version + 1, updated_at = now()
 WHERE route LIKE '/foundation%';

COMMIT;
