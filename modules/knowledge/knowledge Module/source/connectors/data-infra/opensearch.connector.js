"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.createIndex = createIndex;
exports.bulkIndex = bulkIndex;
exports.indexDocument = indexDocument;
exports.deleteDocument = deleteDocument;
const OPENSEARCH_URL = process.env['OPENSEARCH_URL'] || 'http://localhost:9200';
const OPENSEARCH_USER = process.env['OPENSEARCH_USER'] || '';
const OPENSEARCH_PASS = process.env['OPENSEARCH_PASS'] || '';
function getAuthHeader() {
    if (OPENSEARCH_USER && OPENSEARCH_PASS) {
        return { Authorization: `Basic ${Buffer.from(`${OPENSEARCH_USER}:${OPENSEARCH_PASS}`).toString('base64')}` };
    }
    return {};
}
async function osRequest(path, method = 'GET', body) {
    const response = await fetch(`${OPENSEARCH_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getAuthHeader(),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenSearch ${method} ${path} failed: ${response.status} ${text}`);
    }
    return response.json();
}
async function search(index, query, options) {
    const body = { query };
    if (options?.size !== undefined)
        body.size = options.size;
    if (options?.from !== undefined)
        body.from = options.from;
    if (options?.sort)
        body.sort = options.sort;
    return osRequest(`/${index}/_search`, 'POST', body);
}
async function createIndex(index, settings, mappings) {
    const body = {};
    if (settings)
        body.settings = settings;
    if (mappings)
        body.mappings = mappings;
    return osRequest(`/${index}`, 'PUT', Object.keys(body).length ? body : undefined);
}
async function bulkIndex(index, documents) {
    const lines = [];
    for (const { id, document } of documents) {
        const action = id
            ? JSON.stringify({ index: { _index: index, _id: id } })
            : JSON.stringify({ index: { _index: index } });
        lines.push(action);
        lines.push(JSON.stringify(document));
    }
    const body = lines.join('\n') + '\n';
    const response = await fetch(`${OPENSEARCH_URL}/_bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson', ...getAuthHeader() },
        body,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenSearch bulk failed: ${response.status} ${text}`);
    }
    return response.json();
}
async function indexDocument(index, id, document) {
    return osRequest(`/${index}/_doc/${encodeURIComponent(id)}`, 'PUT', document);
}
async function deleteDocument(index, id) {
    return osRequest(`/${index}/_doc/${encodeURIComponent(id)}`, 'DELETE');
}
//# sourceMappingURL=opensearch.connector.js.map