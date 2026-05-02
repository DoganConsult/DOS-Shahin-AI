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

export interface FGACheckRequest {
  user: string;
  relation: string;
  object: string;
}

export class OpenFGAClient {
  private apiUrl: string;
  private storeId: string;
  private modelId: string;
  private _isEnabled: boolean;
  private _isConnected: boolean = false;

  constructor() {
    this._isEnabled = process.env.OPENFGA_ENABLED === 'true';
    this.apiUrl = process.env.OPENFGA_API_URL || 'http://localhost:8081';
    this.storeId = process.env.OPENFGA_STORE_ID || '';
    this.modelId = process.env.OPENFGA_MODEL_ID || '';
  }

  get isEnabled(): boolean { return this._isEnabled; }
  get isConnected(): boolean { return this._isConnected; }

  /**
   * Validate connection by reading authorization models.
   * Call once during service startup.
   */
  public async connect(): Promise<boolean> {
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
      const data = await resp.json() as any;
      this._isConnected = true;
      console.info(`[OpenFGA] Connected → ${this.apiUrl} (store: ${data.name || this.storeId})`);
      return true;
    } catch (err: unknown) {
      console.warn(`[OpenFGA] Connection failed: ${err instanceof Error ? err.message : String(err)}`);
      this._isConnected = false;
      return false;
    }
  }

  public async check(req: FGACheckRequest): Promise<boolean> {
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

      const data = await response.json() as any;
      return data.allowed === true;
    } catch (err) {
      console.error('[OpenFGA] Error invoking check:', err);
      return false; // Fail secure
    }
  }

  public async write(tuples: FGACheckRequest[]): Promise<boolean> {
    if (!this._isEnabled || !this._isConnected) return !this._isEnabled;
    if (!this.storeId || tuples.length === 0) return false;

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
    } catch (err) {
      console.error('[OpenFGA] Error invoking write:', err);
      return false;
    }
  }

  public disconnect(): void {
    this._isConnected = false;
    console.info('[OpenFGA] Disconnected');
  }
}

// ── Singleton + convenience functions ────────────────────────────────────────

export const openfgaClient = new OpenFGAClient();

/** Initialize and validate OpenFGA connection. Call once at service startup. */
export async function connectOpenFGA(): Promise<boolean> {
  return openfgaClient.connect();
}

/** Returns true if OpenFGA is connected and ready. */
export function openfgaConnected(): boolean {
  return openfgaClient.isConnected;
}

/** Check if user has relation to object. Returns false if FGA unavailable (fail-secure). */
export async function checkPermission(user: string, relation: string, object: string): Promise<boolean> {
  return openfgaClient.check({ user, relation, object });
}

/** Write a single relation tuple. Returns false on failure. */
export async function writeRelationship(user: string, relation: string, object: string): Promise<boolean> {
  return openfgaClient.write([{ user, relation, object }]);
}

/** Disconnect and clean up. */
export async function disconnectOpenFGA(): Promise<void> {
  openfgaClient.disconnect();
}
