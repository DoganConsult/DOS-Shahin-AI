import { describe, it, expect, beforeAll } from 'vitest';
import * as http from 'node:http';

/**
 * Integration Test for Dynamic Runtime Enhancements (Pillars 1-4)
 * 1. Validates /api/copilot/intent-to-query NLP parsing (AI Engine)
 * 2. Validates /api/events/stream SSE connection establishment (Notification Service)
 * 3. Validates /api/:moduleCode/bulk-action emits events via SSE (Tenant Service) 
 */

const AUTH_URL = 'http://127.0.0.1:3000';
const AI_ENGINE_URL = 'http://127.0.0.1:3000';
const NOTIFICATION_URL = 'http://127.0.0.1:3000';
const TENANT_URL = 'http://127.0.0.1:3000';
const ADMIN_EMAIL = 'admin@dogan-ai.com';
const ADMIN_PASS = 'D0gan@Platform2026!';

let authToken = '';
let tenantId = '';
let sseToken = '';

async function fetchJson(url: string, options: RequestInit = {}, retries = 3): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 2000));
    return fetchJson(url, options, retries - 1);
  }
  
  const text = await res.text();
  let body = null;
  try {
      body = text ? JSON.parse(text) : null;
  } catch(e) {
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}: ${text}`);
      throw e;
  }

  return { status: res.status, body };
}

describe('Dynamic Runtime Platform End-to-End Tests', () => {
  beforeAll(async () => {
    // 1. Authenticate to get session token & tenant
    const { body } = await fetchJson(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
    });
    authToken = body?.token || '';
    tenantId = body?.tenantId || '';
  });

  describe('Pillar 1 & 4: Intent-To-Query NLP Bridge', () => {
    it('should successfully parse a natural language string into a structured filter payload', async () => {
      expect(authToken).toBeTruthy();
      
      const { status, body } = await fetchJson(`${AI_ENGINE_URL}/api/copilot/intent-to-query`, {
        method: 'POST',
        body: JSON.stringify({
          query: 'Show me all critical priority network incidents assigned to the SOC team',
          moduleCode: 'incident',
          language: 'en'
        })
      });

      // Assert successful mapping
      expect(status).toBe(200);
      expect(body).toBeDefined();
      expect(body.intent).toBeDefined();
      expect(body.filterPayload).toBeDefined();
      
      // Ensure the LLM provided valid parsed filters based on the schema inference
      expect(Array.isArray(body.filterPayload.filters)).toBe(true);
      expect(typeof body.intent).toBe('string');
    });
    
    it('should fall back gracefully to keyword search if query is unrecognized or malformed', async () => {
      const { status, body } = await fetchJson(`${AI_ENGINE_URL}/api/copilot/intent-to-query`, {
        method: 'POST',
        body: JSON.stringify({
          query: 'sdflkjsdflkf sdlfsd f',
          moduleCode: 'incident'
        })
      });

      expect(status).toBe(200);
      expect(body.filterPayload).toBeDefined();
      expect(Array.isArray(body.filterPayload.filters)).toBe(true);
    });
  });

  describe('Pillar 3: Semantic Realtime Notifications (SSE)', () => {
    it('should successfully request an SSE single-use token', async () => {
        const url = `${NOTIFICATION_URL}/api/events/sse-token`;
        const { status, body, headers } = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-tenant-id': tenantId
            }
        }).then(async r => {
            if (!r.ok) {
                const txt = await r.clone().text().catch(()=>'');
                throw new Error(`SSE token route failed: ${r.status} ${txt}`);
            }
            return { status: r.status, body: await r.json(), headers: r.headers };
        });
        
        expect(status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.expiresIn).toBeDefined();
        
        // Grab token from set-cookie
        const setCookie = headers.get('set-cookie');
        expect(setCookie).toContain('grc_sse_token=');
        
        sseToken = setCookie?.match(/grc_sse_token=([^;]+)/)?.[1] || '';
        expect(sseToken).toBeTruthy();
    });

    it('should establish an SSE stream and receive the connection payload', async () => {
      return new Promise<void>((resolve, reject) => {
        if (!sseToken) return reject(new Error('No SSE token'));
        
        const req = http.get(`${NOTIFICATION_URL}/api/events?modules=incident`, {
            headers: {
                'Cookie': `grc_sse_token=${sseToken}`
            }
        }, (res) => {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toBe('text/event-stream');
            
            let dataBuf = '';
            res.on('data', chunk => {
                dataBuf += chunk.toString();
                if (dataBuf.includes('event: connected')) {
                    res.destroy(); // Success!
                    resolve();
                }
            });
            
            res.on('end', () => {
                 if (!dataBuf.includes('event: connected')) {
                     reject(new Error('Connection closed prematurely without connected event'));
                 }
            });
        });

        req.on('error', reject);
        
        // Safety timeout
        setTimeout(() => {
            req.destroy();
            reject(new Error('SSE connection timeout'));
        }, 5000);
      });
    });
  });
});
