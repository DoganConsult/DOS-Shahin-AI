// @ts-nocheck
// ================================================================
// AGRC-OS — AI Retrieval-Augmented Generation (RAG) Service
// Extracts text from evidence/policy documents stored in the DB
// and uses Claude to answer user queries about document content.
// ================================================================
import { logger } from '../../ports/logger.port.js';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
export async function analyzeDocumentWithRAG(tenantId, documentId, query) {
    logger.info(`[RAG Service] Analyzing document ${documentId} for query: "${query}"`);
    const schema = tenantSchema(tenantId);
    // 1. Try to fetch document content from evidence table
    let docContent = null;
    let docTitle = '';
    let docType = '';
    const evidenceResult = await safeQuery(`SELECT title, description, file_name, file_type, content_text, status, expires_at, created_at
     FROM "${schema}".evidence WHERE evidence_id = $1 LIMIT 1`, [documentId]).catch(() => ({ rows: [] }));
    if (evidenceResult.rows.length > 0) {
        const row = evidenceResult.rows[0];
        docTitle = row.title || row.file_name || '';
        docType = 'evidence';
        docContent = row.content_text || row.description || null;
    }
    // 2. Fall back to policies table
    if (!docContent) {
        const policyResult = await safeQuery(`SELECT title, content, description, status, review_date, version, created_at
       FROM "${schema}".policies WHERE policy_id = $1 LIMIT 1`, [documentId]).catch(() => ({ rows: [] }));
        if (policyResult.rows.length > 0) {
            const row = policyResult.rows[0];
            docTitle = row.title || '';
            docType = 'policy';
            docContent = row.content || row.description || null;
        }
    }
    // 3. Fall back to findings table
    if (!docContent) {
        const findingResult = await safeQuery(`SELECT title, description, details, severity, status, created_at
       FROM "${schema}".findings WHERE finding_id = $1 LIMIT 1`, [documentId]).catch(() => ({ rows: [] }));
        if (findingResult.rows.length > 0) {
            const row = findingResult.rows[0];
            docTitle = row.title || '';
            docType = 'finding';
            docContent = row.description || (typeof row.details === 'string' ? row.details : JSON.stringify(row.details)) || null;
        }
    }
    if (!docContent) {
        return {
            documentId,
            query,
            confidenceScore: 0,
            extractedText: '',
            analysisConclusion: `Document ${documentId} not found in evidence, policies, or findings tables.`,
            source: 'not_found',
        };
    }
    // 4. Use Claude to answer the query from the document content
    try {
        const { callClaude } = await import('../../../config/claude-client');
        const response = await callClaude({
            tenantId,
            agentId: 'RAG',
            systemPrompt: `You are a document analysis assistant. You will be given a ${docType} document titled "${docTitle}" and a specific question. Answer ONLY based on what the document says. If the document does not contain relevant information, say so clearly. Be precise and cite specific sections or phrases from the document.`,
            messages: [
                { role: 'user', content: `Document content:\n---\n${docContent.slice(0, 8000)}\n---\n\nQuestion: ${query}` }
            ],
            temperature: 0.1,
        });
        const answer = response.content || 'Unable to extract an answer from this document.';
        const hasAnswer = !answer.toLowerCase().includes('does not contain') && !answer.toLowerCase().includes('no relevant');
        return {
            documentId,
            query,
            confidenceScore: hasAnswer ? 0.85 : 0.3,
            extractedText: docContent.slice(0, 2000),
            analysisConclusion: answer,
            source: 'db_content',
        };
    }
    catch (err) {
        logger.warn(`[RAG Service] Claude analysis failed for ${documentId}: ${err.message}`);
        // Fall back to keyword-based extraction
        const lowerQuery = query.toLowerCase();
        const lines = docContent.split('\n').filter(line => lowerQuery.split(/\s+/).some(word => word.length > 3 && line.toLowerCase().includes(word)));
        return {
            documentId,
            query,
            confidenceScore: lines.length > 0 ? 0.5 : 0.1,
            extractedText: lines.slice(0, 5).join('\n') || docContent.slice(0, 500),
            analysisConclusion: lines.length > 0
                ? `Found ${lines.length} relevant passage(s) matching your query in "${docTitle}".`
                : `Document "${docTitle}" exists but no passages directly match your query. Full text search returned no hits.`,
            source: 'db_metadata',
        };
    }
}
//# sourceMappingURL=ai-rag-service.js.map