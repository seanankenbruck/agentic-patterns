import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function initTracing(): void {
  try {
    const serviceName = process.env.OTEL_SERVICE_NAME || 'sample-app';
    const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const environment = process.env.NODE_ENV || 'development';

    const exporters = [];

    // Always include console exporter for development
    if (environment === 'development') {
      exporters.push(new ConsoleSpanExporter());
    }

    // Add OTLP exporter if endpoint is configured
    if (otlpEndpoint) {
      exporters.push(new OTLPTraceExporter({
        url: `${otlpEndpoint}/v1/traces`,
        headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
          JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
      }));
    }

    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      }),
      traceExporter: exporters.length > 1 ? 
        new (require('@opentelemetry/sdk-trace-base').MultiSpanExporter)(exporters) :
        exporters[0],
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
          },
        }),
      ],
    });

    sdk.start();
    console.log('OpenTelemetry tracing initialized successfully');
    
    process.on('SIGTERM', () => {
      sdk?.shutdown()
        .then(() => console.log('OpenTelemetry tracing terminated'))
        .catch((error) => console.error('Error terminating OpenTelemetry tracing', error))
        .finally(() => process.exit(0));
    });

  } catch (error) {
    console.error('Error initializing OpenTelemetry tracing:', error);
    throw error;
  }
}

export function getTracer(name: string) {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name);
}

export function shutdown(): Promise<void> {
  return sdk?.shutdown() ?? Promise.resolve();
}