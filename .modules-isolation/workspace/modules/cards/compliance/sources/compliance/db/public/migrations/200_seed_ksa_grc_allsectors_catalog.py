#!/usr/bin/env python3
"""
200 — Seed KSA GRC AllSectors catalog (decision pack continuation).

Reads /root/DOS-AIO/DOS-AIO-Specs/KSA_GRC_AllSectors_Complete.xlsx and emits
200_seed_ksa_grc_allsectors_catalog.sql alongside this script.

Sheets ingested:
  - "All 108 Regulators - Frameworks"  -> public.grc_frameworks (enrichment upsert)
  - "Per-Regulator Summary"            -> public.grc_regulators (enrichment upsert)
  - "Sector x Framework Matrix"        -> public.grc_sector_framework_matrix (refresh)
  - "Audit Universe (All Sectors)"     -> public.grc_audit_universe        (new)
  - "KRI Dashboard (All Sectors)"      -> public.grc_kri_catalog           (new)
  - "GRC Maturity (All Sectors)"       -> public.grc_maturity_model        (new)
  - "Risk Domain Coverage Matrix"      -> public.grc_risk_domain_coverage  (new)
  - "Framework Dependencies"           -> public.grc_framework_dependencies (new)
  - "KSA GRC Architecture Map"         -> public.grc_architecture_map      (new)

Idempotent: re-run replaces the SQL file in-place.
"""
from __future__ import annotations
import openpyxl
from pathlib import Path

XLSX = Path('/root/DOS-AIO/DOS-AIO-Specs/KSA_GRC_AllSectors_Complete.xlsx')
OUT  = Path(__file__).with_suffix('.sql')


def q(v) -> str:
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).strip()
    if s == '' or s.lower() in ('—', '-', 'n/a', 'na'):
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"


def truth(v) -> str:
    if v is None: return 'FALSE'
    s = str(v).strip().lower()
    return 'TRUE' if s in ('y', 'yes', 'true', '1', '✓', '✓✓') else 'FALSE'


def main() -> None:
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    out: list[str] = []
    out.append('-- ' + '='*70)
    out.append('-- 200 — Seed KSA GRC AllSectors catalog (auto-generated)')
    out.append('-- Source: DOS-AIO-Specs/KSA_GRC_AllSectors_Complete.xlsx')
    out.append('-- Run by tenant migration runner is NOT required — this is public schema')
    out.append('-- ' + '='*70)
    out.append('BEGIN;')
    out.append('')

    # ─── DDL ────────────────────────────────────────────────────────────
    out.append("""
CREATE TABLE IF NOT EXISTS public.grc_audit_universe (
  audit_id              TEXT PRIMARY KEY,
  sector                TEXT,
  audit_area            TEXT NOT NULL,
  frameworks_covered    TEXT,
  audit_type            TEXT,
  auditor               TEXT,
  frequency             TEXT,
  scope_who             TEXT,
  key_evidence_tested   TEXT,
  risk_rating           TEXT,
  est_days              TEXT,
  regulatory_deadline   TEXT,
  framework_verified    TEXT,
  linked_kris           TEXT,
  shahin_ai_priority    TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grc_kri_catalog (
  kri_id                TEXT PRIMARY KEY,
  sector                TEXT,
  kri_name              TEXT NOT NULL,
  framework_source      TEXT,
  grc_pillar            TEXT,
  risk_domain           TEXT,
  measurement_formula   TEXT,
  threshold_green       TEXT,
  threshold_amber       TEXT,
  threshold_red         TEXT,
  data_source           TEXT,
  owner                 TEXT,
  frequency             TEXT,
  ksa_benchmark         TEXT,
  framework_verified    TEXT,
  regulator_hc_iot      TEXT,
  shahin_ai_tier        TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grc_maturity_model (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_sector         TEXT NOT NULL UNIQUE,
  level1_initial        TEXT,
  level2_developing     TEXT,
  level3_defined        TEXT,
  level4_managed        TEXT,
  level5_optimising     TEXT,
  typical_ksa_2024      TEXT,
  ghicga_target         TEXT,
  evidence_at_l3        TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grc_risk_domain_coverage (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code        TEXT NOT NULL UNIQUE,
  cyber_risk            TEXT,
  privacy_risk          TEXT,
  clinical_safety       TEXT,
  operational_risk      TEXT,
  regulatory_risk       TEXT,
  reputational_risk     TEXT,
  strategic_risk        TEXT,
  supply_chain_risk     TEXT,
  financial_risk        TEXT,
  availability_risk     TEXT,
  cross_border_risk     TEXT,
  coverage_score        TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grc_framework_dependencies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code           TEXT NOT NULL,
  target_code           TEXT NOT NULL,
  relationship          TEXT,
  notes                 TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_code, target_code, relationship)
);

CREATE TABLE IF NOT EXISTS public.grc_architecture_map (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grc_layer             TEXT,
  framework_code        TEXT NOT NULL UNIQUE,
  framework_name        TEXT,
  issuing_authority     TEXT,
  grc_pillar            TEXT,
  compliance_type       TEXT,
  feeds_into            TEXT,
  conflicts_with        TEXT,
  gap_filled            TEXT,
  hc_iot_weight         TEXT,
  priority_tier         TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""".strip())
    out.append('')

    # ─── grc_frameworks enrichment ──────────────────────────────────────
    ws = wb['All 108 Regulators - Frameworks']
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out.append('-- grc_frameworks enrichment from "All 108 Regulators - Frameworks"')
    seen_fw: set[str] = set()
    for r in rows:
        if r is None or len(r) < 53: continue
        fw_code = (r[4] or '').strip() if r[4] else ''
        if not fw_code or fw_code in seen_fw: continue
        # skip section headers
        if fw_code.startswith('──') or fw_code.startswith('  '): continue
        seen_fw.add(fw_code)
        reg_code = (r[1] or '').strip() if r[1] else ''
        if not reg_code: continue
        fw_code_t = fw_code[:200]
        cols = (
            fw_code_t,
            r[5],   # name_en
            r[6],   # name_ar
            reg_code,
            r[3],   # group label "3. Cybersecurity & Data" — we strip the leading number
            r[7],   # current_version
            r[8],   # year_first_issued
            r[9],   # controls
            r[10],  # framework_type
            r[11],  # role
            r[12],  # scope
            r[13],  # hc iot
            r[14],  # source url
            r[41] if len(r) > 41 else None,  # GRC Pillar (G/R/C)
            r[51] if len(r) > 51 else None,  # Applicable Sectors
            r[52] if len(r) > 52 else None,  # Cross-sector?
        )
        # group label like "3. Cybersecurity & Data" -> '3'
        grp = ''
        if cols[4]:
            head = str(cols[4]).strip().split('.')[0].strip()
            if head.isdigit():
                grp = head
        out.append(
          "UPDATE public.grc_frameworks SET "
          f"framework_name_en = COALESCE({q(cols[1])}, framework_name_en), "
          f"framework_name_ar = COALESCE({q(cols[2])}, framework_name_ar), "
          f"group_code = COALESCE({q(grp) if grp else 'NULL'}, group_code), "
          f"current_version = COALESCE({q(cols[5])}, current_version), "
          f"year_first_issued = COALESCE({q(cols[6])}, year_first_issued), "
          f"controls_count = COALESCE({q(cols[7])}, controls_count), "
          f"framework_type = COALESCE({q(cols[8])}, framework_type), "
          f"role = COALESCE({q(cols[9])}, role), "
          f"scope = COALESCE({q(cols[10])}, scope), "
          f"hc_iot_relevance = COALESCE({q(cols[11])}, hc_iot_relevance), "
          f"official_source_url = COALESCE({q(cols[12])}, official_source_url), "
          f"grc_pillar = COALESCE({q(cols[13])}, grc_pillar), "
          f"applicable_sectors = COALESCE({q(cols[14])}, applicable_sectors), "
          f"is_cross_sector = COALESCE({truth(cols[15])}, is_cross_sector), "
          f"updated_at = NOW() "
          f"WHERE framework_code = LEFT({q(fw_code_t)}, 30);"
        )

    # ─── grc_regulators enrichment ──────────────────────────────────────
    ws = wb['Per-Regulator Summary']
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out.append('')
    out.append('-- grc_regulators enrichment from "Per-Regulator Summary"')
    seen_reg: set[str] = set()
    for r in rows:
        if r is None or not r[0]: continue
        code = str(r[0]).strip()
        if not code or code in seen_reg: continue
        seen_reg.add(code)
        name = r[1]
        grp_label = r[2]
        own = r[3] or 0
        must = r[4] or 0
        url = r[8]
        tier = r[10]
        grp = ''
        if grp_label:
            head = str(grp_label).strip().split('.')[0].strip()
            if head.isdigit(): grp = head
        out.append(
          "INSERT INTO public.grc_regulators "
          "(regulator_code, regulator_name, group_code, tier, primary_source_url, own_frameworks_count, must_comply_count) VALUES "
          f"({q(code)}, {q(name) if name else q(code)}, {q(grp) if grp else 'NULL'}, {q(tier)}, {q(url)}, {int(own)}, {int(must)}) "
          "ON CONFLICT (regulator_code) DO UPDATE SET "
          "regulator_name = EXCLUDED.regulator_name, "
          "group_code = COALESCE(EXCLUDED.group_code, public.grc_regulators.group_code), "
          "tier = COALESCE(EXCLUDED.tier, public.grc_regulators.tier), "
          "primary_source_url = COALESCE(EXCLUDED.primary_source_url, public.grc_regulators.primary_source_url), "
          "own_frameworks_count = EXCLUDED.own_frameworks_count, "
          "must_comply_count = EXCLUDED.must_comply_count, "
          "updated_at = NOW();"
        )

    # ─── grc_sector_framework_matrix refresh ────────────────────────────
    ws = wb['Sector × Framework Matrix']
    rows = list(ws.iter_rows(min_row=1, values_only=True))
    header = rows[0]
    # columns 2..18 are sectors "1. Ministries" .. "17. Regional HC Clusters"
    sector_cols: list[tuple[int,str]] = []
    for i in range(2, 19):
        h = header[i]
        if not h: continue
        head = str(h).strip().split('.')[0].strip()
        if head.isdigit():
            sector_cols.append((i, head))
    out.append('')
    out.append('-- grc_sector_framework_matrix refresh from "Sector x Framework Matrix"')
    for r in rows[1:]:
        if r is None or not r[0]: continue
        fw = str(r[0]).strip()
        if not fw or fw.startswith('Coverage'): continue
        fw_t = fw[:30]  # PK is varchar truncated
        for ci, gc in sector_cols:
            v = r[ci] if ci < len(r) else None
            applic = 'Y' if v and str(v).strip().upper() == 'Y' else 'N'
            out.append(
              "INSERT INTO public.grc_sector_framework_matrix (framework_code, group_code, applicability) VALUES "
              f"({q(fw_t)}, {q(gc)}, {q(applic)}) "
              "ON CONFLICT (framework_code, group_code) DO UPDATE SET applicability = EXCLUDED.applicability;"
            )

    # ─── grc_audit_universe ─────────────────────────────────────────────
    ws = wb['Audit Universe (All Sectors)']
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out.append('')
    out.append('-- grc_audit_universe seed')
    for r in rows:
        if r is None or not r[0]: continue
        aid = str(r[0]).strip()
        if not aid.startswith('AU-'): continue
        out.append(
          "INSERT INTO public.grc_audit_universe (audit_id, sector, audit_area, frameworks_covered, audit_type, auditor, frequency, scope_who, key_evidence_tested, risk_rating, est_days, regulatory_deadline, framework_verified, linked_kris, shahin_ai_priority) VALUES "
          f"({q(r[0])}, {q(r[1])}, {q(r[2])}, {q(r[3])}, {q(r[4])}, {q(r[5])}, {q(r[6])}, {q(r[7])}, {q(r[8])}, {q(r[9])}, {q(r[10])}, {q(r[11])}, {q(r[12])}, {q(r[13])}, {q(r[14])}) "
          "ON CONFLICT (audit_id) DO UPDATE SET "
          "sector=EXCLUDED.sector, audit_area=EXCLUDED.audit_area, frameworks_covered=EXCLUDED.frameworks_covered, "
          "audit_type=EXCLUDED.audit_type, auditor=EXCLUDED.auditor, frequency=EXCLUDED.frequency, "
          "scope_who=EXCLUDED.scope_who, key_evidence_tested=EXCLUDED.key_evidence_tested, "
          "risk_rating=EXCLUDED.risk_rating, est_days=EXCLUDED.est_days, regulatory_deadline=EXCLUDED.regulatory_deadline, "
          "framework_verified=EXCLUDED.framework_verified, linked_kris=EXCLUDED.linked_kris, shahin_ai_priority=EXCLUDED.shahin_ai_priority, "
          "updated_at=NOW();"
        )

    # ─── grc_kri_catalog ────────────────────────────────────────────────
    ws = wb['KRI Dashboard (All Sectors)']
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out.append('')
    out.append('-- grc_kri_catalog seed')
    for r in rows:
        if r is None or not r[0]: continue
        kid = str(r[0]).strip()
        if not kid.startswith('KRI-'): continue
        out.append(
          "INSERT INTO public.grc_kri_catalog (kri_id, sector, kri_name, framework_source, grc_pillar, risk_domain, measurement_formula, threshold_green, threshold_amber, threshold_red, data_source, owner, frequency, ksa_benchmark, framework_verified, regulator_hc_iot, shahin_ai_tier) VALUES "
          f"({q(r[0])}, {q(r[1])}, {q(r[2])}, {q(r[3])}, {q(r[4])}, {q(r[5])}, {q(r[6])}, {q(r[7])}, {q(r[8])}, {q(r[9])}, {q(r[10])}, {q(r[11])}, {q(r[12])}, {q(r[13])}, {q(r[14])}, {q(r[15])}, {q(r[16])}) "
          "ON CONFLICT (kri_id) DO UPDATE SET "
          "sector=EXCLUDED.sector, kri_name=EXCLUDED.kri_name, framework_source=EXCLUDED.framework_source, "
          "grc_pillar=EXCLUDED.grc_pillar, risk_domain=EXCLUDED.risk_domain, measurement_formula=EXCLUDED.measurement_formula, "
          "threshold_green=EXCLUDED.threshold_green, threshold_amber=EXCLUDED.threshold_amber, threshold_red=EXCLUDED.threshold_red, "
          "data_source=EXCLUDED.data_source, owner=EXCLUDED.owner, frequency=EXCLUDED.frequency, "
          "ksa_benchmark=EXCLUDED.ksa_benchmark, framework_verified=EXCLUDED.framework_verified, "
          "regulator_hc_iot=EXCLUDED.regulator_hc_iot, shahin_ai_tier=EXCLUDED.shahin_ai_tier, updated_at=NOW();"
        )

    # ─── grc_maturity_model ─────────────────────────────────────────────
    ws = wb['GRC Maturity (All Sectors)']
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out.append('')
    out.append('-- grc_maturity_model seed')
    for r in rows:
        if r is None or not r[0]: continue
        domain = str(r[0]).strip()
        if not domain or len(domain) < 3: continue
        out.append(
          "INSERT INTO public.grc_maturity_model (domain_sector, level1_initial, level2_developing, level3_defined, level4_managed, level5_optimising, typical_ksa_2024, ghicga_target, evidence_at_l3) VALUES "
          f"({q(r[0])}, {q(r[1])}, {q(r[2])}, {q(r[3])}, {q(r[4])}, {q(r[5])}, {q(r[6])}, {q(r[7])}, {q(r[8])}) "
          "ON CONFLICT (domain_sector) DO UPDATE SET "
          "level1_initial=EXCLUDED.level1_initial, level2_developing=EXCLUDED.level2_developing, "
          "level3_defined=EXCLUDED.level3_defined, level4_managed=EXCLUDED.level4_managed, "
          "level5_optimising=EXCLUDED.level5_optimising, typical_ksa_2024=EXCLUDED.typical_ksa_2024, "
          "ghicga_target=EXCLUDED.ghicga_target, evidence_at_l3=EXCLUDED.evidence_at_l3, updated_at=NOW();"
        )

    # ─── grc_risk_domain_coverage ───────────────────────────────────────
    ws = wb['Risk Domain Coverage Matrix']
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out.append('')
    out.append('-- grc_risk_domain_coverage seed')
    for r in rows:
        if r is None or not r[0]: continue
        fw = str(r[0]).strip()
        if not fw or fw.startswith('Coverage') or fw.startswith('🔵'): continue
        out.append(
          "INSERT INTO public.grc_risk_domain_coverage (framework_code, cyber_risk, privacy_risk, clinical_safety, operational_risk, regulatory_risk, reputational_risk, strategic_risk, supply_chain_risk, financial_risk, availability_risk, cross_border_risk, coverage_score) VALUES "
          f"({q(r[0])}, {q(r[1])}, {q(r[2])}, {q(r[3])}, {q(r[4])}, {q(r[5])}, {q(r[6])}, {q(r[7])}, {q(r[8])}, {q(r[9])}, {q(r[10])}, {q(r[11])}, {q(r[12])}) "
          "ON CONFLICT (framework_code) DO UPDATE SET "
          "cyber_risk=EXCLUDED.cyber_risk, privacy_risk=EXCLUDED.privacy_risk, clinical_safety=EXCLUDED.clinical_safety, "
          "operational_risk=EXCLUDED.operational_risk, regulatory_risk=EXCLUDED.regulatory_risk, "
          "reputational_risk=EXCLUDED.reputational_risk, strategic_risk=EXCLUDED.strategic_risk, "
          "supply_chain_risk=EXCLUDED.supply_chain_risk, financial_risk=EXCLUDED.financial_risk, "
          "availability_risk=EXCLUDED.availability_risk, cross_border_risk=EXCLUDED.cross_border_risk, "
          "coverage_score=EXCLUDED.coverage_score, updated_at=NOW();"
        )

    # ─── grc_architecture_map ───────────────────────────────────────────
    ws = wb['KSA GRC Architecture Map']
    rows = list(ws.iter_rows(min_row=3, values_only=True))
    out.append('')
    out.append('-- grc_architecture_map seed')
    for r in rows:
        if r is None or not r[1]: continue
        fw = str(r[1]).strip()
        if not fw or fw.startswith('Framework Code'): continue
        out.append(
          "INSERT INTO public.grc_architecture_map (grc_layer, framework_code, framework_name, issuing_authority, grc_pillar, compliance_type, feeds_into, conflicts_with, gap_filled, hc_iot_weight, priority_tier) VALUES "
          f"({q(r[0])}, {q(r[1])}, {q(r[2])}, {q(r[3])}, {q(r[4])}, {q(r[5])}, {q(r[6])}, {q(r[7])}, {q(r[8])}, {q(r[9])}, {q(r[10])}) "
          "ON CONFLICT (framework_code) DO UPDATE SET "
          "grc_layer=EXCLUDED.grc_layer, framework_name=EXCLUDED.framework_name, "
          "issuing_authority=EXCLUDED.issuing_authority, grc_pillar=EXCLUDED.grc_pillar, "
          "compliance_type=EXCLUDED.compliance_type, feeds_into=EXCLUDED.feeds_into, "
          "conflicts_with=EXCLUDED.conflicts_with, gap_filled=EXCLUDED.gap_filled, "
          "hc_iot_weight=EXCLUDED.hc_iot_weight, priority_tier=EXCLUDED.priority_tier, updated_at=NOW();"
        )

    out.append('')
    out.append('COMMIT;')
    OUT.write_text('\n'.join(out))
    print(f'wrote {OUT} ({len(out)} lines)')


if __name__ == '__main__':
    main()
