/**
 * Runtime form config for the Foundation module.
 *   GET /api/module-config/foundation/form/:variant
 */
export interface FormFieldConfig {
    key: string;
    i18nKey: string;
    type: 'text' | 'textarea' | 'select' | 'date' | 'boolean' | 'number' | 'reference';
    required?: boolean;
    pattern?: string;
    optionsEndpoint?: string;
    validatorRefs?: string[];
    permission?: string;
}
export interface FormVariantConfig {
    variant: string;
    submitEndpoint: string;
    method: 'POST' | 'PUT' | 'PATCH';
    fields: FormFieldConfig[];
    approvalRequired?: boolean;
    schemaRef: string;
}
export declare const FOUNDATION_FORM_CONFIGS: Record<string, FormVariantConfig>;
