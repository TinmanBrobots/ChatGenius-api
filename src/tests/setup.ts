import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: '.env.test' });

// Create test clients
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to read and execute SQL files
export async function executeSql(sql: string) {
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });
  if (error) throw error;
}

// Clean database between tests
export async function cleanDatabase() {
  // Use supabaseAdmin to bypass RLS
  await executeSql(`
    -- Disable RLS temporarily
    ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

    -- Truncate tables in correct order
    TRUNCATE TABLE profiles CASCADE;

    -- Re-enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    -- Delete auth users (this has to be done separately due to auth schema)
    DELETE FROM auth.users WHERE id IN (
      SELECT id FROM auth.users
      WHERE id NOT IN (SELECT id FROM auth.users WHERE email = 'admin@supabase.io')
    );
  `);
}

// Create test user with profile
export async function createTestUser(options: {
  email: string;
  password: string;
  username: string;
  full_name: string;
  is_admin?: boolean;
}) {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create test user');

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: options.email,
      username: options.username,
      full_name: options.full_name,
      status: 'offline',
      notification_preferences: {
        email_notifications: true,
        desktop_notifications: true,
        mobile_notifications: true,
        mention_notifications: true
      },
      theme_preference: 'system',
      email_verified: true,
      is_admin: options.is_admin || false
    });

  if (profileError) throw profileError;

  return authData.user;
}

// Initialize test database
export async function initTestDatabase() {
  // Read and execute setup files
  const sqlFiles = [
    'utils/functions.sql',
    'profiles/schema.sql',
    'profiles/policies.sql'
  ];

  for (const file of sqlFiles) {
    const sql = readFileSync(join(__dirname, '../db', file), 'utf8');
    await executeSql(sql);
  }
} 