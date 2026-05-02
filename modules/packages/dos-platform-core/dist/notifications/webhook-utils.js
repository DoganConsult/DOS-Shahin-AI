"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHmacSignature = verifyHmacSignature;
const node_crypto_1 = require("node:crypto");
function normalizeSignature(signature) {
    return signature.startsWith('sha256=') ? signature.slice(7) : signature;
}
function verifyHmacSignature(rawBody, signature, secret) {
    const received = normalizeSignature(signature);
    const expected = (0, node_crypto_1.createHmac)('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    return expectedBuffer.length === receivedBuffer.length && (0, node_crypto_1.timingSafeEqual)(expectedBuffer, receivedBuffer);
}
//# sourceMappingURL=webhook-utils.js.map