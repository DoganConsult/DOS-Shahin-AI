#!/usr/bin/env python3
"""
Sync platform_dnoc.routes from migration/inventory/route-ownership-map.json.
Registers one wildcard route per route file (method='*', path='/<module>/<filename>')
so DNOC reflects the full inventoried route surface.
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAP  = ROOT / "migration/inventory/route-ownership-map.json"

def q(s): return "'" + str(s).replace("'","''") + "'"

def sql_exec(stmt):
    r = subprocess.run(
        ["sudo","-u","postgres","psql","-d","shahin_grc","-v","ON_ERROR_STOP=1","-c",stmt],
        capture_output=True, text=True)
    if r.returncode != 0:
        print("ERR:", r.stderr[:300], file=sys.stderr); sys.exit(1)

def main():
    d = json.loads(MAP.read_text())
    modules = d.get("modules", {})

    # Build module -> service mapping from modules_registry.attributes.product_code
    # For now map every module to 'gateway' as a generic owning service when unknown.
    # Modules that match a service prefix go there.
    service_hint = {
      "risk":"risk-incident-service","incident":"risk-incident-service",
      "compliance":"compliance-controls-service","controls":"compliance-controls-service",
      "policy":"governance-policy-service","governance":"governance-policy-service",
      "evidence":"evidence-audit-reporting-service","audit":"evidence-audit-reporting-service","reporting":"evidence-audit-reporting-service",
      "onboarding":"onboarding-service","platform-onboarding":"onboarding-service",
      "workflow":"workflow-service","notification":"notification-service","inbox":"notification-inbox-service",
      "ai":"ai-gateway-service","ai-governance":"ai-governance-service","agrc-engine":"agrc-os-service",
      "mcp":"mcp-gateway-service","analytics":"analytics-service",
      "vendor":"vendor-service","asset":"asset-service","bcp":"bcp-service","dora":"dora-service",
      "privacy":"privacy-service","records":"records-service","training":"training-service",
      "remediation":"remediation-action-service","qiyas":"qiyas-journey-service",
      "journey":"qiyas-journey-service","dashboard":"dashboard-widgets-service","widgets":"dashboard-widgets-service",
      "portals":"portals-service","executive":"executive-intelligence-service",
      "integrations":"integrations-service","admin":"tenant-service",
      "product-shell":"product-shell","mobile":"gateway"
    }

    total = 0
    for module_code, files in modules.items():
        svc = service_hint.get(module_code, "gateway")
        for fname in files:
            path = f"/{module_code}/{fname}"
            sql_exec(
                f"INSERT INTO platform_dnoc.routes(module_code,service_code,method,path,auth_required) "
                f"VALUES({q(module_code)},{q(svc)},'*',{q(path)},TRUE) "
                f"ON CONFLICT (service_code,method,path) DO NOTHING;"
            )
            total += 1
    print(f"attempted {total} route inserts")

if __name__ == "__main__":
    main()
