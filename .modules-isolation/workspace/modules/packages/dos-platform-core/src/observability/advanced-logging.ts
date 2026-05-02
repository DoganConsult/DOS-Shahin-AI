import pino from 'pino';
import { Writable } from 'node:stream';
import crypto from 'node:crypto';

interface LogEntry {
  level: string;
  time: string;
  pid: number;
  hostname: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  service: string;
  msg: string;
  err?: any;
  req?: any;
  res?: any;
  duration?: number;
  pii?: boolean;
  audit?: boolean;
  compliance?: string[];
}

interface PIIConfig {
  enabled: boolean;
  fields: string[];
  redactionMethod: 'mask' | 'hash' | 'remove';
  maskChar: string;
  hashAlgorithm: string;
}

interface AuditConfig {
  enabled: boolean;
  events: string[];
  retention: number; // days
  compliance: string[];
  storage: 'file' | 'database' | 'siem';
}

class AdvancedLogger {
  private logger: pino.Logger;
  private correlationIdMap = new Map<string, string>();
  private piiConfig: PIIConfig;
  private auditConfig: AuditConfig;
  private retentionPolicy: RetentionPolicy;
  private vectorPipeline?: VectorPipeline;

  constructor(serviceName: string, config: any = {}) {
    this.piiConfig = {
      enabled: config.pii?.enabled ?? true,
      fields: config.pii?.fields ?? ['email', 'phone', 'ssn', 'creditCard', 'address'],
      redactionMethod: config.pii?.redactionMethod ?? 'mask',
      maskChar: config.pii?.maskChar ?? '*',
      hashAlgorithm: config.pii?.hashAlgorithm ?? 'sha256'
    };

    this.auditConfig = {
      enabled: config.audit?.enabled ?? true,
      events: config.audit?.events ?? ['login', 'logout', 'data_access', 'permission_change'],
      retention: config.audit?.retention ?? 2555, // 7 years
      compliance: config.audit?.compliance ?? ['SOX', 'GDPR', 'HIPAA'],
      storage: config.audit?.storage ?? 'file'
    };

    this.retentionPolicy = new RetentionPolicy(config.retention ?? {});

    // Configure Pino with advanced options
    this.logger = pino({
      level: config.level ?? 'info',
      formatters: {
        level: (label: string) => ({ level: label }),
        log: (object: any) => this.formatLogEntry(object)
      },
      serializers: {
        req: this.serializeRequest.bind(this),
        res: this.serializeResponse.bind(this),
        err: pino.stdSerializers.err
      },
      hooks: {
        logMethod: this.logMethodHook.bind(this)
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      messageKey: 'msg',
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
        service: serviceName
      }
    }, this.createTransport(config));

    // Initialize Vector pipeline if configured
    if (config.vector?.enabled) {
      this.vectorPipeline = new VectorPipeline(config.vector);
    }
  }

  private createTransport(config: any): Writable {
    if (config.vector?.enabled) {
      return new VectorStream(config.vector);
    }

    if (config.file) {
      return pino.transport({
        target: 'pino/file',
        options: {
          destination: config.file,
          mkdir: true
        }
      });
    }

    return process.stdout;
  }

  private formatLogEntry(object: any): any {
    const formatted = { ...object };

    // Add correlation ID if available
    if (this.correlationIdMap.has(process.pid.toString())) {
      formatted.correlationId = this.correlationIdMap.get(process.pid.toString());
    }

    // Redact PII if enabled
    if (this.piiConfig.enabled) {
      this.redactPII(formatted);
    }

    // Add audit metadata if applicable
    if (formatted.audit) {
      formatted.auditMetadata = this.addAuditMetadata(formatted);
    }

    // Add compliance tags
    if (formatted.compliance) {
      formatted.complianceTags = this.getComplianceTags(formatted.compliance);
    }

    return formatted;
  }

  private redactPII(object: any): void {
    for (const field of this.piiConfig.fields) {
      if (object[field]) {
        switch (this.piiConfig.redactionMethod) {
          case 'mask':
            object[field] = this.maskValue(object[field]);
            break;
          case 'hash':
            object[field] = this.hashValue(object[field]);
            break;
          case 'remove':
            delete object[field];
            break;
        }
        object.pii = true;
      }
    }
  }

  private maskValue(value: string): string {
    if (typeof value !== 'string') return value;
    
    if (value.length <= 4) {
      return this.piiConfig.maskChar.repeat(value.length);
    }
    
    return value.substring(0, 2) + 
           this.piiConfig.maskChar.repeat(value.length - 4) + 
           value.substring(value.length - 2);
  }

  private hashValue(value: string): string {
    return crypto
      .createHash(this.piiConfig.hashAlgorithm)
      .update(value)
      .digest('hex')
      .substring(0, 16);
  }

  private addAuditMetadata(object: any): any {
    return {
      timestamp: new Date().toISOString(),
      source: process.env.SERVICE_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      userId: object.userId,
      tenantId: object.tenantId,
      action: object.action,
      resource: object.resource,
      outcome: object.outcome,
      ipAddress: object.ipAddress,
      userAgent: object.userAgent
    };
  }

  private getComplianceTags(compliance: string[]): string[] {
    const tags = [];
    
    if (compliance.includes('GDPR')) {
      tags.push('data-protection', 'eu-privacy');
    }
    
    if (compliance.includes('SOX')) {
      tags.push('financial-reporting', 'internal-controls');
    }
    
    if (compliance.includes('HIPAA')) {
      tags.push('healthcare', 'phi');
    }
    
    return tags;
  }

  private serializeRequest(req: any): any {
    if (!req) return undefined;

    return {
      method: req.method,
      url: req.url,
      headers: this.redactHeaders(req.headers),
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
      userAgent: req.headers['user-agent']
    };
  }

  private serializeResponse(res: any): any {
    if (!res) return undefined;

    return {
      statusCode: res.statusCode,
      headers: this.redactHeaders(res.headers),
      duration: res.responseTime
    };
  }

  private redactHeaders(headers: any): any {
    if (!headers) return {};

    const redacted = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const header of sensitiveHeaders) {
      if (redacted[header]) {
        redacted[header] = '[REDACTED]';
      }
    }

    return redacted;
  }

  private logMethodHook(method: any, level: number): any {
    return (...args: any[]) => {
      // Add correlation ID to all logs if available
      const correlationId = this.getCorrelationId();
      if (correlationId) {
        args[0] = { correlationId, ...args[0] };
      }

      // Send to Vector pipeline if configured
      if (this.vectorPipeline) {
        this.vectorPipeline.send({
          level: pino.levels.labels[level],
          timestamp: new Date().toISOString(),
          message: args[0]?.msg || args[0],
          ...args[0]
        });
      }

      return method(...args);
    };
  }

  private getCorrelationId(): string | undefined {
    return this.correlationIdMap.get(process.pid.toString());
  }

  // Public API methods
  info(message: string, meta?: any): void {
    this.logger.info(meta, message);
  }

  error(message: string, error?: Error, meta?: any): void {
    this.logger.error({ err: error, ...meta }, message);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(meta, message);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(meta, message);
  }

  // Audit logging
  audit(event: string, data: any): void {
    if (!this.auditConfig.enabled || !this.auditConfig.events.includes(event)) {
      return;
    }

    const auditEntry = {
      audit: true,
      event,
      compliance: this.auditConfig.compliance,
      ...data
    };

    this.logger.info(auditEntry, `AUDIT: ${event}`);
  }

  // Request/Response logging
  logRequest(req: any, correlationId?: string): void {
    if (correlationId) {
      this.setCorrelationId(correlationId);
    }

    this.logger.info({ req }, 'Request received');
  }

  logResponse(req: any, res: any, duration?: number): void {
    this.logger.info({ 
      req: this.serializeRequest(req), 
      res: this.serializeResponse(res),
      duration 
    }, 'Response sent');
  }

  // Correlation ID management
  setCorrelationId(correlationId: string): void {
    this.correlationIdMap.set(process.pid.toString(), correlationId);
  }

  clearCorrelationId(): void {
    this.correlationIdMap.delete(process.pid.toString());
  }

  // Configuration management
  updateLogLevel(level: string): void {
    this.logger.level = level;
  }

  updatePIIConfig(config: Partial<PIIConfig>): void {
    this.piiConfig = { ...this.piiConfig, ...config };
  }

  updateAuditConfig(config: Partial<AuditConfig>): void {
    this.auditConfig = { ...this.auditConfig, ...config };
  }

  // Health check
  healthCheck(): any {
    return {
      status: 'healthy',
      correlationIdCount: this.correlationIdMap.size,
      piiEnabled: this.piiConfig.enabled,
      auditEnabled: this.auditConfig.enabled,
      vectorConnected: this.vectorPipeline?.isConnected() ?? false,
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.correlationIdMap.clear();
    
    if (this.vectorPipeline) {
      await this.vectorPipeline.disconnect();
    }
  }
}

class RetentionPolicy {
  private retentionDays: number;
  private cleanupInterval: number;

  constructor(config: any = {}) {
    this.retentionDays = config.retentionDays ?? 30;
    this.cleanupInterval = config.cleanupInterval ?? 24 * 60 * 60 * 1000; // 24 hours

    this.startCleanupJob();
  }

  private startCleanupJob(): void {
    setInterval(() => {
      this.cleanupOldLogs();
    }, this.cleanupInterval);
  }

  private async cleanupOldLogs(): Promise<void> {
    // Implementation would clean up old log files
    console.log(`Cleaning up logs older than ${this.retentionDays} days`);
  }
}

class VectorPipeline {
  private connected: boolean = false;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.connect();
  }

  private async connect(): Promise<void> {
    // Implementation would connect to Vector
    this.connected = true;
    console.log('Connected to Vector pipeline');
  }

  send(data: any): void {
    if (!this.connected) return;

    // Implementation would send data to Vector
    console.log('Sending to Vector:', data);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Disconnected from Vector pipeline');
  }
}

class VectorStream extends Writable {
  private vectorPipeline: VectorPipeline;

  constructor(config: any) {
    super({ objectMode: true });
    this.vectorPipeline = new VectorPipeline(config);
  }

  _write(chunk: any, encoding: BufferEncoding, callback: () => void): void {
    this.vectorPipeline.send(chunk);
    callback();
  }

  _final(callback: () => void): void {
    this.vectorPipeline.disconnect().then(() => callback());
  }
}

// Middleware for Express
export function createLoggingMiddleware(logger: AdvancedLogger) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
    
    logger.setCorrelationId(correlationId);
    logger.logRequest(req, correlationId);

    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      logger.logResponse(req, res, duration);
      logger.clearCorrelationId();
      originalEnd.apply(this, args);
    };

    next();
  };
}

// Factory function
export function createLogger(serviceName: string, config?: any): AdvancedLogger {
  return new AdvancedLogger(serviceName, config);
}

// Export types
export type { LogEntry, PIIConfig, AuditConfig };
