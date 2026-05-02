"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IAMAdapter = void 0;
const base_adapter_1 = require("./base.adapter");
class IAMAdapter extends base_adapter_1.BaseAdapter {
    async authenticate(config) {
        const { apiKey, apiUrl, username, password } = config.credentials;
        const url = apiUrl || 'http://localhost';
        let token;
        let expiresAt;
        if (username && password) {
            const response = await fetch(`${url}/api/v1/authn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (!response.ok)
                throw new Error(`IAM auth failed: ${response.status} ${response.statusText}`);
            const data = (await response.json());
            token = data.sessionToken || data.access_token || '';
            expiresAt = data.expiresAt || new Date(Date.now() + 3600000).toISOString();
        }
        else {
            token = apiKey || '';
            expiresAt = new Date(Date.now() + 3600000).toISOString();
        }
        this.token = { token, expiresAt };
        return this.token;
    }
    async extract(config, query) {
        if (this.isTokenExpired())
            await this.authenticate(config);
        const { apiUrl } = config.credentials;
        const url = apiUrl || 'http://localhost';
        const resource = query?.resource || 'users';
        const params = new URLSearchParams();
        if (query?.limit)
            params.set('limit', String(query.limit));
        if (query?.after)
            params.set('after', String(query.after));
        const response = await fetch(`${url}/api/v1/${resource}?${params}`, {
            headers: {
                Authorization: `SSWS ${this.token?.token}`,
                Accept: 'application/json',
            },
        });
        if (!response.ok)
            throw new Error(`IAM extract failed: ${response.status}`);
        const records = (await response.json());
        return { records: Array.isArray(records) ? records : [], metadata: { resource } };
    }
    map(raw, fieldMapping) {
        return raw.map((record) => ({
            controlId: (fieldMapping?.controlId && record[fieldMapping.controlId]) || record.control_id || '',
            evidenceType: 'iam_user_access',
            sourceSystem: 'iam',
            collectionTimestamp: new Date().toISOString(),
            connectorVersion: '1.0.0',
            data: record,
            metadata: {
                userId: record.id,
                login: record.login || record.profile?.login,
                status: record.status,
                lastLogin: record.lastLogin,
            },
        }));
    }
}
exports.IAMAdapter = IAMAdapter;
