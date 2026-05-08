// Runtime config injection token — value is provided by app bootstrap from /config.json.
import { InjectionToken } from '@angular/core';
import type { FcRuntimeConfig } from '@fc/ui-contracts';

export type FcRuntimeConfigToken = FcRuntimeConfig;

export const FC_RUNTIME_CONFIG = new InjectionToken<FcRuntimeConfigToken>('FC_RUNTIME_CONFIG');
