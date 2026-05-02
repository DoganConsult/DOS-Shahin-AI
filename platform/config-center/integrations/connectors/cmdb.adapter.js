"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMDBAdapter = void 0;
const base_adapter_1 = require("./base.adapter");
class CMDBAdapter extends base_adapter_1.BaseAdapter {
    async authenticate(config) {
        const { apiKey, apiUrl } = config.credentials;
        const url = apiUrl || 'http://localhost';
        const response = await fetch(`${url}/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
            body: JSON.stringify({ grant_type: 'api_key' }),
        });
        if (!response.ok) {
            throw new Error(`CMDB auth failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json());
        const expiresAt = new Date(Date.now() + 3600000).toISOString();
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
        const params = new URLSearchParams();
        if (query?.limit)
            params.set('limit', String(query.limit));
        if (query?.offset)
            params.set('offset', String(query.offset));
        const response = await fetch(`${url}/api/cmdb/assets?${params}`, {
            headers: { Authorization: `Bearer ${this.token?.token}` },
        });
        if (!response.ok) {
            throw new Error(`CMDB extract failed: ${response.status}`);
        }
        const data = (await response.json());
        const records = data.items || data.data || [];
        return { records, metadata: { total: data.total, offset: data.offset } };
    }
    map(raw, fieldMapping) {
        return raw.map((record) => ({
            controlId: (fieldMapping?.controlId && record[fieldMapping.controlId]) || record.control_id || '',
            evidenceType: 'cmdb_asset',
            sourceSystem: 'cmdb',
            collectionTimestamp: new Date().toISOString(),
            connectorVersion: '1.0.0',
            data: record,
            metadata: {
                assetId: record.sys_id || record.id || record.asset_id,
                assetClass: record.sys_class_name || record.asset_class,
            },
        }));
    }
}
exports.CMDBAdapter = CMDBAdapter;
