export interface ConnectorEvidenceMapping {
    mapping_id: string;
    connector_type: string;
    output_type: string;
    evidence_type: string;
    control_id_pattern: string | null;
    auto_submit: boolean;
    enabled: boolean;
}
export declare function mapConnectorOutputToEvidence(tenantId: string, syncPayload: {
    connectorType: string;
    connectionId: string;
    recordsFetched: number;
    recordsNew: number;
}): Promise<{
    matched: number;
    submitted: number;
    errors: number;
}>;
export declare function getConnectorEvidenceMappings(tenantId: string): Promise<ConnectorEvidenceMapping[]>;
export declare function createConnectorEvidenceMapping(tenantId: string, input: {
    connectorType: string;
    outputType: string;
    evidenceType: string;
    controlIdPattern?: string;
}): Promise<ConnectorEvidenceMapping | null>;
