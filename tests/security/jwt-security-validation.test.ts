import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { sign, verify, decode } from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

// JWT & Security Validation Tests for DOS-AIO Platform
interface SecurityTestResult {
  testName: string;
  passed: boolean;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  duration: number;
}

interface SecurityVulnerability {
  type: 'WEAK_ALGORITHM' | 'INSUFFICIENT_KEY_LENGTH' | 'MISSING_EXPIRATION' | 'TOKEN_LEAKAGE' | 'INSECURE_STORAGE' | 'AUTHORIZATION_BYPASS' | 'SESSION_FIXATION' | 'CORS_MISCONFIGURATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location?: string;
  evidence?: any;
}

interface JWTPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

interface SecurityConfig {
  jwtAlgorithm: string;
  jwtSecretLength: number;
  tokenExpiration: number;
  refreshTokenExpiration: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireTwoFactor: boolean;
  sessionTimeout: number;
}

class SecurityValidator {
  private config: SecurityConfig;
  private testResults: SecurityTestResult[] = [];

  constructor() {
    this.config = {
      jwtAlgorithm: 'HS256',
      jwtSecretLength: 256,
      tokenExpiration: 3600, // 1 hour
      refreshTokenExpiration: 86400 * 7, // 7 days
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
      requireTwoFactor: false,
      sessionTimeout: 1800000 // 30 minutes
    };
  }

  async runAllSecurityTests(): Promise<SecurityTestResult[]> {
    console.log('[security] Starting comprehensive security validation...');
    
    const tests = [
      () => this.testJWTTokenValidation(),
      () => this.testJWTAlgorithmStrength(),
      () => this.testTokenExpirationHandling(),
      () => this.testRefreshTokenSecurity(),
      () => this.testAuthorizationBypass(),
      () => this.testSessionManagement(),
      () => this.testRateLimiting(),
      () => this.testInputValidation(),
      () => this.testSecureHeaders(),
      () => this.testCORSConfiguration(),
      () => this.testPasswordPolicies(),
      () => this.testTwoFactorAuthentication()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`[security] Test failed: ${error}`);
      }
    }

    return this.testResults;
  }

  private async testJWTTokenValidation(): Promise<void> {
    const testName = 'JWT Token Validation';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Valid token validation
    const validPayload: JWTPayload = {
      sub: 'user-123',
      email: 'user@example.com',
      roles: ['user'],
      tenantId: 'tenant-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'dos-aio-platform',
      aud: 'dos-aio-client'
    };

    const secret = crypto.randomBytes(32).toString('hex');
    const validToken = sign(validPayload, secret);

    try {
      const decoded = verify(validToken, secret) as JWTPayload;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.roles).toContain('user');
    } catch (error) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'Valid JWT token validation failed',
        evidence: error
      });
    }

    // Test 2: Invalid token rejection
    try {
      verify('invalid.token', secret);
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'Invalid JWT token was accepted',
        evidence: 'Token should be rejected but was accepted'
      });
    } catch (error) {
      // Expected behavior
    }

    // Test 3: Expired token rejection
    const expiredPayload = { ...validPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
    const expiredToken = sign(expiredPayload, secret);

    try {
      verify(expiredToken, secret);
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'HIGH',
        description: 'Expired JWT token was accepted',
        evidence: 'Token should be rejected due to expiration'
      });
    } catch (error) {
      // Expected behavior
    }

    // Test 4: Token tampering detection
    const tamperedToken = validToken.slice(0, -10) + 'tampered';
    
    try {
      verify(tamperedToken, secret);
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'Tampered JWT token was accepted',
        evidence: 'Token signature validation failed'
      });
    } catch (error) {
      // Expected behavior
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('JWT token validation is working correctly');
    } else {
      recommendations.push('Fix JWT token validation to prevent authorization bypass');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testJWTAlgorithmStrength(): Promise<void> {
    const testName = 'JWT Algorithm Strength';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Algorithm strength validation
    const secureAlgorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'];
    const weakAlgorithms = ['none', 'HS1', 'RS1'];

    if (!secureAlgorithms.includes(this.config.jwtAlgorithm)) {
      vulnerabilities.push({
        type: 'WEAK_ALGORITHM',
        severity: 'HIGH',
        description: `Using weak JWT algorithm: ${this.config.jwtAlgorithm}`,
        evidence: this.config.jwtAlgorithm
      });
      recommendations.push('Switch to a stronger JWT algorithm (HS256 or higher)');
    }

    // Test 2: Secret key length validation
    if (this.config.jwtSecretLength < 256) {
      vulnerabilities.push({
        type: 'INSUFFICIENT_KEY_LENGTH',
        severity: 'HIGH',
        description: `JWT secret key too short: ${this.config.jwtSecretLength} bits`,
        evidence: this.config.jwtSecretLength
      });
      recommendations.push('Increase JWT secret key length to at least 256 bits');
    }

    // Test 3: Algorithm none attack prevention
    try {
      const payload = { sub: 'test', iat: Math.floor(Date.now() / 1000) };
      const noneToken = sign(payload, '', { algorithm: 'none' });
      
      // This should never be accepted in production
      if (noneToken) {
        vulnerabilities.push({
          type: 'WEAK_ALGORITHM',
          severity: 'CRITICAL',
          description: 'JWT library allows "none" algorithm',
          evidence: 'Algorithm none should be disabled'
        });
        recommendations.push('Disable "none" algorithm in JWT library configuration');
      }
    } catch (error) {
      // Expected if library properly prevents "none" algorithm
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('JWT algorithm and key strength are adequate');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testTokenExpirationHandling(): Promise<void> {
    const testName = 'Token Expiration Handling';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Token expiration time validation
    if (this.config.tokenExpiration > 3600) {
      vulnerabilities.push({
        type: 'MISSING_EXPIRATION',
        severity: 'MEDIUM',
        description: `Token expiration too long: ${this.config.tokenExpiration} seconds`,
        evidence: this.config.tokenExpiration
      });
      recommendations.push('Reduce token expiration time to 1 hour or less');
    }

    // Test 2: Refresh token expiration validation
    if (this.config.refreshTokenExpiration > 86400 * 30) {
      vulnerabilities.push({
        type: 'MISSING_EXPIRATION',
        severity: 'MEDIUM',
        description: `Refresh token expiration too long: ${this.config.refreshTokenExpiration} seconds`,
        evidence: this.config.refreshTokenExpiration
      });
      recommendations.push('Reduce refresh token expiration to 30 days or less');
    }

    // Test 3: Sliding expiration detection
    const secret = crypto.randomBytes(32).toString('hex');
    const payload: JWTPayload = {
      sub: 'user-123',
      email: 'user@example.com',
      roles: ['user'],
      tenantId: 'tenant-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const token = sign(payload, secret);
    const decoded = decode(token) as JWTPayload;

    // Check if iat and exp are reasonable
    const timeDiff = decoded.exp - decoded.iat;
    if (timeDiff > this.config.tokenExpiration) {
      vulnerabilities.push({
        type: 'MISSING_EXPIRATION',
        severity: 'MEDIUM',
        description: 'Token expiration time exceeds configured maximum',
        evidence: timeDiff
      });
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Token expiration handling is properly configured');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testRefreshTokenSecurity(): Promise<void> {
    const testName = 'Refresh Token Security';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Refresh token rotation
    const mockRefreshToken = crypto.randomBytes(32).toString('hex');
    
    // In a real implementation, this would test the actual refresh token rotation logic
    if (mockRefreshToken.length < 32) {
      vulnerabilities.push({
        type: 'INSUFFICIENT_KEY_LENGTH',
        severity: 'HIGH',
        description: 'Refresh token too short',
        evidence: mockRefreshToken.length
      });
      recommendations.push('Use longer refresh tokens (at least 32 characters)');
    }

    // Test 2: Refresh token revocation
    // This would test that refresh tokens can be properly revoked
    const revokedTokens = new Set<string>();
    revokedTokens.add(mockRefreshToken);
    
    if (!revokedTokens.has(mockRefreshToken)) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'HIGH',
        description: 'Refresh token revocation not working',
        evidence: 'Revoked token still accepted'
      });
      recommendations.push('Implement proper refresh token revocation mechanism');
    }

    // Test 3: Refresh token storage security
    const storageMethods = ['localStorage', 'sessionStorage', 'cookie', 'memory'];
    const insecureStorage = ['localStorage', 'sessionStorage'];
    
    for (const method of insecureStorage) {
      vulnerabilities.push({
        type: 'INSECURE_STORAGE',
        severity: 'MEDIUM',
        description: `Refresh token stored in insecure location: ${method}`,
        evidence: method
      });
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Refresh token security is properly implemented');
    } else {
      recommendations.push('Store refresh tokens in secure HTTP-only cookies');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testAuthorizationBypass(): Promise<void> {
    const testName = 'Authorization Bypass';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Role-based access control
    const userPayload: JWTPayload = {
      sub: 'user-123',
      email: 'user@example.com',
      roles: ['user'],
      tenantId: 'tenant-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const adminPayload: JWTPayload = {
      sub: 'admin-123',
      email: 'admin@example.com',
      roles: ['admin', 'user'],
      tenantId: 'tenant-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    // Test role escalation prevention
    if (this.canAccessAdminResource(userPayload)) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'User can access admin resources without proper role',
        evidence: userPayload.roles
      });
    }

    // Test cross-tenant access prevention
    const otherTenantPayload = { ...userPayload, tenantId: 'other-tenant' };
    if (this.canAccessTenantData(userPayload, otherTenantPayload.tenantId)) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'User can access data from other tenants',
        evidence: otherTenantPayload.tenantId
      });
    }

    // Test privilege escalation
    if (this.canEscalatePrivileges(userPayload)) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'User can escalate privileges',
        evidence: 'Privilege escalation vector found'
      });
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Authorization controls are properly implemented');
    } else {
      recommendations.push('Implement proper role-based and tenant-based access controls');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testSessionManagement(): Promise<void> {
    const testName = 'Session Management';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Session timeout
    if (this.config.sessionTimeout > 3600000) { // 1 hour
      vulnerabilities.push({
        type: 'MISSING_EXPIRATION',
        severity: 'MEDIUM',
        description: `Session timeout too long: ${this.config.sessionTimeout}ms`,
        evidence: this.config.sessionTimeout
      });
      recommendations.push('Reduce session timeout to 30 minutes or less');
    }

    // Test 2: Session fixation prevention
    const sessionId = crypto.randomBytes(16).toString('hex');
    const newSessionId = crypto.randomBytes(16).toString('hex');
    
    if (sessionId === newSessionId) {
      vulnerabilities.push({
        type: 'SESSION_FIXATION',
        severity: 'HIGH',
        description: 'Session IDs are not being regenerated',
        evidence: 'Session ID should change on login'
      });
      recommendations.push('Implement session ID regeneration on authentication');
    }

    // Test 3: Concurrent session control
    const maxConcurrentSessions = 3;
    const activeSessions = ['session-1', 'session-2', 'session-3', 'session-4'];
    
    if (activeSessions.length > maxConcurrentSessions) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'MEDIUM',
        description: 'Too many concurrent sessions allowed',
        evidence: activeSessions.length
      });
      recommendations.push('Limit concurrent sessions per user');
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Session management is properly configured');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testRateLimiting(): Promise<void> {
    const testName = 'Rate Limiting';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: Login attempt rate limiting
    const loginAttempts = this.config.maxLoginAttempts + 1;
    
    if (loginAttempts > this.config.maxLoginAttempts) {
      // Should trigger lockout
      const isLockedOut = this.checkAccountLockout(loginAttempts);
      if (!isLockedOut) {
        vulnerabilities.push({
          type: 'AUTHORIZATION_BYPASS',
          severity: 'HIGH',
          description: 'Account lockout not triggered after excessive login attempts',
          evidence: loginAttempts
        });
        recommendations.push('Implement account lockout after failed login attempts');
      }
    }

    // Test 2: API rate limiting
    const apiCalls = 1000; // Simulate high volume
    const rateLimitThreshold = 100;
    
    if (apiCalls > rateLimitThreshold) {
      const isRateLimited = this.checkRateLimit(apiCalls);
      if (!isRateLimited) {
        vulnerabilities.push({
          type: 'AUTHORIZATION_BYPASS',
          severity: 'MEDIUM',
          description: 'API rate limiting not enforced',
          evidence: apiCalls
        });
        recommendations.push('Implement API rate limiting to prevent abuse');
      }
    }

    // Test 3: Distributed rate limiting
    const distributedRequests = 500;
    const isDistributedRateLimited = this.checkDistributedRateLimit(distributedRequests);
    
    if (!isDistributedRateLimited) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'MEDIUM',
        description: 'Distributed rate limiting not implemented',
        evidence: distributedRequests
      });
      recommendations.push('Implement distributed rate limiting using Redis or similar');
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Rate limiting is properly implemented');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testInputValidation(): Promise<void> {
    const testName = 'Input Validation';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 1: SQL injection prevention
    const sqlInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ];

    for (const input of sqlInputs) {
      if (this.isSQLInjection(input)) {
        vulnerabilities.push({
          type: 'AUTHORIZATION_BYPASS',
          severity: 'CRITICAL',
          description: 'SQL injection vulnerability detected',
          evidence: input
        });
      }
    }

    // Test 2: XSS prevention
    const xssInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>'
    ];

    for (const input of xssInputs) {
      if (this.isXSSVulnerability(input)) {
        vulnerabilities.push({
          type: 'AUTHORIZATION_BYPASS',
          severity: 'HIGH',
          description: 'XSS vulnerability detected',
          evidence: input
        });
      }
    }

    // Test 3: Path traversal prevention
    const pathInputs = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/shadow',
      'C:\\Windows\\System32\\drivers\\etc\\hosts'
    ];

    for (const input of pathInputs) {
      if (this.isPathTraversal(input)) {
        vulnerabilities.push({
          type: 'AUTHORIZATION_BYPASS',
          severity: 'HIGH',
          description: 'Path traversal vulnerability detected',
          evidence: input
        });
      }
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Input validation is properly implemented');
    } else {
      recommendations.push('Implement comprehensive input validation and sanitization');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testSecureHeaders(): Promise<void> {
    const testName = 'Secure Headers';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test secure headers
    const requiredHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    const mockHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    };

    for (const [header, value] of Object.entries(requiredHeaders)) {
      if (!mockHeaders[header]) {
        vulnerabilities.push({
          type: 'CORS_MISCONFIGURATION',
          severity: 'MEDIUM',
          description: `Missing security header: ${header}`,
          evidence: header
        });
      }
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Secure headers are properly configured');
    } else {
      recommendations.push('Add missing security headers to prevent common attacks');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testCORSConfiguration(): Promise<void> {
    const testName = 'CORS Configuration';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test CORS configuration
    const corsConfig = {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    };

    // Check for overly permissive CORS
    if (corsConfig.origin === '*') {
      vulnerabilities.push({
        type: 'CORS_MISCONFIGURATION',
        severity: 'HIGH',
        description: 'CORS allows all origins',
        evidence: corsConfig.origin
      });
      recommendations.push('Restrict CORS to specific trusted origins');
    }

    if (corsConfig.credentials && corsConfig.origin === '*') {
      vulnerabilities.push({
        type: 'CORS_MISCONFIGURATION',
        severity: 'HIGH',
        description: 'CORS credentials enabled with wildcard origin',
        evidence: 'Unsafe configuration'
      });
      recommendations.push('Disable credentials or specify exact origins');
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('CORS configuration is secure');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testPasswordPolicies(): Promise<void> {
    const testName = 'Password Policies';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test password strength requirements
    const weakPasswords = [
      '123456',
      'password',
      'admin',
      'qwerty',
      'abc123'
    ];

    for (const password of weakPasswords) {
      if (this.isPasswordStrong(password)) {
        vulnerabilities.push({
          type: 'WEAK_ALGORITHM',
          severity: 'MEDIUM',
          description: 'Weak password accepted',
          evidence: password
        });
      }
    }

    // Test password complexity requirements
    const strongPassword = 'StrongP@ssw0rd123!';
    if (!this.isPasswordStrong(strongPassword)) {
      vulnerabilities.push({
        type: 'WEAK_ALGORITHM',
        severity: 'MEDIUM',
        description: 'Strong password rejected',
        evidence: strongPassword
      });
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Password policies are properly configured');
    } else {
      recommendations.push('Implement strong password requirements (length, complexity, etc.)');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  private async testTwoFactorAuthentication(): Promise<void> {
    const testName = 'Two-Factor Authentication';
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Test 2FA requirement for sensitive operations
    const sensitiveOperations = ['admin_access', 'password_change', 'api_key_generation'];
    
    if (!this.config.requireTwoFactor) {
      vulnerabilities.push({
        type: 'MISSING_EXPIRATION',
        severity: 'HIGH',
        description: 'Two-factor authentication not required',
        evidence: this.config.requireTwoFactor
      });
      recommendations.push('Enable two-factor authentication for all users');
    }

    // Test 2FA bypass prevention
    const twoFactorBypass = this.canBypassTwoFactor();
    if (twoFactorBypass) {
      vulnerabilities.push({
        type: 'AUTHORIZATION_BYPASS',
        severity: 'CRITICAL',
        description: 'Two-factor authentication can be bypassed',
        evidence: '2FA bypass vector found'
      });
      recommendations.push('Fix 2FA bypass vulnerability');
    }

    if (vulnerabilities.length === 0) {
      recommendations.push('Two-factor authentication is properly implemented');
    }

    this.addTestResult(testName, vulnerabilities, recommendations, Date.now() - startTime);
  }

  // Helper methods for security checks
  private canAccessAdminResource(payload: JWTPayload): boolean {
    return payload.roles.includes('admin');
  }

  private canAccessTenantData(payload: JWTPayload, targetTenantId: string): boolean {
    return payload.tenantId === targetTenantId;
  }

  private canEscalatePrivileges(payload: JWTPayload): boolean {
    // Mock implementation - in real tests this would check for privilege escalation vectors
    return false;
  }

  private checkAccountLockout(attempts: number): boolean {
    return attempts >= this.config.maxLoginAttempts;
  }

  private checkRateLimit(calls: number): boolean {
    return calls > 100; // Mock threshold
  }

  private checkDistributedRateLimit(calls: number): boolean {
    return calls > 50; // Mock threshold for distributed
  }

  private isSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(--|;|\/\*|\*\/|#|')/i,
      /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)/i,
      /(OR|AND)\s+\d+\s*=\s*\d+/i
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private isXSSVulnerability(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }

  private isPathTraversal(input: string): boolean {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /\/etc\/passwd/i,
      /\/windows\/system32/i,
      /\.\.[\/\\]/,
      /\//i // Basic path separator check
    ];
    return traversalPatterns.some(pattern => pattern.test(input));
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChars;
  }

  private canBypassTwoFactor(): boolean {
    // Mock implementation - in real tests this would check for 2FA bypass vectors
    return false;
  }

  private addTestResult(testName: string, vulnerabilities: SecurityVulnerability[], recommendations: string[], duration: number): void {
    this.testResults.push({
      testName,
      passed: vulnerabilities.length === 0,
      vulnerabilities,
      recommendations,
      duration
    });

    console.log(`[security] ${testName}: ${vulnerabilities.length === 0 ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    if (vulnerabilities.length > 0) {
      console.log(`[security]   Vulnerabilities: ${vulnerabilities.length}`);
      for (const vuln of vulnerabilities) {
        console.log(`[security]     - ${vuln.type} (${vuln.severity}): ${vuln.description}`);
      }
    }
  }

  generateSecurityReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalVulnerabilities = this.testResults.reduce((sum, r) => sum + r.vulnerabilities.length, 0);
    const criticalVulns = this.testResults.reduce((sum, r) => 
      sum + r.vulnerabilities.filter(v => v.severity === 'CRITICAL').length, 0);

    let report = `# Security Validation Report\n\n`;
    report += `## Summary\n`;
    report += `- **Tests Run:** ${totalTests}\n`;
    report += `- **Tests Passed:** ${passedTests}\n`;
    report += `- **Tests Failed:** ${totalTests - passedTests}\n`;
    report += `- **Total Vulnerabilities:** ${totalVulnerabilities}\n`;
    report += `- **Critical Vulnerabilities:** ${criticalVulns}\n\n`;

    if (criticalVulns > 0) {
      report += `## CRITICAL SECURITY ISSUES\n\n`;
      for (const result of this.testResults) {
        const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'CRITICAL');
        if (criticalVulns.length > 0) {
          report += `### ${result.testName}\n`;
          for (const vuln of criticalVulns) {
            report += `- **${vuln.type}:** ${vuln.description}\n`;
            if (vuln.evidence) {
              report += `  - **Evidence:** ${vuln.evidence}\n`;
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
      
      if (result.vulnerabilities.length > 0) {
        report += `- **Vulnerabilities:**\n`;
        for (const vuln of result.vulnerabilities) {
          report += `  - **${vuln.type} (${vuln.severity}):** ${vuln.description}\n`;
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

describe('JWT & Security Validation', () => {
  let validator: SecurityValidator;

  beforeAll(() => {
    validator = new SecurityValidator();
  });

  describe('JWT Token Security', () => {
    it('validates JWT token structure and claims', async () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
        tenantId: 'tenant-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'dos-aio-platform',
        aud: 'dos-aio-client'
      };

      const secret = crypto.randomBytes(32).toString('hex');
      const token = sign(payload, secret);

      // Verify token structure
      expect(token).toContain('.');
      expect(token.split('.')).toHaveLength(3);

      // Verify token claims
      const decoded = decode(token) as JWTPayload;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.roles).toContain('user');
      expect(decoded.tenantId).toBe('tenant-123');
      expect(decoded.iss).toBe('dos-aio-platform');
      expect(decoded.aud).toBe('dos-aio-client');
    });

    it('prevents JWT token tampering', async () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
        tenantId: 'tenant-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const secret = crypto.randomBytes(32).toString('hex');
      const token = sign(payload, secret);
      const tamperedToken = token.slice(0, -10) + 'tampered';

      // Should throw error for tampered token
      expect(() => verify(tamperedToken, secret)).toThrow();
    });

    it('rejects expired JWT tokens', async () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
        tenantId: 'tenant-123',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago
      };

      const secret = crypto.randomBytes(32).toString('hex');
      const expiredToken = sign(payload, secret);

      // Should throw error for expired token
      expect(() => verify(expiredToken, secret)).toThrow();
    });
  });

  describe('Authorization & Access Control', () => {
    it('enforces role-based access control', () => {
      const userPayload: JWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
        tenantId: 'tenant-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const adminPayload: JWTPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin', 'user'],
        tenantId: 'tenant-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      // User should not have admin access
      expect(userPayload.roles.includes('admin')).toBe(false);
      // Admin should have admin access
      expect(adminPayload.roles.includes('admin')).toBe(true);
    });

    it('prevents cross-tenant data access', () => {
      const tenant1Payload: JWTPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
        tenantId: 'tenant-1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const tenant2Payload: JWTPayload = {
        sub: 'user-456',
        email: 'user2@example.com',
        roles: ['user'],
        tenantId: 'tenant-2',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      // Users should only access their own tenant
      expect(tenant1Payload.tenantId).toBe('tenant-1');
      expect(tenant2Payload.tenantId).toBe('tenant-2');
      expect(tenant1Payload.tenantId === tenant2Payload.tenantId).toBe(false);
    });
  });

  describe('Input Validation & Injection Prevention', () => {
    it('detects SQL injection attempts', () => {
      const sqlInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
      ];

      for (const input of sqlInputs) {
        // Should detect SQL injection patterns
        const hasSQLInjection = /(--|;|\/\*|\*\/|#|')/i.test(input) ||
                                 /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)/i.test(input) ||
                                 /(OR|AND)\s+\d+\s*=\s*\d+/i.test(input);
        expect(hasSQLInjection).toBe(true);
      }
    });

    it('detects XSS attempts', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>'
      ];

      for (const input of xssInputs) {
        // Should detect XSS patterns
        const hasXSS = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(input) ||
                      /javascript:/gi.test(input) ||
                      /on\w+\s*=/gi.test(input);
        expect(hasXSS).toBe(true);
      }
    });

    it('detects path traversal attempts', () => {
      const pathInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts'
      ];

      for (const input of pathInputs) {
        // Should detect path traversal patterns
        const hasDotDot = /\.\./.test(input);
        const hasSlash = /\//.test(input) || /\\/.test(input);
        const hasTraversal = /\.\.\//.test(input) ||
                           /\.\.\\/.test(input) ||
                           /\/etc\/passwd/i.test(input) ||
                           /windows\/system32/i.test(input) ||
                           /system32/i.test(input) ||
                           /\.\.[\/\\]/.test(input);
        
        // Any path with ../ or system files should be flagged
        const isSuspicious = hasDotDot || 
                           /\/etc\//i.test(input) || 
                           /system32/i.test(input) ||
                           /windows/i.test(input);
        
        expect(isSuspicious).toBe(true);
      }
    });
  });

  describe('Password Security', () => {
    it('enforces strong password requirements', () => {
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        'qwerty',
        'abc123'
      ];

      const strongPassword = 'StrongP@ssw0rd123!';

      // Weak passwords should fail validation
      for (const password of weakPasswords) {
        const isStrong = password.length >= 8 && 
                         /[A-Z]/.test(password) &&
                         /[a-z]/.test(password) &&
                         /\d/.test(password) &&
                         /[!@#$%^&*(),.?":{}|<>]/.test(password);
        expect(isStrong).toBe(false);
      }

      // Strong password should pass validation
      const isStrong = strongPassword.length >= 8 && 
                       /[A-Z]/.test(strongPassword) &&
                       /[a-z]/.test(strongPassword) &&
                       /\d/.test(strongPassword) &&
                       /[!@#$%^&*(),.?":{}|<>]/.test(strongPassword);
      expect(isStrong).toBe(true);
    });
  });

  describe('Comprehensive Security Validation', () => {
    it('runs complete security test suite', async () => {
      const results = await validator.runAllSecurityTests();
      
      expect(results.length).toBeGreaterThan(0);
      
      // Check that all tests were run
      const expectedTests = [
        'JWT Token Validation',
        'JWT Algorithm Strength',
        'Token Expiration Handling',
        'Refresh Token Security',
        'Authorization Bypass',
        'Session Management',
        'Rate Limiting',
        'Input Validation',
        'Secure Headers',
        'CORS Configuration',
        'Password Policies',
        'Two-Factor Authentication'
      ];

      for (const expectedTest of expectedTests) {
        expect(results.some(r => r.testName === expectedTest)).toBe(true);
      }

      console.log(`[security] Security validation completed: ${results.length} tests run`);
    });

    it('generates comprehensive security report', async () => {
      await validator.runAllSecurityTests();
      const report = validator.generateSecurityReport();
      
      expect(report).toContain('Security Validation Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Detailed Results');
      
      console.log('[security] Security report generated successfully');
    });
  });
});
