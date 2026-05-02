"use strict";
/**
 * OpenFGA Client — Fine-Grained Authorization
 *
 * Extracted from monolith: /home/Dr-Dogan-AGRC-OS/backend/src/config/app/openfga.ts
 *
 * Provides:
 *   - connectOpenFGA()       — Initialize and validate connection on startup
 *   - checkPermission()      — Check if user has relation to object
 *   - writeRelationship()    — Write a single relation tuple
 *   - openfgaConnected()     — Connection state
 *   - openfgaClient          — Direct client for batch operations
 *
 * Environment:
 *   OPENFGA_ENABLED=true
 *   OPENFGA_API_URL=http://localhost:8081
 *   OPENFGA_STORE_ID=<store-id>
 *   OPENFGA_MODEL_ID=<model-id>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openfgaClient = exports.OpenFGAClient = void 0;
exports.connectOpenFGA = connectOpenFGA;
exports.openfgaConnected = openfgaConnected;
exports.checkPermission = checkPermission;
exports.writeRelationship = writeRelationship;
exports.disconnectOpenFGA = disconnectOpenFGA;
class OpenFGAClient {
    apiUrl;
    storeId;
    modelId;
    _isEnabled;
    _isConnected = false;
    constructor() {
        this._isEnabled = process.env.OPENFGA_ENABLED === 'true';
        this.apiUrl = process.env.OPENFGA_API_URL || 'http://localhost:8081';
        this.storeId = process.env.OPENFGA_STORE_ID || '';
        this.modelId = process.env.OPENFGA_MODEL_ID || '';
    }
    get isEnabled() { return this._isEnabled; }
    get isConnected() { return this._isConnected; }
    /**
     * Validate connection by reading authorization models.
     * Call once during service startup.
     */
    async connect() {
        if (!this._isEnabled) {
            console.info('[OpenFGA] Disabled (OPENFGA_ENABLED != true)');
            return false;
        }
        if (!this.storeId) {
            console.warn('[OpenFGA] OPENFGA_STORE_ID not set — skipping initialization');
            return false;
        }
        try {
            const resp = await fetch(`${this.apiUrl}/stores/${this.storeId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!resp.ok) {
                console.warn(`[OpenFGA] Connection failed: HTTP ${resp.status}`);
                this._isConnected = false;
                return false;
            }
            const data = await resp.json();
            this._isConnected = true;
            console.info(`[OpenFGA] Connected → ${this.apiUrl} (store: ${data.name || this.storeId})`);
            return true;
        }
        catch (err) {
            console.warn(`[OpenFGA] Connection failed: ${err instanceof Error ? err.message : String(err)}`);
            this._isConnected = false;
            return false;
        }
    }
    async check(req) {
        if (!this._isEnabled || !this._isConnected) {
            return !this._isEnabled; // bypass if disabled, deny if enabled but disconnected
        }
        try {
            const url = `${this.apiUrl}/stores/${this.storeId}/check`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tuple_key: req,
                    authorization_model_id: this.modelId || undefined,
                }),
            });
            if (!response.ok) {
                console.error(`[OpenFGA] Check failed, status: ${response.status}`);
                return false;
            }
            const data = await response.json();
            return data.allowed === true;
        }
        catch (err) {
            console.error('[OpenFGA] Error invoking check:', err);
            return false; // Fail secure
        }
    }
    async write(tuples) {
        if (!this._isEnabled || !this._isConnected)
            return !this._isEnabled;
        if (!this.storeId || tuples.length === 0)
            return false;
        try {
            const url = `${this.apiUrl}/stores/${this.storeId}/write`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    writes: { tuple_keys: tuples },
                    authorization_model_id: this.modelId || undefined,
                }),
            });
            return response.ok;
        }
        catch (err) {
            console.error('[OpenFGA] Error invoking write:', err);
            return false;
        }
    }
    disconnect() {
        this._isConnected = false;
        console.info('[OpenFGA] Disconnected');
    }
}
exports.OpenFGAClient = OpenFGAClient;
// ── Singleton + convenience functions ────────────────────────────────────────
exports.openfgaClient = new OpenFGAClient();
/** Initialize and validate OpenFGA connection. Call once at service startup. */
async function connectOpenFGA() {
    return exports.openfgaClient.connect();
}
/** Returns true if OpenFGA is connected and ready. */
function openfgaConnected() {
    return exports.openfgaClient.isConnected;
}
/** Check if user has relation to object. Returns false if FGA unavailable (fail-secure). */
async function checkPermission(user, relation, object) {
    return exports.openfgaClient.check({ user, relation, object });
}
/** Write a single relation tuple. Returns false on failure. */
async function writeRelationship(user, relation, object) {
    return exports.openfgaClient.write([{ user, relation, object }]);
}
/** Disconnect and clean up. */
async function disconnectOpenFGA() {
    exports.openfgaClient.disconnect();
}
//# sourceMappingURL=openfga-client.js.map