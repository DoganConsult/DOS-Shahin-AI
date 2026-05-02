"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.M365Connector = void 0;
const base_adapter_1 = require("./base.adapter");
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
class M365Connector extends base_adapter_1.BaseAdapter {
    async authenticate(config) {
        const { tenantId, clientId, clientSecret } = config.credentials;
        if (!tenantId || !clientId || !clientSecret) {
            throw new Error('M365 connector requires tenantId, clientId, and clientSecret');
        }
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
        });
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!response.ok) {
            const err = (await response.text());
            throw new Error(`M365 auth failed: ${response.status} ${err}`);
        }
        const data = (await response.json());
        const expiresIn = data.expires_in || 3600;
        this.token = {
            token: data.access_token,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            tokenType: data.token_type,
        };
        return this.token;
    }
    async extract(config, query) {
        if (this.isTokenExpired())
            await this.authenticate(config);
        const resource = query?.resource || 'users';
        const top = query?.limit || 100;
        let endpoint;
        if (resource === 'users') {
            endpoint = `${GRAPH_BASE}/users?$top=${top}&$select=id,displayName,userPrincipalName,accountEnabled,createdDateTime,lastSignInDateTime`;
        }
        else if (resource === 'groups') {
            endpoint = `${GRAPH_BASE}/groups?$top=${top}`;
        }
        else if (resource === 'auditLogs') {
            endpoint = `${GRAPH_BASE}/auditLogs/signIns?$top=${top}`;
        }
        else if (resource === 'mailboxes') {
            endpoint = `${GRAPH_BASE}/users?$top=${top}&$select=id,displayName,mail,mailboxSettings`;
        }
        else {
            endpoint = `${GRAPH_BASE}/${resource}?$top=${top}`;
        }
        const records = [];
        let nextLink = endpoint;
        while (nextLink) {
            const response = await fetch(nextLink, {
                headers: { Authorization: `Bearer ${this.token?.token}`, 'Content-Type': 'application/json' },
            });
            if (!response.ok)
                throw new Error(`M365 extract failed: ${response.status}`);
            const data = (await response.json());
            const items = data.value || [];
            records.push(...items);
            nextLink = data['@odata.nextLink'] || null;
            if (records.length >= Number(top))
                break;
        }
        return { records, metadata: { resource, count: records.length } };
    }
    map(raw, fieldMapping) {
        return raw.map((record) => ({
            controlId: (fieldMapping?.controlId && record[fieldMapping.controlId]) || record.control_id || '',
            evidenceType: 'm365_identity',
            sourceSystem: 'm365',
            collectionTimestamp: new Date().toISOString(),
            connectorVersion: '1.0.0',
            data: record,
            metadata: {
                userId: record.id,
                upn: record.userPrincipalName,
                displayName: record.displayName,
                accountEnabled: record.accountEnabled,
                lastSignIn: record.lastSignInDateTime,
            },
        }));
    }
}
exports.M365Connector = M365Connector;
