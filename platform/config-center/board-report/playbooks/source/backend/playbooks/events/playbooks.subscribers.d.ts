export declare function registerPlaybooksEventSubscribers(): void;
export declare function handleIncidentClassified(payload: {
    tenantId: string;
    incidentId: string;
    classification: string;
    severity: string;
}): Promise<void>;
