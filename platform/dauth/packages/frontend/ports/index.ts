/**
 * DAuth frontend injection ports.
 *
 * DAuth frontend must not reach into product-owned services (bootstrap,
 * i18n, toast, actor identity). Instead, product shells that consume
 * `@dos/dauth-frontend` provide implementations of these injection tokens
 * on bootstrap.
 *
 * All three tokens have minimal contracts — exactly the surface DAuth
 * frontend code uses, nothing more.
 */

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface BootstrapSnapshot {
  state: string;
  [k: string]: unknown;
}

export interface DAuthBootstrapPort {
  loadSessionBootstrap(): Observable<BootstrapSnapshot | null | undefined>;
}

export interface DAuthI18nPort {
  t(key: string, params?: Record<string, unknown>): string;
}

export interface DAuthToastPort {
  info(title: string, message: string): void;
  warn(title: string, message: string): void;
  error(title: string, message: string): void;
  success?(title: string, message: string): void;
}

export interface DAuthActorIdentityPort {
  clearActorContext(): void;
  getCurrentActorId?(): string | null;
}

export interface DAuthConnectivityPort {
  readonly online: boolean;
  onStatusChange?(listener: (online: boolean) => void): () => void;
}

export const DAUTH_BOOTSTRAP_PORT = new InjectionToken<DAuthBootstrapPort>(
  'DAuthBootstrapPort',
);
export const DAUTH_I18N_PORT = new InjectionToken<DAuthI18nPort>(
  'DAuthI18nPort',
);
export const DAUTH_TOAST_PORT = new InjectionToken<DAuthToastPort>(
  'DAuthToastPort',
);
export const DAUTH_ACTOR_IDENTITY_PORT = new InjectionToken<DAuthActorIdentityPort>(
  'DAuthActorIdentityPort',
);
export const DAUTH_CONNECTIVITY_PORT = new InjectionToken<DAuthConnectivityPort>(
  'DAuthConnectivityPort',
);
