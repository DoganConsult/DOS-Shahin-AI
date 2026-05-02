# Module: `integrations`

**Owner service:** `gateway` -- **Tables:** 38 -- **Has-data:** 4 -- **Schema-only:** 34

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `cmdb_assets` | 18 | Integrations -- Asset record (Cmdb Assets) | T |  |
| 2 | `cmdb_connections` | 13 | Integrations -- Cmdb Connections | N |  |
| 3 | `cmdb_sync_history` | 10 | Integrations -- Cmdb Sync: Historical change records | P |  |
| 4 | `connector_automation_rules` | 11 | Integrations -- Connector Automation: Rules/policy definitions | P | ✓ |
| 5 | `connector_configs` | 14 | Integrations -- Connector Configs | N |  |
| 6 | `connector_dependency_graph` | 9 | Integrations -- Connector Dependency Graph | N | ✓ |
| 7 | `connector_evidence_mappings` | 10 | Integrations -- Connector Evidence: Cross-entity mapping | P | ✓ |
| 8 | `connector_executions` | 7 | Integrations -- Connector Executions | N |  |
| 9 | `connector_registry` | 22 | Integrations -- Connector Registry | N | ✓ |
| 10 | `connector_status_log` | 7 | Integrations -- Connector Status: Activity/audit log records | P |  |
| 11 | `entity_link_metadata` | 5 | Entity link metadata | R |  |
| 12 | `entity_links` | 8 | Entity relationship links | R |  |
| 13 | `erp_connections` | 12 | Integrations -- Erp Connections | N |  |
| 14 | `erp_field_mappings` | 9 | Integrations -- Erp Field: Cross-entity mapping | P |  |
| 15 | `erp_sync_history` | 10 | Integrations -- Erp Sync: Historical change records | P |  |
| 16 | `external_stakeholder_profiles` | 23 | Integrations -- External Stakeholder Profiles | N |  |
| 17 | `iam_identities` | 17 | Integrations -- Iam Identities | N |  |
| 18 | `inbound_webhook_endpoints` | 12 | Integrations -- Inbound Webhook Endpoints | N |  |
| 19 | `inbound_webhook_log` | 7 | Integrations -- Inbound Webhook: Activity/audit log records | P |  |
| 20 | `integration_configs` | 13 | Integrations -- Integration Configs | N |  |
| 21 | `itsm_connections` | 14 | Integrations -- Itsm Connections | N |  |
| 22 | `itsm_sync_history` | 11 | Integrations -- Itsm Sync: Historical change records | P |  |
| 23 | `itsm_tickets` | 20 | Integrations -- Itsm Tickets | N |  |
| 24 | `m365_connections` | 15 | Integrations -- M365 Connections | N |  |
| 25 | `m365_evidence_items` | 17 | Integrations -- M365 Evidence Items | N |  |
| 26 | `m365_sync_history` | 10 | Integrations -- M365 Sync: Historical change records | P |  |
| 27 | `openclaw_api_keys` | 17 | Integrations -- Openclaw Api: Key/identifier catalog | P |  |
| 28 | `powerbi_reports` | 10 | Integrations -- Powerbi Reports | N |  |
| 29 | `siem_connections` | 14 | Integrations -- Siem Connections | N |  |
| 30 | `siem_events` | 15 | Integrations -- Siem: Domain event records | P |  |
| 31 | `siem_sync_history` | 10 | Integrations -- Siem Sync: Historical change records | P |  |
| 32 | `vuln_scan_results` | 19 | Integrations -- Vuln Scan Results | N |  |
| 33 | `vuln_scan_sync_history` | 11 | Integrations -- Vuln Scan Sync: Historical change records | P |  |
| 34 | `vuln_scanner_connections` | 15 | Integrations -- Vuln Scanner Connections | N |  |
| 35 | `webhook_delivery_log` | 6 | Integrations -- Webhook Delivery: Activity/audit log records | P |  |
| 36 | `webhook_endpoints` | 13 | Integrations -- Webhook Endpoints | N |  |
| 37 | `webhook_retry_queue` | 12 | Integrations -- Work queue records (Webhook Retry Queue) | T |  |
| 38 | `webhook_subscriptions` | 9 | Integrations -- Webhook: Subscription records | P |  |
