-- Run as PostgreSQL superuser (or owner of schema dos) after migrations/seeds.
-- Grants read access for the application role used by gateway-adjacent services (e.g. dos_auth).

GRANT USAGE ON SCHEMA dos TO dos_auth;
GRANT SELECT ON ALL TABLES IN SCHEMA dos TO dos_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA dos GRANT SELECT ON TABLES TO dos_auth;
