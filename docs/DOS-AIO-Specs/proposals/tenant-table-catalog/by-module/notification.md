# Module: `notification`

**Owner service:** `notification-service` -- **Tables:** 8 -- **Has-data:** 1 -- **Schema-only:** 7

| # | Table | Cols | Purpose | Src | Data |
|---:|---|---:|---|:-:|:-:|
| 1 | `alert_instances` | 19 | Notification -- Alert Instances | N |  |
| 2 | `alert_rules` | 24 | Notification -- Alert: Rules/policy definitions | P |  |
| 3 | `email_inbox` | 25 | Notification -- Inbox queue (Email Inbox) | T |  |
| 4 | `email_templates` | 17 | Notification -- Email: Template catalog | P |  |
| 5 | `notification_preferences` | 21 | Notification -- Notification Preferences | N |  |
| 6 | `notification_preferences_legacy` | 3 | Notification -- Notification Preferences Legacy | N |  |
| 7 | `notification_queue` | 34 | Notification -- Work queue records (Notification Queue) | T | ✓ |
| 8 | `notifications_log` | 12 | Notification -- Notifications: Activity/audit log records | P |  |
