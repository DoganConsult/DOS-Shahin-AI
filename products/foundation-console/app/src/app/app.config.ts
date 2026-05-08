// App config — zoneless change detection, no static module routes, runtime config provided
// from /config.json. FC_RUNTIME_CONFIG comes from @fc/ui-system (single source of truth).
import type { ApplicationConfig } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import type { FcRuntimeConfig } from '@fc/ui-contracts';
import { FC_RUNTIME_CONFIG, FC_COMPONENT_MAP, FC_DEFAULT_COMPONENT_MAP } from '@fc/ui-system';
import { APP_ROUTES } from './app.routes';

function assertRuntimeConfig(v: unknown): FcRuntimeConfig {
  if (!v || typeof v !== 'object') throw new Error('FC_RUNTIME_CONFIG: not an object');
  const r = v as Partial<FcRuntimeConfig>;
  if (typeof r.productCode !== 'string') throw new Error('FC_RUNTIME_CONFIG.productCode missing');
  if (!r.endpoints || typeof r.endpoints !== 'object') {
    throw new Error('FC_RUNTIME_CONFIG.endpoints missing');
  }
  if (typeof r.endpoints.workspaceRuntime !== 'string') {
    throw new Error('FC_RUNTIME_CONFIG.endpoints.workspaceRuntime missing');
  }
  return v as FcRuntimeConfig;
}

export function appConfig(runtimeConfig: unknown): ApplicationConfig {
  const cfg = assertRuntimeConfig(runtimeConfig);
  return {
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(APP_ROUTES, withComponentInputBinding()),
      { provide: FC_RUNTIME_CONFIG, useValue: cfg },
      { provide: FC_COMPONENT_MAP,  useValue: FC_DEFAULT_COMPONENT_MAP },
    ],
  };
}
