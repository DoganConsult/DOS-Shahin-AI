/**
 * otel-init — bootstraps the OpenTelemetry Node SDK so all subsequent code
 * (agent runs, Claude API calls, tool execution, DB queries, HTTP) emits
 * traces to the OTLP HTTP receiver configured in OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * MUST be imported as the very first thing in main.ts so the SDK can hook
 * Node's require/import system before instrumented modules load.
 *
 * Activates only when OTEL_TRACING_ENABLED=true. Otherwise no-op.
 *
 * Note: this file is ESM (the engine sets "type":"module"); we use top-level
 * await + dynamic `import` rather than CJS `require`.
 */

const ENABLED =
  process.env.OTEL_TRACING_ENABLED === 'true' || process.env.OTEL_ENABLED === 'true';

if (ENABLED) {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318';
  }
  process.env.OTEL_ENABLED = 'true';

  try {
    const sdkNode = await import('@opentelemetry/sdk-node');
    const otlpHttp = await import('@opentelemetry/exporter-trace-otlp-http');
    const auto = await import('@opentelemetry/auto-instrumentations-node');
    const resources = await import('@opentelemetry/resources');
    const sem = await import('@opentelemetry/semantic-conventions');

    const sdk = new sdkNode.NodeSDK({
      resource: resources.resourceFromAttributes({
        [sem.ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'ai-engine-service',
        [sem.ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.1.0',
        'deployment.environment': process.env.NODE_ENV || 'production',
      }),
      traceExporter: new otlpHttp.OTLPTraceExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      }),
      instrumentations: [
        auto.getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();

    const shutdown = (): void => {
      sdk
        .shutdown()
        .catch((err: Error) => console.error('[otel] shutdown failed', err))
        .finally(() => process.exit(0));
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    console.log(
      `[otel] tracing enabled → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces ` +
        `(service=${process.env.OTEL_SERVICE_NAME || 'ai-engine-service'})`,
    );
  } catch (err) {
    console.warn('[otel] failed to initialise SDK — tracing disabled:', (err as Error).message);
  }
}

export {};
