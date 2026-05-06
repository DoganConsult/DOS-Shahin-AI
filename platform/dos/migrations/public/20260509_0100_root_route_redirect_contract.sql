-- 20260509_0100_root_route_redirect_contract.sql
--
-- Phase 1 — Root route "/" contract + DB-driven public allowlist.
--
-- Doctrine (per AGENTS.md): Zero static / Zero legacy / Zero fallback.
-- Source of truth for "is this route publicly readable" moves from a
-- TS literal in services/ui-os-service/src/server.ts to the
-- dos.dynamic_ui_route_metadata table (`is_public` column).
-- Source of truth for "/" semantics becomes a typed redirect contract
-- stored in the existing `metadata` JSONB column (added here).
--
-- Forward-only, idempotent. Re-runnable.

BEGIN;

-- Add is_public flag (drives the server's public-bypass middleware).
ALTER TABLE dos.dynamic_ui_route_metadata
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_dynamic_ui_route_metadata_is_public
  ON dos.dynamic_ui_route_metadata(is_public) WHERE is_public = true;

-- Add metadata JSONB column (carries the typed redirect contract for
-- render_mode='redirect' rows; empty object for everything else).
ALTER TABLE dos.dynamic_ui_route_metadata
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Seed every previously-static public marketing/auth route as is_public=true,
-- render_mode='template'. Idempotent.
INSERT INTO dos.dynamic_ui_route_metadata (
  route, render_mode, template_binding_required, is_public, metadata, notes
) VALUES
  ('/login',              'template', true,  true, '{}'::jsonb, 'Public auth surface — anonymous-readable.'),
  ('/register',           'template', true,  true, '{}'::jsonb, 'Public auth surface — anonymous-readable.'),
  ('/forgot-password',    'template', true,  true, '{}'::jsonb, 'Public auth surface — anonymous-readable.'),
  ('/mfa',                'template', true,  true, '{}'::jsonb, 'Public auth surface — anonymous-readable.'),
  ('/reset-password',     'template', true,  true, '{}'::jsonb, 'Public auth surface — anonymous-readable.'),
  ('/pricing',            'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/trust',              'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/security',           'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/contact',            'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/about',              'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/legal',              'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/platform',           'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/resources',          'template', true,  true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/resources/executive-kit','template', true, true, '{}'::jsonb, 'Public marketing surface — anonymous-readable.'),
  ('/marketing',          'template', true,  true, '{}'::jsonb, 'Public marketing landing — destination of relocated marketing-landing binding.')
ON CONFLICT (route) DO UPDATE
  SET render_mode = EXCLUDED.render_mode,
      template_binding_required = EXCLUDED.template_binding_required,
      is_public = EXCLUDED.is_public,
      notes = EXCLUDED.notes,
      version = dos.dynamic_ui_route_metadata.version + 1,
      updated_at = now();

-- Seed "/" as a redirect entry route. Anonymous → /login, authenticated →
-- /workspace-home. Carried in the metadata JSONB as the typed shape:
--   { renderMode, templateBindingRequired, redirect: { anonymous, authenticated, default } }
-- The FE DynamicTemplatePageComponent reads this and short-circuits the
-- template-binding HTTP call entirely — "/" never reaches that endpoint.
INSERT INTO dos.dynamic_ui_route_metadata (
  route, render_mode, template_binding_required, is_public, metadata, notes
) VALUES (
  '/',
  'redirect',
  false,
  true,
  '{
    "renderMode": "redirect",
    "templateBindingRequired": false,
    "redirect": {
      "anonymous": "/login",
      "authenticated": "/workspace-home",
      "default": "/login"
    }
  }'::jsonb,
  'Root entry route. Resolves via DB-stored typed redirect; FE must not call /api/ui-os/template-binding for this route.'
)
ON CONFLICT (route) DO UPDATE
  SET render_mode = EXCLUDED.render_mode,
      template_binding_required = EXCLUDED.template_binding_required,
      is_public = EXCLUDED.is_public,
      metadata = EXCLUDED.metadata,
      notes = EXCLUDED.notes,
      version = dos.dynamic_ui_route_metadata.version + 1,
      updated_at = now();

-- Move the marketing-landing template binding off "/" so the redirect
-- contract owns "/" exclusively. The binding is re-inserted at /marketing
-- (declared public landing) with the same archetype/template_export.
DO $$
DECLARE
  src RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'dos' AND table_name = 'ui_route_template_binding'
  ) THEN
    SELECT * INTO src
      FROM dos.ui_route_template_binding
     WHERE route = '/'
     LIMIT 1;
    IF FOUND THEN
      INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props, version,
        title_en, title_ar, subtitle_en, subtitle_ar, eyebrow_en, eyebrow_ar,
        ai_headline_en, ai_headline_ar, status_tags, primary_action)
      VALUES ('/marketing', src.archetype, src.template_export, src.props, src.version,
        src.title_en, src.title_ar, src.subtitle_en, src.subtitle_ar,
        src.eyebrow_en, src.eyebrow_ar, src.ai_headline_en, src.ai_headline_ar,
        src.status_tags, src.primary_action)
      ON CONFLICT (route) DO UPDATE
        SET archetype = EXCLUDED.archetype,
            template_export = EXCLUDED.template_export,
            props = EXCLUDED.props,
            title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
            subtitle_en = EXCLUDED.subtitle_en, subtitle_ar = EXCLUDED.subtitle_ar,
            eyebrow_en = EXCLUDED.eyebrow_en, eyebrow_ar = EXCLUDED.eyebrow_ar,
            ai_headline_en = EXCLUDED.ai_headline_en, ai_headline_ar = EXCLUDED.ai_headline_ar,
            status_tags = EXCLUDED.status_tags, primary_action = EXCLUDED.primary_action,
            version = dos.ui_route_template_binding.version + 1;
      DELETE FROM dos.ui_route_template_binding WHERE route = '/';
    END IF;
  END IF;
END$$;

-- Phase 1 — runtime role grants. The ui-os-service connects as dos_auth
-- (and several other dos_* runtime roles); without explicit SELECT the
-- public route-metadata router cannot serve the typed redirect contract
-- and the public-route allowlist warmup fails. AGENTS.md doctrine: if
-- runtime needs it, the migration grants it. Idempotent.
GRANT SELECT ON dos.dynamic_ui_route_metadata TO dos_app, dos_auth;

-- Assertions — fail the migration loudly if the contract did not land.
DO $$
DECLARE
  root_meta JSONB;
  root_mode TEXT;
  root_pub  BOOLEAN;
  pub_count INT;
BEGIN
  SELECT metadata, render_mode, is_public
    INTO root_meta, root_mode, root_pub
    FROM dos.dynamic_ui_route_metadata WHERE route = '/';
  IF root_mode IS DISTINCT FROM 'redirect' THEN
    RAISE EXCEPTION '/ render_mode must be redirect, got %', root_mode;
  END IF;
  IF root_pub IS NOT TRUE THEN
    RAISE EXCEPTION '/ is_public must be true';
  END IF;
  IF root_meta -> 'redirect' ->> 'anonymous'    IS NULL
     OR root_meta -> 'redirect' ->> 'authenticated' IS NULL
     OR root_meta -> 'redirect' ->> 'default'   IS NULL THEN
    RAISE EXCEPTION '/ metadata.redirect must include anonymous, authenticated, default';
  END IF;
  SELECT COUNT(*) INTO pub_count
    FROM dos.dynamic_ui_route_metadata WHERE is_public = true;
  IF pub_count < 15 THEN
    RAISE EXCEPTION 'expected at least 15 is_public rows, got %', pub_count;
  END IF;
END$$;

COMMIT;
