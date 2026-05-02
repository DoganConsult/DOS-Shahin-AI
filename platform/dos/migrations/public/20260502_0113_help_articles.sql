-- dos:draft
-- =====================================================================
-- UI-OS — §10 Help — articles, collections, contextual links  (20260502_0113)
--
-- Tables (4) — DKNF via dos.ui_contextual_help_display_t.
-- 1NF: ui_help_collection_articles is the m2m child (replaces TEXT[] of slugs).
-- 3NF: contextual_help_links uses help_article_id (UUID FK), never slug.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_help_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  slug            VARCHAR(200) NOT NULL,
  locale          VARCHAR(20) NOT NULL DEFAULT 'en',
  title_key       VARCHAR(150),
  body_md         TEXT NOT NULL,
  module_code     VARCHAR(100),
  product_code    VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  published_at    TIMESTAMPTZ,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_help_articles_uk
    UNIQUE (tenant_id, slug, locale)
);

CREATE INDEX IF NOT EXISTS ix_ui_help_articles_tenant
  ON dos.ui_help_articles (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_help_articles_module
  ON dos.ui_help_articles (tenant_id, module_code) WHERE module_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.ui_help_collections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  collection_key    VARCHAR(150) NOT NULL,
  title_key         VARCHAR(150),
  description_key   VARCHAR(200),
  display_order     INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_help_collections_uk
    UNIQUE (tenant_id, collection_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_help_collections_tenant
  ON dos.ui_help_collections (tenant_id);

-- 1NF child: m2m between collection and article
CREATE TABLE IF NOT EXISTS dos.ui_help_collection_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  collection_id   UUID NOT NULL,
  article_id      UUID NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_help_collection_articles_collection_fk
    FOREIGN KEY (collection_id) REFERENCES dos.ui_help_collections(id) ON DELETE CASCADE,
  CONSTRAINT ui_help_collection_articles_article_fk
    FOREIGN KEY (article_id) REFERENCES dos.ui_help_articles(id) ON DELETE CASCADE,
  CONSTRAINT ui_help_collection_articles_uk
    UNIQUE (collection_id, article_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_help_collection_articles_collection
  ON dos.ui_help_collection_articles (collection_id);

CREATE TABLE IF NOT EXISTS dos.ui_contextual_help_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  surface_key         VARCHAR(200) NOT NULL,
  help_article_id     UUID NOT NULL,
  display_kind        dos.ui_contextual_help_display_t NOT NULL DEFAULT 'tooltip',
  display_order       INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_contextual_help_links_article_fk
    FOREIGN KEY (help_article_id) REFERENCES dos.ui_help_articles(id) ON DELETE CASCADE,
  CONSTRAINT ui_contextual_help_links_uk
    UNIQUE (tenant_id, surface_key, help_article_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_contextual_help_links_surface
  ON dos.ui_contextual_help_links (tenant_id, surface_key);

COMMIT;
