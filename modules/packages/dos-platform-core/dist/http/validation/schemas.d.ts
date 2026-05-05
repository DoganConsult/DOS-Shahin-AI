import { z } from 'zod';
declare function safeStr(max?: number): z.ZodEffects<z.ZodString, string, string>;
declare function optSafeStr(max?: number): z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
type PiiCategory = 'email' | 'name' | 'phone' | 'address' | 'national_id' | 'ip' | 'dob' | 'ssn' | 'bank_account';
declare function piiStr(category: PiiCategory, max?: number): z.ZodEffects<z.ZodString, string, string>;
declare function optPiiStr(category: PiiCategory, max?: number): z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
declare function piiEmail(): z.ZodString;
declare function optPiiEmail(): z.ZodOptional<z.ZodString>;
export declare const commonSchemas: {
    uuid: z.ZodUnion<[z.ZodString, z.ZodString]>;
    isoDate: z.ZodUnion<[z.ZodString, z.ZodString]>;
    nonEmpty: z.ZodEffects<z.ZodString, string, string>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "draft", "archived", "pending", "closed", "open", "mitigated", "resolved", "deleted"]>>;
    paginationQuery: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
    }, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
    }>;
    idParams: z.ZodObject<{
        id: z.ZodUnion<[z.ZodString, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
    }, {
        id?: string;
    }>;
    dateRange: z.ZodEffects<z.ZodObject<{
        from: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        to: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        from?: string;
        to?: string;
    }, {
        from?: string;
        to?: string;
    }>, {
        from?: string;
        to?: string;
    }, {
        from?: string;
        to?: string;
    }>;
    bulkAction: z.ZodObject<{
        ids: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodString]>, "many">;
        action: z.ZodEnum<["delete", "archive", "activate", "deactivate", "export", "assign"]>;
        assignTo: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        assignTo?: string;
        action?: "delete" | "archive" | "activate" | "deactivate" | "export" | "assign";
        ids?: string[];
    }, {
        assignTo?: string;
        action?: "delete" | "archive" | "activate" | "deactivate" | "export" | "assign";
        ids?: string[];
    }>;
    exportQuery: z.ZodObject<{
        format: z.ZodDefault<z.ZodEnum<["csv", "xlsx", "pdf", "json"]>>;
        columns: z.ZodOptional<z.ZodString>;
        dateRange: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        format?: "csv" | "xlsx" | "pdf" | "json";
        columns?: string;
        dateRange?: string;
    }, {
        status?: string;
        format?: "csv" | "xlsx" | "pdf" | "json";
        columns?: string;
        dateRange?: string;
    }>;
    safeStr: typeof safeStr;
    optSafeStr: typeof optSafeStr;
    piiStr: typeof piiStr;
    optPiiStr: typeof optPiiStr;
    piiEmail: typeof piiEmail;
    optPiiEmail: typeof optPiiEmail;
};
export declare const riskSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        likelihood: z.ZodOptional<z.ZodNumber>;
        impact: z.ZodOptional<z.ZodNumber>;
        category: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["open", "mitigated", "closed", "draft", "pending"]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        treatment_plan: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        risk_type: z.ZodOptional<z.ZodString>;
        inherent_score: z.ZodOptional<z.ZodNumber>;
        residual_score: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "pending" | "closed" | "draft" | "open" | "mitigated";
        title?: string;
        owner?: string;
        treatment_plan?: string;
        category?: string;
        likelihood?: number;
        impact?: number;
        risk_type?: string;
        inherent_score?: number;
        residual_score?: number;
    }, {
        description?: string;
        status?: "pending" | "closed" | "draft" | "open" | "mitigated";
        title?: string;
        owner?: string;
        treatment_plan?: string;
        category?: string;
        likelihood?: number;
        impact?: number;
        risk_type?: string;
        inherent_score?: number;
        residual_score?: number;
    }>;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        likelihood: z.ZodOptional<z.ZodNumber>;
        impact: z.ZodOptional<z.ZodNumber>;
        category: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["open", "mitigated", "closed", "draft", "pending"]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        treatment_plan: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        disposition_reason: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "pending" | "closed" | "draft" | "open" | "mitigated";
        title?: string;
        owner?: string;
        treatment_plan?: string;
        disposition_reason?: string;
        category?: string;
        likelihood?: number;
        impact?: number;
    }, {
        description?: string;
        status?: "pending" | "closed" | "draft" | "open" | "mitigated";
        title?: string;
        owner?: string;
        treatment_plan?: string;
        disposition_reason?: string;
        category?: string;
        likelihood?: number;
        impact?: number;
    }>;
};
export declare const complianceSchemas: {
    createFramework: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        code: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        status: z.ZodDefault<z.ZodEnum<["active", "draft", "deprecated"]>>;
        category: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
        status?: "active" | "draft" | "deprecated";
        code?: string;
        category?: string;
        version?: string;
    }, {
        name?: string;
        description?: string;
        status?: "active" | "draft" | "deprecated";
        code?: string;
        category?: string;
        version?: string;
    }>;
    createControl: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        control_id: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        framework_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
        status: z.ZodDefault<z.ZodEnum<["active", "draft", "ineffective", "effective"]>>;
        frequency: z.ZodOptional<z.ZodEnum<["continuous", "daily", "weekly", "monthly", "quarterly", "annual"]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "active" | "effective" | "draft" | "ineffective";
        title?: string;
        owner?: string;
        control_type?: "preventive" | "detective" | "corrective" | "directive";
        control_id?: string;
        framework_id?: string;
        frequency?: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
    }, {
        description?: string;
        status?: "active" | "effective" | "draft" | "ineffective";
        title?: string;
        owner?: string;
        control_type?: "preventive" | "detective" | "corrective" | "directive";
        control_id?: string;
        framework_id?: string;
        frequency?: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
    }>;
    updateControl: z.ZodObject<{
        title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
        status: z.ZodOptional<z.ZodEnum<["active", "draft", "ineffective", "effective"]>>;
        linked_evidence: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        last_test_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "active" | "effective" | "draft" | "ineffective";
        title?: string;
        owner?: string;
        control_type?: "preventive" | "detective" | "corrective" | "directive";
        linked_evidence?: string;
        last_test_date?: string;
    }, {
        description?: string;
        status?: "active" | "effective" | "draft" | "ineffective";
        title?: string;
        owner?: string;
        control_type?: "preventive" | "detective" | "corrective" | "directive";
        linked_evidence?: string;
        last_test_date?: string;
    }>;
};
export declare const auditSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        action: z.ZodOptional<z.ZodString>;
        actorId: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        entity_type: z.ZodOptional<z.ZodString>;
        entity_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        module: z.ZodOptional<z.ZodString>;
        audit_type: z.ZodOptional<z.ZodEnum<["internal", "external", "compliance", "operational"]>>;
        status: z.ZodDefault<z.ZodEnum<["planned", "in_progress", "completed", "draft"]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "planned" | "in_progress" | "completed" | "draft";
        module?: string;
        action?: string;
        title?: string;
        entity_id?: string;
        owner?: string;
        actorId?: string;
        details?: Record<string, unknown>;
        entity_type?: string;
        audit_type?: "internal" | "compliance" | "external" | "operational";
    }, {
        description?: string;
        status?: "planned" | "in_progress" | "completed" | "draft";
        module?: string;
        action?: string;
        title?: string;
        entity_id?: string;
        owner?: string;
        actorId?: string;
        details?: Record<string, unknown>;
        entity_type?: string;
        audit_type?: "internal" | "compliance" | "external" | "operational";
    }>;
};
export declare const vendorSchemas: {
    create: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        category: z.ZodOptional<z.ZodString>;
        tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        status: z.ZodDefault<z.ZodEnum<["active", "inactive", "pending", "terminated"]>>;
        contact_email: z.ZodOptional<z.ZodString>;
        contact_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        risk_score: z.ZodOptional<z.ZodNumber>;
        contract_start: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        contract_end: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        status?: "active" | "pending" | "inactive" | "terminated";
        tier?: "critical" | "high" | "medium" | "low";
        owner?: string;
        category?: string;
        contact_email?: string;
        contact_name?: string;
        risk_score?: number;
        contract_start?: string;
        contract_end?: string;
    }, {
        name?: string;
        status?: "active" | "pending" | "inactive" | "terminated";
        tier?: "critical" | "high" | "medium" | "low";
        owner?: string;
        category?: string;
        contact_email?: string;
        contact_name?: string;
        risk_score?: number;
        contract_start?: string;
        contract_end?: string;
    }>;
    update: z.ZodObject<{
        name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        category: z.ZodOptional<z.ZodString>;
        tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        status: z.ZodOptional<z.ZodEnum<["active", "inactive", "pending", "terminated"]>>;
        contact_email: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        risk_score: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        status?: "active" | "pending" | "inactive" | "terminated";
        tier?: "critical" | "high" | "medium" | "low";
        owner?: string;
        category?: string;
        contact_email?: string;
        risk_score?: number;
    }, {
        name?: string;
        status?: "active" | "pending" | "inactive" | "terminated";
        tier?: "critical" | "high" | "medium" | "low";
        owner?: string;
        category?: string;
        contact_email?: string;
        risk_score?: number;
    }>;
};
export declare const assetSchemas: {
    create: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
        classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
        criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        status: z.ZodDefault<z.ZodEnum<["active", "inactive", "decommissioned", "draft"]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        location: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
        status?: "active" | "inactive" | "draft" | "decommissioned";
        owner?: string;
        asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
        classification?: "internal" | "restricted" | "public" | "confidential";
        criticality?: "critical" | "high" | "medium" | "low";
        location?: string;
    }, {
        name?: string;
        description?: string;
        status?: "active" | "inactive" | "draft" | "decommissioned";
        owner?: string;
        asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
        classification?: "internal" | "restricted" | "public" | "confidential";
        criticality?: "critical" | "high" | "medium" | "low";
        location?: string;
    }>;
    update: z.ZodObject<{
        name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
        classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
        criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        status: z.ZodOptional<z.ZodEnum<["active", "inactive", "decommissioned", "draft"]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        status?: "active" | "inactive" | "draft" | "decommissioned";
        owner?: string;
        asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
        classification?: "internal" | "restricted" | "public" | "confidential";
        criticality?: "critical" | "high" | "medium" | "low";
    }, {
        name?: string;
        status?: "active" | "inactive" | "draft" | "decommissioned";
        owner?: string;
        asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
        classification?: "internal" | "restricted" | "public" | "confidential";
        criticality?: "critical" | "high" | "medium" | "low";
    }>;
};
export declare const governanceSchemas: {
    createPolicy: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        category: z.ZodOptional<z.ZodString>;
        review_frequency: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "semi-annual", "annual"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "active", "expired", "archived"]>>;
        approved_by: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        review_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "active" | "expired" | "draft" | "archived";
        title?: string;
        owner?: string;
        review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
        approved_by?: string;
        review_date?: string;
        category?: string;
    }, {
        description?: string;
        status?: "active" | "expired" | "draft" | "archived";
        title?: string;
        owner?: string;
        review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
        approved_by?: string;
        review_date?: string;
        category?: string;
    }>;
    updatePolicy: z.ZodObject<{
        title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        review_frequency: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "semi-annual", "annual"]>>;
        status: z.ZodOptional<z.ZodEnum<["draft", "active", "expired", "archived"]>>;
        approved_by: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        review_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "active" | "expired" | "draft" | "archived";
        title?: string;
        owner?: string;
        review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
        approved_by?: string;
        review_date?: string;
    }, {
        description?: string;
        status?: "active" | "expired" | "draft" | "archived";
        title?: string;
        owner?: string;
        review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
        approved_by?: string;
        review_date?: string;
    }>;
};
export declare const evidenceSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        source: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        evidence_type: z.ZodOptional<z.ZodEnum<["document", "screenshot", "log", "report", "certificate", "attestation"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "pending", "approved", "rejected", "expired"]>>;
        control_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        valid_from: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        valid_until: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "pending" | "approved" | "rejected" | "expired" | "draft";
        title?: string;
        source?: string;
        owner?: string;
        control_id?: string;
        evidence_type?: "document" | "attestation" | "report" | "screenshot" | "log" | "certificate";
        valid_from?: string;
        valid_until?: string;
    }, {
        description?: string;
        status?: "pending" | "approved" | "rejected" | "expired" | "draft";
        title?: string;
        source?: string;
        owner?: string;
        control_id?: string;
        evidence_type?: "document" | "attestation" | "report" | "screenshot" | "log" | "certificate";
        valid_from?: string;
        valid_until?: string;
    }>;
};
export declare const bcpSchemas: {
    create: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        plan_type: z.ZodOptional<z.ZodEnum<["bcp", "drp", "incident_response", "crisis_management"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "active", "expired", "testing"]>>;
        rto_hours: z.ZodOptional<z.ZodNumber>;
        rpo_hours: z.ZodOptional<z.ZodNumber>;
        last_tested: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
        status?: "active" | "expired" | "draft" | "testing";
        owner?: string;
        plan_type?: "bcp" | "drp" | "incident_response" | "crisis_management";
        rto_hours?: number;
        rpo_hours?: number;
        last_tested?: string;
    }, {
        name?: string;
        description?: string;
        status?: "active" | "expired" | "draft" | "testing";
        owner?: string;
        plan_type?: "bcp" | "drp" | "incident_response" | "crisis_management";
        rto_hours?: number;
        rpo_hours?: number;
        last_tested?: string;
    }>;
};
export declare const trainingSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        training_type: z.ZodOptional<z.ZodEnum<["awareness", "technical", "compliance", "role_based"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "active", "completed", "archived"]>>;
        due_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        duration_minutes: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "active" | "completed" | "draft" | "archived";
        title?: string;
        owner?: string;
        training_type?: "compliance" | "awareness" | "technical" | "role_based";
        due_date?: string;
        duration_minutes?: number;
    }, {
        description?: string;
        status?: "active" | "completed" | "draft" | "archived";
        title?: string;
        owner?: string;
        training_type?: "compliance" | "awareness" | "technical" | "role_based";
        due_date?: string;
        duration_minutes?: number;
    }>;
};
export declare const privacySchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        assessment_type: z.ZodOptional<z.ZodEnum<["dpia", "pia", "tia", "lia"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "in_progress", "completed", "approved"]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        data_categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "approved" | "in_progress" | "completed" | "draft";
        title?: string;
        owner?: string;
        assessment_type?: "dpia" | "pia" | "tia" | "lia";
        data_categories?: string[];
    }, {
        description?: string;
        status?: "approved" | "in_progress" | "completed" | "draft";
        title?: string;
        owner?: string;
        assessment_type?: "dpia" | "pia" | "tia" | "lia";
        data_categories?: string[];
    }>;
};
export declare const doraSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        assessment_type: z.ZodOptional<z.ZodEnum<["ict_risk", "incident_reporting", "resilience_testing", "third_party"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "in_progress", "completed", "approved"]>>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "approved" | "in_progress" | "completed" | "draft";
        title?: string;
        owner?: string;
        assessment_type?: "ict_risk" | "incident_reporting" | "resilience_testing" | "third_party";
    }, {
        description?: string;
        status?: "approved" | "in_progress" | "completed" | "draft";
        title?: string;
        owner?: string;
        assessment_type?: "ict_risk" | "incident_reporting" | "resilience_testing" | "third_party";
    }>;
};
export declare const remediationSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        priority: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        status: z.ZodDefault<z.ZodEnum<["open", "in_progress", "completed", "overdue", "cancelled"]>>;
        due_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        source_type: z.ZodOptional<z.ZodString>;
        source_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "in_progress" | "completed" | "cancelled" | "open" | "overdue";
        title?: string;
        priority?: "critical" | "high" | "medium" | "low";
        owner?: string;
        due_date?: string;
        source_type?: string;
        source_id?: string;
    }, {
        description?: string;
        status?: "in_progress" | "completed" | "cancelled" | "open" | "overdue";
        title?: string;
        priority?: "critical" | "high" | "medium" | "low";
        owner?: string;
        due_date?: string;
        source_type?: string;
        source_id?: string;
    }>;
};
export declare const incidentSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        status: z.ZodDefault<z.ZodEnum<["open", "investigating", "contained", "resolved", "closed"]>>;
        reporter: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        category: z.ZodOptional<z.ZodString>;
        root_cause: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        resolution: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        status?: "closed" | "open" | "resolved" | "investigating" | "contained";
        severity?: "critical" | "high" | "medium" | "low";
        title?: string;
        root_cause?: string;
        resolution?: string;
        category?: string;
        reporter?: string;
    }, {
        description?: string;
        status?: "closed" | "open" | "resolved" | "investigating" | "contained";
        severity?: "critical" | "high" | "medium" | "low";
        title?: string;
        root_cause?: string;
        resolution?: string;
        category?: string;
        reporter?: string;
    }>;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        status: z.ZodOptional<z.ZodEnum<["open", "investigating", "contained", "resolved", "closed"]>>;
        root_cause: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        resolution: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        status?: "closed" | "open" | "resolved" | "investigating" | "contained";
        severity?: "critical" | "high" | "medium" | "low";
        title?: string;
        root_cause?: string;
        resolution?: string;
    }, {
        status?: "closed" | "open" | "resolved" | "investigating" | "contained";
        severity?: "critical" | "high" | "medium" | "low";
        title?: string;
        root_cause?: string;
        resolution?: string;
    }>;
};
export declare const workflowSchemas: {
    create: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        workflow_type: z.ZodOptional<z.ZodEnum<["approval", "review", "notification", "automation", "custom"]>>;
        status: z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "archived"]>>;
        trigger: z.ZodOptional<z.ZodString>;
        steps: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
        status?: "active" | "draft" | "archived" | "paused";
        steps?: Record<string, unknown>[];
        trigger?: string;
        owner?: string;
        workflow_type?: "notification" | "automation" | "custom" | "approval" | "review";
    }, {
        name?: string;
        description?: string;
        status?: "active" | "draft" | "archived" | "paused";
        steps?: Record<string, unknown>[];
        trigger?: string;
        owner?: string;
        workflow_type?: "notification" | "automation" | "custom" | "approval" | "review";
    }>;
};
export declare const notificationSchemas: {
    create: z.ZodObject<{
        type: z.ZodEnum<["email", "in_app", "sms", "webhook"]>;
        subject: z.ZodEffects<z.ZodString, string, string>;
        body: z.ZodString;
        recipient_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        recipient_email: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodEnum<["high", "normal", "low"]>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type?: "email" | "in_app" | "sms" | "webhook";
        metadata?: Record<string, unknown>;
        body?: string;
        priority?: "high" | "low" | "normal";
        subject?: string;
        recipient_id?: string;
        recipient_email?: string;
    }, {
        type?: "email" | "in_app" | "sms" | "webhook";
        metadata?: Record<string, unknown>;
        body?: string;
        priority?: "high" | "low" | "normal";
        subject?: string;
        recipient_id?: string;
        recipient_email?: string;
    }>;
};
export declare const tenantSchemas: {
    create: z.ZodObject<{
        tenant_code: z.ZodString;
        tenant_name_en: z.ZodEffects<z.ZodString, string, string>;
        tenant_name_ar: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        org_name: z.ZodEffects<z.ZodString, string, string>;
        industry: z.ZodOptional<z.ZodString>;
        org_size: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timezone?: string;
        tenant_code?: string;
        tenant_name_en?: string;
        tenant_name_ar?: string;
        org_name?: string;
        industry?: string;
        org_size?: string;
        country?: string;
    }, {
        timezone?: string;
        tenant_code?: string;
        tenant_name_en?: string;
        tenant_name_ar?: string;
        org_name?: string;
        industry?: string;
        org_size?: string;
        country?: string;
    }>;
    update: z.ZodObject<{
        tenant_name_en: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        tenant_name_ar: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        org_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        industry: z.ZodOptional<z.ZodString>;
        org_size: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["active", "suspended", "deactivated"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: "active" | "suspended" | "deactivated";
        tenant_name_en?: string;
        tenant_name_ar?: string;
        org_name?: string;
        industry?: string;
        org_size?: string;
    }, {
        status?: "active" | "suspended" | "deactivated";
        tenant_name_en?: string;
        tenant_name_ar?: string;
        org_name?: string;
        industry?: string;
        org_size?: string;
    }>;
};
export declare const userSchemas: {
    create: z.ZodObject<{
        email: z.ZodString;
        name: z.ZodEffects<z.ZodString, string, string>;
        full_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        password: z.ZodOptional<z.ZodString>;
        role_code: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["active", "inactive", "pending"]>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        status?: "active" | "pending" | "inactive";
        password?: string;
        email?: string;
        full_name?: string;
        role_code?: string;
    }, {
        name?: string;
        status?: "active" | "pending" | "inactive";
        password?: string;
        email?: string;
        full_name?: string;
        role_code?: string;
    }>;
    update: z.ZodObject<{
        name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        full_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        email: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["active", "inactive", "pending"]>>;
        role_code: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        status?: "active" | "pending" | "inactive";
        email?: string;
        full_name?: string;
        role_code?: string;
    }, {
        name?: string;
        status?: "active" | "pending" | "inactive";
        email?: string;
        full_name?: string;
        role_code?: string;
    }>;
};
export declare const analyticsSchemas: {
    createDashboard: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        layout: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        visibility: z.ZodDefault<z.ZodEnum<["private", "shared", "public"]>>;
        widgets: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
        widgets?: Record<string, unknown>[];
        layout?: Record<string, unknown>;
        visibility?: "shared" | "public" | "private";
    }, {
        name?: string;
        description?: string;
        widgets?: Record<string, unknown>[];
        layout?: Record<string, unknown>;
        visibility?: "shared" | "public" | "private";
    }>;
    createWidget: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        widget_type: z.ZodOptional<z.ZodEnum<["chart", "table", "kpi", "map", "gauge", "list"]>>;
        data_source: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        config?: Record<string, unknown>;
        widget_type?: "table" | "map" | "chart" | "kpi" | "gauge" | "list";
        data_source?: string;
    }, {
        name?: string;
        config?: Record<string, unknown>;
        widget_type?: "table" | "map" | "chart" | "kpi" | "gauge" | "list";
        data_source?: string;
    }>;
};
export declare const qiyasSchemas: {
    create: z.ZodObject<{
        title: z.ZodEffects<z.ZodString, string, string>;
        maturity_model: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["draft", "in_progress", "completed"]>>;
        target_level: z.ZodOptional<z.ZodNumber>;
        current_level: z.ZodOptional<z.ZodNumber>;
        owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        status?: "in_progress" | "completed" | "draft";
        title?: string;
        owner?: string;
        maturity_model?: string;
        target_level?: number;
        current_level?: number;
    }, {
        status?: "in_progress" | "completed" | "draft";
        title?: string;
        owner?: string;
        maturity_model?: string;
        target_level?: number;
        current_level?: number;
    }>;
};
export declare const onboardingSchemas: {
    start: z.ZodObject<{
        tenant_code: z.ZodString;
        org_name: z.ZodEffects<z.ZodString, string, string>;
        admin_email: z.ZodString;
        admin_name: z.ZodEffects<z.ZodString, string, string>;
        industry: z.ZodOptional<z.ZodString>;
        org_size: z.ZodOptional<z.ZodString>;
        selected_modules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        product_code: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenant_code?: string;
        org_name?: string;
        industry?: string;
        org_size?: string;
        admin_email?: string;
        admin_name?: string;
        selected_modules?: string[];
        product_code?: string;
    }, {
        tenant_code?: string;
        org_name?: string;
        industry?: string;
        org_size?: string;
        admin_email?: string;
        admin_name?: string;
        selected_modules?: string[];
        product_code?: string;
    }>;
};
export declare const riskFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    likelihood_min: z.ZodOptional<z.ZodNumber>;
    likelihood_max: z.ZodOptional<z.ZodNumber>;
    impact_min: z.ZodOptional<z.ZodNumber>;
    impact_max: z.ZodOptional<z.ZodNumber>;
    risk_type: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    risk_type?: string;
    likelihood_min?: number;
    likelihood_max?: number;
    impact_min?: number;
    impact_max?: number;
}, {
    status?: string;
    module?: string;
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    risk_type?: string;
    likelihood_min?: number;
    likelihood_max?: number;
    impact_min?: number;
    impact_max?: number;
}>;
export declare const complianceFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    framework_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
    effectiveness: z.ZodOptional<z.ZodEnum<["effective", "ineffective", "not_tested"]>>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    search?: string;
    owner?: string;
    control_type?: "preventive" | "detective" | "corrective" | "directive";
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    framework_id?: string;
    effectiveness?: "effective" | "ineffective" | "not_tested";
}, {
    status?: string;
    module?: string;
    search?: string;
    owner?: string;
    control_type?: "preventive" | "detective" | "corrective" | "directive";
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    framework_id?: string;
    effectiveness?: "effective" | "ineffective" | "not_tested";
}>;
export declare const auditFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    audit_type: z.ZodOptional<z.ZodEnum<["internal", "external", "compliance", "operational"]>>;
    entity_type: z.ZodOptional<z.ZodString>;
    entity_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    actor_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    entity_id?: string;
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    entity_type?: string;
    audit_type?: "internal" | "compliance" | "external" | "operational";
    actor_id?: string;
}, {
    status?: string;
    module?: string;
    entity_id?: string;
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    entity_type?: string;
    audit_type?: "internal" | "compliance" | "external" | "operational";
    actor_id?: string;
}>;
export declare const vendorFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    contract_active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    tier?: "critical" | "high" | "medium" | "low";
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    contract_active?: boolean;
}, {
    status?: string;
    module?: string;
    tier?: "critical" | "high" | "medium" | "low";
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    contract_active?: boolean;
}>;
export declare const assetFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
    classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
    criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
    classification?: "internal" | "restricted" | "public" | "confidential";
    criticality?: "critical" | "high" | "medium" | "low";
}, {
    status?: string;
    module?: string;
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
    classification?: "internal" | "restricted" | "public" | "confidential";
    criticality?: "critical" | "high" | "medium" | "low";
}>;
export declare const incidentFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    reported_after: z.ZodOptional<z.ZodString>;
    reported_before: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    severity?: "critical" | "high" | "medium" | "low";
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    reported_after?: string;
    reported_before?: string;
}, {
    status?: string;
    module?: string;
    severity?: "critical" | "high" | "medium" | "low";
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    reported_after?: string;
    reported_before?: string;
}>;
export declare const remediationFilterQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    status: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    createdAfter: z.ZodOptional<z.ZodString>;
    createdBefore: z.ZodOptional<z.ZodString>;
    updatedAfter: z.ZodOptional<z.ZodString>;
    updatedBefore: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodString>;
} & {
    priority: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    overdue_only: z.ZodOptional<z.ZodBoolean>;
    source_type: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
    module?: string;
    priority?: "critical" | "high" | "medium" | "low";
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    source_type?: string;
    overdue_only?: boolean;
}, {
    status?: string;
    module?: string;
    priority?: "critical" | "high" | "medium" | "low";
    search?: string;
    owner?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    category?: string;
    tags?: string;
    source_type?: string;
    overdue_only?: boolean;
}>;
export declare const filterSchemas: {
    risk: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        likelihood_min: z.ZodOptional<z.ZodNumber>;
        likelihood_max: z.ZodOptional<z.ZodNumber>;
        impact_min: z.ZodOptional<z.ZodNumber>;
        impact_max: z.ZodOptional<z.ZodNumber>;
        risk_type: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        risk_type?: string;
        likelihood_min?: number;
        likelihood_max?: number;
        impact_min?: number;
        impact_max?: number;
    }, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        risk_type?: string;
        likelihood_min?: number;
        likelihood_max?: number;
        impact_min?: number;
        impact_max?: number;
    }>;
    compliance: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        framework_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
        effectiveness: z.ZodOptional<z.ZodEnum<["effective", "ineffective", "not_tested"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        control_type?: "preventive" | "detective" | "corrective" | "directive";
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        framework_id?: string;
        effectiveness?: "effective" | "ineffective" | "not_tested";
    }, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        control_type?: "preventive" | "detective" | "corrective" | "directive";
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        framework_id?: string;
        effectiveness?: "effective" | "ineffective" | "not_tested";
    }>;
    audit: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        audit_type: z.ZodOptional<z.ZodEnum<["internal", "external", "compliance", "operational"]>>;
        entity_type: z.ZodOptional<z.ZodString>;
        entity_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        actor_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        entity_id?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        entity_type?: string;
        audit_type?: "internal" | "compliance" | "external" | "operational";
        actor_id?: string;
    }, {
        status?: string;
        module?: string;
        entity_id?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        entity_type?: string;
        audit_type?: "internal" | "compliance" | "external" | "operational";
        actor_id?: string;
    }>;
    vendor: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        contract_active: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        tier?: "critical" | "high" | "medium" | "low";
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        contract_active?: boolean;
    }, {
        status?: string;
        module?: string;
        tier?: "critical" | "high" | "medium" | "low";
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        contract_active?: boolean;
    }>;
    asset: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
        classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
        criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
        classification?: "internal" | "restricted" | "public" | "confidential";
        criticality?: "critical" | "high" | "medium" | "low";
    }, {
        status?: string;
        module?: string;
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
        classification?: "internal" | "restricted" | "public" | "confidential";
        criticality?: "critical" | "high" | "medium" | "low";
    }>;
    incident: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        reported_after: z.ZodOptional<z.ZodString>;
        reported_before: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        severity?: "critical" | "high" | "medium" | "low";
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        reported_after?: string;
        reported_before?: string;
    }, {
        status?: string;
        module?: string;
        severity?: "critical" | "high" | "medium" | "low";
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        reported_after?: string;
        reported_before?: string;
    }>;
    remediation: z.ZodObject<{
        page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        status: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        createdAfter: z.ZodOptional<z.ZodString>;
        createdBefore: z.ZodOptional<z.ZodString>;
        updatedAfter: z.ZodOptional<z.ZodString>;
        updatedBefore: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodString>;
    } & {
        priority: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        overdue_only: z.ZodOptional<z.ZodBoolean>;
        source_type: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: string;
        module?: string;
        priority?: "critical" | "high" | "medium" | "low";
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        source_type?: string;
        overdue_only?: boolean;
    }, {
        status?: string;
        module?: string;
        priority?: "critical" | "high" | "medium" | "low";
        search?: string;
        owner?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        createdAfter?: string;
        createdBefore?: string;
        updatedAfter?: string;
        updatedBefore?: string;
        category?: string;
        tags?: string;
        source_type?: string;
        overdue_only?: boolean;
    }>;
};
export declare const allSchemas: {
    common: {
        uuid: z.ZodUnion<[z.ZodString, z.ZodString]>;
        isoDate: z.ZodUnion<[z.ZodString, z.ZodString]>;
        nonEmpty: z.ZodEffects<z.ZodString, string, string>;
        status: z.ZodOptional<z.ZodEnum<["active", "inactive", "draft", "archived", "pending", "closed", "open", "mitigated", "resolved", "deleted"]>>;
        paginationQuery: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
        }, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
        }>;
        idParams: z.ZodObject<{
            id: z.ZodUnion<[z.ZodString, z.ZodString]>;
        }, "strip", z.ZodTypeAny, {
            id?: string;
        }, {
            id?: string;
        }>;
        dateRange: z.ZodEffects<z.ZodObject<{
            from: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            to: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            from?: string;
            to?: string;
        }, {
            from?: string;
            to?: string;
        }>, {
            from?: string;
            to?: string;
        }, {
            from?: string;
            to?: string;
        }>;
        bulkAction: z.ZodObject<{
            ids: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodString]>, "many">;
            action: z.ZodEnum<["delete", "archive", "activate", "deactivate", "export", "assign"]>;
            assignTo: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            assignTo?: string;
            action?: "delete" | "archive" | "activate" | "deactivate" | "export" | "assign";
            ids?: string[];
        }, {
            assignTo?: string;
            action?: "delete" | "archive" | "activate" | "deactivate" | "export" | "assign";
            ids?: string[];
        }>;
        exportQuery: z.ZodObject<{
            format: z.ZodDefault<z.ZodEnum<["csv", "xlsx", "pdf", "json"]>>;
            columns: z.ZodOptional<z.ZodString>;
            dateRange: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            format?: "csv" | "xlsx" | "pdf" | "json";
            columns?: string;
            dateRange?: string;
        }, {
            status?: string;
            format?: "csv" | "xlsx" | "pdf" | "json";
            columns?: string;
            dateRange?: string;
        }>;
        safeStr: typeof safeStr;
        optSafeStr: typeof optSafeStr;
        piiStr: typeof piiStr;
        optPiiStr: typeof optPiiStr;
        piiEmail: typeof piiEmail;
        optPiiEmail: typeof optPiiEmail;
    };
    risk: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            likelihood: z.ZodOptional<z.ZodNumber>;
            impact: z.ZodOptional<z.ZodNumber>;
            category: z.ZodOptional<z.ZodString>;
            status: z.ZodDefault<z.ZodEnum<["open", "mitigated", "closed", "draft", "pending"]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            treatment_plan: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            risk_type: z.ZodOptional<z.ZodString>;
            inherent_score: z.ZodOptional<z.ZodNumber>;
            residual_score: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "pending" | "closed" | "draft" | "open" | "mitigated";
            title?: string;
            owner?: string;
            treatment_plan?: string;
            category?: string;
            likelihood?: number;
            impact?: number;
            risk_type?: string;
            inherent_score?: number;
            residual_score?: number;
        }, {
            description?: string;
            status?: "pending" | "closed" | "draft" | "open" | "mitigated";
            title?: string;
            owner?: string;
            treatment_plan?: string;
            category?: string;
            likelihood?: number;
            impact?: number;
            risk_type?: string;
            inherent_score?: number;
            residual_score?: number;
        }>;
        update: z.ZodObject<{
            title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            likelihood: z.ZodOptional<z.ZodNumber>;
            impact: z.ZodOptional<z.ZodNumber>;
            category: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["open", "mitigated", "closed", "draft", "pending"]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            treatment_plan: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            disposition_reason: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "pending" | "closed" | "draft" | "open" | "mitigated";
            title?: string;
            owner?: string;
            treatment_plan?: string;
            disposition_reason?: string;
            category?: string;
            likelihood?: number;
            impact?: number;
        }, {
            description?: string;
            status?: "pending" | "closed" | "draft" | "open" | "mitigated";
            title?: string;
            owner?: string;
            treatment_plan?: string;
            disposition_reason?: string;
            category?: string;
            likelihood?: number;
            impact?: number;
        }>;
    };
    compliance: {
        createFramework: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            code: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            status: z.ZodDefault<z.ZodEnum<["active", "draft", "deprecated"]>>;
            category: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            description?: string;
            status?: "active" | "draft" | "deprecated";
            code?: string;
            category?: string;
            version?: string;
        }, {
            name?: string;
            description?: string;
            status?: "active" | "draft" | "deprecated";
            code?: string;
            category?: string;
            version?: string;
        }>;
        createControl: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            control_id: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            framework_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
            status: z.ZodDefault<z.ZodEnum<["active", "draft", "ineffective", "effective"]>>;
            frequency: z.ZodOptional<z.ZodEnum<["continuous", "daily", "weekly", "monthly", "quarterly", "annual"]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "active" | "effective" | "draft" | "ineffective";
            title?: string;
            owner?: string;
            control_type?: "preventive" | "detective" | "corrective" | "directive";
            control_id?: string;
            framework_id?: string;
            frequency?: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
        }, {
            description?: string;
            status?: "active" | "effective" | "draft" | "ineffective";
            title?: string;
            owner?: string;
            control_type?: "preventive" | "detective" | "corrective" | "directive";
            control_id?: string;
            framework_id?: string;
            frequency?: "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annual";
        }>;
        updateControl: z.ZodObject<{
            title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
            status: z.ZodOptional<z.ZodEnum<["active", "draft", "ineffective", "effective"]>>;
            linked_evidence: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            last_test_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "active" | "effective" | "draft" | "ineffective";
            title?: string;
            owner?: string;
            control_type?: "preventive" | "detective" | "corrective" | "directive";
            linked_evidence?: string;
            last_test_date?: string;
        }, {
            description?: string;
            status?: "active" | "effective" | "draft" | "ineffective";
            title?: string;
            owner?: string;
            control_type?: "preventive" | "detective" | "corrective" | "directive";
            linked_evidence?: string;
            last_test_date?: string;
        }>;
    };
    audit: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            action: z.ZodOptional<z.ZodString>;
            actorId: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            entity_type: z.ZodOptional<z.ZodString>;
            entity_id: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            module: z.ZodOptional<z.ZodString>;
            audit_type: z.ZodOptional<z.ZodEnum<["internal", "external", "compliance", "operational"]>>;
            status: z.ZodDefault<z.ZodEnum<["planned", "in_progress", "completed", "draft"]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "planned" | "in_progress" | "completed" | "draft";
            module?: string;
            action?: string;
            title?: string;
            entity_id?: string;
            owner?: string;
            actorId?: string;
            details?: Record<string, unknown>;
            entity_type?: string;
            audit_type?: "internal" | "compliance" | "external" | "operational";
        }, {
            description?: string;
            status?: "planned" | "in_progress" | "completed" | "draft";
            module?: string;
            action?: string;
            title?: string;
            entity_id?: string;
            owner?: string;
            actorId?: string;
            details?: Record<string, unknown>;
            entity_type?: string;
            audit_type?: "internal" | "compliance" | "external" | "operational";
        }>;
    };
    vendor: {
        create: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            category: z.ZodOptional<z.ZodString>;
            tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            status: z.ZodDefault<z.ZodEnum<["active", "inactive", "pending", "terminated"]>>;
            contact_email: z.ZodOptional<z.ZodString>;
            contact_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            risk_score: z.ZodOptional<z.ZodNumber>;
            contract_start: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            contract_end: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            status?: "active" | "pending" | "inactive" | "terminated";
            tier?: "critical" | "high" | "medium" | "low";
            owner?: string;
            category?: string;
            contact_email?: string;
            contact_name?: string;
            risk_score?: number;
            contract_start?: string;
            contract_end?: string;
        }, {
            name?: string;
            status?: "active" | "pending" | "inactive" | "terminated";
            tier?: "critical" | "high" | "medium" | "low";
            owner?: string;
            category?: string;
            contact_email?: string;
            contact_name?: string;
            risk_score?: number;
            contract_start?: string;
            contract_end?: string;
        }>;
        update: z.ZodObject<{
            name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            category: z.ZodOptional<z.ZodString>;
            tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            status: z.ZodOptional<z.ZodEnum<["active", "inactive", "pending", "terminated"]>>;
            contact_email: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            risk_score: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            status?: "active" | "pending" | "inactive" | "terminated";
            tier?: "critical" | "high" | "medium" | "low";
            owner?: string;
            category?: string;
            contact_email?: string;
            risk_score?: number;
        }, {
            name?: string;
            status?: "active" | "pending" | "inactive" | "terminated";
            tier?: "critical" | "high" | "medium" | "low";
            owner?: string;
            category?: string;
            contact_email?: string;
            risk_score?: number;
        }>;
    };
    asset: {
        create: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
            classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
            criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            status: z.ZodDefault<z.ZodEnum<["active", "inactive", "decommissioned", "draft"]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            location: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            description?: string;
            status?: "active" | "inactive" | "draft" | "decommissioned";
            owner?: string;
            asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
            classification?: "internal" | "restricted" | "public" | "confidential";
            criticality?: "critical" | "high" | "medium" | "low";
            location?: string;
        }, {
            name?: string;
            description?: string;
            status?: "active" | "inactive" | "draft" | "decommissioned";
            owner?: string;
            asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
            classification?: "internal" | "restricted" | "public" | "confidential";
            criticality?: "critical" | "high" | "medium" | "low";
            location?: string;
        }>;
        update: z.ZodObject<{
            name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
            classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
            criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            status: z.ZodOptional<z.ZodEnum<["active", "inactive", "decommissioned", "draft"]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            status?: "active" | "inactive" | "draft" | "decommissioned";
            owner?: string;
            asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
            classification?: "internal" | "restricted" | "public" | "confidential";
            criticality?: "critical" | "high" | "medium" | "low";
        }, {
            name?: string;
            status?: "active" | "inactive" | "draft" | "decommissioned";
            owner?: string;
            asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
            classification?: "internal" | "restricted" | "public" | "confidential";
            criticality?: "critical" | "high" | "medium" | "low";
        }>;
    };
    governance: {
        createPolicy: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            category: z.ZodOptional<z.ZodString>;
            review_frequency: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "semi-annual", "annual"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "expired", "archived"]>>;
            approved_by: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            review_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "active" | "expired" | "draft" | "archived";
            title?: string;
            owner?: string;
            review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
            approved_by?: string;
            review_date?: string;
            category?: string;
        }, {
            description?: string;
            status?: "active" | "expired" | "draft" | "archived";
            title?: string;
            owner?: string;
            review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
            approved_by?: string;
            review_date?: string;
            category?: string;
        }>;
        updatePolicy: z.ZodObject<{
            title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            review_frequency: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "semi-annual", "annual"]>>;
            status: z.ZodOptional<z.ZodEnum<["draft", "active", "expired", "archived"]>>;
            approved_by: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            review_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "active" | "expired" | "draft" | "archived";
            title?: string;
            owner?: string;
            review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
            approved_by?: string;
            review_date?: string;
        }, {
            description?: string;
            status?: "active" | "expired" | "draft" | "archived";
            title?: string;
            owner?: string;
            review_frequency?: "monthly" | "quarterly" | "annual" | "semi-annual";
            approved_by?: string;
            review_date?: string;
        }>;
    };
    evidence: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            source: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            evidence_type: z.ZodOptional<z.ZodEnum<["document", "screenshot", "log", "report", "certificate", "attestation"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "pending", "approved", "rejected", "expired"]>>;
            control_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            valid_from: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            valid_until: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "pending" | "approved" | "rejected" | "expired" | "draft";
            title?: string;
            source?: string;
            owner?: string;
            control_id?: string;
            evidence_type?: "document" | "attestation" | "report" | "screenshot" | "log" | "certificate";
            valid_from?: string;
            valid_until?: string;
        }, {
            description?: string;
            status?: "pending" | "approved" | "rejected" | "expired" | "draft";
            title?: string;
            source?: string;
            owner?: string;
            control_id?: string;
            evidence_type?: "document" | "attestation" | "report" | "screenshot" | "log" | "certificate";
            valid_from?: string;
            valid_until?: string;
        }>;
    };
    bcp: {
        create: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            plan_type: z.ZodOptional<z.ZodEnum<["bcp", "drp", "incident_response", "crisis_management"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "expired", "testing"]>>;
            rto_hours: z.ZodOptional<z.ZodNumber>;
            rpo_hours: z.ZodOptional<z.ZodNumber>;
            last_tested: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            description?: string;
            status?: "active" | "expired" | "draft" | "testing";
            owner?: string;
            plan_type?: "bcp" | "drp" | "incident_response" | "crisis_management";
            rto_hours?: number;
            rpo_hours?: number;
            last_tested?: string;
        }, {
            name?: string;
            description?: string;
            status?: "active" | "expired" | "draft" | "testing";
            owner?: string;
            plan_type?: "bcp" | "drp" | "incident_response" | "crisis_management";
            rto_hours?: number;
            rpo_hours?: number;
            last_tested?: string;
        }>;
    };
    training: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            training_type: z.ZodOptional<z.ZodEnum<["awareness", "technical", "compliance", "role_based"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "completed", "archived"]>>;
            due_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            duration_minutes: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "active" | "completed" | "draft" | "archived";
            title?: string;
            owner?: string;
            training_type?: "compliance" | "awareness" | "technical" | "role_based";
            due_date?: string;
            duration_minutes?: number;
        }, {
            description?: string;
            status?: "active" | "completed" | "draft" | "archived";
            title?: string;
            owner?: string;
            training_type?: "compliance" | "awareness" | "technical" | "role_based";
            due_date?: string;
            duration_minutes?: number;
        }>;
    };
    privacy: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            assessment_type: z.ZodOptional<z.ZodEnum<["dpia", "pia", "tia", "lia"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "in_progress", "completed", "approved"]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            data_categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "approved" | "in_progress" | "completed" | "draft";
            title?: string;
            owner?: string;
            assessment_type?: "dpia" | "pia" | "tia" | "lia";
            data_categories?: string[];
        }, {
            description?: string;
            status?: "approved" | "in_progress" | "completed" | "draft";
            title?: string;
            owner?: string;
            assessment_type?: "dpia" | "pia" | "tia" | "lia";
            data_categories?: string[];
        }>;
    };
    dora: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            assessment_type: z.ZodOptional<z.ZodEnum<["ict_risk", "incident_reporting", "resilience_testing", "third_party"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "in_progress", "completed", "approved"]>>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "approved" | "in_progress" | "completed" | "draft";
            title?: string;
            owner?: string;
            assessment_type?: "ict_risk" | "incident_reporting" | "resilience_testing" | "third_party";
        }, {
            description?: string;
            status?: "approved" | "in_progress" | "completed" | "draft";
            title?: string;
            owner?: string;
            assessment_type?: "ict_risk" | "incident_reporting" | "resilience_testing" | "third_party";
        }>;
    };
    remediation: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            priority: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            status: z.ZodDefault<z.ZodEnum<["open", "in_progress", "completed", "overdue", "cancelled"]>>;
            due_date: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            source_type: z.ZodOptional<z.ZodString>;
            source_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "in_progress" | "completed" | "cancelled" | "open" | "overdue";
            title?: string;
            priority?: "critical" | "high" | "medium" | "low";
            owner?: string;
            due_date?: string;
            source_type?: string;
            source_id?: string;
        }, {
            description?: string;
            status?: "in_progress" | "completed" | "cancelled" | "open" | "overdue";
            title?: string;
            priority?: "critical" | "high" | "medium" | "low";
            owner?: string;
            due_date?: string;
            source_type?: string;
            source_id?: string;
        }>;
    };
    incident: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            status: z.ZodDefault<z.ZodEnum<["open", "investigating", "contained", "resolved", "closed"]>>;
            reporter: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            category: z.ZodOptional<z.ZodString>;
            root_cause: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            resolution: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            status?: "closed" | "open" | "resolved" | "investigating" | "contained";
            severity?: "critical" | "high" | "medium" | "low";
            title?: string;
            root_cause?: string;
            resolution?: string;
            category?: string;
            reporter?: string;
        }, {
            description?: string;
            status?: "closed" | "open" | "resolved" | "investigating" | "contained";
            severity?: "critical" | "high" | "medium" | "low";
            title?: string;
            root_cause?: string;
            resolution?: string;
            category?: string;
            reporter?: string;
        }>;
        update: z.ZodObject<{
            title: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            status: z.ZodOptional<z.ZodEnum<["open", "investigating", "contained", "resolved", "closed"]>>;
            root_cause: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            resolution: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            status?: "closed" | "open" | "resolved" | "investigating" | "contained";
            severity?: "critical" | "high" | "medium" | "low";
            title?: string;
            root_cause?: string;
            resolution?: string;
        }, {
            status?: "closed" | "open" | "resolved" | "investigating" | "contained";
            severity?: "critical" | "high" | "medium" | "low";
            title?: string;
            root_cause?: string;
            resolution?: string;
        }>;
    };
    workflow: {
        create: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            workflow_type: z.ZodOptional<z.ZodEnum<["approval", "review", "notification", "automation", "custom"]>>;
            status: z.ZodDefault<z.ZodEnum<["draft", "active", "paused", "archived"]>>;
            trigger: z.ZodOptional<z.ZodString>;
            steps: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            description?: string;
            status?: "active" | "draft" | "archived" | "paused";
            steps?: Record<string, unknown>[];
            trigger?: string;
            owner?: string;
            workflow_type?: "notification" | "automation" | "custom" | "approval" | "review";
        }, {
            name?: string;
            description?: string;
            status?: "active" | "draft" | "archived" | "paused";
            steps?: Record<string, unknown>[];
            trigger?: string;
            owner?: string;
            workflow_type?: "notification" | "automation" | "custom" | "approval" | "review";
        }>;
    };
    notification: {
        create: z.ZodObject<{
            type: z.ZodEnum<["email", "in_app", "sms", "webhook"]>;
            subject: z.ZodEffects<z.ZodString, string, string>;
            body: z.ZodString;
            recipient_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            recipient_email: z.ZodOptional<z.ZodString>;
            priority: z.ZodDefault<z.ZodEnum<["high", "normal", "low"]>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            type?: "email" | "in_app" | "sms" | "webhook";
            metadata?: Record<string, unknown>;
            body?: string;
            priority?: "high" | "low" | "normal";
            subject?: string;
            recipient_id?: string;
            recipient_email?: string;
        }, {
            type?: "email" | "in_app" | "sms" | "webhook";
            metadata?: Record<string, unknown>;
            body?: string;
            priority?: "high" | "low" | "normal";
            subject?: string;
            recipient_id?: string;
            recipient_email?: string;
        }>;
    };
    tenant: {
        create: z.ZodObject<{
            tenant_code: z.ZodString;
            tenant_name_en: z.ZodEffects<z.ZodString, string, string>;
            tenant_name_ar: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            org_name: z.ZodEffects<z.ZodString, string, string>;
            industry: z.ZodOptional<z.ZodString>;
            org_size: z.ZodOptional<z.ZodString>;
            country: z.ZodOptional<z.ZodString>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            timezone?: string;
            tenant_code?: string;
            tenant_name_en?: string;
            tenant_name_ar?: string;
            org_name?: string;
            industry?: string;
            org_size?: string;
            country?: string;
        }, {
            timezone?: string;
            tenant_code?: string;
            tenant_name_en?: string;
            tenant_name_ar?: string;
            org_name?: string;
            industry?: string;
            org_size?: string;
            country?: string;
        }>;
        update: z.ZodObject<{
            tenant_name_en: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            tenant_name_ar: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            org_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            industry: z.ZodOptional<z.ZodString>;
            org_size: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["active", "suspended", "deactivated"]>>;
        }, "strip", z.ZodTypeAny, {
            status?: "active" | "suspended" | "deactivated";
            tenant_name_en?: string;
            tenant_name_ar?: string;
            org_name?: string;
            industry?: string;
            org_size?: string;
        }, {
            status?: "active" | "suspended" | "deactivated";
            tenant_name_en?: string;
            tenant_name_ar?: string;
            org_name?: string;
            industry?: string;
            org_size?: string;
        }>;
    };
    user: {
        create: z.ZodObject<{
            email: z.ZodString;
            name: z.ZodEffects<z.ZodString, string, string>;
            full_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            password: z.ZodOptional<z.ZodString>;
            role_code: z.ZodOptional<z.ZodString>;
            status: z.ZodDefault<z.ZodEnum<["active", "inactive", "pending"]>>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            status?: "active" | "pending" | "inactive";
            password?: string;
            email?: string;
            full_name?: string;
            role_code?: string;
        }, {
            name?: string;
            status?: "active" | "pending" | "inactive";
            password?: string;
            email?: string;
            full_name?: string;
            role_code?: string;
        }>;
        update: z.ZodObject<{
            name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            full_name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            email: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<["active", "inactive", "pending"]>>;
            role_code: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            status?: "active" | "pending" | "inactive";
            email?: string;
            full_name?: string;
            role_code?: string;
        }, {
            name?: string;
            status?: "active" | "pending" | "inactive";
            email?: string;
            full_name?: string;
            role_code?: string;
        }>;
    };
    analytics: {
        createDashboard: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            layout: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            visibility: z.ZodDefault<z.ZodEnum<["private", "shared", "public"]>>;
            widgets: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            description?: string;
            widgets?: Record<string, unknown>[];
            layout?: Record<string, unknown>;
            visibility?: "shared" | "public" | "private";
        }, {
            name?: string;
            description?: string;
            widgets?: Record<string, unknown>[];
            layout?: Record<string, unknown>;
            visibility?: "shared" | "public" | "private";
        }>;
        createWidget: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            widget_type: z.ZodOptional<z.ZodEnum<["chart", "table", "kpi", "map", "gauge", "list"]>>;
            data_source: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            config?: Record<string, unknown>;
            widget_type?: "table" | "map" | "chart" | "kpi" | "gauge" | "list";
            data_source?: string;
        }, {
            name?: string;
            config?: Record<string, unknown>;
            widget_type?: "table" | "map" | "chart" | "kpi" | "gauge" | "list";
            data_source?: string;
        }>;
    };
    qiyas: {
        create: z.ZodObject<{
            title: z.ZodEffects<z.ZodString, string, string>;
            maturity_model: z.ZodOptional<z.ZodString>;
            status: z.ZodDefault<z.ZodEnum<["draft", "in_progress", "completed"]>>;
            target_level: z.ZodOptional<z.ZodNumber>;
            current_level: z.ZodOptional<z.ZodNumber>;
            owner: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            status?: "in_progress" | "completed" | "draft";
            title?: string;
            owner?: string;
            maturity_model?: string;
            target_level?: number;
            current_level?: number;
        }, {
            status?: "in_progress" | "completed" | "draft";
            title?: string;
            owner?: string;
            maturity_model?: string;
            target_level?: number;
            current_level?: number;
        }>;
    };
    onboarding: {
        start: z.ZodObject<{
            tenant_code: z.ZodString;
            org_name: z.ZodEffects<z.ZodString, string, string>;
            admin_email: z.ZodString;
            admin_name: z.ZodEffects<z.ZodString, string, string>;
            industry: z.ZodOptional<z.ZodString>;
            org_size: z.ZodOptional<z.ZodString>;
            selected_modules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            product_code: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            tenant_code?: string;
            org_name?: string;
            industry?: string;
            org_size?: string;
            admin_email?: string;
            admin_name?: string;
            selected_modules?: string[];
            product_code?: string;
        }, {
            tenant_code?: string;
            org_name?: string;
            industry?: string;
            org_size?: string;
            admin_email?: string;
            admin_name?: string;
            selected_modules?: string[];
            product_code?: string;
        }>;
    };
    filters: {
        risk: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            likelihood_min: z.ZodOptional<z.ZodNumber>;
            likelihood_max: z.ZodOptional<z.ZodNumber>;
            impact_min: z.ZodOptional<z.ZodNumber>;
            impact_max: z.ZodOptional<z.ZodNumber>;
            risk_type: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            risk_type?: string;
            likelihood_min?: number;
            likelihood_max?: number;
            impact_min?: number;
            impact_max?: number;
        }, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            risk_type?: string;
            likelihood_min?: number;
            likelihood_max?: number;
            impact_min?: number;
            impact_max?: number;
        }>;
        compliance: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            framework_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            control_type: z.ZodOptional<z.ZodEnum<["preventive", "detective", "corrective", "directive"]>>;
            effectiveness: z.ZodOptional<z.ZodEnum<["effective", "ineffective", "not_tested"]>>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            control_type?: "preventive" | "detective" | "corrective" | "directive";
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            framework_id?: string;
            effectiveness?: "effective" | "ineffective" | "not_tested";
        }, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            control_type?: "preventive" | "detective" | "corrective" | "directive";
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            framework_id?: string;
            effectiveness?: "effective" | "ineffective" | "not_tested";
        }>;
        audit: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            audit_type: z.ZodOptional<z.ZodEnum<["internal", "external", "compliance", "operational"]>>;
            entity_type: z.ZodOptional<z.ZodString>;
            entity_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            actor_id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            entity_id?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            entity_type?: string;
            audit_type?: "internal" | "compliance" | "external" | "operational";
            actor_id?: string;
        }, {
            status?: string;
            module?: string;
            entity_id?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            entity_type?: string;
            audit_type?: "internal" | "compliance" | "external" | "operational";
            actor_id?: string;
        }>;
        vendor: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            tier: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            contract_active: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            tier?: "critical" | "high" | "medium" | "low";
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            contract_active?: boolean;
        }, {
            status?: string;
            module?: string;
            tier?: "critical" | "high" | "medium" | "low";
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            contract_active?: boolean;
        }>;
        asset: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            asset_type: z.ZodOptional<z.ZodEnum<["hardware", "software", "data", "network", "personnel", "facility", "service"]>>;
            classification: z.ZodOptional<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
            criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
            classification?: "internal" | "restricted" | "public" | "confidential";
            criticality?: "critical" | "high" | "medium" | "low";
        }, {
            status?: string;
            module?: string;
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            asset_type?: "service" | "data" | "hardware" | "software" | "network" | "personnel" | "facility";
            classification?: "internal" | "restricted" | "public" | "confidential";
            criticality?: "critical" | "high" | "medium" | "low";
        }>;
        incident: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            reported_after: z.ZodOptional<z.ZodString>;
            reported_before: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            severity?: "critical" | "high" | "medium" | "low";
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            reported_after?: string;
            reported_before?: string;
        }, {
            status?: string;
            module?: string;
            severity?: "critical" | "high" | "medium" | "low";
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            reported_after?: string;
            reported_before?: string;
        }>;
        remediation: z.ZodObject<{
            page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            search: z.ZodOptional<z.ZodString>;
            sortBy: z.ZodOptional<z.ZodString>;
            sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
            status: z.ZodOptional<z.ZodString>;
            module: z.ZodOptional<z.ZodString>;
            createdAfter: z.ZodOptional<z.ZodString>;
            createdBefore: z.ZodOptional<z.ZodString>;
            updatedAfter: z.ZodOptional<z.ZodString>;
            updatedBefore: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodString>;
        } & {
            priority: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
            overdue_only: z.ZodOptional<z.ZodBoolean>;
            source_type: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status?: string;
            module?: string;
            priority?: "critical" | "high" | "medium" | "low";
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            source_type?: string;
            overdue_only?: boolean;
        }, {
            status?: string;
            module?: string;
            priority?: "critical" | "high" | "medium" | "low";
            search?: string;
            owner?: string;
            page?: number;
            pageSize?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            createdAfter?: string;
            createdBefore?: string;
            updatedAfter?: string;
            updatedBefore?: string;
            category?: string;
            tags?: string;
            source_type?: string;
            overdue_only?: boolean;
        }>;
    };
};
export {};
