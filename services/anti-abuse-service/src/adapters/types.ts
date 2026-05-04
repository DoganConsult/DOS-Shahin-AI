/**
 * DOS Master M8 — adapter contract.
 *
 * Each provider returns a normalized score in [0, 1] where 0 = clean and
 * 1 = certain abuse. The aggregator combines providers per policy.
 */
export interface AntiAbuseSignal {
  kind: 'captcha' | 'ip-rep' | 'device-fp' | 'email-verify' | 'rate-limit' | 'waf';
  score: number;
  detail: Record<string, unknown>;
}

export interface SignalContext {
  attemptId: string;
  email?: string | null;
  ipAddr?: string | null;
  deviceFp?: string | null;
  captchaToken?: string | null;
}

export interface AntiAbuseAdapter {
  kind: AntiAbuseSignal['kind'];
  evaluate(ctx: SignalContext): Promise<AntiAbuseSignal>;
}
