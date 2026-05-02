export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  super_admin: ['read','create','update','delete','approve','export','admin'],
  tenant_admin: ['read','create','update','delete','approve','export'],
  module_admin: ['read','create','update','delete','approve'],
  manager: ['read','create','update','approve'],
  analyst: ['read','create','update'],
  viewer: ['read'],
};
