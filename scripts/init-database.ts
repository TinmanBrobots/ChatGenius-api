import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function readSqlFile(relativePath: string): Promise<string> {
  const fullPath = join(__dirname, '../src/db', relativePath);
  return readFileSync(fullPath, 'utf8');
}

async function executeSql(sql: string, description: string) {
  console.log(`Executing ${description}...`);
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });

  if (error) {
    throw new Error(`Error in ${description}: ${error.message}`);
  }
  console.log(`${description} completed successfully`);
}

async function initDatabase() {
  try {
    console.log('Starting database initialization...');

    // Combine all SQL files in the correct order
    const sqlStatements = [
      // 1. Set timezone
      'ALTER DATABASE postgres SET timezone TO \'UTC\';',

      // 2. Create utility functions first
      await readSqlFile('utils/functions.sql'),

      // 3. Drop existing policies
      `
      DO $$ 
      DECLARE
          pol record;
      BEGIN
          FOR pol IN 
              SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public'
          LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                  pol.policyname, 
                  pol.schemaname, 
                  pol.tablename);
          END LOOP;
      END $$;
      `,

      // // 4. Create schemas
      // await readSqlFile('profiles/schema.sql'),
      // await readSqlFile('channels/schema.sql'),
      // await readSqlFile('channel_members/schema.sql'),
      // await readSqlFile('messages/schema.sql'),
      // await readSqlFile('message_reactions/schema.sql'),

      // 5. Create policies
      await readSqlFile('profiles/policies.sql'),
      await readSqlFile('channels/policies.sql'),
      await readSqlFile('channel_members/policies.sql'),
      await readSqlFile('messages/policies.sql'),
      await readSqlFile('message_reactions/policies.sql')
    ];

    // Execute all SQL statements in sequence
    for (const [index, sql] of sqlStatements.entries()) {
      await executeSql(sql, `Step ${index + 1}`);
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase(); 