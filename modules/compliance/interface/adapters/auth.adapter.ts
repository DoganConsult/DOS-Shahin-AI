// Bridge — re-exports the canonical auth adapter so older route files that
// expected `interface/adapters/auth.adapter` continue to resolve. New code
// should import from `ports/auth.port` or `infrastructure/persistence/auth.adapter` directly.
export * from '../../infrastructure/persistence/auth.adapter';
