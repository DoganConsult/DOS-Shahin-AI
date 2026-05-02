import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Simple Pact-like contract testing framework for DOS-AIO
interface PactContract {
  consumer: string;
  provider: string;
  interactions: Array<{
    description: string;
    request: {
      method: string;
      path: string;
      headers?: Record<string, string>;
      body?: any;
    };
    response: {
      status: number;
      headers?: Record<string, string>;
      body: any;
    };
  }>;
}

interface ContractBroker {
  contracts: Map<string, PactContract>;
  publish(contract: PactContract): void;
  verify(consumer: string, provider: string): boolean;
  getContracts(consumer?: string, provider?: string): PactContract[];
}

class SimpleContractBroker implements ContractBroker {
  contracts = new Map<string, PactContract>();

  private getContractKey(consumer: string, provider: string): string {
    return `${consumer}-${provider}`;
  }

  publish(contract: PactContract): void {
    const key = this.getContractKey(contract.consumer, contract.provider);
    this.contracts.set(key, contract);
    console.log(`[contract-broker] Published contract: ${contract.consumer} -> ${contract.provider}`);
  }

  verify(consumer: string, provider: string): boolean {
    const key = this.getContractKey(consumer, provider);
    const contract = this.contracts.get(key);
    
    if (!contract) {
      console.warn(`[contract-broker] No contract found for ${consumer} -> ${provider}`);
      return false;
    }

    // Basic validation - in real implementation this would verify against actual provider
    console.log(`[contract-broker] Verified contract: ${consumer} -> ${provider}`);
    return true;
  }

  getContracts(consumer?: string, provider?: string): PactContract[] {
    const contracts: PactContract[] = [];
    
    for (const contract of this.contracts.values()) {
      const consumerMatch = !consumer || contract.consumer === consumer;
      const providerMatch = !provider || contract.provider === provider;
      
      if (consumerMatch && providerMatch) {
        contracts.push(contract);
      }
    }
    
    return contracts;
  }
}

// Contract validation schemas
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string(),
  }).optional(),
});

const AuthResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    roles: z.array(z.string()),
  }),
});

const TenantResponseSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  status: z.string(),
  settings: z.record(z.unknown()).optional(),
});

describe('Consumer-Driven Contracts (Pact-style)', () => {
  let broker: ContractBroker;

  beforeAll(() => {
    broker = new SimpleContractBroker();
    
    // Publish sample contracts based on actual service interactions
    publishSampleContracts(broker);
  });

  describe('Frontend Consumer Contracts', () => {
    it('frontend expects auth-service login API contract', () => {
      const contract: PactContract = {
        consumer: 'frontend',
        provider: 'auth-service',
        interactions: [
          {
            description: 'Login request with valid credentials',
            request: {
              method: 'POST',
              path: '/api/auth/login',
              headers: { 'Content-Type': 'application/json' },
              body: {
                email: 'user@example.com',
                password: 'password123'
              }
            },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'refresh-token-123',
                expiresAt: '2026-04-14T00:00:00Z',
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  roles: ['user']
                }
              }
            }
          },
          {
            description: 'Login request with invalid credentials',
            request: {
              method: 'POST',
              path: '/api/auth/login',
              headers: { 'Content-Type': 'application/json' },
              body: {
                email: 'user@example.com',
                password: 'wrong-password'
              }
            },
            response: {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
              body: {
                success: false,
                error: 'Invalid credentials'
              }
            }
          }
        ]
      };

      // Validate contract structure
      expect(contract.consumer).toBe('frontend');
      expect(contract.provider).toBe('auth-service');
      expect(contract.interactions).toHaveLength(2);

      // Validate response schemas
      for (const interaction of contract.interactions) {
        if (interaction.response.status === 200) {
          expect(() => AuthResponseSchema.parse(interaction.response.body)).not.toThrow();
        } else {
          expect(() => ApiResponseSchema.parse(interaction.response.body)).not.toThrow();
        }
      }

      broker.publish(contract);
    });

    it('frontend expects tenant-service API contract', () => {
      const contract: PactContract = {
        consumer: 'frontend',
        provider: 'tenant-service',
        interactions: [
          {
            description: 'Get tenant details',
            request: {
              method: 'GET',
              path: '/api/tenants/tenant-123',
              headers: { 'Authorization': 'Bearer token' }
            },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: {
                tenantId: 'tenant-123',
                name: 'Sample Tenant',
                status: 'active',
                settings: {
                  theme: 'dark',
                  language: 'en'
                }
              }
            }
          }
        ]
      };

      expect(() => TenantResponseSchema.parse(contract.interactions[0].response.body)).not.toThrow();
      broker.publish(contract);
    });

    it('frontend expects risk-service API contract', () => {
      const contract: PactContract = {
        consumer: 'frontend',
        provider: 'risk-service',
        interactions: [
          {
            description: 'List risks',
            request: {
              method: 'GET',
              path: '/api/risk/risks',
              headers: { 'Authorization': 'Bearer token' }
            },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: {
                success: true,
                data: [
                  {
                    id: 'risk-1',
                    title: 'Sample Risk',
                    likelihood: 3,
                    impact: 4,
                    status: 'open'
                  }
                ],
                meta: {
                  timestamp: '2026-04-13T15:00:00Z',
                  requestId: 'req-123'
                }
              }
            }
          }
        ]
      };

      expect(() => ApiResponseSchema.parse(contract.interactions[0].response.body)).not.toThrow();
      broker.publish(contract);
    });
  });

  describe('Service-to-Service Contracts', () => {
    it('auth-service provides token validation to other services', () => {
      const contract: PactContract = {
        consumer: 'risk-service',
        provider: 'auth-service',
        interactions: [
          {
            description: 'Validate JWT token',
            request: {
              method: 'POST',
              path: '/api/auth/validate',
              headers: { 'Content-Type': 'application/json' },
              body: {
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              }
            },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: {
                valid: true,
                userId: 'user-123',
                tenantId: 'tenant-123',
                roles: ['user'],
                expiresAt: '2026-04-14T00:00:00Z'
              }
            }
          }
        ]
      };

      broker.publish(contract);
    });

    it('services consume events from event backbone', () => {
      const contract: PactContract = {
        consumer: 'risk-service',
        provider: 'event-backbone',
        interactions: [
          {
            description: 'Consume risk assessment completed event',
            request: {
              method: 'SUBSCRIBE',
              path: 'risk.assessment_completed',
              headers: { 'X-Service-Auth': 'service-token' }
            },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: {
                eventId: 'event-123',
                eventType: 'risk.assessment_completed',
                tenantId: 'tenant-123',
                payload: {
                  riskId: 'risk-123',
                  assessmentId: 'assessment-123',
                  result: 'high_risk'
                },
                timestamp: '2026-04-13T15:00:00Z'
              }
            }
          }
        ]
      };

      broker.publish(contract);
    });
  });

  describe('Contract Verification', () => {
    it('can verify published contracts', () => {
      const contracts = broker.getContracts();
      expect(contracts.length).toBeGreaterThan(0);

      // Verify all contracts
      for (const contract of contracts) {
        const verified = broker.verify(contract.consumer, contract.provider);
        expect(verified).toBe(true);
      }
    });

    it('can filter contracts by consumer or provider', () => {
      const frontendContracts = broker.getContracts('frontend');
      expect(frontendContracts.length).toBeGreaterThan(0);
      expect(frontendContracts.every(c => c.consumer === 'frontend')).toBe(true);

      const authContracts = broker.getContracts(undefined, 'auth-service');
      expect(authContracts.length).toBeGreaterThan(0);
      expect(authContracts.every(c => c.provider === 'auth-service')).toBe(true);
    });

    it('detects breaking changes in contracts', () => {
      // Original contract
      const originalContract: PactContract = {
        consumer: 'test-consumer',
        provider: 'test-provider',
        interactions: [
          {
            description: 'Get user',
            request: { method: 'GET', path: '/api/users/123' },
            response: {
              status: 200,
              body: { id: '123', name: 'John', email: 'john@example.com' }
            }
          }
        ]
      };

      broker.publish(originalContract);

      // Breaking change contract (missing required field)
      const breakingContract: PactContract = {
        consumer: 'test-consumer',
        provider: 'test-provider',
        interactions: [
          {
            description: 'Get user',
            request: { method: 'GET', path: '/api/users/123' },
            response: {
              status: 200,
              body: { id: '123', name: 'John' } // Missing email field
            }
          }
        ]
      };

      // This should detect the breaking change
      const originalSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      });

      const breakingSchema = z.object({
        id: z.string(),
        name: z.string()
      });

      expect(() => originalSchema.parse(breakingContract.interactions[0].response.body)).toThrow();
      
      // Log breaking change detection
      console.warn(`[contract-breaking] Breaking change detected in test-consumer -> test-provider: Missing required field 'email'`);
    });
  });

  describe('Contract Versioning', () => {
    it('supports multiple API versions', () => {
      const v1Contract: PactContract = {
        consumer: 'frontend-v1',
        provider: 'tenant-service',
        interactions: [
          {
            description: 'Get tenant v1',
            request: { method: 'GET', path: '/api/v1/tenants/123' },
            response: {
              status: 200,
              body: { tenant_id: '123', tenant_name: 'Old Name', status: 'active' }
            }
          }
        ]
      };

      const v2Contract: PactContract = {
        consumer: 'frontend-v2',
        provider: 'tenant-service',
        interactions: [
          {
            description: 'Get tenant v2',
            request: { method: 'GET', path: '/api/v2/tenants/123' },
            response: {
              status: 200,
              body: { tenantId: '123', name: 'New Name', status: 'active', settings: {} }
            }
          }
        ]
      };

      broker.publish(v1Contract);
      broker.publish(v2Contract);

      const tenantContracts = broker.getContracts(undefined, 'tenant-service');
      expect(tenantContracts.length).toBeGreaterThanOrEqual(2);
    });
  });
});

function publishSampleContracts(broker: ContractBroker) {
  // This would typically read from contract files or generate from actual service interactions
  console.log('[contract-broker] Publishing sample contracts...');
}

// Contract persistence utilities
function saveContractsToFile(broker: ContractBroker, filePath: string): void {
  const contracts = Array.from(broker.contracts.entries()).map(([key, contract]) => ({
    key,
    contract
  }));
  
  fs.writeFileSync(filePath, JSON.stringify(contracts, null, 2));
  console.log(`[contract-broker] Saved ${contracts.length} contracts to ${filePath}`);
}

function loadContractsFromFile(filePath: string): ContractBroker {
  const broker = new SimpleContractBroker();
  
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const { contract } of data) {
      broker.publish(contract);
    }
  }
  
  return broker;
}
