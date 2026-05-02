export class PlatformMetricContract {}

export class ObservabilityService {}

export class HealthCheckContract {}

export const logger = {
  debug: (msg: string, ...args: any[]) => console.debug(msg, ...args),
  info: (msg: string, ...args: any[]) => console.info(msg, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(msg, ...args),
  error: (msg: string, ...args: any[]) => console.error(msg, ...args),
};

