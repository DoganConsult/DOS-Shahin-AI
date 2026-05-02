# Foundation RLS policies

Per-table row-level-security policies for foundation-owned `dos.*` tables.

The active loader is `../migrations/20260425_0500_foundation_rls.sql`,
which iterates the same table list and creates the policies defined here
in a single transaction. The `*.rls.sql` files in this folder are the
**authoritative declaration** — copy/paste them into a future migration
when adding a new owned table; do not edit policies inline in migrations.

Tables without `tenant_id` (permissions, functional_roles, role_permissions)
are platform-global and intentionally NOT RLS-scoped.

Pattern:
```sql
ALTER TABLE dos.<table> ENABLE  ROW LEVEL SECURITY;
ALTER TABLE dos.<table> FORCE   ROW LEVEL SECURITY;

CREATE POLICY foundation_tenant_read  ON dos.<table> FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.<table> FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
```
