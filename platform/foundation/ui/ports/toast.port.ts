import { InjectionToken } from '@angular/core';

export type FoundationToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface FoundationToast {
  show(severity: FoundationToastSeverity, message: string, detail?: string): void;
  success(message: string, detail?: string): void;
  info(message: string, detail?: string): void;
  warn(message: string, detail?: string): void;
  error(message: string, detail?: string): void;
}

export const FOUNDATION_TOAST = new InjectionToken<FoundationToast>('FoundationToast');

export class NoopFoundationToast implements FoundationToast {
  show(): void {}
  success(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
