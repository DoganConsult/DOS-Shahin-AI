#!/usr/bin/env python3
"""
Seed platform_dos registries from manifests + live DB tenant schemas.
  - products_registry         from products/<code>/manifest/product.manifest.json
  - modules_registry          from modules/<code>/module.manifest.json + 4 platform modules
  - services_registry         from services/<dir> (filesystem)
  - product_modules           from product manifest module_codes + headline_module_codes
  - product_services          from products/<code>/bundles/default.bundle.json services[]
  - tenants_registry          from information_schema tenant_* schemas
  - tenant_products           activate shahin for every real tenant schema
  - tenant_product_modules    activate all shahin modules for every shahin tenant
  - tenant_services           provision all product services for every shahin tenant
"""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRODUCTS = ROOT / "products"
MODULES  = ROOT / "modules"
SERVICES = ROOT / "services"

def sql(stmt: str) -> str:
    r = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "shahin_grc", "-v", "ON_ERROR_STOP=1",
         "-A", "-t", "-c", stmt],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print("SQL ERROR:", r.stderr, file=sys.stderr)
        print("STMT:", stmt[:400], file=sys.stderr)
        sys.exit(1)
    return r.stdout

def sql_exec(stmt: str):
    r = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "shahin_grc", "-v", "ON_ERROR_STOP=1",
         "-c", stmt],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print("SQL ERROR:", r.stderr, file=sys.stderr)
        print("STMT:", stmt[:400], file=sys.stderr)
        sys.exit(1)

def q(s: str) -> str:
    return "'" + str(s).replace("'", "''") + "'"

def load_products():
    out = []
    for d in sorted(PRODUCTS.iterdir()):
        mf = d / "manifest" / "product.manifest.json"
        if not mf.exists(): continue
        m = json.loads(mf.read_text())
        b = d / "bundles" / "default.bundle.json"
        bundle = json.loads(b.read_text()) if b.exists() else {}
        out.append({
            "code": m["product_code"],
            "version": m.get("version","0.0.0"),
            "display_name": m.get("display_name", m["product_code"]),
            "status": m.get("status","active"),
            "enabled": m.get("status","active") == "active",
            "platform_dependencies": m.get("platform_dependencies", []),
            "module_codes": m.get("module_codes", []),
            "headline_module_codes": m.get("headline_module_codes", []),
            "services": bundle.get("services", []),
            "owner_team": m.get("owner_team", "unknown"),
        })
    return out

def load_modules():
    platform_mods = [
        {"code":"dos","layer":"platform","version":"1.0.0","owner_team":"platform-dos"},
        {"code":"dauth","layer":"platform","version":"1.0.0","owner_team":"platform-dauth"},
        {"code":"dsoc","layer":"platform","version":"1.0.0","owner_team":"platform-dsoc"},
        {"code":"dnoc","layer":"platform","version":"1.0.0","owner_team":"platform-dnoc"},
    ]
    product_mods = []
    for mf in sorted(MODULES.glob("*/module.manifest.json")):
        m = json.loads(mf.read_text())
        product_mods.append({
            "code": m["moduleCode"],
            "layer": "product",
            "version": m.get("version","1.0.0"),
            "owner_team": m.get("ownerTeam","unknown"),
            "product_code": m.get("productCode"),
            "status": m.get("status","active"),
        })
    return platform_mods + product_mods

def load_services():
    out = []
    for d in sorted(SERVICES.iterdir()):
        if not d.is_dir(): continue
        if d.name.startswith("_"): continue
        out.append({"code": d.name, "layer": "product", "owner_team": "platform"})
    return out

def main():
    products = load_products()
    modules  = load_modules()
    services = load_services()

    print(f"Loaded: {len(products)} products, {len(modules)} modules, {len(services)} services")

    # ── products_registry ──
    for p in products:
        sql_exec(
            f"INSERT INTO platform_dos.products_registry(product_code,version,enabled,display_name,attributes) "
            f"VALUES({q(p['code'])},{q(p['version'])},{str(p['enabled']).upper()},{q(p['display_name'])},"
            f"{q(json.dumps({'owner_team':p['owner_team'],'status':p['status']}))}::jsonb) "
            f"ON CONFLICT (product_code) DO UPDATE SET version=EXCLUDED.version, enabled=EXCLUDED.enabled, "
            f"display_name=EXCLUDED.display_name, attributes=EXCLUDED.attributes;"
        )

    # ── modules_registry ──
    for m in modules:
        attrs = {"product_code": m.get("product_code")} if m.get("product_code") else {}
        sql_exec(
            f"INSERT INTO platform_dos.modules_registry(module_code,version,layer,owner_team,status,attributes) "
            f"VALUES({q(m['code'])},{q(m['version'])},{q(m['layer'])},{q(m['owner_team'])},'registered',"
            f"{q(json.dumps(attrs))}::jsonb) "
            f"ON CONFLICT (module_code) DO UPDATE SET version=EXCLUDED.version, layer=EXCLUDED.layer, "
            f"owner_team=EXCLUDED.owner_team, attributes=EXCLUDED.attributes;"
        )

    # ── services_registry ──
    for s in services:
        sql_exec(
            f"INSERT INTO platform_dos.services_registry(service_code,layer,owner_team) "
            f"VALUES({q(s['code'])},{q(s['layer'])},{q(s['owner_team'])}) "
            f"ON CONFLICT (service_code) DO NOTHING;"
        )

    # ── product_modules ──
    module_codes_in_registry = set(m["code"] for m in modules)
    for p in products:
        headlines = set(p["headline_module_codes"])
        for mc in p["module_codes"]:
            if mc not in module_codes_in_registry:
                print(f"  skip product_modules: module '{mc}' (product {p['code']}) not in modules_registry")
                continue
            sql_exec(
                f"INSERT INTO platform_dos.product_modules(product_code,module_code,is_headline) "
                f"VALUES({q(p['code'])},{q(mc)},{str(mc in headlines).upper()}) "
                f"ON CONFLICT DO NOTHING;"
            )

    # ── product_services ──
    service_codes = set(s["code"] for s in services)
    for p in products:
        for sc in p["services"]:
            if sc not in service_codes:
                # auto-register missing service
                sql_exec(
                    f"INSERT INTO platform_dos.services_registry(service_code,layer,owner_team) "
                    f"VALUES({q(sc)},'product','auto-registered') ON CONFLICT DO NOTHING;"
                )
            sql_exec(
                f"INSERT INTO platform_dos.product_services(product_code,service_code) "
                f"VALUES({q(p['code'])},{q(sc)}) ON CONFLICT DO NOTHING;"
            )

    # ── tenants_registry: discover from live schemas ──
    rows = sql("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant\\_%' ESCAPE '\\' ORDER BY schema_name;")
    tenant_schemas = [r.strip() for r in rows.splitlines() if r.strip()]
    # Classify: skip fixtures (test_027, validate_migrations, rlstest-*, idem_*, mtf*)
    FIXTURE_PREFIXES = ("tenant_test_","tenant_validate_","tenant_rlstest","tenant_idem_","tenant_mtf")
    real_tenants = []
    fixture_tenants = []
    for s in tenant_schemas:
        tid = s.replace("tenant_","",1)
        is_fixture = any(s.startswith(p) for p in FIXTURE_PREFIXES)
        (fixture_tenants if is_fixture else real_tenants).append(tid)
    print(f"Tenants: {len(real_tenants)} real, {len(fixture_tenants)} fixtures")

    for tid in real_tenants:
        sql_exec(
            f"INSERT INTO platform_dos.tenants_registry(tenant_id,product_code,status,display_name,attributes) "
            f"VALUES({q(tid)},'shahin','active',{q(tid)},'{{\"source\":\"live-schema-discovery\"}}'::jsonb) "
            f"ON CONFLICT (tenant_id) DO UPDATE SET status='active';"
        )
    for tid in fixture_tenants:
        sql_exec(
            f"INSERT INTO platform_dos.tenants_registry(tenant_id,product_code,status,display_name,attributes) "
            f"VALUES({q(tid)},NULL,'suspended',{q(tid)},'{{\"source\":\"fixture\"}}'::jsonb) "
            f"ON CONFLICT (tenant_id) DO UPDATE SET status='suspended';"
        )

    # ── tenant_products: activate shahin for every real tenant ──
    for tid in real_tenants:
        sql_exec(
            f"INSERT INTO platform_dos.tenant_products(tenant_id,product_code,status) "
            f"VALUES({q(tid)},'shahin','active') ON CONFLICT DO NOTHING;"
        )

    # ── tenant_product_modules: activate all shahin modules for each tenant ──
    shahin = next(p for p in products if p["code"] == "shahin")
    shahin_modules = [m for m in shahin["module_codes"] if m in module_codes_in_registry]
    for tid in real_tenants:
        for mc in shahin_modules:
            sql_exec(
                f"INSERT INTO platform_dos.tenant_product_modules(tenant_id,product_code,module_code,status) "
                f"VALUES({q(tid)},'shahin',{q(mc)},'active') ON CONFLICT DO NOTHING;"
            )

    # ── tenant_services: provision all shahin services for each tenant ──
    for tid in real_tenants:
        for sc in shahin["services"]:
            sql_exec(
                f"INSERT INTO platform_dos.tenant_services(tenant_id,product_code,service_code,status) "
                f"VALUES({q(tid)},'shahin',{q(sc)},'active') ON CONFLICT DO NOTHING;"
            )

    print("Seed complete.")

if __name__ == "__main__":
    main()
