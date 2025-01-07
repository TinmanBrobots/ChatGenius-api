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

async function createTestChannels() {
  try {
    // First, get all test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username');

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      throw new Error('No users found. Please run create-test-users.ts first.');
    }

    const adminUser = users[0]; // First user will be admin of all channels

    const channels = [
      {
        name: 'general',
        description: 'General discussion channel',
        is_private: false,
        created_by: adminUser.id
      },
      {
        name: 'random',
        description: 'Random conversations and fun stuff',
        is_private: false,
        created_by: adminUser.id
      },
      {
        name: 'team-private',
        description: 'Private team discussions',
        is_private: true,
        created_by: adminUser.id
      }
    ];

    // Create channels
    for (const channel of channels) {
      // Insert channel
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .insert(channel)
        .select()
        .single();

      if (channelError) {
        console.error(`Failed to create channel ${channel.name}:`, channelError);
        continue;
      }

      console.log(`Created channel: ${channel.name}`);

      // Add all users to public channels, only first two users to private channel
      const membersToAdd = channel.is_private ? users.slice(0, 2) : users;

      // Add members
      const channelMembers = membersToAdd.map(user => ({
        channel_id: channelData.id,
        user_id: user.id,
        role: user.id === adminUser.id ? 'admin' : 'member'
      }));

      const { error: membersError } = await supabase
        .from('channel_members')
        .insert(channelMembers);

      if (membersError) {
        console.error(`Failed to add members to channel ${channel.name}:`, membersError);
        continue;
      }

      console.log(`Added ${membersToAdd.length} members to channel: ${channel.name}`);

      // Add some test messages
      const messages = [
        {
          channel_id: channelData.id,
          user_id: users[0].id,
          content: `Welcome to #${channel.name}! 👋`
        },
        {
          channel_id: channelData.id,
          user_id: users[1].id,
          content: 'Thanks for having me here!'
        }
      ];

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messages);

      if (messagesError) {
        console.error(`Failed to add messages to channel ${channel.name}:`, messagesError);
        continue;
      }

      console.log(`Added test messages to channel: ${channel.name}`);
    }

    console.log('Finished creating test channels');
  } catch (error) {
    console.error('Error creating test channels:', error);
  }
}

createTestChannels(); 