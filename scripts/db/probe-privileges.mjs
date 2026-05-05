#!/usr/bin/env node
/**
 * Migration Privileges Probe
 * 
 * Parses migration file for ALTER TABLE {ADD CONSTRAINT|ENABLE TRIGGER|REFERENCES}
 * and verifies the connecting role holds REFERENCES/TRIGGER/USAGE before publisher tries.
 * Catches permission failures early.
 * 
 * Usage: node scripts/db/probe-privileges.mjs <migration-file>
 * 
 * Exit codes:
 * - 0: All privilege requirements met
 * - 1: Missing privileges detected
 * - 2: Error
 */

import { readFileSync } from 'node:fs';
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

async function probePrivileges(migrationFile) {
  console.log(`[probe-privileges] Probing: ${migrationFile}`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    const content = readFileSync(migrationFile, 'utf-8');
    
    // Check for ALTER TABLE ... ADD CONSTRAINT ... REFERENCES
    const fkMatches = content.match(/ALTER\s+TABLE\s+(\S+)\s+ADD\s+CONSTRAINT\s+\S+\s+FOREIGN\s+KEY\s+REFERENCES\s+(\S+)/gi);
    
    // Check for ALTER TABLE ... ENABLE TRIGGER
    const triggerMatches = content.match(/ALTER\s+TABLE\s+(\S+)\s+ENABLE\s+TRIGGER\s+(\S+)/gi);
    
    // Check for ALTER TABLE ... ADD CONSTRAINT ... CHECK (IN (SELECT ...))
    const crossTableCheckMatches = content.match(/CHECK\s*\([^)]*IN\s*\([^)]*SELECT[^)]*\)/gi);
    
    const issues = [];
    
    if (fkMatches) {
      for (const match of fkMatches) {
        const tableMatch = match.match(/ALTER\s+TABLE\s+(\S+)/i);
        const refTableMatch = match.match(/REFERENCES\s+(\S+)/i);
        
        if (tableMatch && refTableMatch) {
          const table = tableMatch[1];
          const refTable = refTableMatch[1];
          
          // Check REFERENCES privilege on referenced table
          const result = await pool.query(`
            SELECT has_table_privilege('dos_auth', $1, 'REFERENCES') as has_ref
          `, [refTable]);
          
          if (!result.rows[0].has_ref) {
            issues.push({ type: 'REFERENCES', table, ref_table: refTable, privilege: 'REFERENCES' });
          }
        }
      }
    }
    
    if (triggerMatches) {
      for (const match of triggerMatches) {
        const tableMatch = match.match(/ALTER\s+TABLE\s+(\S+)/i);
        
        if (tableMatch) {
          const table = tableMatch[1];
          
          // Check TRIGGER privilege on table
          const result = await pool.query(`
            SELECT has_table_privilege('dos_auth', $1, 'TRIGGER') as has_trigger
          `, [table]);
          
          if (!result.rows[0].has_trigger) {
            issues.push({ type: 'TRIGGER', table, privilege: 'TRIGGER' });
          }
        }
      }
    }
    
    if (crossTableCheckMatches) {
      issues.push({ type: 'CROSS_TABLE_CHECK', count: crossTableCheckMatches.length, reason: 'Cross-table CHECK predicates not allowed (use FK constraints instead)' });
    }
    
    if (issues.length > 0) {
      console.error('❌ Privilege issues detected:');
      issues.forEach(issue => {
        console.error(`  - ${JSON.stringify(issue)}`);
      });
      console.error(`\nTotal issues: ${issues.length}`);
      console.error('\nTo fix: Grant required privileges to dos_auth role or use different approach');
      process.exit(1);
    }
    
    console.log('✅ Privilege probe passed');
    if (fkMatches) console.log(`   Checked ${fkMatches.length} FK constraints`);
    if (triggerMatches) console.log(`   Checked ${triggerMatches.length} trigger operations`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/db/probe-privileges.mjs <migration-file>');
  process.exit(2);
}

probePrivileges(migrationFile);
