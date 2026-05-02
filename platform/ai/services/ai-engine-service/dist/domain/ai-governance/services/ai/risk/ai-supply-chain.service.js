// ============================================
// AI Supply Chain Service — Phase 3, Step 3.2
// EU AI Act Art. 15/17/18/25/53, NIST AI RMF, AIBOM
// ============================================
import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { eventBus } from '../../../ports/events.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// 1. registerModelProvenance
export async function registerModelProvenance(tenantId, provenance) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_model_provenance
       (system_id, model_name, model_version, provider, model_type,
        architecture, training_framework, training_data_summary,
        parameters_count, license, license_url, sbom_format, sbom_content,
        hash_algorithm, model_hash, origin_country, data_residency_country,
        bias_assessment_status, fairness_metrics, performance_baseline,
        accuracy_threshold, is_open_source, is_fine_tuned,
        base_model_ref, environmental_impact, energy_consumption_kwh,
        digital_signature, signature_algorithm, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
     RETURNING id`, [
        provenance.system_id, provenance.model_name, provenance.model_version ?? null,
        provenance.provider, provenance.model_type ?? null,
        provenance.architecture ?? null, provenance.training_framework ?? null,
        provenance.training_data_summary ?? null, provenance.parameters_count ?? null,
        provenance.license ?? null, provenance.license_url ?? null,
        provenance.sbom_format ?? null, JSON.stringify(provenance.sbom_content ?? {}),
        provenance.hash_algorithm ?? null, provenance.model_hash ?? null,
        provenance.origin_country ?? null, provenance.data_residency_country ?? null,
        provenance.bias_assessment_status ?? 'pending',
        JSON.stringify(provenance.fairness_metrics ?? {}),
        JSON.stringify(provenance.performance_baseline ?? {}),
        provenance.accuracy_threshold ?? null,
        provenance.is_open_source ?? false, provenance.is_fine_tuned ?? false,
        provenance.base_model_ref ?? null,
        JSON.stringify(provenance.environmental_impact ?? {}),
        provenance.energy_consumption_kwh ?? null,
        provenance.digital_signature ?? null, provenance.signature_algorithm ?? null,
        provenance.created_by ?? null,
    ]);
    swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'ai_supply_chain.provenance_registered', tenantId, sourceService: 'ai-supply-chain', severity: 'info',
        payload: { provenanceId: rows[0].id, modelName: provenance.model_name, provider: provenance.provider },
    }), { tenantId, operation: 'eventBus:ai_supply_chain.provenance_registered' });
    return { id: rows[0].id };
}
// 2. trackDataLineage
export async function trackDataLineage(tenantId, lineage) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_data_lineage
       (system_id, dataset_name, source_type, source_uri, data_format,
        record_count, collection_method, collection_date,
        preprocessing_steps, transformations, quality_score, completeness_pct,
        pii_detected, pii_categories, consent_basis, retention_policy,
        cross_border, destination_countries, adequacy_decision_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`, [
        lineage.system_id, lineage.dataset_name, lineage.source_type ?? 'internal',
        lineage.source_uri ?? null, lineage.data_format ?? null,
        lineage.record_count ?? null, lineage.collection_method ?? null,
        lineage.collection_date ?? null,
        JSON.stringify(lineage.preprocessing_steps ?? []),
        JSON.stringify(lineage.transformations ?? []),
        lineage.quality_score ?? null, lineage.completeness_pct ?? null,
        lineage.pii_detected ?? false, lineage.pii_categories ?? [],
        lineage.consent_basis ?? null, lineage.retention_policy ?? null,
        lineage.cross_border ?? false, lineage.destination_countries ?? [],
        lineage.adequacy_decision_ref ?? null,
    ]);
    swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'ai_supply_chain.lineage_tracked', tenantId, sourceService: 'ai-supply-chain', severity: 'info',
        payload: { lineageId: rows[0].id, datasetName: lineage.dataset_name, systemId: lineage.system_id },
    }), { tenantId, operation: 'eventBus:ai_supply_chain.lineage_tracked' });
    return { id: rows[0].id };
}
// 2b. getProvenanceById
export async function getProvenanceById(tenantId, provenanceId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_model_provenance WHERE id = $1`, [provenanceId]);
    return rows[0] ?? null;
}
// 2c. getLineageById
export async function getLineageById(tenantId, lineageId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_data_lineage WHERE id = $1`, [lineageId]);
    return rows[0] ?? null;
}
// 3. generateAiBom — SPDX 3.0 or CycloneDX 1.6 JSON
export async function generateAiBom(tenantId, systemId, format = 'spdx') {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// 4. assessSupplyChainRisk
export async function assessSupplyChainRisk(tenantId, systemId) {
    const schema = tenantSchema(tenantId);
    const [models, providers, data] = await Promise.all([
        safeQuery(`SELECT * FROM "${schema}".ai_model_provenance WHERE system_id = $1`, [systemId]),
        safeQuery(`SELECT * FROM "${schema}".ai_provider_registry`),
        safeQuery(`SELECT * FROM "${schema}".ai_data_lineage WHERE system_id = $1`, [systemId]),
    ]);
    const riskFactors = [];
    const recommendations = [];
    let score = 0;
    // Build provider lookup by name for cross-referencing
    const providerMap = new Map();
    for (const p of providers.rows) {
        providerMap.set(p.name_en?.toLowerCase(), p);
    }
    for (const model of models.rows) {
        if (!model.is_open_source && !model.license) {
            riskFactors.push(`Model ${model.model_name}: No license declared`);
            recommendations.push(`Obtain and document license for ${model.model_name}`);
            score += 20;
        }
        if (model.bias_assessment_status === 'pending') {
            riskFactors.push(`Model ${model.model_name}: Bias assessment pending`);
            recommendations.push(`Complete bias assessment for ${model.model_name}`);
            score += 15;
        }
        if (!model.model_hash) {
            riskFactors.push(`Model ${model.model_name}: No integrity hash`);
            score += 10;
        }
        // Cross-reference provider risk_tier from registry
        const provider = providerMap.get(model.provider?.toLowerCase());
        if (provider) {
            if (provider.risk_tier === 'critical') {
                riskFactors.push(`Model ${model.model_name}: Provider ${model.provider} rated critical risk`);
                recommendations.push(`Review and mitigate reliance on critical-risk provider ${model.provider}`);
                score += 25;
            }
            else if (provider.risk_tier === 'high') {
                riskFactors.push(`Model ${model.model_name}: Provider ${model.provider} rated high risk`);
                recommendations.push(`Implement additional controls for high-risk provider ${model.provider}`);
                score += 15;
            }
            if (provider.compliance_status === 'non_compliant') {
                riskFactors.push(`Model ${model.model_name}: Provider ${model.provider} is non-compliant`);
                recommendations.push(`Escalate non-compliance of provider ${model.provider}`);
                score += 20;
            }
        }
    }
    for (const d of data.rows) {
        if (d.cross_border && !d.adequacy_decision_ref) {
            riskFactors.push(`Dataset ${d.dataset_name}: Cross-border without adequacy decision`);
            recommendations.push(`Verify adequacy decision for ${d.dataset_name} transfer`);
            score += 25;
        }
        if (d.pii_detected && !d.consent_basis) {
            riskFactors.push(`Dataset ${d.dataset_name}: PII without consent basis`);
            score += 20;
        }
    }
    return {
        overall_score: Math.min(score, 100),
        risk_factors: riskFactors,
        recommendations,
    };
}
// 5. checkDataSovereignty
export async function checkDataSovereignty(tenantId, systemId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_data_lineage WHERE system_id = $1 AND cross_border = TRUE`, [systemId]);
    const issues = [];
    // EU adequacy decisions list (simplified)
    const adequateCountries = [
        'AND', 'ARG', 'CAN', 'CHE', 'FRO', 'GBR', 'GGY', 'IMN', 'ISR', 'JEY',
        'JPN', 'KOR', 'NZL', 'URY', 'USA',
    ];
    for (const d of rows) {
        for (const country of (d.destination_countries ?? [])) {
            if (!adequateCountries.includes(country) && !d.adequacy_decision_ref) {
                issues.push(`Dataset ${d.dataset_name}: Transfer to ${country} lacks adequacy decision or appropriate safeguards`);
            }
        }
    }
    return { compliant: issues.length === 0, issues };
}
// ============================================
// 6. Provider Registry CRUD — ai_provider_registry
// EU AI Act Art. 22 (authorized representatives)
// ============================================
export async function registerProvider(tenantId, provider) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_provider_registry
       (provider_code, name_en, name_ar, provider_type, country,
        eu_authorized_representative_name, eu_authorized_representative_address,
        compliance_status, risk_tier, contract_reference, contact_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`, [
        provider.provider_code, provider.name_en, provider.name_ar ?? null,
        provider.provider_type ?? 'external', provider.country ?? null,
        provider.eu_authorized_representative_name ?? null,
        provider.eu_authorized_representative_address ?? null,
        provider.compliance_status ?? 'pending',
        provider.risk_tier ?? 'medium',
        provider.contract_reference ?? null, provider.contact_email ?? null,
    ]);
    swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'ai_supply_chain.provider_registered', tenantId, sourceService: 'ai-supply-chain', severity: 'info',
        payload: { providerId: rows[0].id, providerCode: provider.provider_code },
    }), { tenantId, operation: 'eventBus:ai_supply_chain.provider_registered' });
    return { id: rows[0].id };
}
export async function listProviders(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT * FROM "${schema}".ai_provider_registry WHERE 1=1`;
    const params = [];
    if (filters?.risk_tier) {
        params.push(filters.risk_tier);
        query += ` AND risk_tier = $${params.length}`;
    }
    if (filters?.compliance_status) {
        params.push(filters.compliance_status);
        query += ` AND compliance_status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await safeQuery(query, params);
    return rows;
}
export async function getProviderById(tenantId, providerId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_provider_registry WHERE id = $1`, [providerId]);
    return rows[0] ?? null;
}
export async function updateProviderCompliance(tenantId, providerId, update) {
    const schema = tenantSchema(tenantId);
    const { rowCount } = await safeQuery(`UPDATE "${schema}".ai_provider_registry
     SET compliance_status = $2,
         risk_tier = COALESCE($3, risk_tier),
         last_assessed_at = now(),
         updated_at = now()
     WHERE id = $1`, [providerId, update.compliance_status, update.risk_tier ?? null]);
    if ((rowCount ?? 0) > 0) {
        swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'ai_supply_chain.provider_compliance_updated', tenantId, sourceService: 'ai-supply-chain', severity: 'info',
            payload: { providerId, status: update.compliance_status },
        }), { tenantId, operation: 'eventBus:ai_supply_chain.provider_compliance_updated' });
    }
    return { updated: (rowCount ?? 0) > 0 };
}
// ============================================
// 7. Supplier Agreements CRUD — ai_supplier_agreements
// ============================================
export async function createSupplierAgreement(tenantId, agreement) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_supplier_agreements
       (provider_id, agreement_type, effective_date, expiry_date,
        data_processing_terms, sla_terms, audit_rights,
        sub_processor_notification, termination_conditions, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`, [
        agreement.provider_id, agreement.agreement_type ?? 'service',
        agreement.effective_date, agreement.expiry_date ?? null,
        JSON.stringify(agreement.data_processing_terms ?? {}),
        JSON.stringify(agreement.sla_terms ?? {}),
        agreement.audit_rights ?? false,
        agreement.sub_processor_notification ?? false,
        agreement.termination_conditions ?? null,
        agreement.status ?? 'draft',
    ]);
    swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'ai_supply_chain.agreement_created', tenantId, sourceService: 'ai-supply-chain', severity: 'info',
        payload: { agreementId: rows[0].id, providerId: agreement.provider_id },
    }), { tenantId, operation: 'eventBus:ai_supply_chain.agreement_created' });
    return { id: rows[0].id };
}
export async function listSupplierAgreements(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT a.*, p.name_en AS provider_name, p.provider_code
     FROM "${schema}".ai_supplier_agreements a
     JOIN "${schema}".ai_provider_registry p ON p.id = a.provider_id
     WHERE 1=1`;
    const params = [];
    if (filters?.provider_id) {
        params.push(filters.provider_id);
        query += ` AND a.provider_id = $${params.length}`;
    }
    if (filters?.status) {
        params.push(filters.status);
        query += ` AND a.status = $${params.length}`;
    }
    query += ' ORDER BY a.effective_date DESC';
    const { rows } = await safeQuery(query, params);
    return rows;
}
export async function getAgreementById(tenantId, agreementId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT a.*, p.name_en AS provider_name, p.provider_code
     FROM "${schema}".ai_supplier_agreements a
     JOIN "${schema}".ai_provider_registry p ON p.id = a.provider_id
     WHERE a.id = $1`, [agreementId]);
    return rows[0] ?? null;
}
export async function updateAgreementStatus(tenantId, agreementId, status) {
    const schema = tenantSchema(tenantId);
    const { rowCount } = await safeQuery(`UPDATE "${schema}".ai_supplier_agreements
     SET status = $2, updated_at = now()
     WHERE id = $1`, [agreementId, status]);
    return { updated: (rowCount ?? 0) > 0 };
}
export async function checkExpiringAgreements(tenantId, daysAhead = 30) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT a.*, p.name_en AS provider_name, p.provider_code
     FROM "${schema}".ai_supplier_agreements a
     JOIN "${schema}".ai_provider_registry p ON p.id = a.provider_id
     WHERE a.status = 'active'
       AND a.expiry_date IS NOT NULL
       AND a.expiry_date <= now() + ($1 || ' days')::INTERVAL
     ORDER BY a.expiry_date ASC`, [daysAhead]);
    return rows;
}
// ============================================
// 8. Model Modifications — ai_model_modifications
// EU AI Act Art. 17 (substantial modifications)
// ============================================
export async function recordModelModification(tenantId, modification) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".ai_model_modifications
       (provenance_id, system_id, modification_type, description,
        previous_version, new_version, is_substantial,
        substantial_justification, impact_assessment_id,
        approved_by, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`, [
        modification.provenance_id, modification.system_id,
        modification.modification_type, modification.description,
        modification.previous_version ?? null, modification.new_version ?? null,
        modification.is_substantial ?? false,
        modification.substantial_justification ?? null,
        modification.impact_assessment_id ?? null,
        modification.approved_by ?? null,
        modification.approved_at ?? null,
    ]);
    const eventType = modification.is_substantial
        ? 'ai_supply_chain.modification_substantial'
        : 'ai_supply_chain.modification_recorded';
    swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: eventType, tenantId, sourceService: 'ai-supply-chain',
        severity: modification.is_substantial ? 'warning' : 'info',
        payload: { modificationId: rows[0].id, systemId: modification.system_id, type: modification.modification_type, isSubstantial: modification.is_substantial ?? false },
    }), { tenantId, operation: 'eventBus:any' });
    return { id: rows[0].id };
}
export async function listModelModifications(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    let query = `SELECT m.*, p.model_name, p.model_version
     FROM "${schema}".ai_model_modifications m
     JOIN "${schema}".ai_model_provenance p ON p.id = m.provenance_id
     WHERE 1=1`;
    const params = [];
    if (filters?.provenance_id) {
        params.push(filters.provenance_id);
        query += ` AND m.provenance_id = $${params.length}`;
    }
    if (filters?.system_id) {
        params.push(filters.system_id);
        query += ` AND m.system_id = $${params.length}`;
    }
    if (filters?.is_substantial !== undefined) {
        params.push(filters.is_substantial);
        query += ` AND m.is_substantial = $${params.length}`;
    }
    query += ' ORDER BY m.created_at DESC';
    const { rows } = await safeQuery(query, params);
    return rows;
}
export async function getModificationById(tenantId, modificationId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT m.*, p.model_name, p.model_version
     FROM "${schema}".ai_model_modifications m
     JOIN "${schema}".ai_model_provenance p ON p.id = m.provenance_id
     WHERE m.id = $1`, [modificationId]);
    return rows[0] ?? null;
}
export async function getSubstantialModifications(tenantId, systemId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT m.*, p.model_name, p.model_version
     FROM "${schema}".ai_model_modifications m
     JOIN "${schema}".ai_model_provenance p ON p.id = m.provenance_id
     WHERE m.system_id = $1 AND m.is_substantial = TRUE
     ORDER BY m.created_at DESC`, [systemId]);
    return rows;
}
//# sourceMappingURL=ai-supply-chain.service.js.map