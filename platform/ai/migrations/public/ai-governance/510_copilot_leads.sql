-- 510_copilot_leads.sql
-- Phase 2: A13 (Landing Copilot) graduates from anonymous Q&A to lead-capture
-- by writing into public.copilot_leads. Used by:
--   • the /api/copilot/public-chat tool when intent=demo / contact / pricing
--   • the A13 daily_lead_summary shift (KPIs + manager inbox digest)
--
-- The table is platform-global (tenant_id NULL) — leads come from anonymous
-- visitors before tenant assignment.

CREATE TABLE IF NOT EXISTS public.copilot_leads (
  lead_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent         TEXT        NOT NULL CHECK (intent IN ('demo','contact','pricing','docs','general')),
  email          TEXT,
  company        TEXT,
  role_title     TEXT,
  message        TEXT,
  visitor_ip     INET,
  user_agent     TEXT,
  source         TEXT,                              -- 'landing-copilot' | future surfaces
  session_id     UUID,                              -- ties to Langfuse trace.session_id when present
  metadata       JSONB       NOT NULL DEFAULT '{}',
  routed_to      TEXT,                              -- e.g. 'sales-team' | 'product-team'
  routed_at      TIMESTAMPTZ,
  status         TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new','routed','contacted','converted','rejected')),
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_leads_captured ON public.copilot_leads (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_leads_intent_status ON public.copilot_leads (intent, status);
CREATE INDEX IF NOT EXISTS idx_copilot_leads_email ON public.copilot_leads (email) WHERE email IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.copilot_leads TO dos_ai;
