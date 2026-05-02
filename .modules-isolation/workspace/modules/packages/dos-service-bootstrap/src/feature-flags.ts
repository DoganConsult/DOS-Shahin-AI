// OpenFeature client wired to the native flagd daemon at 127.0.0.1:8013.
// Configure once at boot, query anywhere via getFlag()/getFlagBool().
//
// Configure via env:
//   FLAGD_HOST              — defaults to 127.0.0.1
//   FLAGD_PORT              — defaults to 8013 (gRPC eval)
//   FLAGD_DISABLED=1        — bypass flagd, every getFlag returns the default
//
// flagd config + initial flag set lives at /etc/flagd/flags.json (see
// ops/bootstrap/install-prod-grade.sh).

import { OpenFeature, type Client, type EvaluationContext } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';

let _client: Client | null = null;
let _initPromise: Promise<Client | null> | null = null;

export async function initFeatureFlags(serviceCode: string): Promise<Client | null> {
  if (_client) return _client;
  if (process.env.FLAGD_DISABLED === '1') return null;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const provider = new FlagdProvider({
        host: process.env.FLAGD_HOST ?? '127.0.0.1',
        port: parseInt(process.env.FLAGD_PORT ?? '8013', 10),
        tls: false,
      });
      await OpenFeature.setProviderAndWait(provider);
      _client = OpenFeature.getClient(serviceCode);
      return _client;
    } catch {
      // flagd unreachable — fall back to defaults so the service still boots.
      _client = null;
      return null;
    }
  })();

  return _initPromise;
}

export function getClient(): Client | null {
  return _client;
}

export async function getFlag<T>(key: string, defaultValue: T, ctx?: EvaluationContext): Promise<T> {
  if (!_client) return defaultValue;
  const c = ctx ?? {};
  if (typeof defaultValue === 'boolean') {
    return (await _client.getBooleanValue(key, defaultValue, c)) as unknown as T;
  }
  if (typeof defaultValue === 'string') {
    return (await _client.getStringValue(key, defaultValue, c)) as unknown as T;
  }
  if (typeof defaultValue === 'number') {
    return (await _client.getNumberValue(key, defaultValue, c)) as unknown as T;
  }
  return (await _client.getObjectValue(key, defaultValue as any, c)) as unknown as T;
}

export const getFlagBool = (key: string, def = false, ctx?: EvaluationContext): Promise<boolean> =>
  getFlag<boolean>(key, def, ctx);

export const getFlagString = (key: string, def = '', ctx?: EvaluationContext): Promise<string> =>
  getFlag<string>(key, def, ctx);
