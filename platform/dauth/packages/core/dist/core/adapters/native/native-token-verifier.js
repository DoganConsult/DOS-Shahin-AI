"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeTokenVerifier = exports.NativeTokenVerifier = void 0;
/**
 * Native TokenVerifier — wraps the existing jsonwebtoken HS256 flow in
 * `identity/token.service.ts#verifyAccessToken`. This is the default and is
 * always available — Keycloak and other external verifiers run beside it in
 * shadow mode before any enforce flip.
 */
const jwt = __importStar(require("jsonwebtoken"));
const token_service_1 = require("../../identity/token.service");
const token_verifier_port_1 = require("../../ports/token-verifier.port");
class NativeTokenVerifier {
    name = 'native';
    async verify(token) {
        try {
            const payload = jwt.verify(token, (0, token_service_1.getJwtSecret)());
            return { payload, source: 'native' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.toLowerCase().includes('expired')) {
                throw new token_verifier_port_1.InvalidTokenError(msg, 'EXPIRED', 'native');
            }
            if (msg.toLowerCase().includes('signature')) {
                throw new token_verifier_port_1.InvalidTokenError(msg, 'SIGNATURE', 'native');
            }
            if (msg.toLowerCase().includes('malformed') || msg.toLowerCase().includes('invalid')) {
                throw new token_verifier_port_1.InvalidTokenError(msg, 'MALFORMED', 'native');
            }
            throw new token_verifier_port_1.InvalidTokenError(msg, 'UNKNOWN', 'native');
        }
    }
}
exports.NativeTokenVerifier = NativeTokenVerifier;
exports.nativeTokenVerifier = new NativeTokenVerifier();
//# sourceMappingURL=native-token-verifier.js.map