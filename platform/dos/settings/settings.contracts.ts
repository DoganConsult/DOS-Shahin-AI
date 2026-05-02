export interface PlatformSettingContract {
  key: string;
  value: unknown;
  scope: 'global' | 'tenant' | 'module';
  scopeId?: string;
  updatedAt: string;
  updatedBy: string;
}
