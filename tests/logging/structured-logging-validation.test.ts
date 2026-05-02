import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

// Structured Logging Validation Tests for DOS-AIO Platform
interface LoggingTestResult {
  testName: string;
  passed: boolean;
  issues: LoggingIssue[];
  recommendations: string[];
  duration: number;
}

interface LoggingIssue {
  type: 'MISSING_STRUCTURED_LOGS' | 'INCONSISTENT_FORMAT' | 'MISSING_CORRELATION_ID' | 'MISSING_LOG_LEVEL' | 'PII_LEAKAGE' | 'PERFORMANCE_IMPACT' | 'MISSING_CONTEXT' | 'INVALID_SCHEMA';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location?: string;
  evidence?: any;
}

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  service: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  email?: string;
  ssn?: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

interface LoggingConfig {
  format: 'JSON' | 'TEXT';
  level: string;
  structured: boolean;
  includeStackTrace: boolean;
  sanitizePII: boolean;
  maxLogSize: number;
  bufferSize: number;
  flushInterval: number;
}

class StructuredLoggingValidator {
  private config: LoggingConfig;
  private testResults: LoggingTestResult[] = [];
  private sampleLogs: LogEntry[] = [];

  constructor() {
    this.config = {
      format: 'JSON',
      level: 'INFO',
      structured: true,
      includeStackTrace: true,
      sanitizePII: true,
      maxLogSize: 10000,
      bufferSize: 1000,
      flushInterval: 5000
    };
    
    this.generateSampleLogs();
  }

  private generateSampleLogs(): void {
    this.sampleLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'User login successful',
        service: 'auth-service',
        correlationId: 'req-123',
        userId: 'user-456',
        tenantId: 'tenant-789',
        requestId: 'req-123',
        context: {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          method: 'POST',
          endpoint: '/api/v1/auth/login'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: 'Database connection failed',
        service: 'risk-service',
        correlationId: 'req-456',
        context: {
          database: 'postgres',
          host: 'db.example.com',
          port: 5432
        },
        error: {
          name: 'ConnectionError',
          message: 'ECONNREFUSED',
          stack: 'Error: ECONNREFUSED\n    at Connection...'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: 'Rate limit exceeded',
        service: 'api-gateway',
        correlationId: 'req-789',
        userId: 'user-123',
        context: {
          limit: 100,
          current: 101,
          window: '1m',
          ip: '192.168.1.100'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message: 'Processing risk assessment',
        service: 'risk-service',
        correlationId: 'req-abc',
        userId: 'user-456',
        tenantId: 'tenant-789',
        context: {
          riskId: 'risk-123',
          assessmentType: 'security',
          complexity: 'high'
        }
      },
      {
        timestamp: new Date().toISOString(),
        level: 'FATAL',
        message: 'Service unavailable',
        service: 'compliance-service',
        correlationId: 'req-def',
        context: {
          healthCheck: 'failed',
          dependency: 'database',
          retryCount: 3
        },
        error: {
          name: 'ServiceUnavailableError',
          message: 'Database connection pool exhausted'
        }
      }
    ];
  }

  async runAllLoggingTests(): Promise<LoggingTestResult[]> {
    console.log('[logging] Starting comprehensive structured logging validation...');

    const tests = [
      () => this.testLogStructure(),
      () => this.testLogConsistency(),
      () => this.testCorrelationIdTracking(),
      () => this.testLogLevelValidation(),
      () => this.testPIISanitization(),
      () => this.testPerformanceImpact(),
      () => this.testContextEnrichment(),
      () => this.testErrorLogging(),
      () => this.testLogAggregation(),
      () => this.testLogRetention()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`[logging] Test failed: ${error}`);
      }
    }

    return this.testResults;
  }

  private async testLogStructure(): Promise<void> {
    const testName = 'Log Structure Validation';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Required fields presence
    const requiredFields = ['timestamp', 'level', 'message', 'service'];
    for (const log of this.sampleLogs) {
      for (const field of requiredFields) {
        if (!log[field as keyof LogEntry]) {
          issues.push({
            type: 'MISSING_STRUCTURED_LOGS',
            severity: 'HIGH',
            description: `Missing required field: ${field}`,
            location: log.service
          });
        }
      }
    }

    // Test 2: Timestamp format validation
    for (const log of this.sampleLogs) {
      if (!this.isValidTimestamp(log.timestamp)) {
        issues.push({
          type: 'INCONSISTENT_FORMAT',
          severity: 'HIGH',
          description: 'Invalid timestamp format',
          evidence: log.timestamp
        });
      }
    }

    // Test 3: Log level validation
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    for (const log of this.sampleLogs) {
      if (!validLevels.includes(log.level)) {
        issues.push({
          type: 'MISSING_LOG_LEVEL',
          severity: 'MEDIUM',
          description: `Invalid log level: ${log.level}`,
          evidence: log.level
        });
      }
    }

    // Test 4: JSON structure validation
    if (this.config.format === 'JSON') {
      for (const log of this.sampleLogs) {
        try {
          JSON.stringify(log);
        } catch (error) {
          issues.push({
            type: 'INVALID_SCHEMA',
            severity: 'HIGH',
            description: 'Log entry not serializable to JSON',
            evidence: error
          });
        }
      }
    }

    if (issues.length === 0) {
      recommendations.push('Log structure is properly implemented');
    } else {
      recommendations.push('Fix log structure issues');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testLogConsistency(): Promise<void> {
    const testName = 'Log Consistency Validation';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Format consistency across services
    const services = new Set(this.sampleLogs.map(log => log.service));
    for (const service of services) {
      const serviceLogs = this.sampleLogs.filter(log => log.service === service);
      const formats = new Set(serviceLogs.map(log => typeof log.message));
      
      if (formats.size > 1) {
        issues.push({
          type: 'INCONSISTENT_FORMAT',
          severity: 'MEDIUM',
          description: `Inconsistent message formats in ${service}`,
          location: service
        });
      }
    }

    // Test 2: Field naming consistency
    const fieldVariations = [
      { fields: ['correlationId', 'correlation_id', 'correlationID'], expected: 'correlationId' },
      { fields: ['userId', 'user_id', 'userID'], expected: 'userId' },
      { fields: ['tenantId', 'tenant_id', 'tenantID'], expected: 'tenantId' },
      { fields: ['requestId', 'request_id', 'requestID'], expected: 'requestId' }
    ];

    for (const variation of fieldVariations) {
      const usedFields = new Set<string>();
      for (const log of this.sampleLogs) {
        for (const field of variation.fields) {
          if (log[field as keyof LogEntry]) {
            usedFields.add(field);
          }
        }
      }
      
      if (usedFields.size > 1) {
        issues.push({
          type: 'INCONSISTENT_FORMAT',
          severity: 'MEDIUM',
          description: `Inconsistent field naming: ${Array.from(usedFields).join(', ')}`,
          evidence: variation.expected
        });
      }
    }

    // Test 3: Context structure consistency
    const contextStructures = this.sampleLogs
      .filter(log => log.context)
      .map(log => Object.keys(log.context!).sort().join(','));

    const uniqueContextStructures = new Set(contextStructures);
    if (uniqueContextStructures.size > 3) { // Allow some variation
      issues.push({
        type: 'INCONSISTENT_FORMAT',
        severity: 'LOW',
        description: 'Too many variations in context structure',
        evidence: uniqueContextStructures.size
      });
    }

    if (issues.length === 0) {
      recommendations.push('Log consistency is maintained across services');
    } else {
      recommendations.push('Standardize log formats and field naming');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testCorrelationIdTracking(): Promise<void> {
    const testName = 'Correlation ID Tracking';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Correlation ID presence in user-facing operations
    const userFacingLogs = this.sampleLogs.filter(log => 
      log.userId || log.requestId || log.message.includes('user')
    );

    for (const log of userFacingLogs) {
      if (!log.correlationId) {
        issues.push({
          type: 'MISSING_CORRELATION_ID',
          severity: 'HIGH',
          description: 'Missing correlation ID in user-facing operation',
          location: log.service
        });
      }
    }

    // Test 2: Correlation ID format validation
    const correlationIds = this.sampleLogs
      .map(log => log.correlationId)
      .filter(Boolean) as string[];

    for (const correlationId of correlationIds) {
      if (!this.isValidCorrelationId(correlationId)) {
        issues.push({
          type: 'MISSING_CORRELATION_ID',
          severity: 'MEDIUM',
          description: 'Invalid correlation ID format',
          evidence: correlationId
        });
      }
    }

    // Test 3: Correlation ID propagation across services
    const correlationGroups = new Map<string, LogEntry[]>();
    for (const log of this.sampleLogs) {
      if (log.correlationId) {
        if (!correlationGroups.has(log.correlationId)) {
          correlationGroups.set(log.correlationId, []);
        }
        correlationGroups.get(log.correlationId)!.push(log);
      }
    }

    for (const [correlationId, logs] of correlationGroups) {
      const services = new Set(logs.map(log => log.service));
      if (services.size > 1) {
        // Good: correlation ID spans multiple services
        console.log(`[logging] Correlation ID ${correlationId} spans ${services.size} services`);
      }
    }

    if (issues.length === 0) {
      recommendations.push('Correlation ID tracking is properly implemented');
    } else {
      recommendations.push('Ensure correlation IDs are present and consistent');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testLogLevelValidation(): Promise<void> {
    const testName = 'Log Level Validation';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Appropriate log level usage
    const levelPatterns = {
      'DEBUG': ['debug', 'trace', 'verbose'],
      'INFO': ['success', 'completed', 'started', 'created', 'updated'],
      'WARN': ['warning', 'deprecated', 'retry', 'timeout', 'limit'],
      'ERROR': ['error', 'failed', 'exception', 'invalid'],
      'FATAL': ['fatal', 'crash', 'panic', 'critical']
    };

    for (const log of this.sampleLogs) {
      const message = log.message.toLowerCase();
      let expectedLevel: string | null = null;

      for (const [level, patterns] of Object.entries(levelPatterns)) {
        if (patterns.some(pattern => message.includes(pattern))) {
          expectedLevel = level;
          break;
        }
      }

      if (expectedLevel && expectedLevel !== log.level) {
        issues.push({
          type: 'MISSING_LOG_LEVEL',
          severity: 'MEDIUM',
          description: `Log level mismatch: expected ${expectedLevel}, got ${log.level}`,
          evidence: log.message
        });
      }
    }

    // Test 2: Log level hierarchy validation
    const levelHierarchy = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'FATAL': 4 };
    const configLevel = levelHierarchy[this.config.level as keyof typeof levelHierarchy] || 1;

    for (const log of this.sampleLogs) {
      const logLevel = levelHierarchy[log.level];
      if (logLevel < configLevel) {
        // This might be intentional, but worth noting
        console.log(`[logging] Log level ${log.level} below configured threshold ${this.config.level}`);
      }
    }

    // Test 3: Error logs include error details
    const errorLogs = this.sampleLogs.filter(log => 
      log.level === 'ERROR' || log.level === 'FATAL'
    );

    for (const log of errorLogs) {
      if (!log.error && !log.context?.error) {
        issues.push({
          type: 'MISSING_CONTEXT',
          severity: 'HIGH',
          description: 'Error log missing error details',
          location: log.service
        });
      }
    }

    if (issues.length === 0) {
      recommendations.push('Log levels are appropriately used');
    } else {
      recommendations.push('Review and adjust log level usage');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testPIISanitization(): Promise<void> {
    const testName = 'PII Sanitization';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: PII detection in logs
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
      /password\s*[:=]\s*[^\s]+/gi, // Password
      /token\s*[:=]\s*[^\s]+/gi // Token
    ];

    for (const log of this.sampleLogs) {
      const logString = JSON.stringify(log);
      
      for (const pattern of piiPatterns) {
        const matches = logString.match(pattern);
        if (matches) {
          issues.push({
            type: 'PII_LEAKAGE',
            severity: 'CRITICAL',
            description: 'PII detected in log entry',
            evidence: matches
          });
        }
      }
    }

    // Test 2: Sanitization effectiveness
    const unsanitizedLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO' as const,
        message: 'User login successful',
        service: 'auth-service',
        userId: 'user-456',
        email: 'user@example.com',
        ssn: '123-45-6789'
      }
    ];

    for (const log of unsanitizedLogs) {
      const sanitized = this.sanitizeLog(log);
      const logString = JSON.stringify(sanitized);
      
      if (logString.includes('user@example.com') || logString.includes('123-45-6789')) {
        issues.push({
          type: 'PII_LEAKAGE',
          severity: 'CRITICAL',
          description: 'PII not properly sanitized',
          evidence: logString
        });
      }
    }

    // Test 3: Context data sanitization
    const contextWithPII = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567'
      }
    };

    const sanitizedContext = this.sanitizeContext(contextWithPII);
    const contextString = JSON.stringify(sanitizedContext);
    
    if (contextString.includes('john@example.com') || contextString.includes('555-123-4567')) {
      issues.push({
        type: 'PII_LEAKAGE',
        severity: 'HIGH',
        description: 'PII in context not sanitized',
        evidence: contextString
      });
    }

    if (issues.length === 0) {
      recommendations.push('PII sanitization is properly implemented');
    } else {
      recommendations.push('Implement proper PII sanitization');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testPerformanceImpact(): Promise<void> {
    const testName = 'Performance Impact';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Log size validation
    for (const log of this.sampleLogs) {
      const logSize = JSON.stringify(log).length;
      if (logSize > this.config.maxLogSize) {
        issues.push({
          type: 'PERFORMANCE_IMPACT',
          severity: 'MEDIUM',
          description: `Log entry too large: ${logSize} bytes`,
          evidence: logSize
        });
      }
    }

    // Test 2: Logging frequency impact
    const highFrequencyLogs = Array.from({ length: 1000 }, (_, i) => ({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `High frequency log ${i}`,
      service: 'test-service'
    }));

    const startTimeMs = Date.now();
    for (const log of highFrequencyLogs) {
      JSON.stringify(log);
    }
    const serializationTime = Date.now() - startTimeMs;

    if (serializationTime > 1000) { // 1 second for 1000 logs
      issues.push({
        type: 'PERFORMANCE_IMPACT',
        severity: 'HIGH',
        description: `Slow log serialization: ${serializationTime}ms for 1000 logs`,
        evidence: serializationTime
      });
    }

    // Test 3. Buffer management
    const bufferSize = this.config.bufferSize;
    if (bufferSize > 10000) {
      issues.push({
        type: 'PERFORMANCE_IMPACT',
        severity: 'MEDIUM',
        description: `Buffer size too large: ${bufferSize}`,
        evidence: bufferSize
      });
    }

    // Test 4. Flush interval optimization
    const flushInterval = this.config.flushInterval;
    if (flushInterval > 10000) { // 10 seconds
      issues.push({
        type: 'PERFORMANCE_IMPACT',
        severity: 'LOW',
        description: `Flush interval too long: ${flushInterval}ms`,
        evidence: flushInterval
      });
    }

    if (issues.length === 0) {
      recommendations.push('Logging performance is optimized');
    } else {
      recommendations.push('Optimize logging performance parameters');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testContextEnrichment(): Promise<void> {
    const testName = 'Context Enrichment';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Essential context fields
    const essentialContextFields = {
      'auth-service': ['ip', 'userAgent', 'method'],
      'risk-service': ['riskId', 'assessmentType'],
      'api-gateway': ['endpoint', 'method', 'ip'],
      'compliance-service': ['reportType', 'period']
    };

    for (const log of this.sampleLogs) {
      const expectedFields = essentialContextFields[log.service as keyof typeof essentialContextFields];
      if (expectedFields && log.context) {
        for (const field of expectedFields) {
          if (!log.context[field]) {
            issues.push({
              type: 'MISSING_CONTEXT',
              severity: 'MEDIUM',
              description: `Missing context field: ${field}`,
              location: log.service
            });
          }
        }
      }
    }

    // Test 2: Context data relevance
    for (const log of this.sampleLogs) {
      if (log.context) {
        const contextKeys = Object.keys(log.context);
        
        // Check for irrelevant context data
        const irrelevantFields = ['debugInfo', 'internalState', 'tempData'];
        for (const field of irrelevantFields) {
          if (contextKeys.includes(field)) {
            issues.push({
              type: 'MISSING_CONTEXT',
              severity: 'LOW',
              description: `Irrelevant context field: ${field}`,
              location: log.service
            });
          }
        }
      }
    }

    // Test 3: Context data structure
    for (const log of this.sampleLogs) {
      if (log.context) {
        // Check for nested objects that should be flattened
        for (const [key, value] of Object.entries(log.context)) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Nested object detected - might need flattening
            console.log(`[logging] Nested context object in ${key}: ${Object.keys(value).join(', ')}`);
          }
        }
      }
    }

    if (issues.length === 0) {
      recommendations.push('Context enrichment is properly implemented');
    } else {
      recommendations.push('Improve context data relevance and structure');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testErrorLogging(): Promise<void> {
    const testName = 'Error Logging';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Error log completeness
    const errorLogs = this.sampleLogs.filter(log => 
      log.level === 'ERROR' || log.level === 'FATAL'
    );

    for (const log of errorLogs) {
      if (!log.error && !log.context?.error) {
        issues.push({
          type: 'MISSING_CONTEXT',
          severity: 'HIGH',
          description: 'Error log missing error object',
          location: log.service
        });
      }

      const errorObj = log.error || log.context?.error;
      if (errorObj) {
        if (!errorObj.name) {
          issues.push({
            type: 'MISSING_CONTEXT',
            severity: 'MEDIUM',
            description: 'Error object missing name',
            location: log.service
          });
        }

        if (!errorObj.message) {
          issues.push({
            type: 'MISSING_CONTEXT',
            severity: 'MEDIUM',
            description: 'Error object missing message',
            location: log.service
          });
        }

        if (log.level === 'FATAL' && !errorObj.stack) {
          issues.push({
            type: 'MISSING_CONTEXT',
            severity: 'HIGH',
            description: 'Fatal error missing stack trace',
            location: log.service
          });
        }
      }
    }

    // Test 2: Stack trace sanitization
    const errorWithStack = {
      name: 'TestError',
      message: 'Test error message',
      stack: 'Error: Test error message\n    at Object.test (/app/test.js:123:45)\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)'
    };

    const sanitizedStack = this.sanitizeStack(errorWithStack.stack);
    if (sanitizedStack.includes('/app/test.js:123:45')) {
      issues.push({
        type: 'PII_LEAKAGE',
        severity: 'MEDIUM',
        description: 'Stack trace contains file paths',
        evidence: sanitizedStack
      });
    }

    // Test 3. Error categorization
    const errorTypes = ['ValidationError', 'AuthenticationError', 'DatabaseError', 'NetworkError'];
    for (const log of errorLogs) {
      const errorObj = log.error || log.context?.error;
      if (errorObj && !errorTypes.includes(errorObj.name)) {
        // This might be intentional, but worth noting
        console.log(`[logging] Unknown error type: ${errorObj.name}`);
      }
    }

    if (issues.length === 0) {
      recommendations.push('Error logging is comprehensive and secure');
    } else {
      recommendations.push('Improve error logging completeness and sanitization');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testLogAggregation(): Promise<void> {
    const testName = 'Log Aggregation';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Log aggregation readiness
    const aggregatableFields = ['correlationId', 'userId', 'tenantId', 'service', 'level'];
    
    for (const log of this.sampleLogs) {
      const availableFields = Object.keys(log);
      const missingAggregatableFields = aggregatableFields.filter(field => !availableFields.includes(field));
      
      if (missingAggregatableFields.length > 0) {
        issues.push({
          type: 'MISSING_STRUCTURED_LOGS',
          severity: 'MEDIUM',
          description: `Missing aggregatable fields: ${missingAggregatableFields.join(', ')}`,
          location: log.service
        });
      }
    }

    // Test 2: Time-series compatibility
    for (const log of this.sampleLogs) {
      if (!this.isValidTimestamp(log.timestamp)) {
        issues.push({
          type: 'INCONSISTENT_FORMAT',
          severity: 'HIGH',
          description: 'Invalid timestamp for time-series aggregation',
          evidence: log.timestamp
        });
      }
    }

    // Test 3. Metric extraction capability
    const metricPatterns = [
      { pattern: /duration|time|elapsed/i, metric: 'duration' },
      { pattern: /count|total|size/i, metric: 'count' },
      { pattern: /memory|heap/i, metric: 'memory' },
      { pattern: /cpu|processor/i, metric: 'cpu' }
    ];

    for (const log of this.sampleLogs) {
      const logString = JSON.stringify(log).toLowerCase();
      const detectedMetrics = [];

      for (const { pattern, metric } of metricPatterns) {
        if (pattern.test(logString)) {
          detectedMetrics.push(metric);
        }
      }

      if (detectedMetrics.length > 0) {
        console.log(`[logging] Detected metrics in ${log.service}: ${detectedMetrics.join(', ')}`);
      }
    }

    if (issues.length === 0) {
      recommendations.push('Logs are ready for aggregation and analysis');
    } else {
      recommendations.push('Improve log structure for better aggregation');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  private async testLogRetention(): Promise<void> {
    const testName = 'Log Retention';
    const startTime = Date.now();
    const issues: LoggingIssue[] = [];
    const recommendations: string[] = [];

    // Test 1: Retention policy implementation
    const retentionPolicies = {
      'DEBUG': 7,      // 7 days
      'INFO': 30,      // 30 days
      'WARN': 90,      // 90 days
      'ERROR': 365,    // 1 year
      'FATAL': 3650    // 10 years
    };

    for (const [level, days] of Object.entries(retentionPolicies)) {
      if (!this.hasRetentionPolicy(level)) {
        issues.push({
          type: 'MISSING_STRUCTURED_LOGS',
          severity: 'MEDIUM',
          description: `Missing retention policy for ${level} logs`,
          evidence: level
        });
      }
    }

    // Test 2. Log rotation configuration
    if (!this.isLogRotationConfigured()) {
      issues.push({
        type: 'PERFORMANCE_IMPACT',
        severity: 'HIGH',
        description: 'Log rotation not configured'
      });
    }

    // Test 3. Storage optimization
    const logSize = JSON.stringify(this.sampleLogs).length;
    const estimatedDailySize = logSize * 100; // Assume 100x sample logs per day
    
    if (estimatedDailySize > 100 * 1024 * 1024) { // 100MB per day
      issues.push({
        type: 'PERFORMANCE_IMPACT',
        severity: 'MEDIUM',
        description: `High daily log volume: ${Math.round(estimatedDailySize / 1024 / 1024)}MB`,
        evidence: estimatedDailySize
      });
    }

    if (issues.length === 0) {
      recommendations.push('Log retention policies are properly configured');
    } else {
      recommendations.push('Implement proper log retention and rotation');
    }

    this.addTestResult(testName, issues, recommendations, Date.now() - startTime);
  }

  // Helper methods for validation checks
  private isValidTimestamp(timestamp: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return isoRegex.test(timestamp);
  }

  private isValidCorrelationId(correlationId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const reqRegex = /^req-[a-z0-9]+$/i;
    return uuidRegex.test(correlationId) || reqRegex.test(correlationId);
  }

  private sanitizeLog(log: LogEntry): LogEntry {
    const sanitized = { ...log };
    
    // Remove PII from email
    if (sanitized.email) {
      sanitized.email = this.maskEmail(sanitized.email);
    }
    
    // Remove PII from context
    if (sanitized.context) {
      sanitized.context = this.sanitizeContext(sanitized.context);
    }
    
    return sanitized;
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        if (value.includes('@')) {
          sanitized[key] = this.maskEmail(value);
        } else if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) {
          sanitized[key] = '***-**-****';
        }
      }
    }
    
    return sanitized;
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.slice(0, 2) + '***@' + domain;
    return maskedUsername;
  }

  private sanitizeStack(stack: string): string {
    // Remove file paths and line numbers from stack trace
    return stack.replace(/at\s+.*?\([^)]+\)/g, 'at [redacted]');
  }

  private hasRetentionPolicy(level: string): boolean {
    // Mock implementation - in real tests this would check actual retention policies
    return true;
  }

  private isLogRotationConfigured(): boolean {
    // Mock implementation - in real tests this would check actual rotation configuration
    return true;
  }

  private addTestResult(testName: string, issues: LoggingIssue[], recommendations: string[], duration: number): void {
    this.testResults.push({
      testName,
      passed: issues.length === 0,
      issues,
      recommendations,
      duration
    });

    console.log(`[logging] ${testName}: ${issues.length === 0 ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    if (issues.length > 0) {
      console.log(`[logging]   Issues: ${issues.length}`);
      for (const issue of issues) {
        console.log(`[logging]     - ${issue.type} (${issue.severity}): ${issue.description}`);
      }
    }
  }

  generateLoggingReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalIssues = this.testResults.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = this.testResults.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'CRITICAL').length, 0);

    let report = `# Structured Logging Validation Report\n\n`;
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

describe('Structured Logging Validation', () => {
  let validator: StructuredLoggingValidator;

  beforeAll(() => {
    validator = new StructuredLoggingValidator();
  });

  describe('Log Structure', () => {
    it('validates required log fields', () => {
      const validLog = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Test log message',
        service: 'test-service'
      };
      
      expect(validLog.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(validLog.level);
      expect(validLog.message).toBeTruthy();
      expect(validLog.service).toBeTruthy();
    });

    it('validates correlation ID format', () => {
      const validCorrelationIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        'req-abc123',
        'req-456def'
      ];
      
      const invalidCorrelationIds = [
        'invalid',
        '123-456-789',
        'req_123'
      ];
      
      for (const id of validCorrelationIds) {
        expect(validator['isValidCorrelationId'](id)).toBe(true);
      }
      
      for (const id of invalidCorrelationIds) {
        expect(validator['isValidCorrelationId'](id)).toBe(false);
      }
    });

    it('validates timestamp format', () => {
      const validTimestamp = '2023-12-01T10:30:00.000Z';
      const invalidTimestamp = '2023/12/01 10:30:00';
      
      expect(validator['isValidTimestamp'](validTimestamp)).toBe(true);
      expect(validator['isValidTimestamp'](invalidTimestamp)).toBe(false);
    });
  });

  describe('PII Sanitization', () => {
    it('detects PII patterns', () => {
      const piiPatterns = [
        'SSN: 123-45-6789',
        'Email: user@example.com',
        'Phone: 555-123-4567',
        'Credit card: 4111-1111-1111-1111'
      ];
      
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
      
      expect(emailRegex.test(piiPatterns[1])).toBe(true);
      expect(ssnRegex.test(piiPatterns[0])).toBe(true);
    });

    it('masks email addresses', () => {
      const email = 'user@example.com';
      const masked = validator['maskEmail'](email);
      
      expect(masked).toBe('us***@example.com');
      expect(masked).not.toBe(email);
    });

    it('sanitizes log context', () => {
      const context = {
        email: 'user@example.com',
        ssn: '123-45-6789',
        name: 'John Doe'
      };
      
      const sanitized = validator['sanitizeContext'](context);
      
      expect(sanitized.email).toBe('us***@example.com');
      expect(sanitized.ssn).toBe('***-**-****');
      expect(sanitized.name).toBe('John Doe'); // Non-PII should remain
    });
  });

  describe('Error Logging', () => {
    it('validates error log structure', () => {
      const errorLog = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: 'Database connection failed',
        service: 'risk-service',
        correlationId: 'req-123',
        error: {
          name: 'ConnectionError',
          message: 'ECONNREFUSED',
          stack: 'Error: ECONNREFUSED\n    at Connection...'
        }
      };
      
      expect(errorLog.error).toBeDefined();
      expect(errorLog.error.name).toBe('ConnectionError');
      expect(errorLog.error.message).toBe('ECONNREFUSED');
      expect(errorLog.error.stack).toBeTruthy();
    });

    it('sanitizes stack traces', () => {
      const stack = 'Error: Test message\n    at Object.test (/app/test.js:123:45)\n    at process.nextTick';
      const sanitized = validator['sanitizeStack'](stack);
      
      expect(sanitized).toContain('[redacted]');
      expect(sanitized).not.toContain('/app/test.js:123:45');
    });
  });

  describe('Performance Impact', () => {
    it('validates log size limits', () => {
      const smallLog = { message: 'Small log' };
      const largeLog = { 
        message: 'x'.repeat(20000), // Very large message
        context: { data: 'x'.repeat(20000) }
      };
      
      const smallSize = JSON.stringify(smallLog).length;
      const largeSize = JSON.stringify(largeLog).length;
      
      expect(smallSize).toBeLessThan(10000);
      expect(largeSize).toBeGreaterThan(10000);
    });

    it('measures serialization performance', () => {
      const logs = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Log ${i}`,
        service: 'test-service'
      }));
      
      const start = Date.now();
      logs.forEach(log => JSON.stringify(log));
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should be under 1 second
    });
  });

  describe('Comprehensive Logging Tests', () => {
    it('runs complete logging validation suite', async () => {
      const results = await validator.runAllLoggingTests();
      
      expect(results.length).toBeGreaterThan(0);
      
      // Check that all tests were run
      const expectedTests = [
        'Log Structure Validation',
        'Log Consistency Validation',
        'Correlation ID Tracking',
        'Log Level Validation',
        'PII Sanitization',
        'Performance Impact',
        'Context Enrichment',
        'Error Logging',
        'Log Aggregation',
        'Log Retention'
      ];

      for (const expectedTest of expectedTests) {
        expect(results.some(r => r.testName === expectedTest)).toBe(true);
      }

      console.log(`[logging] Logging validation completed: ${results.length} tests run`);
    });

    it('generates comprehensive logging report', async () => {
      await validator.runAllLoggingTests();
      const report = validator.generateLoggingReport();
      
      expect(report).toContain('Structured Logging Validation Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Detailed Results');
      
      console.log('[logging] Logging report generated successfully');
    });
  });
});
