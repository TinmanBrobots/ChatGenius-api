import { supabase } from '../config/supabase';

export class ChannelService {
  async getUserChannels(userId: string) {
    console.log('Fetching channels for user:', userId);
    const { data, error } = await supabase
      .from('channel_members')
      .select(`
        channel:channels(
          id,
          name,
          description,
          is_private,
          created_by,
          created_at,
          updated_at
        ),
        role
      `);

    if (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }

    const channels = data.map(item => ({
      ...item.channel,
      role: item.role
    }));

    return channels;
  }

  async createChannel(name: string, description: string, is_private: boolean, userId: string, memberIds: string[] = []) {
    // Start a transaction
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name,
        description,
        is_private,
        created_by: userId
      })
      .select()
      .single();

    if (channelError) throw channelError;

    // Add creator as admin
    const { error: creatorError } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        user_id: userId,
        role: 'admin'
      });

    if (creatorError) throw creatorError;

    // Add other members if provided
    if (memberIds.length > 0) {
      const members = memberIds.map(memberId => ({
        channel_id: channel.id,
        user_id: memberId,
        role: 'member'
      }));

      const { error: membersError } = await supabase
        .from('channel_members')
        .insert(members);

      if (membersError) throw membersError;
    }

    return channel;
  }

  async getChannelMembers(channelId: string) {
    const { data, error } = await supabase
      .from('channel_members')
      .select(`
        user_id,
        role,
        joined_at,
        user:profiles(id, username, avatar_url, status)
      `)
      .eq('channel_id', channelId);

    if (error) throw error;
    return data;
  }

  async addChannelMember(channelId: string, userId: string, role: 'admin' | 'member' = 'member') {
    const { error } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channelId,
        user_id: userId,
        role
      });

    if (error) throw error;
  }

  async removeChannelMember(channelId: string, userId: string) {
    const { error } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async updateChannelRole(channelId: string, userId: string, role: 'admin' | 'member') {
    const { error } = await supabase
      .from('channel_members')
      .update({ role })
      .eq('channel_id', channelId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async searchChannels(query: string, userId: string) {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .not('is_private', 'eq', true)
      .limit(10);

    if (error) throw error;
    return data;
  }
}

export const channelService = new ChannelService(); 