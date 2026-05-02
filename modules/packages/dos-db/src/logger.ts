import pino from 'pino';

let _logger: pino.Logger = pino({ name: 'dos-db', level: process.env.LOG_LEVEL || 'info' });

export function setDbLogger(logger: pino.Logger): void {
  _logger = logger;
}

export function getDbLogger(): pino.Logger {
  return _logger;
}
