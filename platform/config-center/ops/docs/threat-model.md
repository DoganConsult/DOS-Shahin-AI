# STRIDE Threat Model 

## 1. Spoofing
- **Risk**: Unauthorized actor assumes the identity of a Tenant Admin.
- **Microservice/Component**: `auth-service`, `gateway`
- **Mitigation**: Strict JWT verification inside `gateway` before mapping `req.user`. IPs tracked across Redis rate limit maps.

## 2. Tampering
- **Risk**: Modification of compliance frameworks or workflow states en-route to `ai-engine-service`.
- **Mitigation**: All HTTP traffic travels via TLS 1.3 through the Nginx proxy. Service-to-service calls stay on the loopback interface / host-private network (native PM2 processes, no container overlay) mapped to `.internal` TLDs restricting outside packet injection.

## 3. Repudiation
- **Risk**: User claims they did not initiate a major policy approval.
- **Mitigation**: `AuditService` explicitly dumps HTTP payload `Correlation-ID`s and explicit `User-IDs` onto the immutable data store tracking.

## 4. Information Disclosure
- **Risk**: Tenant A accesses Tenant B's risk registers.
- **Mitigation**: Postgres applies Row-Level Security (`RLS`) bounded explicitly before any `SELECT` mapping through the DAuth framework logic using `SET LOCAL rls.tenant_id = $1;`.

## 5. Denial of Service (DoS)
- **Risk**: API flooded with un-authenticated requests.
- **Mitigation**: Gateway memory/redis stores limit to 5 per minute per IP for Auth services. Platform limits overall scale via PM2 auto-scalar and Nginx 30r/s maximum limits.

## 6. Elevation of Privilege
- **Risk**: `viewer` role accesses `tenant_admin` routing.
- **Mitigation**: Canonical DAuth enforces module permissions at the HTTP header layer natively mapped to role boundaries.
