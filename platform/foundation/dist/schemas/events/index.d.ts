export declare const FOUNDATION_EVENT_ENVELOPE_SCHEMA: {
    $schema: string;
    $id: string;
    title: string;
    type: string;
    required: string[];
    properties: {
        event_type: {
            type: string;
            pattern: string;
        };
        tenantId: {
            type: string;
            minLength: number;
        };
        userId: {
            type: string;
        };
        module: {
            const: string;
        };
        event: {
            type: string;
        };
        entityType: {
            type: string;
        };
        entityId: {
            type: string;
        };
        data: {
            type: string;
            additionalProperties: boolean;
        };
        occurredAt: {
            type: string;
            format: string;
        };
        correlationId: {
            type: string;
        };
        causationId: {
            type: string;
        };
        version: {
            type: string;
            default: string;
        };
    };
    additionalProperties: boolean;
};
export declare const FOUNDATION_EVENT_SCHEMAS: {
    readonly envelope: {
        $schema: string;
        $id: string;
        title: string;
        type: string;
        required: string[];
        properties: {
            event_type: {
                type: string;
                pattern: string;
            };
            tenantId: {
                type: string;
                minLength: number;
            };
            userId: {
                type: string;
            };
            module: {
                const: string;
            };
            event: {
                type: string;
            };
            entityType: {
                type: string;
            };
            entityId: {
                type: string;
            };
            data: {
                type: string;
                additionalProperties: boolean;
            };
            occurredAt: {
                type: string;
                format: string;
            };
            correlationId: {
                type: string;
            };
            causationId: {
                type: string;
            };
            version: {
                type: string;
                default: string;
            };
        };
        additionalProperties: boolean;
    };
};
