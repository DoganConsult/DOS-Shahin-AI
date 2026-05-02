/**
 * Attestation event subscribers — handle cross-module events.
 */
export declare function registerAttestationEventSubscribers(): void;
export declare function handleControlUpdated(payload: {
    tenantId: string;
    controlId: string;
    status: string;
}): Promise<void>;
export declare function handleEvidenceCollected(payload: {
    tenantId: string;
    evidenceId: string;
    entityType: string;
    entityId: string;
}): Promise<void>;
