# Platform Security Debt Register

This document is the **single human-readable index** of accepted, pre-existing
security debt in the canonical source tree
(`/root/DOS-AIO/DOS Platform`).

The machine-readable source of truth is
[`security-debt.json`](./security-debt.json). Both files MUST stay in sync.
CI tooling and review agents MUST read the JSON; this Markdown is for humans.

---

## Auth-storage policy (binding)

| Concern | Sanctioned mechanism                                                                 |
|---------|--------------------------------------------------------------------------------------|
| Session | HTTPOnly + Secure + SameSite=strict cookie issued by `auth-service`                  |
| Identity hydration | Server endpoint (e.g. `/api/me`) — not browser-readable storage           |
| Forbidden in browser storage | `scopedJwt`, `jwt`, `accessToken`, `refreshToken`, `externalUserId`, any `grc_*` identity field |

Any code that violates this policy is automatically **at least P1** and is
P0 if it sits on the authentication critical path.

---

## Open items

### SEC-DEBT-0001 — `localStorage` token writes in `invitation-accept` flow

| Field | Value |
|---|---|
| Severity | **P0** |
| Status | **OPEN** |
| Discovered | Batch-1 post-move scan (canonical-source restructure), 2026-04-29 |
| Origin | **Pre-existing**; content unchanged from the legacy `Shahin-AI Website/frontend` tree (verified via `git mv` of Batch 1) |
| File | `products/shahin-ai/app/src/app/blueprint/pages/invitations/invitation-accept.component.ts` |
| Violating lines | 522, 523, 575, 576, 577, 578, 579 |
| Violated keys | `scopedJwt`, `externalUserId`, `grc_userId`, `grc_tenantId`, `grc_role`, `grc_userName`, `grc_orgName` |

#### Why it sits on the critical path

`invitation-accept.component.ts` is the exit path of the invitation /
new-tenant onboarding flow. The same component:

1. Receives the freshly minted scoped JWT (`scopedJwt`) and the external
   user id (`externalUserId`) for the just-onboarded tenant admin, **and**
2. Persists tenant/role/user identity (`grc_*`) used downstream by other
   shahin-ai modules.

Both writes mean a successful XSS in any shahin-ai-served route can lift a
**fully provisioned tenant-admin session token** straight out of
`localStorage`. This is exactly the threat HTTPOnly cookies exist to prevent.

#### Scope rules

- **Batch 1 (Shahin-AI app move)** — out of scope; was a pure `git mv`.
- **Batch 2 (Foundation module move)** — **out of scope**. Do **not**
  bundle this fix with a structural restructure batch.
- A dedicated security batch must be opened. It will touch
  `auth-service`, `gateway`, `product-shell` cookie handling, and the
  shahin-ai app's auth bootstrap.

> **Do NOT mark this item low priority.** It is recorded as P0 by explicit
> directive and stays P0 until remediated.

#### Remediation outline (for the future security batch — informational only)

1. `auth-service` issues the session as HTTPOnly + Secure + SameSite=strict
   cookie on the invitation-accept and invitation-register responses.
2. `gateway` forwards `Set-Cookie` unchanged for the product-shell origin
   and rejects any path that returns a token in the JSON body.
3. `product-shell` whitelists the cookie name on the SPA origin; no SPA
   code reads it.
4. The shahin-ai SPA replaces all `localStorage.getItem('scopedJwt' | 'grc_*' | 'externalUserId')`
   reads with a single `/api/me` call (server-side hydration).
5. After all reads are migrated, the writes in `invitation-accept.component.ts`
   are deleted in the **same** commit that deletes the last reader, so no
   intermediate broken state ships.
6. CI lint gate added: forbid any new `localStorage.(set|get)Item('scopedJwt'|'grc_*'|...|'externalUserId')`.

#### Interim compensating controls

- None are currently in place.
- **Minimum interim measure (cheap, recommended now):** add a CI scan
  rule that fails the build if any *new* `localStorage` write to the
  forbidden key list is introduced. This freezes the blast radius at
  exactly the lines listed above.

---

## How to update this register

1. Edit `security-debt.json` first (it is the canonical source).
2. Mirror the change into this Markdown.
3. Commit both files in the same commit. Mismatch between the two is itself
   a process violation.
