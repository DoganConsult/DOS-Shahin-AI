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
export declare class OpenFGAClient {
    private apiUrl;
    private storeId;
    private modelId;
    private _isEnabled;
    private _isConnected;
    constructor();
    get isEnabled(): boolean;
    get isConnected(): boolean;
    /**
     * Validate connection by reading authorization models.
     * Call once during service startup.
     */
    connect(): Promise<boolean>;
    check(req: FGACheckRequest): Promise<boolean>;
    write(tuples: FGACheckRequest[]): Promise<boolean>;
    disconnect(): void;
}
export declare const openfgaClient: OpenFGAClient;
/** Initialize and validate OpenFGA connection. Call once at service startup. */
export declare function connectOpenFGA(): Promise<boolean>;
/** Returns true if OpenFGA is connected and ready. */
export declare function openfgaConnected(): boolean;
/** Check if user has relation to object. Returns false if FGA unavailable (fail-secure). */
export declare function checkPermission(user: string, relation: string, object: string): Promise<boolean>;
/** Write a single relation tuple. Returns false on failure. */
export declare function writeRelationship(user: string, relation: string, object: string): Promise<boolean>;
/** Disconnect and clean up. */
export declare function disconnectOpenFGA(): Promise<void>;
