import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
  uptime: number;
  version: string;
  environment: string;
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  details?: any;
}

interface SLOMetrics {
  availability: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number;
  lastUpdated: string;
}

interface CustomMetrics {
  businessMetrics: Record<string, number>;
  operationalMetrics: Record<string, number>;
  userMetrics: Record<string, number>;
}

class HealthMetricsTracing {
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private startTime: number;
  
  // Prometheus metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private activeConnections: Gauge<string>;
  private databaseConnections: Gauge<string>;
  private customMetrics: Map<string, Counter<string> | Gauge<string> | Histogram<string>>;
  
  // OpenTelemetry
  private sdk: NodeSDK;
  private tracer: any;
  
  // SLO tracking
  private sloMetrics: Map<string, SLOMetrics>;
  
  constructor(serviceName: string, config: any = {}) {
    this.serviceName = serviceName;
    this.serviceVersion = config.version || '1.0.0';
    this.environment = config.environment || 'development';
    this.startTime = Date.now();
    
    this.customMetrics = new Map();
    this.sloMetrics = new Map();
    
    this.initializePrometheus();
    this.initializeOpenTelemetry(config);
    this.initializeSLOTracking();
  }

  private initializePrometheus(): void {
    // Enable default metrics collection
    collectDefaultMetrics({
      prefix: `${this.serviceName}_`,
      labelNames: ['service', 'version', 'environment']
    });

    // Custom HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: `${this.serviceName}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new Counter({
      name: `${this.serviceName}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tenant_id']
    });

    this.activeConnections = new Gauge({
      name: `${this.serviceName}_active_connections`,
      help: 'Number of active connections',
      labelNames: ['type']
    });

    this.databaseConnections = new Gauge({
      name: `${this.serviceName}_database_connections`,
      help: 'Number of database connections',
      labelNames: ['database', 'state']
    });
  }

  private initializeOpenTelemetry(config: any): void {
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.environment,
      }),
      traceExporter: new OTLPTraceExporter({
        url: config.tracing?.endpoint || 'http://localhost:4318/v1/traces',
        headers: config.tracing?.headers || {}
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: config.metrics?.endpoint || 'http://localhost:4318/v1/metrics',
          headers: config.metrics?.headers || {}
        }),
        exportIntervalMillis: config.metrics?.interval || 30000
      }),
      spanProcessors: [
        new SimpleSpanProcessor(new OTLPTraceExporter({
          url: config.tracing?.endpoint || 'http://localhost:4318/v1/traces'
        }))
      ]
    });

    this.sdk.start();
    this.tracer = trace.getTracer(this.serviceName);
  }

  private initializeSLOTracking(): void {
    // Initialize default SLOs
    this.sloMetrics.set('api_availability', {
      availability: 99.9,
      latency: { p50: 100, p95: 500, p99: 1000 },
      errorRate: 0.1,
      throughput: 1000,
      lastUpdated: new Date().toISOString()
    });

    this.sloMetrics.set('database_availability', {
      availability: 99.5,
      latency: { p50: 50, p95: 200, p99: 500 },
      errorRate: 0.5,
      throughput: 500,
      lastUpdated: new Date().toISOString()
    });
  }

  // Health check methods
  async performHealthCheck(): Promise<HealthCheck> {
    const checks: Record<string, HealthCheckResult> = {};
    
    // Database health check
    checks.database = await this.checkDatabase();
    
    // Redis health check
    checks.redis = await this.checkRedis();
    
    // External services health check
    checks.external_services = await this.checkExternalServices();
    
    // Memory health check
    checks.memory = this.checkMemory();
    
    // Disk space health check
    checks.disk = this.checkDisk();
    
    // Overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus = this.calculateOverallStatus(statuses);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Date.now() - this.startTime,
      version: this.serviceVersion,
      environment: this.environment
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Simulate database health check
      await this.simulateDatabaseQuery();
      
      return {
        status: 'pass',
        duration: Date.now() - start,
        message: 'Database is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        duration: Date.now() - start,
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Simulate Redis health check
      await this.simulateRedisPing();
      
      return {
        status: 'pass',
        duration: Date.now() - start,
        message: 'Redis is healthy'
      };
    } catch (error) {
      return {
        status: 'fail',
        duration: Date.now() - start,
        message: 'Redis connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheckResult> {
    const start = Date.now();
    const services = ['auth-service', 'tenant-service', 'notification-service'];
    const results: Record<string, string> = {};
    
    for (const service of services) {
      try {
        await this.simulateServiceCheck(service);
        results[service] = 'healthy';
      } catch (error) {
        results[service] = 'unhealthy';
      }
    }
    
    const unhealthyCount = Object.values(results).filter(r => r === 'unhealthy').length;
    const status = unhealthyCount === 0 ? 'pass' : unhealthyCount < services.length ? 'warn' : 'fail';
    
    return {
      status,
      duration: Date.now() - start,
      message: `${services.length - unhealthyCount}/${services.length} services healthy`,
      details: results
    };
  }

  private checkMemory(): HealthCheckResult {
    const start = Date.now();
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    let status: 'pass' | 'warn' | 'fail';
    if (memoryUsagePercent < 70) status = 'pass';
    else if (memoryUsagePercent < 90) status = 'warn';
    else status = 'fail';
    
    return {
      status,
      duration: Date.now() - start,
      message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      details: {
        heapUsed: usedMemory,
        heapTotal: totalMemory,
        external: memUsage.external,
        rss: memUsage.rss
      }
    };
  }

  private checkDisk(): HealthCheckResult {
    const start = Date.now();
    
    // Simulate disk check (in production, use actual disk stats)
    const diskUsage = 65; // Simulated percentage
    
    let status: 'pass' | 'warn' | 'fail';
    if (diskUsage < 70) status = 'pass';
    else if (diskUsage < 85) status = 'warn';
    else status = 'fail';
    
    return {
      status,
      duration: Date.now() - start,
      message: `Disk usage: ${diskUsage}%`,
      details: { usage: diskUsage }
    };
  }

  private calculateOverallStatus(statuses: ('pass' | 'warn' | 'fail')[]): 'healthy' | 'degraded' | 'unhealthy' {
    const failCount = statuses.filter(s => s === 'fail').length;
    const warnCount = statuses.filter(s => s === 'warn').length;
    
    if (failCount > 0) return 'unhealthy';
    if (warnCount > 0) return 'degraded';
    return 'healthy';
  }

  // Metrics collection methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, tenantId?: string): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      tenant_id: tenantId || 'unknown'
    };
    
    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestTotal.inc(labels);
  }

  setActiveConnections(type: string, count: number): void {
    this.activeConnections.set({ type }, count);
  }

  setDatabaseConnections(database: string, state: string, count: number): void {
    this.databaseConnections.set({ database, state }, count);
  }

  // Custom metrics
  createCounter(name: string, help: string, labelNames?: string[]): Counter<string> {
    const counter = new Counter({
      name: `${this.serviceName}_${name}`,
      help,
      labelNames: labelNames || []
    });
    
    this.customMetrics.set(name, counter);
    return counter;
  }

  createGauge(name: string, help: string, labelNames?: string[]): Gauge<string> {
    const gauge = new Gauge({
      name: `${this.serviceName}_${name}`,
      help,
      labelNames: labelNames || []
    });
    
    this.customMetrics.set(name, gauge);
    return gauge;
  }

  createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): Histogram<string> {
    const histogram = new Histogram({
      name: `${this.serviceName}_${name}`,
      help,
      labelNames: labelNames || [],
      buckets: buckets || [0.1, 0.5, 1, 2, 5, 10]
    });
    
    this.customMetrics.set(name, histogram);
    return histogram;
  }

  // Business metrics
  recordBusinessMetric(metricName: string, value: number, labels?: Record<string, string>): void {
    const counter = this.customMetrics.get(metricName) as Counter<string>;
    if (counter) {
      counter.inc(labels || {}, value);
    }
  }

  recordOperationalMetric(metricName: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.customMetrics.get(metricName) as Gauge<string>;
    if (gauge) {
      gauge.set(labels || {}, value);
    }
  }

  recordUserMetric(metricName: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.customMetrics.get(metricName) as Histogram<string>;
    if (histogram) {
      histogram.observe(labels || {}, value);
    }
  }

  // SLO tracking
  updateSLO(sloName: string, metrics: Partial<SLOMetrics>): void {
    const current = this.sloMetrics.get(sloName);
    if (current) {
      this.sloMetrics.set(sloName, {
        ...current,
        ...metrics,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  getSLOMetrics(): Record<string, SLOMetrics> {
    return Object.fromEntries(this.sloMetrics);
  }

  // Distributed tracing
  createSpan(name: string, attributes?: Record<string, string>): any {
    const span = this.tracer.startSpan(name, {
      attributes: {
        'service.name': this.serviceName,
        'service.version': this.serviceVersion,
        ...attributes
      }
    });
    
    return span;
  }

  traceAsyncOperation<T>(
    name: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string>
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, { attributes }, async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ 
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Sampling configuration
  configureSampling(config: {
    traceIdRatio?: number;
    parentBased?: boolean;
    alwaysOn?: boolean;
  }): void {
    // Implementation would configure sampling based on config
    console.log('Sampling configured:', config);
  }

  // Alerting integration
  checkSLOAlerts(): Array<{ slo: string; alert: string; severity: string }> {
    const alerts: Array<{ slo: string; alert: string; severity: string }> = [];
    
    for (const [sloName, metrics] of this.sloMetrics) {
      // Check availability
      if (metrics.availability < 99) {
        alerts.push({
          slo: sloName,
          alert: `Availability below threshold: ${metrics.availability}%`,
          severity: 'critical'
        });
      }
      
      // Check latency
      if (metrics.latency.p95 > 1000) {
        alerts.push({
          slo: sloName,
          alert: `P95 latency too high: ${metrics.latency.p95}ms`,
          severity: 'warning'
        });
      }
      
      // Check error rate
      if (metrics.errorRate > 1) {
        alerts.push({
          slo: sloName,
          alert: `Error rate too high: ${metrics.errorRate}%`,
          severity: 'critical'
        });
      }
    }
    
    return alerts;
  }

  // Prometheus metrics endpoint
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
    register.clear();
  }

  // Simulation methods (replace with actual implementations)
  private async simulateDatabaseQuery(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private async simulateRedisPing(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  private async simulateServiceCheck(service: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

// Express middleware for metrics and tracing
export function createMetricsMiddleware(monitor: HealthMetricsTracing) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    // Create span for request
    const span = monitor.createSpan('http_request', {
      'http.method': req.method,
      'http.url': req.url,
      'http.user_agent': req.headers['user-agent'],
      'tenant.id': req.headers['x-tenant-id'] || 'unknown'
    });
    
    // Set active context
    context.with(trace.setSpan(context.active(), span), () => {
      // Override res.end to record metrics
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = Date.now() - start;
        const route = req.route?.path || req.path || 'unknown';
        
        monitor.recordHttpRequest(
          req.method,
          route,
          res.statusCode,
          duration,
          req.headers['x-tenant-id']
        );
        
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response_time_ms': duration
        });
        
        span.end();
        originalEnd.apply(this, args);
      };
      
      next();
    });
  };
}

// Health check endpoint handler
export function createHealthCheckHandler(monitor: HealthMetricsTracing) {
  return async (req: any, res: any) => {
    try {
      const health = await monitor.performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// Metrics endpoint handler
export function createMetricsHandler(monitor: HealthMetricsTracing) {
  return async (req: any, res: any) => {
    try {
      const metrics = await monitor.getMetrics();
      res.set('Content-Type', register.contentType);
      res.send(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  };
}

// SLO metrics endpoint handler
export function createSLOHandler(monitor: HealthMetricsTracing) {
  return async (req: any, res: any) => {
    try {
      const sloMetrics = monitor.getSLOMetrics();
      const alerts = monitor.checkSLOAlerts();
      
      res.json({
        metrics: sloMetrics,
        alerts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect SLO metrics' });
    }
  };
}

// Factory function
export function createHealthMetricsTracing(serviceName: string, config?: any): HealthMetricsTracing {
  return new HealthMetricsTracing(serviceName, config);
}

// Export types
export type { HealthCheck, HealthCheckResult, SLOMetrics, CustomMetrics };
