export const RISK_EVENT_NAMES = [] as const;
export type RiskEventName = (typeof RISK_EVENT_NAMES)[number];

export const RISK_CONSUMED_EVENT_NAMES = [] as const;
export type RiskConsumedEventName = (typeof RISK_CONSUMED_EVENT_NAMES)[number];

export const RISK_PERMISSION_CODES = [] as const;
export type RiskPermissionCode = (typeof RISK_PERMISSION_CODES)[number];

export const RISK_ERROR_CODES = [] as const;
export type RiskErrorCode = (typeof RISK_ERROR_CODES)[number];

export type RiskErrorBody = {
  code: RiskErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

