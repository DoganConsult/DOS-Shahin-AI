/**
 * Wave 10e — focused unit test for the gateway-origin verifier.
 *
 * Pure crypto path — no DB, no network. Asserts the verifier mirror in
 * services/ui-os-service/src/middleware/gateway-origin.ts accepts a
 * properly-signed token and rejects malformed/expired/wrong-source ones.
 */
import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { verifyGatewayOrigin } from '../middleware/gateway-origin.js';
const SECRET = 'unit-test-secret-please-rotate';
function b64url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function sign(payload) {
    const json = Buffer.from(JSON.stringify(payload), 'utf8');
    const head = b64url(json);
    const sig = crypto.createHmac('sha256', SECRET).update(head).digest();
    return `${head}.${b64url(sig)}`;
}
function basePayload(over = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
        iat: now, exp: now + 60, jti: crypto.randomUUID(), sub: 'user-123',
        tenantId: 't-acme', email: 'u@x', roles: ['user'], src: 'gateway', v: 1,
        ...over,
    };
}
describe('verifyGatewayOrigin', () => {
    it('accepts a freshly-signed token and yields the principal', () => {
        const r = verifyGatewayOrigin(sign(basePayload()), { secret: SECRET });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.principal.sub).toBe('user-123');
            expect(r.principal.tenantId).toBe('t-acme');
        }
    });
    it('rejects MISSING when token is empty', () => {
        const r = verifyGatewayOrigin('', { secret: SECRET });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toBe('MISSING');
    });
    it('rejects MALFORMED when there is no dot separator', () => {
        const r = verifyGatewayOrigin('no-dot-here', { secret: SECRET });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toBe('MALFORMED');
    });
    it('rejects BAD_HMAC when signature does not verify', () => {
        const t = sign(basePayload());
        const tampered = `${t.slice(0, -2)}AA`;
        const r = verifyGatewayOrigin(tampered, { secret: SECRET });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toBe('BAD_HMAC');
    });
    it('rejects EXPIRED tokens', () => {
        const past = Math.floor(Date.now() / 1000) - 3600;
        const r = verifyGatewayOrigin(sign(basePayload({ iat: past, exp: past + 60 })), { secret: SECRET });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toBe('EXPIRED');
    });
    it('rejects WRONG_SOURCE', () => {
        const r = verifyGatewayOrigin(sign(basePayload({ src: 'attacker' })), { secret: SECRET });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toBe('WRONG_SOURCE');
    });
    it('rejects WRONG_VERSION', () => {
        const r = verifyGatewayOrigin(sign(basePayload({ v: 99 })), { secret: SECRET });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.reason).toBe('WRONG_VERSION');
    });
    it('rejects REPLAYED jti within ttl', () => {
        const t = sign(basePayload());
        const a = verifyGatewayOrigin(t, { secret: SECRET });
        const b = verifyGatewayOrigin(t, { secret: SECRET });
        expect(a.ok).toBe(true);
        expect(b.ok).toBe(false);
        if (!b.ok)
            expect(b.reason).toBe('REPLAYED');
    });
});
//# sourceMappingURL=gateway-origin.test.js.map