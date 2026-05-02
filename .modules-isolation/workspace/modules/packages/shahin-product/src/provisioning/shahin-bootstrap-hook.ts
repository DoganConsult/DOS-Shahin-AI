// @ts-nocheck — module-layer imports not yet extracted
/**
 * Shahin-AI Product Bootstrap Hook
 *
 * Registers Shahin-AI product-specific provisioning logic with the DOS
 * product bootstrap hook interface. This is called during the
 * install_product_packs provisioning step.
 *
 * @owner Product (Shahin-AI)
 * Law 15: removing this file removes all Shahin-specific provisioning
 *         without affecting the DOS pipeline.
 */

import {
  registerProductBootstrapHook,
  type ProductProvisioningContext,
} from '@dos/platform-core/provisioning/product-bootstrap-hook';
import { setProductIdentity } from '@dos/platform-core/branding';
import { registerProductToken, registerProductKey } from '@dos/platform-core/http/guards/module-guard';
import { registerDefaultProduct, registerProductIdentity } from '@dos/platform-core/config/platform-identity';
import { logger } from '@dos/module-sdk/governance-os/platform/services/misc/logger.service';

let _initialized = false;

async function onProvision(_context: ProductProvisioningContext): Promise<void> {
}

export function initializeShahinProduct(): void {
  if (_initialized) return;
  _initialized = true;

  try {
    registerProductBootstrapHook({
      productKey: 'shahin-ai',
      productName: 'Shahin-Ai',
      onProvision,
    });

    setProductIdentity({
      name: 'Shahin-Ai',
      url: (process as any).env.APP_URL || 'https://grc.shahin.sa'
    });

    registerProductToken('grc', 'agrc', 'Shahin-AI');
    registerProductToken('qiyas', 'qiyas');
    registerProductKey('agrc');
    registerProductKey('qiyas');

    registerDefaultProduct('agrc');
    registerProductIdentity({
      productKey: 'shahin-ai',
      nameEn: 'Shahin-AI',
      nameAr: 'شاهين الذكي',
      brandUrl: process.env.APP_URL || 'https://grc.shahin.sa',
    });

    // R2: Role home mappings are now dynamically derived from agrc-product.definition.ts 
    // via UnifiedConfigService. No longer manually pushed into the bootstrap module.

    logger.info('[Shahin] Product identity registered successfully');
  } catch (err) {
    logger.error('[Shahin] Product identity registration failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
