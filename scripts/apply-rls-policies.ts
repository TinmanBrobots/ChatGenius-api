import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

async function applyRLSPolicies() {
  try {
    // Read the SQL file
    const policiesSQL = fs.readFileSync(
      path.join(__dirname, '../src/db/policies.sql'),
      'utf8'
    );

    // Split the SQL into individual statements
    const statements = policiesSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        console.error('Error executing statement:', error);
        console.error('Statement:', statement);
      } else {
        console.log('Successfully executed statement');
      }
    }

    console.log('RLS policies applied successfully');
  } catch (error) {
    console.error('Error applying RLS policies:', error);
  }
}

applyRLSPolicies(); 