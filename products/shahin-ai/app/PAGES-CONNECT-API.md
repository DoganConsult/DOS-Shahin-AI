# Wiring pages to real APIs

Pages that only show "coming soon" or static content should be wired to real backend APIs so the app is fully connected.

## Pattern (3 steps)

1. **Inject `GrcService`** in the page component (and optionally a loading/error state).
2. **In `ngOnInit`**: call a real API (e.g. `this.grc.get('/auth/userinfo')`).
3. **Store the result** in a signal or property and **bind it in the template** (show data, loading, errors).

## Example: Account Settings

- **API:** `GET /api/auth/userinfo` (returns `userName`, `email`, `orgName`, etc.)
- **Component:** inject `GrcService`, call `this.grc.get('/auth/userinfo')` in `ngOnInit`, store in a signal, show in template.

## Example: Login History / Recent activity

- **API:** `GET /api/workspace-home/recent-activity` (returns `{ activities: [...] }`).
- **Component:** inject `GrcService`, call in `ngOnInit`, bind `activities` in template (e.g. list with timestamp, action, entity_type).

## Backend base URL

- `GrcService` uses `environment.apiUrl` (e.g. `/api`). Paths are relative to that: use `/auth/userinfo`, `/workspace-home/recent-activity`, `/audit-trail`, etc.

## Suggested API to page mapping (representative)

| Page / route area        | Suggested API(s) |
|--------------------------|------------------|
| account-settings         | `GET /auth/userinfo` (done) |
| login-history            | `GET /workspace-home/recent-activity` (done) |
| workspace-home / dashboard | `GET /workspace-home`, `GET /dashboard` |
| audit / audit-trail      | `GET /audit-trail` (needs audit:read) |
| risks                    | `GET /risks`, `GET /risks/matrix` |
| controls / compliance    | `GET /controls`, `GET /dashboard/controls` |
| policies / governance    | `GET /governance/policies` |
| evidence                 | Evidence APIs per backend |
| reports                  | Reports APIs per backend |
| admin / users           | Admin user list API |
| onboarding (post-login) | `GET /onboarding/questions`, `POST /onboarding/complete` |

For the full list of routed components, see `src/app/app.routes.ts`. Apply the same pattern: inject `GrcService`, call the appropriate backend path in `ngOnInit`, and bind the response in the template.
