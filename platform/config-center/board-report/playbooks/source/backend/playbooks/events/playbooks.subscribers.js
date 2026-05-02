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
exports.registerPlaybooksEventSubscribers = registerPlaybooksEventSubscribers;
exports.handleIncidentClassified = handleIncidentClassified;
const module_sdk_1 = require("@dos/module-sdk");
function registerPlaybooksEventSubscribers() {
    module_sdk_1.logger.info('[Playbooks] Event subscribers registered');
}
async function handleIncidentClassified(payload) {
    const { safeQuery, tenantSchema } = await Promise.resolve().then(() => __importStar(require('@dos/db')));
    try {
        const schema = tenantSchema(payload.tenantId);
        // Find matching playbook for this classification/severity
        const { rows } = await safeQuery(`SELECT id, name FROM "${schema}".playbooks
       WHERE trigger_classification = $1 AND status = 'active' AND deleted_at IS NULL
       ORDER BY priority ASC LIMIT 1`, [payload.classification]);
        if (rows.length > 0) {
            module_sdk_1.logger.info(`[Playbooks] Auto-triggering playbook ${rows[0].name} for incident ${payload.incidentId}`);
        }
    }
    catch (err) {
        module_sdk_1.logger.error(`[Playbooks] handleIncidentClassified failed: ${(0, module_sdk_1.toErrorMessage)(err)}`);
    }
}
//# sourceMappingURL=playbooks.subscribers.js.map