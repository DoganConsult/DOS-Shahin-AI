"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulnAdapter = void 0;
const base_adapter_1 = require("./base.adapter");
class VulnAdapter extends base_adapter_1.BaseAdapter {
    async authenticate(config) {
        const { apiKey, apiUrl, accessKey, secretKey, platform } = config.credentials;
        const url = apiUrl || 'http://localhost';
        if (platform === 'tenable' && accessKey && secretKey) {
            const response = await fetch(`${url}/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ApiKeys': `accessKey=${accessKey}; secretKey=${secretKey}`,
                },
            });
            if (!response.ok)
                throw new Error(`Vuln Tenable auth failed: ${response.status}`);
            this.token = {
                token: `accessKey=${accessKey}; secretKey=${secretKey}`,
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                platform: 'tenable',
                authType: 'apikeys',
            };
        }
        else if (platform === 'qualys') {
            const response = await fetch(`${url}/api/2.0/fo/session/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'curl' },
                body: new URLSearchParams({ action: 'login', username: accessKey || '', password: secretKey || '' }).toString(),
            });
            if (!response.ok)
                throw new Error(`Vuln Qualys auth failed: ${response.status}`);
            const data = (await response.json());
            this.token = {
                token: data.QualysSession || apiKey || '',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                platform: 'qualys',
            };
        }
        else {
            this.token = {
                token: apiKey || '',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
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
        let headers;
        if (platform === 'tenable') {
            const severity = query?.severity || '';
            const params = new URLSearchParams({ limit: String(query?.limit || 100) });
            if (severity)
                params.set('severity', severity);
            endpoint = `${url}/workbenches/vulnerabilities?${params}`;
            headers = { 'X-ApiKeys': this.token?.token || '', Accept: 'application/json' };
        }
        else if (platform === 'qualys') {
            endpoint = `${url}/api/2.0/fo/asset/host/vm/detection/?action=list&show_results=1`;
            headers = { 'X-Requested-With': 'curl', Cookie: `QualysSession=${this.token?.token}` };
        }
        else {
            endpoint = `${url}/api/vulnerabilities?limit=${query?.limit || 100}`;
            headers = { Authorization: `Bearer ${this.token?.token}`, Accept: 'application/json' };
        }
        const response = await fetch(endpoint, { headers });
        if (!response.ok)
            throw new Error(`Vuln extract failed: ${response.status}`);
        const data = (await response.json());
        const records = data.vulnerabilities
            || data.data
            || [];
        return { records: Array.isArray(records) ? records : [], metadata: { platform, count: records.length } };
    }
    map(raw, fieldMapping) {
        return raw.map((record) => ({
            controlId: (fieldMapping?.controlId && record[fieldMapping.controlId]) || record.control_id || '',
            evidenceType: 'vulnerability_finding',
            sourceSystem: 'vuln_scanner',
            collectionTimestamp: new Date().toISOString(),
            connectorVersion: '1.0.0',
            data: record,
            metadata: {
                vulnId: record.plugin_id || record.id || record.vuln_id,
                severity: record.severity,
                cvssScore: record.cvss_base_score || record.cvss,
                hostCount: record.count || record.host_count,
                cve: record.cve,
            },
        }));
    }
}
exports.VulnAdapter = VulnAdapter;
