# Module: `asset`

**Owner service:** `risk-incident-service` -- **Tables:** 12 -- **Has-data:** 2 -- **Schema-only:** 10

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `applications` | 27 | Asset -- Applications | N |  |
| 2 | `asset_classification_scheme` | 11 | Asset -- Asset record (Asset Classification Scheme) | T |  |
| 3 | `asset_classifications` | 14 | Asset -- Asset record (Asset Classifications) | T | ✓ |
| 4 | `asset_dependencies` | 14 | Asset -- Asset: Dependency mapping | P |  |
| 5 | `asset_evidence_links` | 7 | Asset -- Asset Evidence: Cross-table link records | P |  |
| 6 | `asset_lifecycle_events` | 10 | Asset -- Asset Lifecycle: Domain event records | P |  |
| 7 | `asset_owners` | 10 | Asset -- Asset: Ownership assignment | P |  |
| 8 | `asset_ownership_matrix` | 9 | Asset -- RACI/permission matrix (Asset Ownership Matrix) | T |  |
| 9 | `asset_vendor_links` | 8 | Asset -- Asset Vendor: Cross-table link records | P |  |
| 10 | `assets` | 48 | Asset -- Asset record (Assets) | T | ✓ |
| 11 | `business_services` | 23 | Asset -- Business Services | N |  |
| 12 | `control_asset_links` | 8 | Asset -- Control Asset: Cross-table link records | P |  |
