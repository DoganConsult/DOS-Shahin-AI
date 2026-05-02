"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPoints = searchPoints;
const QDRANT_URL = process.env['QDRANT_URL'] || 'http://localhost:6333';
const QDRANT_API_KEY = process.env['QDRANT_API_KEY'] || '';
function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (QDRANT_API_KEY)
        headers['api-key'] = QDRANT_API_KEY;
    return headers;
}
async function searchPoints(options) {
    const { collection, vector, limit = 10, offset, filter, withPayload = true, withVector = false, scoreThreshold, params, } = options;
    const body = {
        vector,
        limit,
        with_payload: withPayload,
        with_vector: withVector,
    };
    if (offset !== undefined)
        body.offset = offset;
    if (filter)
        body.filter = filter;
    if (scoreThreshold !== undefined)
        body.score_threshold = scoreThreshold;
    if (params)
        body.params = params;
    const response = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(collection)}/points/search`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Qdrant search failed for collection "${collection}": ${response.status} ${text}`);
    }
    const data = (await response.json());
    return data.result ?? [];
}
//# sourceMappingURL=qdrant.connector.js.map