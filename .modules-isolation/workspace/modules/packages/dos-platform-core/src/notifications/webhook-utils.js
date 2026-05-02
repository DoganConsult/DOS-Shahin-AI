import { createHmac, timingSafeEqual } from 'node:crypto';
function normalizeSignature(signature) {
    return signature.startsWith('sha256=') ? signature.slice(7) : signature;
}
export function verifyHmacSignature(rawBody, signature, secret) {
    const received = normalizeSignature(signature);
    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
//# sourceMappingURL=webhook-utils.js.map