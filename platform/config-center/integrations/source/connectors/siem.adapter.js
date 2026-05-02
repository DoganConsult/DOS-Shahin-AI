"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIEMAdapter = void 0;
const base_adapter_1 = require("./base.adapter");
class SIEMAdapter extends base_adapter_1.BaseAdapter {
    async authenticate(config) {
        const { apiKey, apiUrl, username, password, platform } = config.credentials;
        const url = apiUrl || 'http://localhost';
        if (platform === 'splunk' && username && password) {
            const body = new URLSearchParams({ username, password });
            const response = await fetch(`${url}/services/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });
            if (!response.ok)
                throw new Error(`SIEM Splunk auth failed: ${response.status}`);
            const text = await response.text();
            const match = text.match(/<sessionKey>([^<]+)<\/sessionKey>/);
            const token = match ? match[1] : '';
            this.token = { token, expiresAt: new Date(Date.now() + 3600_000).toISOString(), platform: 'splunk' };
        }
        else if (platform === 'elastic') {
            this.token = {
                token: apiKey || Buffer.from(`${username}:${password}`).toString('base64'),
                expiresAt: new Date(Date.now() + 3600_000).toISOString(),
                platform: 'elastic',
            };
        }
        else {
            this.token = {
                token: apiKey || '',
                expiresAt: new Date(Date.now() + 3600_000).toISOString(),
                platform: platform || 'generic',
            };
        }
        return this.token;
    }
    async extract(config, query) {
        if (this.isTokenExpired())
            await this.authenticate(config);
        const { apiUrl, platform } = config.credentials;
        const url = apiUrl || 'http://localhost';
        let endpoint;
        let authHeader;
        let body;
        if (platform === 'splunk') {
            const search = query?.search || 'search index=* earliest=-24h | head 100';
            endpoint = `${url}/services/search/jobs/export?output_mode=json&search=${encodeURIComponent(search)}`;
            authHeader = `Splunk ${this.token?.token}`;
        }
        else if (platform === 'elastic') {
            const index = query?.index || '*';
            endpoint = `${url}/${index}/_search`;
            authHeader = `ApiKey ${this.token?.token}`;
            body = JSON.stringify({ size: query?.limit || 100, query: { match_all: {} } });
        }
        else {
            endpoint = `${url}/api/alerts?limit=${query?.limit || 100}`;
            authHeader = `Bearer ${this.token?.token}`;
        }
        const fetchOptions = {
            headers: { Authorization: authHeader, Accept: 'application/json', 'Content-Type': 'application/json' },
        };
        if (body) {
            fetchOptions.method = 'POST';
            fetchOptions.body = body;
        }
        const response = await fetch(endpoint, fetchOptions);
        if (!response.ok)
            throw new Error(`SIEM extract failed: ${response.status}`);
        const data = (await response.json());
        const records = data.hits?.hits
            || data.results
            || data.data
            || [];
        return { records: Array.isArray(records) ? records : [], metadata: { platform, count: records.length } };
    }
    map(raw, fieldMapping) {
        return raw.map((record) => {
            const source = record._source || record;
            return {
                controlId: (fieldMapping?.controlId && record[fieldMapping.controlId]) || record.control_id || '',
                evidenceType: 'siem_alert',
                sourceSystem: 'siem',
                collectionTimestamp: new Date().toISOString(),
                connectorVersion: '1.0.0',
                data: source,
                metadata: {
                    alertId: record._id || source.id || source.alert_id,
                    severity: source.severity || source.risk_level,
                    timestamp: source['@timestamp'] || source.timestamp,
                    category: source.category || source.event_type,
                },
            };
        });
    }
}
exports.SIEMAdapter = SIEMAdapter;
//# sourceMappingURL=siem.adapter.js.map