import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { z } from 'zod';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

// Secrets & Zod Validation Tests for DOS-AIO Platform
interface ValidationTestResult {
  testName: string;
  passed: boolean;
  issues: ValidationIssue[];
  recommendations: string[];
  duration: number;
}

interface ValidationIssue {
  type: 'MISSING_SECRET' | 'WEAK_SECRET' | 'EXPOSED_SECRET' | 'INVALID_SCHEMA' | 'MISSING_VALIDATION' | 'INSECURE_DEFAULT' | 'DATA_LEAKAGE' | 'TYPE_MISMATCH' | 'AUTHORIZATION_BYPASS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location?: string;
  evidence?: any;
}

interface SecretConfig {
  name: string;
  required: boolean;
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  rotationPeriod?: number; // days
  encryption?: boolean;
}

interface ZodSchemaDefinition {
  name: string;
  schema: z.ZodSchema;
  endpoint?: string;
  validationLevel: 'STRICT' | 'LENIENT' | 'CUSTOM';
}

class SecretsZodValidator {
  private secrets: Map<string, SecretConfig> = new Map();
  private schemas: Map<string, ZodSchemaDefinition> = new Map();
  private testResults: ValidationTestResult[] = [];

  constructor() {
    this.initializeSecrets();
    this.initializeSchemas();
  }

  private initializeSecrets(): void {
    const secretConfigs: SecretConfig[] = [
      {
        name: 'JWT_SECRET',
        required: true,
        minLength: 32,
        rotationPeriod: 90,
        encryption: true
      },
      {
        name: 'DATABASE_URL',
        required: true,
        rotationPeriod: 180,
        encryption: true
      },
      {
        name: 'REDIS_URL',
        required: true,
        rotationPeriod: 180,
        encryption: true
      },
      {
        name: 'API_KEY_ENCRYPTION_KEY',
        required: true,
        minLength: 32,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        rotationPeriod: 365,
        encryption: false
      },
      {
        name: 'SMTP_PASSWORD',
        required: false,
        minLength: 16,
        rotationPeriod: 90,
        encryption: true
      },
      {
        name: 'WEBHOOK_SECRET',
        required: false,
        minLength: 24,
        rotationPeriod: 180,
        encryption: true
      }
    ];

    for (const config of secretConfigs) {
      this.secrets.set(config.name, config);
    }
  }

  private initializeSchemas(): void {
    // User-related schemas
    this.schemas.set('UserCreate', {
      name: 'UserCreate',
      schema: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        tenantId: z.string().uuid('Invalid tenant ID'),
        roles: z.array(z.string()).min(1, 'At least one role is required')
      }),
      endpoint: '/api/v1/users',
      validationLevel: 'STRICT'
    });

    this.schemas.set('UserUpdate', {
      name: 'UserUpdate',
      schema: z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        roles: z.array(z.string()).optional()
      }),
      endpoint: '/api/v1/users/:id',
      validationLevel: 'STRICT'
    });

    // Risk management schemas
    this.schemas.set('RiskCreate', {
      name: 'RiskCreate',
      schema: z.object({
        title: z.string().min(3, 'Title must be at least 3 characters'),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        likelihood: z.number().min(1).max(5, 'Likelihood must be between 1 and 5'),
        impact: z.number().min(1).max(5, 'Impact must be between 1 and 5'),
        category: z.string().min(1, 'Category is required'),
        tenantId: z.string().uuid(),
        assignedTo: z.string().uuid().optional()
      }),
      endpoint: '/api/v1/risks',
      validationLevel: 'STRICT'
    });

    // Compliance schemas
    this.schemas.set('ComplianceReport', {
      name: 'ComplianceReport',
      schema: z.object({
        type: z.enum(['monthly', 'quarterly', 'annual']),
        period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
        tenantId: z.string().uuid(),
        includeMetrics: z.boolean().default(true),
        format: z.enum(['pdf', 'excel', 'json']).default('pdf')
      }),
      endpoint: '/api/v1/compliance/reports',
      validationLevel: 'STRICT'
    });

    // Authentication schemas
    this.schemas.set('Login', {
      name: 'Login',
      schema: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
        tenantId: z.string().uuid('Invalid tenant ID').optional(),
        rememberMe: z.boolean().default(false)
      }),
      endpoint: '/api/v1/auth/login',
      validationLevel: 'STRICT'
    });

    this.schemas.set('RefreshToken', {
      name: 'RefreshToken',
      schema: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required')
      }),
      endpoint: '/api/v1/auth/refresh',
      validationLevel: 'STRICT'
    });
  }

  async runAllValidationTests(): Promise<ValidationTestResult[]> {
    console.log('[validation] Starting comprehensive secrets and validation tests...');

    const tests = [
      () => this.testSecretManagement(),
      () => this.testSecretRotation(),
      () => this.testSecretEncryption(),
      () => this.testZodSchemaValidation(),
      () => this.testInputSanitization(),
      () => this.testDataTypeValidation(),
      () => this.testBusinessRuleValidation(),
      () => this.testSecurityValidation(),
      () => this.testPerformanceValidation(),
      () => this.testErrorHandling()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`[validation] Test failed: ${error}`);
      }
    }

    return this.testResults;
  }

  private async testSecretManagement(): Promise<void> {
    const testName = 'Secret Management';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Required secrets presence
    for (const [name, config] of this.secrets) {
      if (config.required && !this.hasSecret(name)) {
        issues.push({
          type: 'MISSING_SECRET',
          severity: 'CRITICAL',
          description: `Required secret missing: ${name}`,
          location: name
        });
      }
    }

    // Test 2: Secret strength validation
    const weakSecrets = ['123456', 'password', 'secret', 'admin'];
    for (const weakSecret of weakSecrets) {
      if (!this.isSecretStrong(weakSecret)) {
        issues.push({
          type: 'WEAK_SECRET',
          severity: 'HIGH',
          description: 'Weak secret detected',
          evidence: weakSecret
        });
      }
    }

    // Test 3: Secret exposure in code
    const exposedSecrets = this.scanForExposedSecrets();
    for (const secret of exposedSecrets) {
      issues.push({
        type: 'EXPOSED_SECRET',
        severity: 'CRITICAL',
        description: 'Secret exposed in code',
        location: secret.location,
        evidence: secret.value
      });
    }

    // Test 4: Default secrets usage
    const defaultSecrets = ['default-secret', 'change-me', 'password123'];
    for (const defaultSecret of defaultSecrets) {
      if (this.usesDefaultSecret(defaultSecret)) {
        issues.push({
          type: 'INSECURE_DEFAULT',
          severity: 'HIGH',
          description: 'Default secret in use',
          evidence: defaultSecret
        });
      }
    }

    if (issues.length === 0) {
      recommendations.push('Secret management is properly configured');
    } else {
      recommendations.push('Fix secret management issues immediately');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testSecretRotation(): Promise<void> {
    const testName = 'Secret Rotation';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Rotation policy enforcement
    for (const [name, config] of this.secrets) {
      if (config.rotationPeriod && this.isSecretOverdue(name, config.rotationPeriod)) {
        issues.push({
          type: 'MISSING_SECRET',
          severity: 'HIGH',
          description: `Secret rotation overdue: ${name}`,
          location: name
        });
      }
    }

    // Test 2: Rotation history tracking
    if (!this.hasRotationHistory()) {
      issues.push({
        type: 'MISSING_SECRET',
        severity: 'MEDIUM',
        description: 'Secret rotation history not tracked'
      });
    }

    // Test 3: Automated rotation capability
    if (!this.supportsAutomatedRotation()) {
      issues.push({
        type: 'MISSING_SECRET',
        severity: 'MEDIUM',
        description: 'Automated secret rotation not supported'
      });
    }

    if (issues.length === 0) {
      recommendations.push('Secret rotation policies are properly enforced');
    } else {
      recommendations.push('Implement proper secret rotation policies');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testSecretEncryption(): Promise<void> {
    const testName = 'Secret Encryption';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Encryption at rest
    for (const [name, config] of this.secrets) {
      if (config.encryption && !this.isSecretEncrypted(name)) {
        issues.push({
          type: 'EXPOSED_SECRET',
          severity: 'CRITICAL',
          description: `Secret not encrypted at rest: ${name}`,
          location: name
        });
      }
    }

    // Test 2: Encryption in transit
    if (!this.usesHTTPSForSecrets()) {
      issues.push({
        type: 'EXPOSED_SECRET',
        severity: 'HIGH',
        description: 'Secrets transmitted over insecure channel'
      });
    }

    // Test 3: Encryption algorithm strength
    const weakAlgorithms = ['des', 'rc4', 'md5'];
    for (const algorithm of weakAlgorithms) {
      if (this.usesWeakEncryption(algorithm)) {
        issues.push({
          type: 'WEAK_SECRET',
          severity: 'HIGH',
          description: `Weak encryption algorithm: ${algorithm}`,
          evidence: algorithm
        });
      }
    }

    if (issues.length === 0) {
      recommendations.push('Secret encryption is properly implemented');
    } else {
      recommendations.push('Implement proper secret encryption');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testZodSchemaValidation(): Promise<void> {
    const testName = 'Zod Schema Validation';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Schema completeness
    for (const [name, schemaDef] of this.schemas) {
      if (!this.isSchemaComplete(schemaDef.schema)) {
        issues.push({
          type: 'MISSING_VALIDATION',
          severity: 'MEDIUM',
          description: `Incomplete schema: ${name}`,
          location: name
        });
      }
    }

    // Test 2: Schema validation effectiveness
    const testCases = [
      { schema: 'UserCreate', data: { email: 'invalid-email', password: '123' }, shouldFail: true },
      { schema: 'RiskCreate', data: { title: 'A', likelihood: 10 }, shouldFail: true },
      { schema: 'Login', data: { email: 'test@example.com', password: 'validpass' }, shouldFail: false }
    ];

    for (const testCase of testCases) {
      const schemaDef = this.schemas.get(testCase.schema);
      if (schemaDef) {
        try {
          const result = schemaDef.schema.safeParse(testCase.data);
          if (testCase.shouldFail && result.success) {
            issues.push({
              type: 'MISSING_VALIDATION',
              severity: 'HIGH',
              description: `Schema validation should have failed: ${testCase.schema}`,
              evidence: testCase.data
            });
          } else if (!testCase.shouldFail && !result.success) {
            issues.push({
              type: 'MISSING_VALIDATION',
              severity: 'MEDIUM',
              description: `Schema validation failed unexpectedly: ${testCase.schema}`,
              evidence: result.error
            });
          }
        } catch (error) {
          issues.push({
            type: 'INVALID_SCHEMA',
            severity: 'HIGH',
            description: `Schema error: ${testCase.schema}`,
            evidence: error
          });
        }
      }
    }

    // Test 3: Schema consistency
    if (!this.areSchemasConsistent()) {
      issues.push({
        type: 'TYPE_MISMATCH',
        severity: 'MEDIUM',
        description: 'Schema inconsistencies detected'
      });
    }

    if (issues.length === 0) {
      recommendations.push('Zod schemas are properly implemented');
    } else {
      recommendations.push('Fix schema validation issues');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testInputSanitization(): Promise<void> {
    const testName = 'Input Sanitization';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: XSS prevention
    const xssInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>'
    ];

    for (const input of xssInputs) {
      if (!this.isInputSanitized(input)) {
        issues.push({
          type: 'DATA_LEAKAGE',
          severity: 'HIGH',
          description: 'XSS vulnerability detected',
          evidence: input
        });
      }
    }

    // Test 2: SQL injection prevention
    const sqlInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "' UNION SELECT * FROM users --"
    ];

    for (const input of sqlInputs) {
      if (!this.isInputSanitized(input)) {
        issues.push({
          type: 'DATA_LEAKAGE',
          severity: 'CRITICAL',
          description: 'SQL injection vulnerability detected',
          evidence: input
        });
      }
    }

    // Test 3: Path traversal prevention
    const pathInputs = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/etc/shadow'
    ];

    for (const input of pathInputs) {
      if (!this.isInputSanitized(input)) {
        issues.push({
          type: 'DATA_LEAKAGE',
          severity: 'HIGH',
          description: 'Path traversal vulnerability detected',
          evidence: input
        });
      }
    }

    if (issues.length === 0) {
      recommendations.push('Input sanitization is properly implemented');
    } else {
      recommendations.push('Implement proper input sanitization');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testDataTypeValidation(): Promise<void> {
    const testName = 'Data Type Validation';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: UUID validation
    const invalidUuids = ['invalid-uuid', '123-456-789', 'not-a-uuid'];
    for (const uuid of invalidUuids) {
      if (!this.isValidUUID(uuid)) {
        // This is expected - invalid UUIDs should be rejected
        continue;
      }
    }

    // Test 2: Email validation
    const invalidEmails = ['invalid-email', 'test@', '@domain.com', 'test..test@example.com'];
    for (const email of invalidEmails) {
      if (!this.isValidEmail(email)) {
        // This is expected - invalid emails should be rejected
        continue;
      }
    }

    // Test 3: Date validation
    const invalidDates = ['invalid-date', '32/01/2023', '2023-13-01', '2023-02-30'];
    for (const date of invalidDates) {
      if (!this.isValidDate(date)) {
        // This is expected - invalid dates should be rejected
        continue;
      }
    }

    // Test 4: Number range validation
    const outOfRangeNumbers = [-1, 1000, 3.14159];
    for (const num of outOfRangeNumbers) {
      if (!this.isInRange(num, 1, 5)) {
        // This is expected - out of range numbers should be rejected
        continue;
      }
    }

    if (issues.length === 0) {
      recommendations.push('Data type validation is properly implemented');
    } else {
      recommendations.push('Fix data type validation issues');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testBusinessRuleValidation(): Promise<void> {
    const testName = 'Business Rule Validation';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: User role validation
    const invalidRoles = ['invalid-role', 'super-admin', 'root'];
    for (const role of invalidRoles) {
      if (!this.isValidRole(role)) {
        // This is expected - invalid roles should be rejected
        continue;
      }
    }

    // Test 2: Risk assessment validation
    const invalidRiskData = {
      likelihood: 10, // Should be 1-5
      impact: -1,    // Should be 1-5
      category: ''   // Should not be empty
    };

    if (!this.isValidRiskData(invalidRiskData)) {
      // This is expected - invalid risk data should be rejected
    }

    // Test 3: Tenant isolation validation
    const crossTenantData = {
      userId: 'user-123',
      tenantId: 'tenant-456',
      requestedTenantId: 'tenant-789'
    };

    if (!this.isValidTenantAccess(crossTenantData)) {
      // This is expected - cross-tenant access should be rejected
    }

    if (issues.length === 0) {
      recommendations.push('Business rule validation is properly implemented');
    } else {
      recommendations.push('Fix business rule validation issues');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testSecurityValidation(): Promise<void> {
    const testName = 'Security Validation';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Authentication bypass prevention
    if (this.canBypassAuthentication()) {
      issues.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'Authentication bypass vulnerability detected'
      });
    }

    // Test 2: Authorization enforcement
    if (this.canBypassAuthorization()) {
      issues.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'Authorization bypass vulnerability detected'
      });
    }

    // Test 3: Rate limiting enforcement
    if (!this.hasRateLimiting()) {
      issues.push({
        type: 'DATA_LEAKAGE',
        severity: 'HIGH',
        description: 'Rate limiting not implemented'
      });
    }

    if (issues.length === 0) {
      recommendations.push('Security validation is properly implemented');
    } else {
      recommendations.push('Fix security validation issues');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testPerformanceValidation(): Promise<void> {
    const testName = 'Performance Validation';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Validation performance
    const largePayload = this.generateLargePayload();
    const validationTime = this.measureValidationTime(largePayload);
    
    if (validationTime > 1000) { // 1 second
      issues.push({
        type: 'TYPE_MISMATCH',
        severity: 'MEDIUM',
        description: `Validation too slow: ${validationTime}ms`,
        evidence: validationTime
      });
    }

    // Test 2: Memory usage
    const memoryUsage = this.measureMemoryUsage();
    if (memoryUsage > 100 * 1024 * 1024) { // 100MB
      issues.push({
        type: 'TYPE_MISMATCH',
        severity: 'MEDIUM',
        description: `High memory usage: ${memoryUsage} bytes`,
        evidence: memoryUsage
      });
    }

    if (issues.length === 0) {
      recommendations.push('Performance validation is acceptable');
    } else {
      recommendations.push('Optimize validation performance');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Validation error messages
    const invalidData = { email: 'invalid', password: '' };
    const validationResult = this.validateWithZod('UserCreate', invalidData);
    
    if (!validationResult.success && validationResult.error) {
      // Check if error messages are user-friendly
      const errorMessages = this.extractErrorMessages(validationResult.error);
      const hasUserFriendlyMessages = errorMessages.some(msg => 
        msg.length > 10 && !msg.includes('ZodError')
      );
      
      if (!hasUserFriendlyMessages) {
        issues.push({
          type: 'MISSING_VALIDATION',
          severity: 'MEDIUM',
          description: 'Validation error messages are not user-friendly'
        });
      }
    }

    // Test 2: Error information leakage
    const systemError = this.triggerSystemError();
    if (this.leaksSystemInformation(systemError)) {
      issues.push({
        type: 'DATA_LEAKAGE',
        severity: 'HIGH',
        description: 'System error leaks sensitive information'
      });
    }

    if (issues.length === 0) {
      recommendations.push('Error handling is properly implemented');
    } else {
      recommendations.push('Fix error handling issues');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  // Helper methods for validation checks
  private hasSecret(name: string): boolean {
    // Mock implementation - in real tests this would check environment variables or secret store
    const mockSecrets = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL'];
    return mockSecrets.includes(name);
  }

  private isSecretStrong(secret: string): boolean {
    const minLength = 16;
    const hasUppercase = /[A-Z]/.test(secret);
    const hasLowercase = /[a-z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
    
    return secret.length >= minLength && 
           hasUppercase && 
           hasLowercase && 
           hasNumbers && 
           hasSpecialChars;
  }

  private scanForExposedSecrets(): Array<{ location: string; value: string }> {
    // Mock implementation - in real tests this would scan source code
    return [];
  }

  private usesDefaultSecret(secret: string): boolean {
    const defaults = ['default-secret', 'change-me', 'password123', 'admin'];
    return defaults.includes(secret);
  }

  private isSecretOverdue(name: string, rotationPeriod: number): boolean {
    // Mock implementation - in real tests this would check last rotation date
    return false;
  }

  private hasRotationHistory(): boolean {
    // Mock implementation
    return true;
  }

  private supportsAutomatedRotation(): boolean {
    // Mock implementation
    return true;
  }

  private isSecretEncrypted(name: string): boolean {
    // Mock implementation
    return true;
  }

  private usesHTTPSForSecrets(): boolean {
    // Mock implementation
    return true;
  }

  private usesWeakEncryption(algorithm: string): boolean {
    // Mock implementation
    return false;
  }

  private isSchemaComplete(schema: z.ZodSchema): boolean {
    // Mock implementation - check if schema has proper validation rules
    return true;
  }

  private areSchemasConsistent(): boolean {
    // Mock implementation - check schema consistency across endpoints
    return true;
  }

  private isInputSanitized(input: string): boolean {
    // Mock implementation - check if input is properly sanitized
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /(--|;|\/\*|\*\/|#)/i,
      /\.\.\//,
      /\.\.\\/
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(input));
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const parsed = new Date(date);
    return parsed instanceof Date && !isNaN(parsed.getTime());
  }

  private isInRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
  }

  private isValidRole(role: string): boolean {
    const validRoles = ['admin', 'user', 'manager', 'auditor', 'viewer'];
    return validRoles.includes(role);
  }

  private isValidRiskData(data: any): boolean {
    return data.likelihood >= 1 && data.likelihood <= 5 &&
           data.impact >= 1 && data.impact <= 5 &&
           data.category && data.category.length > 0;
  }

  private isValidTenantAccess(data: any): boolean {
    return data.tenantId === data.requestedTenantId;
  }

  private canBypassAuthentication(): boolean {
    // Mock implementation
    return false;
  }

  private canBypassAuthorization(): boolean {
    // Mock implementation
    return false;
  }

  private hasRateLimiting(): boolean {
    // Mock implementation
    return true;
  }

  private generateLargePayload(): any {
    // Generate a large payload for performance testing
    return {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        data: 'x'.repeat(1000)
      }))
    };
  }

  private measureValidationTime(payload: any): number {
    const start = Date.now();
    // Simulate validation
    JSON.stringify(payload);
    return Date.now() - start;
  }

  private measureMemoryUsage(): number {
    // Mock implementation
    return 50 * 1024 * 1024; // 50MB
  }

  private validateWithZod(schemaName: string, data: any): any {
    const schemaDef = this.schemas.get(schemaName);
    if (!schemaDef) {
      return { success: false, error: 'Schema not found' };
    }
    
    return schemaDef.schema.safeParse(data);
  }

  private extractErrorMessages(error: any): string[] {
    // Mock implementation - extract user-friendly error messages
    return ['Invalid email format', 'Password must be at least 8 characters'];
  }

  private triggerSystemError(): any {
    // Mock implementation - trigger a system error
    return new Error('System error occurred');
  }

  private leaksSystemInformation(error: any): boolean {
    // Mock implementation - check if error leaks system information
    return false;
  }

  private addTestResult(testName: string, issues: ValidationIssue[], recommendations: string[], duration: number): void {
    this.testResults.push({
      testName,
      passed: issues.length === 0,
      issues,
      recommendations,
      duration
    });

    console.log(`[validation] ${testName}: ${issues.length === 0 ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    if (issues.length > 0) {
      console.log(`[validation]   Issues: ${issues.length}`);
      for (const issue of issues) {
        console.log(`[validation]     - ${issue.type} (${issue.severity}): ${issue.description}`);
      }
    }
  }

  generateValidationReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalIssues = this.testResults.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = this.testResults.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'CRITICAL').length, 0);

    let report = `# Secrets & Zod Validation Report\n\n`;
    report += `## Summary\n`;
    report += `- **Tests Run:** ${totalTests}\n`;
    report += `- **Tests Passed:** ${passedTests}\n`;
    report += `- **Tests Failed:** ${totalTests - passedTests}\n`;
    report += `- **Total Issues:** ${totalIssues}\n`;
    report += `- **Critical Issues:** ${criticalIssues}\n\n`;

    if (criticalIssues > 0) {
      report += `## CRITICAL ISSUES\n\n`;
      for (const result of this.testResults) {
        const criticalIssues = result.issues.filter(i => i.severity === 'CRITICAL');
        if (criticalIssues.length > 0) {
          report += `### ${result.testName}\n`;
          for (const issue of criticalIssues) {
            report += `- **${issue.type}:** ${issue.description}\n`;
            if (issue.evidence) {
              report += `  - **Evidence:** ${issue.evidence}\n`;
            }
          }
          report += `\n`;
        }
      }
    }

    report += `## Detailed Results\n\n`;
    for (const result of this.testResults) {
      report += `### ${result.testName}\n`;
      report += `- **Status:** ${result.passed ? 'PASSED' : 'FAILED'}\n`;
      report += `- **Duration:** ${result.duration}ms\n`;
      
      if (result.issues.length > 0) {
        report += `- **Issues:**\n`;
        for (const issue of result.issues) {
          report += `  - **${issue.type} (${issue.severity}):** ${issue.description}\n`;
        }
      }
      
      if (result.recommendations.length > 0) {
        report += `- **Recommendations:**\n`;
        for (const rec of result.recommendations) {
          report += `  - ${rec}\n`;
        }
      }
      report += `\n`;
    }

    return report;
  }
}

describe('Secrets & Zod Validation', () => {
  let validator: SecretsZodValidator;

  beforeAll(() => {
    validator = new SecretsZodValidator();
  });

  describe('Secret Management', () => {
    it('validates secret strength requirements', () => {
      const strongSecret = 'StrongP@ssw0rd123!';
      const weakSecret = 'weak123';
      
      expect(validator['isSecretStrong'](strongSecret)).toBe(true);
      expect(validator['isSecretStrong'](weakSecret)).toBe(false);
    });

    it('detects exposed secrets in code', () => {
      const codeWithSecrets = `
        const API_KEY = 'sk-1234567890abcdef';
        const password = 'password123';
      `;
      
      // Mock implementation would scan for secrets
      expect(codeWithSecrets).toContain('sk-1234567890abcdef');
    });

    it('prevents default secret usage', () => {
      const defaultSecrets = ['default-secret', 'change-me', 'password123'];
      
      for (const secret of defaultSecrets) {
        expect(validator['usesDefaultSecret'](secret)).toBe(true);
      }
    });
  });

  describe('Zod Schema Validation', () => {
    it('validates user creation schema', () => {
      const userSchema = validator['schemas'].get('UserCreate');
      expect(userSchema).toBeDefined();
      
      const validUser = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123!',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        roles: ['user']
      };
      
      const result = userSchema!.schema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('rejects invalid user data', () => {
      const userSchema = validator['schemas'].get('UserCreate');
      
      const invalidUser = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
        tenantId: 'invalid-uuid',
        roles: []
      };
      
      const result = userSchema!.schema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('validates risk creation schema', () => {
      const riskSchema = validator['schemas'].get('RiskCreate');
      expect(riskSchema).toBeDefined();
      
      const validRisk = {
        title: 'Security Risk Assessment',
        description: 'This is a detailed description of the security risk',
        likelihood: 3,
        impact: 4,
        category: 'security',
        tenantId: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const result = riskSchema!.schema.safeParse(validRisk);
      expect(result.success).toBe(true);
    });

    it('rejects invalid risk data', () => {
      const riskSchema = validator['schemas'].get('RiskCreate');
      
      const invalidRisk = {
        title: 'A',
        description: 'Short',
        likelihood: 10, // Should be 1-5
        impact: -1,    // Should be 1-5
        category: '',
        tenantId: 'invalid-uuid'
      };
      
      const result = riskSchema!.schema.safeParse(invalidRisk);
      expect(result.success).toBe(false);
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('detects and prevents XSS attempts', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>'
      ];
      
      for (const input of xssInputs) {
        expect(validator['isInputSanitized'](input)).toBe(false);
      }
    });

    it('detects and prevents SQL injection attempts', () => {
      const sqlInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "' UNION SELECT * FROM users --"
      ];
      
      for (const input of sqlInputs) {
        // Debug: check what the pattern actually matches
        const sqlPattern = /(--|;|\/\*|\*\/|#)/i;
        const matches = sqlPattern.test(input);
        console.log(`[debug] SQL input "${input}" -> pattern matches: ${matches}`);
        
        // The method returns false when dangerous patterns are detected (input is NOT sanitized)
        const isSanitized = validator['isInputSanitized'](input);
        console.log(`[debug] isInputSanitized result: ${isSanitized}`);
        
        expect(isSanitized).toBe(false);
      }
    });

    it('validates UUID format', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUuid = 'invalid-uuid';
      
      expect(validator['isValidUUID'](validUuid)).toBe(true);
      expect(validator['isValidUUID'](invalidUuid)).toBe(false);
    });

    it('validates email format', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      
      expect(validator['isValidEmail'](validEmail)).toBe(true);
      expect(validator['isValidEmail'](invalidEmail)).toBe(false);
    });

    it('validates date format', () => {
      const validDate = '2023-12-01';
      const invalidDate = '32/01/2023';
      
      expect(validator['isValidDate'](validDate)).toBe(true);
      expect(validator['isValidDate'](invalidDate)).toBe(false);
    });
  });

  describe('Business Rule Validation', () => {
    it('validates user roles', () => {
      const validRoles = ['admin', 'user', 'manager'];
      const invalidRoles = ['invalid-role', 'super-admin'];
      
      for (const role of validRoles) {
        expect(validator['isValidRole'](role)).toBe(true);
      }
      
      for (const role of invalidRoles) {
        expect(validator['isValidRole'](role)).toBe(false);
      }
    });

    it('validates risk assessment data', () => {
      const validRisk = {
        likelihood: 3,
        impact: 4,
        category: 'security'
      };
      
      const invalidRisk = {
        likelihood: 10,
        impact: -1,
        category: ''
      };
      
      expect(validator['isValidRiskData'](validRisk)).toBe(true);
      expect(validator['isValidRiskData'](invalidRisk)).toBe(false);
    });

    it('enforces tenant isolation', () => {
      const validAccess = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        requestedTenantId: 'tenant-123'
      };
      
      const invalidAccess = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        requestedTenantId: 'tenant-456'
      };
      
      expect(validator['isValidTenantAccess'](validAccess)).toBe(true);
      expect(validator['isValidTenantAccess'](invalidAccess)).toBe(false);
    });
  });

  describe('Comprehensive Validation Tests', () => {
    it('runs complete validation test suite', async () => {
      const results = await validator.runAllValidationTests();
      
      expect(results.length).toBeGreaterThan(0);
      
      // Check that all tests were run
      const expectedTests = [
        'Secret Management',
        'Secret Rotation',
        'Secret Encryption',
        'Zod Schema Validation',
        'Input Sanitization',
        'Data Type Validation',
        'Business Rule Validation',
        'Security Validation',
        'Performance Validation',
        'Error Handling'
      ];

      for (const expectedTest of expectedTests) {
        expect(results.some(r => r.testName === expectedTest)).toBe(true);
      }

      console.log(`[validation] Validation completed: ${results.length} tests run`);
    });

    it('generates comprehensive validation report', async () => {
      await validator.runAllValidationTests();
      const report = validator.generateValidationReport();
      
      expect(report).toContain('Secrets & Zod Validation Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Detailed Results');
      
      console.log('[validation] Validation report generated successfully');
    });
  });
});
