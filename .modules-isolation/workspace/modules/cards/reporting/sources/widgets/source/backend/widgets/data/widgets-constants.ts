export const WIDGETS_STATUSES = ['draft', 'active', 'in_review', 'approved', 'suspended', 'archived'] as const;
export const WIDGETS_DEFAULT_STATUS: typeof WIDGETS_STATUSES[number] = 'draft';
export const WIDGETS_TERMINAL_STATUSES = ['archived'] as const;

export const WIDGETS_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_BULK_OPERATION_SIZE: 200,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
} as const;

export const WIDGETS_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 48,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
} as const;

export const WIDGETS_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
