# AS-BUILT: Mobile Module (MP-45)

## Module Identity
- **Module Code:** `mobile`
- **Tier:** Technical Support Surface
- **Criticality:** P2

## Owned Artifacts
- **Database Tables:** `mobile_devices`, `mobile_push_tokens`, `mobile_sync_queue`
- **Aggregate Root:** `mobile_devices`
- **API Surface:** `/api/mobile/` → `/devices`, `/push-tokens`, `/sync`, `/config`, `/diagnostics`

## Protected Actions (DAuth Enforcement Points)
- `mobile.read` — View device listings
- `mobile.manage` — Manage devices and tokens (admin)
- All device operations scoped to `req.user.id` (user can only manage own devices)

## Service Families
1. **Device Registration Service** — `registerDevice()`, `listDevices()`, `deregisterDevice()`, `heartbeat()`
2. **Push Notification Bridge** — `registerPushToken()`, `invalidatePushToken()`
3. **Offline Sync Service** — `getPendingSyncItems()`, `addSyncItem()`, `acknowledgeSyncItem()`, `resolveSyncConflict()`
4. **Mobile Config Service** — `getMobileConfig()` (env-driven)
5. **Diagnostics Service** — `runDiagnostics()`

## Diagnostics
- Active devices by platform (iOS/Android)
- Stale push tokens (>30 days)
- Pending sync items depth
- Unresolved sync conflicts

## Event Backbone
- Publishes: `mobile.device_registered`, `mobile.device_deregistered`, `mobile.sync_completed`
- Consumes: `notification.push_requested`
