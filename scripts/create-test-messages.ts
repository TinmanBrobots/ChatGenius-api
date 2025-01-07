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

async function createTestMessages() {
  try {
    // Get all channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, name');

    if (channelsError) throw channelsError;
    if (!channels || channels.length === 0) {
      throw new Error('No channels found. Please run create-test-channels.ts first.');
    }

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username');

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      throw new Error('No users found. Please run create-test-users.ts first.');
    }

    // Create test messages for each channel
    for (const channel of channels) {
      const messages = [
        {
          channel_id: channel.id,
          user_id: users[0].id,
          content: `Hey everyone! Welcome to the ${channel.name} channel! 🎉`,
          is_edited: false
        },
        {
          channel_id: channel.id,
          user_id: users[1].id,
          content: 'Thanks for setting this up! Looking forward to our discussions here.',
          is_edited: false
        },
        {
          channel_id: channel.id,
          user_id: users[0].id,
          content: 'Feel free to share your thoughts and ideas! 💡',
          is_edited: false
        }
      ];

      // Add some threaded messages
      const { data: parentMessage, error: parentError } = await supabase
        .from('messages')
        .insert(messages[0])
        .select()
        .single();

      if (parentError) {
        console.error(`Failed to create parent message in channel ${channel.name}:`, parentError);
        continue;
      }

      const threadMessages = [
        {
          channel_id: channel.id,
          user_id: users[1].id,
          content: 'This is great! I have some ideas to share.',
          parent_message_id: parentMessage.id,
          is_edited: false
        },
        {
          channel_id: channel.id,
          user_id: users[2]?.id || users[0].id,
          content: 'Me too! Let\'s discuss them in this thread.',
          parent_message_id: parentMessage.id,
          is_edited: false
        }
      ];

      // Insert remaining regular messages
      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messages.slice(1));

      if (messagesError) {
        console.error(`Failed to create messages in channel ${channel.name}:`, messagesError);
        continue;
      }

      // Insert thread messages
      const { error: threadError } = await supabase
        .from('messages')
        .insert(threadMessages);

      if (threadError) {
        console.error(`Failed to create thread messages in channel ${channel.name}:`, threadError);
        continue;
      }

      // Add some reactions to the parent message
      const reactions = users.slice(0, 2).map(user => ({
        message_id: parentMessage.id,
        user_id: user.id,
        emoji: '👍'
      }));

      const { error: reactionsError } = await supabase
        .from('message_reactions')
        .insert(reactions);

      if (reactionsError) {
        console.error(`Failed to add reactions in channel ${channel.name}:`, reactionsError);
        continue;
      }

      console.log(`Created test messages and reactions in channel: ${channel.name}`);
    }

    console.log('Finished creating test messages');
  } catch (error) {
    console.error('Error creating test messages:', error);
  }
}

createTestMessages(); 