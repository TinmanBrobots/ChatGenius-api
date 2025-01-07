import { createClient } from '@supabase/supabase-js';
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

async function createTestUsers() {
  const users = [
    {
      email: 'matt14rob@gmail.com',
      password: 'Slapshot1114.',
      username: 'matt_rob',
      full_name: 'Matt Rob'
    },
    {
      email: 'popkorn1114@gmail.com',
      password: 'Slapshot1114!',
      username: 'popkorn',
      full_name: 'Popkorn'
    },
    {
      email: 'mastert1114@gmail.com',
      password: 'Slapshot1114?',
      username: 'master_t',
      full_name: 'Master T'
    }
  ];

  for (const user of users) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });

    if (authError) {
      console.error(`Failed to create auth user ${user.email}:`, authError);
      continue;
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        username: user.username,
        full_name: user.full_name,
        status: 'offline'
      });

    if (profileError) {
      console.error(`Failed to create profile for ${user.email}:`, profileError);
      continue;
    }

    console.log(`Created user and profile for ${user.email}`);
  }
}

createTestUsers()
  .then(() => console.log('Done creating test users'))
  .catch(console.error); 