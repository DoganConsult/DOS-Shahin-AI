"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERPAdapter = void 0;
const base_adapter_1 = require("./base.adapter");
class ERPAdapter extends base_adapter_1.BaseAdapter {
    async authenticate(config) {
        const { apiKey, apiUrl, clientId, clientSecret } = config.credentials;
        const url = apiUrl || 'http://localhost';
        const body = clientId
            ? JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
            : JSON.stringify({ grant_type: 'api_key', api_key: apiKey });
        const response = await fetch(`${url}/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        if (!response.ok) {
            throw new Error(`ERP auth failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json());
        const expiresAt = new Date(Date.now() + 3600_000).toISOString();
        this.token = {
            token: data.access_token || apiKey || '',
            expiresAt: data.expires_at || expiresAt,
        };
        return this.token;
    }
    async extract(config, query) {
        if (this.isTokenExpired())
            await this.authenticate(config);
        const { apiUrl } = config.credentials;
        const url = apiUrl || 'http://localhost';
        const module = query?.module || 'user_access';
        const params = new URLSearchParams();
        if (query?.limit)
            params.set('$top', String(query.limit));
        if (query?.offset)
            params.set('$skip', String(query.offset));
        const response = await fetch(`${url}/api/erp/${module}?${params}`, {
            headers: { Authorization: `Bearer ${this.token?.token}` },
        });
        if (!response.ok) {
            throw new Error(`ERP extract failed: ${response.status}`);
        }
        const data = (await response.json());
        const records = data.value || data.data || [];
        return { records, metadata: { total: data['@odata.count'], module } };
    }
    map(raw, fieldMapping) {
        return raw.map((record) => ({
            controlId: (fieldMapping?.controlId && record[fieldMapping.controlId]) || record.control_id || '',
            evidenceType: 'erp_access_review',
            sourceSystem: 'erp',
            collectionTimestamp: new Date().toISOString(),
            connectorVersion: '1.0.0',
            data: record,
            metadata: {
                userId: record.UserId || record.user_id || record.id,
                role: record.Role || record.role,
                module: record.Module || record.module,
            },
        }));
    }
}
exports.ERPAdapter = ERPAdapter;
//# sourceMappingURL=erp.adapter.js.map