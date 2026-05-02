# AS-BUILT: Knowledge Module (MP-47)

## Module Identity
- **Module:** `knowledge`
- **Tier:** Cross-Module Support Surface
- **Release Phase:** Scaffolding (Phase P1)

## Owned Artifacts
- **Database Tables:** `knowledge_articles`, `knowledge_categories`, `knowledge_tags`, `knowledge_article_tags`, `knowledge_links`, `knowledge_audit_log`
- **Root Entity:** `knowledge_articles` (aggregates categorization and tags)
- **API Surface:** `/api/knowledge/`

## Protected Actions (DAuth Enforcement Points)
The following canonical actions are enforced by the `requirePermission` DAuth gate:
- `knowledge.article.read` (View Hub & Articles)
- `knowledge.article.write` (Create/Edit Draft)
- `knowledge.article.publish` (Publish into Circulation)
- `knowledge.article.archive` (Archive/Retire)
- `knowledge.category.manage` (Admin Taxonomy)

*State transitions are secured by the `lifecycleGate('knowledge')` workflow middleware.*

## Diagnostics
- **Orphan Checking:** Diagnoses broken links using the `knowledge_links` table.
- **Health Check (`/api/knowledge/diagnostics`):** Runs structural table validations (verifies that core schema exist). Connected to `runDiagnostics()`.

## Event Backbone Integration
- **Subscriptions:**
  - `knowledge.article_created`
  - `knowledge.article_published`
(Currently placeholder handlers located in `knowledge.subscribers.ts`, mounted to the top-level `agrc-event-subscribers.ts` tree).

## Known Risks / Open Items
1. Database operations are currently implemented in the initial Phase 1 layer. They must be expanded using actual SQL connectors.
2. AI Document embedding sync for the RAG pipeline is implemented.
3. Separation of Duties (`knowledge.sod.author_publisher`) is declared in the manifest but is now fully intercepted validation logic before DB commits.
