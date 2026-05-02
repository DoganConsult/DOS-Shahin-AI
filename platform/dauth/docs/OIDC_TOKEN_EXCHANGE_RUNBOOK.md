# OIDC token exchange — log retrieval and verification runbook

Use this after a user sees **`TOKEN_EXCHANGE_FAILED`** in the browser (HTML reason code). The auth-service logs the structured fields needed to map **HTTP status**, **Keycloak error body**, **`redirect_uri`**, **`client_id`**, and **correlation id**.

## 1) Pull auth-service logs (`pull-logs`)

**Search strings** (pick what your log stack supports):

- Correlation id from the error page, e.g. `oidc-cb-moctbxg5-0ivlj1`
- Log message: `[oidc.callback] code exchange failed`
- Optional: `[oidc] token_exchange_keycloak_response` (full Keycloak body prefix up to 2000 chars on non-OK)

**Kubernetes / kubectl** (adapt namespace, label selector, container name):

```bash
NS=dogan-platform   # example
APP=auth-service    # example

kubectl -n "$NS" logs deploy/"$APP" --since=2h --timestamps=true \
  | grep -E 'oidc-cb-moctbxg5-0ivlj1|\[oidc\.callback\] code exchange failed|\[oidc\] token_exchange_keycloak_response'
```

**Loki / LogQL** (example — replace `{namespace="..."}`):

```logql
{namespace="dogan-platform", app="auth-service"}
  |= "oidc-cb-moctbxg5-0ivlj1"
  or |= "[oidc.callback] code exchange failed"
```

**Time window**: narrow to ~5 minutes around the incident (e.g. `2026-04-24T11:10:00Z`–`2026-04-24T11:15:00Z`).

Copy verbatim:

- `err` / `err.message` from `[oidc.callback] code exchange failed`
- If present: `tokenUrl`, `redirect_uri`, `client_id`, `httpStatus`, `keycloakErrorBody` from `[oidc] token_exchange_keycloak_response`

## 2) Parse `oidc_token_exchange_failed` (`parse-err`)

Thrown message format:

```text
oidc_token_exchange_failed:<HTTP_STATUS>:<first 200 chars of Keycloak body>
```

Example:

```text
oidc_token_exchange_failed:400:{"error":"invalid_grant","error_description":"..."}
```

In code, use `parseOidcTokenExchangeError(message)` from `keycloak-oidc-flow.service.ts` (also logged as `parsedHttpStatus` and `keycloakBodyPrefix` on callback failure).

Common **Keycloak** `error` values:

| `error` / symptom | Likely cause |
|-------------------|--------------|
| `invalid_grant` | Wrong or reused code, PKCE mismatch, **`redirect_uri` mismatch** vs authorize request |
| `unauthorized_client` | Client not allowed for grant, or wrong client type |
| HTTP **401** with invalid client | Wrong **`client_secret`** or **`client_id`** |

## 3) Keycloak client checks (`verify-kc-client`)

In **Keycloak Admin** → realm from env **`KEYCLOAK_REALM`** → **Clients** → client id matching deployment (**`KEYCLOAK_PRODUCT_OIDC_CLIENT_ID`** or **`KEYCLOAK_OIDC_CLIENT_ID`**):

- **Client authentication**: ON (confidential)
- **Standard flow**: enabled (authorization code)
- **Valid redirect URIs** must include **exact** callback URLs used in production:

  - `https://shahin-ai.com/api/auth/oidc/callback`
  - `https://www.shahin-ai.com/api/auth/oidc/callback`
  - `https://admin.dogan-ai.com/api/auth/oidc/callback` (if admin surface uses OIDC)

Character-for-character match with what the BFF sends (no trailing slash drift).

## 4) `X-Forwarded-Host` / `redirect_uri` parity (`verify-forwarded-host`)

The BFF builds:

`redirect_uri = https://<normalized X-Forwarded-Host or Host>/api/auth/oidc/callback`

**Must be identical** on **`GET /api/auth/oidc/start`** and **`GET /api/auth/oidc/callback`** for the same browser journey.

**Operational checks:**

- Compare ingress / reverse-proxy config for **both** routes: same `X-Forwarded-Host` (or same `Host`) for apex vs `www`.
- In logs, watch **`[oidc.callback] redirect_uri drift vs /start`** — fires when the callback recomputed `redirect_uri` differs from the value stored at `/start` (apex vs `www`, proxy stripping headers, etc.).

## 5) Environment parity (`verify-env`)

On the **auth-service** deployment, confirm (names only — do not paste secret **values** into tickets):

| Variable | Purpose |
|----------|---------|
| `KEYCLOAK_BASE_URL` | Initial Keycloak base URL (overridden per product surface in OIDC routes) |
| `KEYCLOAK_REALM` | Realm name in token URL path |
| `KEYCLOAK_OIDC_CLIENT_ID` / `KEYCLOAK_OIDC_CLIENT_SECRET` | Default confidential client |
| `KEYCLOAK_PRODUCT_OIDC_CLIENT_ID` / `KEYCLOAK_PRODUCT_OIDC_CLIENT_SECRET` | Product surface override when set |
| `KEYCLOAK_OIDC_REDIRECT_URI` or `OIDC_CALLBACK_URL` | Base load; per-request override still uses forwarded host |

Diff runtime env against Keycloak **Credentials** tab for the **same** `client_id` the service logs on token failure.

**Note:** `KEYCLOAK_INTERNAL_BASE_URL` is **not** read by the OIDC token exchange path in this repo; the token POST uses `cfg.baseUrl` after host override (typically public `https://auth.shahin-ai.com` for the product surface).
