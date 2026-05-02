"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_ROOT = exports.LOG_DIR = exports.PM2_APP_NAME = exports.API_CONTACT_EMAIL = exports.API_CONTACT_NAME = exports.API_DESCRIPTION = exports.API_TITLE = exports.KEYCLOAK_REALM = exports.PGMQ_QUEUE_PREFIX = exports.AGE_GRAPH_NAME = exports.CLICKHOUSE_DATABASE = exports.LANGFUSE_PROJECT = exports.METRICS_PREFIX = exports.OTEL_SERVICE_NAME = exports.REDIS_PREFIX = exports.DB_PORT = exports.DB_HOST = exports.DB_USER = exports.DB_NAME = exports.DEFAULT_PRODUCT_KEY = exports.PLATFORM_VERSION = exports.PLATFORM_NAME_AR = exports.PLATFORM_NAME_EN = void 0;
exports.getDefaultProductKey = getDefaultProductKey;
exports.registerDefaultProduct = registerDefaultProduct;
exports.registerProductIdentity = registerProductIdentity;
exports.getRegisteredProduct = getRegisteredProduct;
exports.getAllRegisteredProducts = getAllRegisteredProducts;
exports.hasRegisteredProducts = hasRegisteredProducts;
exports.PLATFORM_NAME_EN = process.env.PLATFORM_NAME || 'Dogan-AI-OS';
exports.PLATFORM_NAME_AR = process.env.PLATFORM_NAME_AR || 'نظام دوغان الذكي';
exports.PLATFORM_VERSION = process.env.PLATFORM_VERSION || '1.0.0';
exports.DEFAULT_PRODUCT_KEY = process.env.DEFAULT_PRODUCT_KEY || '';
let _registeredDefaultProductKey = '';
function getDefaultProductKey() {
    return _registeredDefaultProductKey || exports.DEFAULT_PRODUCT_KEY;
}
function registerDefaultProduct(productKey) {
    if (!_registeredDefaultProductKey) {
        _registeredDefaultProductKey = productKey;
    }
}
exports.DB_NAME = process.env.PG_DATABASE || 'platform_db';
exports.DB_USER = process.env.PG_USER || 'platform';
exports.DB_HOST = process.env.PG_HOST || 'localhost';
exports.DB_PORT = parseInt(process.env.PG_PORT || '5432', 10);
exports.REDIS_PREFIX = process.env.REDIS_PREFIX || 'dos:';
exports.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'dos-backend';
exports.METRICS_PREFIX = process.env.METRICS_PREFIX || 'dos_';
exports.LANGFUSE_PROJECT = process.env.LANGFUSE_PROJECT || process.env.LANGCHAIN_PROJECT || 'dos';
exports.CLICKHOUSE_DATABASE = process.env.CLICKHOUSE_DATABASE || 'platform_analytics';
exports.AGE_GRAPH_NAME = process.env.AGE_GRAPH_NAME || 'dos_graph';
exports.PGMQ_QUEUE_PREFIX = process.env.PGMQ_QUEUE_PREFIX || 'platform_';
exports.KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'platform';
exports.API_TITLE = process.env.API_TITLE || 'DOS Platform API';
exports.API_DESCRIPTION = process.env.API_DESCRIPTION || 'Dogan-AI-OS — Multi-tenant Platform API';
exports.API_CONTACT_NAME = process.env.API_CONTACT_NAME || 'Platform Support';
exports.API_CONTACT_EMAIL = process.env.API_CONTACT_EMAIL || '';
exports.PM2_APP_NAME = process.env.PM2_APP_NAME || 'dos-backend';
exports.LOG_DIR = process.env.LOG_DIR || '/var/log/dos';
exports.APP_ROOT = process.env.APP_ROOT || '/opt/dos/backend';
const _registeredProducts = new Map();
function registerProductIdentity(product) {
    _registeredProducts.set(product.productKey, product);
}
function getRegisteredProduct(productKey) {
    return _registeredProducts.get(productKey);
}
function getAllRegisteredProducts() {
    return Array.from(_registeredProducts.values());
}
function hasRegisteredProducts() {
    return _registeredProducts.size > 0;
}
//# sourceMappingURL=platform-identity.js.map