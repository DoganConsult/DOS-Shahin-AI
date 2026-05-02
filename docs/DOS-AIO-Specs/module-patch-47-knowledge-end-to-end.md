# Module Patch MP-47 — Knowledge Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 47 — Knowledge Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Knowledge module** end to end. 

It tells an agent exactly how to:
- inspect knowledge base management, article lifecycle, categorization, search indexing, and cross-module knowledge linking
- compare the current implementation against the canonical knowledge target
- know what belongs to Knowledge, what belongs to DOS, what belongs to DAuth, and what belongs to adjacent AI modules
- know exactly what files, services, contracts, tables, events, UI surfaces, admin surfaces, tests, and handover artifacts must exist

### 0.4 Module identity
- Module code: `knowledge`
- Layer: cross-module support surface
- Criticality: **P2 medium**
- Runtime role: knowledge article registry, categorization, search indexing, cross-module knowledge linking, FAQ management, vector embedding sync for RAG pipelines
- Primary dependency domains: DOS foundation, DAuth control spine, local-knowledge, ai, workflow

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 5 (Lifecycle Auth)
- Patch 8 (Audit Integration)
- Patch 9 (UI/UX Standards)
- Patch 11 (Observability)

---

## 2. Module Purpose and Boundaries

### 2.1 What Knowledge owns directly
- Knowledge article registry (create, update, publish, archive, retire)
- Article categorization, taxonomy, and tagging
- Search index management for knowledge content and vector DB sync triggering
- Cross-module knowledge linking (link articles to compliance frameworks, risk records, policy entities)
- FAQ and help content management

### 2.2 What Knowledge consumes from DOS
- Foundation org structure (author alignment, department visibility)
- Event backbone (publishing events, view analytics triggers)
- Observability and shell runtime

### 2.3 What Knowledge consumes from DAuth
- Scoped access (who can view, create, edit, publish articles)
- Editorial authority and delegation
- Separation of Duties (SoD) — authors cannot self-publish certain high-impact categories

### 2.4 What Knowledge consumes from adjacent modules
- **Local-Knowledge**: For RAG/AI-powered search and document ingestion pipelines
- **AI**: For article summarization, metadata extraction, and recommendation algorithms
- **Workflow**: For multi-stage article review and publishing cycles

### 2.5 What Knowledge must not implement
- Duplicate document file storage (consumed from Evidence/Files module)
- Duplicate RAG pipeline engines (consumed from Local-Knowledge)
- Independent user management

---

## 3. Canonical Backend Structure

```text
backend/src/modules/knowledge/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  admin/
  mappers/
  data/
  security/
  ports/
  index.ts
  knowledge.module.ts
  lifecycle-registration.ts
```

### 3.1 Required backend service families
- **Article Registry Service**: Full CRUD, versioning support
- **Categorization Service**: Taxonomy tree management
- **Search Index Service**: Syncing articles to Elastic/ClickHouse/Vector databases
- **Cross-Link Service**: Resolving entity relationships
- **Diagnostics Service**: Identifying stale or orphaned articles
- **Admin Service**: Configuration and taxonomy overrides

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/knowledge/
  pages/
  components/
  services/
  contracts/
  store/
  index.ts
```

Required surfaces:
- Knowledge Hub (searchable directory)
- Article Detail (document viewer with related links)
- Category Browser (hierarchical navigation)
- Article Editor (rich text creation, metadata assignment)
- Search Results (global knowledge search surface)
- Admin/Diagnostics (reporting on stale knowledge)

---

## 5. Data Model Requirements

Knowledge owns the following tables in the tenant schema:
- `knowledge_articles` — id, title, content_raw, content_html, status, author_id, published_at, version
- `knowledge_categories` — id, parent_id, name, description, level
- `knowledge_tags` — id, name, usage_count
- `knowledge_article_tags` — linking table
- `knowledge_links` — cross-module entity links (article_id, entity_type, entity_id)

---

## 6. API Surface Requirements

Required route groups:
- **Article CRUD**: `/api/knowledge/articles` (create, read, update, list, archive)
- **Category Management**: `/api/knowledge/categories` (tree retrieval)
- **Search**: `/api/knowledge/search` (full-text and semantic bridging)
- **Cross-linking**: `/api/knowledge/articles/:id/links`
- **Diagnostics/Admin**: `/api/knowledge/diagnostics`

Required contracts:
- `KnowledgeArticleContract`
- `KnowledgeCategoryContract`
- `KnowledgeLinkContract`
- `KnowledgeDiagnosticsContract`

Validation must be enforced with Zod schemas on all mutating endpoints.

---

## 7. Workflow and DAuth Integration

Knowledge must integrate with workflow for:
- Article publish/retire approval flows (draft → in_review → published → archived).

Knowledge must integrate with DAuth for:
- Scoped access and editorial authority tracking. Permissions must follow dot notation: `knowledge.article.create`, `knowledge.article.publish`.

---

## 8. AI Integration

Allowed AI participation (via explicit calls to AI module):
- Article summarization (generating abstracts)
- Related article suggestions
- Auto-categorization recommendations
- Vector embeddings generation upon publish

Restricted:
- No silent publication without human approval. AI cannot transition an article to `published` state itself.

---

## 9. UI and Experience Requirements

The Knowledge UI must provide:
- High-performance, low-latency search bar in the Knowledge Hub
- Clean typography and readability in the Article Detail view
- Rich text editor for content creation

Must define:
- Explicit empty/loading/error states for all views
- "No articles found" states that suggest altering search taxonomy
- Responsive layouts for viewing on smaller screens


### 9.1 Cross-Module UX and Interactivity
- **Embedded Knowledge Panes**: Risk and policy screens dynamically summon related knowledge articles in side-drawers using shared taxonomy tags.
- **Unified Search Sync**: Content pushes seamlessly to the GRC Query global search bar without manual indexing.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Article retention policy configuration (e.g., auto-archiving after 3 years)
- Category taxonomy management
- Search index rebuild triggers
- Require-approval boolean toggles per category

---

## 11. Observability and Operations

Required diagnostics:
- Stale articles (not updated or reviewed within cadence)
- Orphaned links (links to deleted entities in other modules)
- Uncategorized active articles
- Search index health and vector sync status
- Article engagement metrics (most viewed, zero view articles)

---

## 12. Required Tests

- Article lifecycle tests (draft to publish via workflow)
- Categorization tree navigation tests
- Search and query param tests
- Cross-linking entity referential integrity tests
- DAuth scoping tests
- Diagnostics tests

---

## 13. Exact Build Instructions

If the knowledge backend does not exist:
- Create module skeleton, register in `domain-routes.catalog.ts` and `agrc-event-subscribers.ts`.

If articles are stub functions:
- Implement real PostgreSQL DB-backed CRUD. Remove any in-memory mocks.

If search is missing:
- Wire to the search index service backing Elastic/ClickHouse/Vector databases.

---

## 14. Acceptance Criteria

Pass only if:
- Article CRUD operates perfectly end-to-end reading from real tables via typed contracts.
- Categorization and search functions are responsive and accurate.
- Cross-linking creates verifiable DB records.
- Diagnostics are operational and returned via admin surfaces.
- DAuth read/write separation is strictly enforced.

---

## 15. Fail Conditions

FAIL if:
- Articles are stored in memory or JSON files instead of PostgreSQL.
- Publishing bypasses DAuth or Workflow review constraints.
- Search returns hardcoded mock arrays instead of real queried data.
- Required artifact classes (contracts, routes, tests) are skipped or `// TODO`.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 48 — Fitch Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current knowledge implementation against the canonical target, classify gaps, build missing PostgreSQL-backed features, validate against rules, and update the ledger.
