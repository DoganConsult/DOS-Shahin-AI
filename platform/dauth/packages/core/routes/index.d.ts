/**
 * DAuth route barrel — backend-owned.
 * These route implementations live in backend/src/platform/dauth/routes/ and are
 * NOT exported by the @dos/auth package. Import directly from backend-local paths.
 */
export * from './access-contract.routes';
export * from './auth.routes';
export * from './authz-explain.routes';
export * from './dynamic-rbac.routes';
export * from './email-verification.routes';
export * from './invitation.routes';
export * from './me.routes';
export * from './permission-derivation.routes';
export * from './role-detail.routes';
export * from './role-matrix.routes';
export * from './role-profile.routes';
