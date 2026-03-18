#!/usr/bin/env node
/**
 * Migration Runner: Display UNIQUE constraints migration SQL
 * 
 * Usage: node run_unique_constraints_migration.js
 * 
 * This prints the migration SQL that needs to be run in Supabase dashboard
 */

import fs from 'fs';
import path from 'path';

async function showMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join('.', 'migrations', '20260313_add_user_id_unique_constraints.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                        MIGRATION GUIDE                              ║');
    console.log('║              Add UNIQUE Constraints on user_id Columns               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 MIGRATION SQL TO EXECUTE:\n');
    console.log(migrationSQL);
    
    console.log('\n✅ EXECUTION STEPS:\n');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your "Campus Flow" project');
    console.log('3. Click "SQL Editor" in the left sidebar');
    console.log('4. Click "New query" button');
    console.log('5. Copy the SQL above into the editor');
    console.log('6. Click "Run" button');
    console.log('7. Verify: You should see "Execute query: SUCCESS"\n');
    
    console.log('🔍 VERIFICATION QUERY (after migration):\n');
    console.log(`SELECT constraint_name, table_name, column_name
FROM information_schema.constraint_column_usage
WHERE table_name IN ('profiles', 'student_profiles', 'teacher_profiles')
  AND constraint_name LIKE '%user_id%'
ORDER BY table_name;\n`);
    
    console.log('💡 EXPECTED RESULT: Should show 6 UNIQUE/PRIMARY KEY constraints for user_id\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
showMigration();
