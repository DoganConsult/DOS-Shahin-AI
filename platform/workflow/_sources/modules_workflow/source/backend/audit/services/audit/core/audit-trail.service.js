"use strict";
// Workflow-local audit-trail adapter.
//
// 29 workflow source files import { recordAudit } from this path to write
// append-only entries to the shared dos.audit_trail table. Making the
// adapter workflow-local keeps the dependency graph tree-shaped (workflow
// owns its audit writes; the audit module owns reads + the UI surface)
// while still writing to the same canonical table.
//
// Signature matches the `recordAudit` surface of
// modules/audit/.../audit-trail.service.ts. Hash-chain verification + query
// helpers stay with the audit module (the read-side owner of the table).
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAudit = void 0;
var db_1 = require("@dos/db");
var resilience_1 = require("@dos/platform-core/resilience");
var node_crypto_1 = require("node:crypto");
var uuid_1 = require("uuid");
/**
 * Append a row to dos.audit_trail. Errors are swallowed via the
 * platform-core resilience envelope so a downstream audit failure never
 * breaks the caller's business write.
 */
function recordAudit(entry) {
    return __awaiter(this, void 0, void 0, function () {
        var entryId, payload, payloadStr, hashInput, hash;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            entryId = (0, uuid_1.v4)();
            payload = {
                beforeState: (_a = entry.beforeState) !== null && _a !== void 0 ? _a : null,
                afterState: (_b = entry.afterState) !== null && _b !== void 0 ? _b : null,
                ipAddress: (_c = entry.ipAddress) !== null && _c !== void 0 ? _c : null,
            };
            payloadStr = JSON.stringify(payload);
            hashInput = [
                entry.tenantId,
                entry.userId,
                entry.module,
                entry.action,
                entry.entityType,
                entry.entityId,
                payloadStr,
            ].join('|');
            hash = (0, node_crypto_1.createHash)('sha256').update(hashInput).digest('hex');
            (0, resilience_1.swallow)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.safeQuery)("INSERT INTO dos.audit_trail\n       (entry_id, tenant_id, actor_id, module, action, entity_type, entity_id,\n        payload, hash, created_at)\n     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW())", [
                entryId,
                entry.tenantId,
                entry.userId,
                entry.module,
                entry.action,
                entry.entityType,
                entry.entityId,
                payloadStr,
                hash,
            ]), { tenantId: entry.tenantId, operation: 'workflow.recordAudit' });
            return [2 /*return*/];
        });
    });
}
exports.recordAudit = recordAudit;
