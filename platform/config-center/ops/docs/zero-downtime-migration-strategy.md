# Zero-Downtime Migration Strategy

This document outlines the zero-downtime migration strategy for the DOS-AIO platform, ensuring continuous availability during database schema changes.

## Principles

1. **Online DDL First**: Always use online DDL operations that don't require table locks
2. **Backward Compatibility**: New schemas must work with old application versions
3. **Incremental Changes**: Break large migrations into smaller, manageable steps
4. **Rollback Ready**: Every migration must have a corresponding rollback script
5. **Test Thoroughly**: All migrations must be tested in staging before production

## Migration Types

### 1. Additive Changes (Safe)

These changes can be made without downtime:

```sql
-- Adding new columns (with DEFAULT)
ALTER TABLE dos.users ADD COLUMN phone_number VARCHAR(50) DEFAULT NULL;

-- Adding new indexes (CONCURRENTLY)
CREATE INDEX CONCURRENTLY idx_users_phone_number ON dos.users(phone_number);

-- Adding new tables
CREATE TABLE dos.user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES dos.users(id),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Non-Breaking Modifications (Safe with Care)

These changes require careful planning but can be done online:

```sql
-- Expanding varchar length (safe in PostgreSQL)
ALTER TABLE dos.users ALTER COLUMN email TYPE VARCHAR(255);

-- Adding NOT NULL constraint (requires default first)
ALTER TABLE dos.users ALTER COLUMN phone_number SET DEFAULT '';
ALTER TABLE dos.users ALTER COLUMN phone_number SET NOT NULL;
ALTER TABLE dos.users ALTER COLUMN phone_number DROP DEFAULT;

-- Adding CHECK constraints (NOT VALID first)
ALTER TABLE dos.users ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') NOT VALID;
ALTER TABLE dos.users VALIDATE CONSTRAINT check_email_format;
```

### 3. Breaking Changes (Requires Multi-Step Process)

These changes require a multi-step approach:

#### Step 1: Add New Column/Table
```sql
-- Add new column with temporary name
ALTER TABLE dos.users ADD COLUMN new_email VARCHAR(255) DEFAULT NULL;
```

#### Step 2: Deploy Application Code
- Deploy application version that writes to both old and new columns
- Add data migration logic to populate new column

#### Step 3: Migrate Data
```sql
-- Migrate existing data
UPDATE dos.users SET new_email = email WHERE new_email IS NULL;
```

#### Step 4: Switch Application
- Deploy application version that reads from new column
- Add validation to ensure new column is populated

#### Step 5: Cleanup
```sql
-- Drop old column (after verification period)
ALTER TABLE dos.users DROP COLUMN email;
-- Rename new column
ALTER TABLE dos.users RENAME COLUMN new_email TO email;
```

## Specific Migration Strategies

### Column Type Changes

```sql
-- Step 1: Add new column
ALTER TABLE dos.users ADD COLUMN new_status VARCHAR(20) DEFAULT 'active';

-- Step 2: Migrate data
UPDATE dos.users SET new_status = status::TEXT WHERE status IS NOT NULL;

-- Step 3: Update application to use new column

-- Step 4: Drop old column and rename
ALTER TABLE dos.users DROP COLUMN status;
ALTER TABLE dos.users RENAME COLUMN new_status TO status;
```

### Table Restructuring

```sql
-- Step 1: Create new table structure
CREATE TABLE dos.users_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    -- other columns...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Set up triggers to keep tables in sync
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO dos.users_new (id, email, ...)
    VALUES (NEW.id, NEW.email, ...)
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        -- other fields...
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_user
    AFTER INSERT OR UPDATE ON dos.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_data();

-- Step 3: Migrate existing data
INSERT INTO dos.users_new (id, email, ...)
SELECT id, email, ... FROM dos.users;

-- Step 4: Switch application to new table

-- Step 5: Cleanup
DROP TRIGGER trigger_sync_user ON dos.users;
DROP TABLE dos.users;
ALTER TABLE dos.users_new RENAME TO users;
```

### Index Changes

```sql
-- Adding new index (CONCURRENTLY prevents table locks)
CREATE INDEX CONCURRENTLY idx_users_composite ON dos.users(tenant_id, status);

-- Rebuilding index (CONCURRENTLY)
DROP INDEX CONCURRENTLY idx_users_email;
CREATE INDEX CONCURRENTLY idx_users_email ON dos.users(email);

-- Adding partial index
CREATE INDEX CONCURRENTLY idx_users_active ON dos_users(id) WHERE status = 'active';
```

## Migration Process

### 1. Pre-Migration Checklist

- [ ] Migration tested in staging environment
- [ ] Rollback script tested and verified
- [ ] Backup of current database created
- [ ] Application compatibility verified
- [ ] Performance impact assessed
- [ ] Migration window scheduled (if needed)

### 2. Migration Execution

```bash
# 1. Create backup
pg_dump dos_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration validation
npm run migration:validate auth-service

# 3. Execute migration
npm run migration:up auth-service

# 4. Verify migration
npm run migration:status auth-service

# 5. Test application functionality
npm run test:e2e:smoke

# 6. Monitor performance
npm run monitor:performance
```

### 3. Post-Migration Verification

- [ ] All services running without errors
- [ ] Database performance metrics normal
- [ ] Application functionality verified
- [ ] No data corruption detected
- [ ] Rollback plan tested (if needed)

## Emergency Procedures

### Migration Failure

1. **Stop the migration process**
2. **Assess the failure point**
3. **Execute rollback if necessary**
4. **Restore from backup if rollback fails**
5. **Investigate root cause**
6. **Retry with corrected migration**

```bash
# Emergency rollback
npm run migration:down auth-service <target_version>

# Or restore from backup
psql dos_production < backup_20231201_143022.sql
```

### Rollback Triggers

- Migration execution time > 30 minutes
- Error rate > 1% for 5 consecutive minutes
- Database CPU > 90% for 10 consecutive minutes
- Application error rate > 5%

## Performance Considerations

### Migration Impact Assessment

1. **Lock Duration**: Measure how long locks are held
2. **Query Performance**: Test critical queries during migration
3. **Connection Pool**: Monitor connection pool usage
4. **Memory Usage**: Watch for memory spikes during large operations

### Optimization Techniques

```sql
-- Use batches for large updates
UPDATE dos.users SET phone_number = NULL 
WHERE id IN (
    SELECT id FROM dos.users 
    LIMIT 1000
);

-- Disable triggers temporarily if needed
ALTER TABLE dos.users DISABLE TRIGGER ALL;
-- Perform operation
ALTER TABLE dos.users ENABLE TRIGGER ALL;

-- Use COPY for large data imports
COPY dos.users_temp FROM '/tmp/users.csv' WITH CSV;
```

## Monitoring During Migration

### Key Metrics

- Database connection count
- Query execution time
- Lock wait time
- CPU and memory usage
- Application error rate
- Response time percentiles

### Alerting Rules

```yaml
# Example alerting rules
migration_alerts:
  - name: "Migration Long Running"
    condition: "migration_duration > 1800" # 30 minutes
    severity: "warning"
  
  - name: "High Lock Wait Time"
    condition: "lock_wait_time > 5000" # 5 seconds
    severity: "critical"
  
  - name: "Migration Error Rate"
    condition: "error_rate > 0.01" # 1%
    severity: "critical"
```

## Best Practices

1. **Always use CONCURRENTLY for index creation**
2. **Break large operations into smaller batches**
3. **Test migrations on realistic data volumes**
4. **Have rollback scripts ready and tested**
5. **Monitor throughout the migration process**
6. **Communicate with stakeholders about migration windows**
7. **Document any manual steps required**
8. **Keep migrations backward compatible when possible**

## Migration Templates

### Adding New Column
```sql
-- 001_add_user_phone_up.sql
ALTER TABLE dos.users ADD COLUMN phone_number VARCHAR(50) DEFAULT NULL;
COMMENT ON COLUMN dos.users.phone_number IS 'User phone number for SMS notifications';

-- 001_add_user_phone_down.sql
ALTER TABLE dos.users DROP COLUMN IF EXISTS phone_number;
```

### Adding New Index
```sql
-- 002_add_user_email_index_up.sql
CREATE INDEX CONCURRENTLY idx_users_email_lower ON dos.users(LOWER(email));

-- 002_add_user_email_index_down.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_lower;
```

### Data Migration
```sql
-- 003_migrate_user_roles_up.sql
ALTER TABLE dos.users ADD COLUMN role_new VARCHAR(20) DEFAULT 'user';
UPDATE dos.users SET role_new = CASE 
    WHEN is_admin THEN 'admin'
    WHEN is_auditor THEN 'auditor'
    ELSE 'user'
END;
ALTER TABLE dos.users ALTER COLUMN role_new SET NOT NULL;

-- 003_migrate_user_roles_down.sql
ALTER TABLE dos.users DROP COLUMN IF EXISTS role_new;
```

## Testing Strategy

### Unit Testing
- Test migration SQL syntax
- Test rollback SQL syntax
- Test data transformation logic

### Integration Testing
- Test migration with realistic data
- Test application compatibility
- Test performance impact

### Staging Testing
- Full migration run on staging data
- Application deployment and testing
- Performance benchmarking

### Production Readiness
- Migration plan approved
- Rollback plan tested
- Monitoring configured
- Communication plan ready
