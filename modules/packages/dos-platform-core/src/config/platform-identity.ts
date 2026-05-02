export const PLATFORM_NAME_EN = process.env.PLATFORM_NAME || 'Dogan-AI-OS';
export const PLATFORM_NAME_AR = process.env.PLATFORM_NAME_AR || 'نظام دوغان الذكي';
export const PLATFORM_VERSION = process.env.PLATFORM_VERSION || '1.0.0';
export const DEFAULT_PRODUCT_KEY = process.env.DEFAULT_PRODUCT_KEY || '';

let _registeredDefaultProductKey = '';

export function getDefaultProductKey(): string {
  return _registeredDefaultProductKey || DEFAULT_PRODUCT_KEY;
}

export function registerDefaultProduct(productKey: string): void {
  if (!_registeredDefaultProductKey) {
    _registeredDefaultProductKey = productKey;
  }
}

export const DB_NAME = process.env.PG_DATABASE || 'platform_db';
export const DB_USER = process.env.PG_USER || 'platform';
export const DB_HOST = process.env.PG_HOST || 'localhost';
export const DB_PORT = parseInt(process.env.PG_PORT || '5432', 10);
export const REDIS_PREFIX = process.env.REDIS_PREFIX || 'dos:';
export const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'dos-backend';
export const METRICS_PREFIX = process.env.METRICS_PREFIX || 'dos_';
export const LANGFUSE_PROJECT = process.env.LANGFUSE_PROJECT || process.env.LANGCHAIN_PROJECT || 'dos';
export const CLICKHOUSE_DATABASE = process.env.CLICKHOUSE_DATABASE || 'platform_analytics';
export const AGE_GRAPH_NAME = process.env.AGE_GRAPH_NAME || 'dos_graph';
export const PGMQ_QUEUE_PREFIX = process.env.PGMQ_QUEUE_PREFIX || 'platform_';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'platform';
export const API_TITLE = process.env.API_TITLE || 'DOS Platform API';
export const API_DESCRIPTION = process.env.API_DESCRIPTION || 'Dogan-AI-OS — Multi-tenant Platform API';
export const API_CONTACT_NAME = process.env.API_CONTACT_NAME || 'Platform Support';
export const API_CONTACT_EMAIL = process.env.API_CONTACT_EMAIL || '';
export const PM2_APP_NAME = process.env.PM2_APP_NAME || 'dos-backend';
export const LOG_DIR = process.env.LOG_DIR || '/var/log/dos';
export const APP_ROOT = process.env.APP_ROOT || '/opt/dos/backend';

export interface RegisteredProduct {
  productKey: string;
  nameEn: string;
  nameAr: string;
  brandUrl: string;
}

const _registeredProducts = new Map<string, RegisteredProduct>();

export function registerProductIdentity(product: RegisteredProduct): void {
  _registeredProducts.set(product.productKey, product);
}

export function getRegisteredProduct(productKey: string): RegisteredProduct | undefined {
  return _registeredProducts.get(productKey);
}

export function getAllRegisteredProducts(): RegisteredProduct[] {
  return Array.from(_registeredProducts.values());
}

export function hasRegisteredProducts(): boolean {
  return _registeredProducts.size > 0;
}
