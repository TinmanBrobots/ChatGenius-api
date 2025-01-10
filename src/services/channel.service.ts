import { supabase, supabaseAdmin } from '../config/supabase';
import { Channel, ChannelMember } from '../types/database';

// Use admin client in test environment to bypass RLS
const client = process.env.NODE_ENV === 'test' ? supabaseAdmin : supabase;

export class ChannelService {
  // Core Channel Operations
  async createChannel(channelData: Partial<Channel>, member_ids?: string[]): Promise<Channel> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // For direct messages, ensure exactly two members
    if (channelData.type === 'direct') {
      if (!member_ids || member_ids.length !== 1) {
        throw new Error('Direct messages must have exactly one other member');
      }
      // Add current user to member_ids for direct messages
      member_ids = [user.id, ...member_ids];
    }

    // Start a transaction
    const { data: channel, error } = await client
      .from('channels')
      .insert({
        ...channelData,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    if (!channel) throw new Error('Failed to create channel');

    try {
      // For direct messages, add both users as regular members
      if (channel.type === 'direct') {
        console.log('Adding members to direct message', member_ids)
        const memberPromises = member_ids!.map(profileId => 
          this.addMember(channel.id, profileId, 'member')
        );
        await Promise.all(memberPromises);
      } else {
        console.log('Adding creator as owner', user.id)
        // For regular channels, add creator as owner and other members
        await this.addMember(channel.id, user.id, 'owner');
        
        console.log('Adding other members', member_ids)
        if (member_ids && member_ids.length > 0) {
          const memberPromises = member_ids
            .filter(id => id !== user.id)
            .map(profileId => this.addMember(channel.id, profileId, 'member'));
          
          await Promise.all(memberPromises);
        }
      }

      return channel;
    } catch (error) {
      // If adding members fails, attempt to clean up the channel
      await this.deleteChannel(channel.id).catch(console.error);
      throw new Error('Failed to add channel members');
    }
  }

  async getChannelById(id: string): Promise<Channel> {
    const { data: channel, error } = await client
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!channel) throw new Error('Channel not found');

    return channel;
  }

  async updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
    const { data: channel, error } = await client
      .from('channels')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!channel) throw new Error('Channel not found');

    return channel;
  }

  async archiveChannel(id: string): Promise<void> {
    const { error } = await client
      .from('channels')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteChannel(id: string): Promise<void> {
    const { error } = await client
      .from('channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Channel Query Operations
  async listChannels(options: {
    types?: Channel['type'][];
    isArchived?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Channel[]> {
    console.log('listChannels', options)
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = client
      .from('channels')
      .select(`
        *,
        members:channel_members(
          profile_id,
          profile:profiles(
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .order('last_message_at', { ascending: false });

    if (options.types) {
      query = query.in('type', options.types);
    }

    if (typeof options.isArchived === 'boolean') {
      query = query.eq('is_archived', options.isArchived);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.filter(channel => 
      channel.type === 'public' 
      || channel.members.some((member: ChannelMember) => member.profile_id === user.id)
    ) || [];
  }

  async searchChannels(query: string): Promise<Channel[]> {
    const { data, error } = await client
      .from('channels')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('last_message_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // Channel Member Operations
  async addMember(channelId: string, profileId: string, role: ChannelMember['role'] = 'member'): Promise<ChannelMember> {
    console.log(channelId, profileId)
    const { data: member, error } = await client
      .from('channel_members')
      .insert({
        channel_id: channelId,
        profile_id: profileId,
        role
      })
      .select()
      .single();
    
    console.log('Member', JSON.stringify(member, null, 2));
    console.log('Error', JSON.stringify(error, null, 2));

    if (error) throw error;
    if (!member) throw new Error('Failed to add member');

    return member;
  }

  async removeMember(channelId: string, profileId: string): Promise<void> {
    const { error } = await client
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('profile_id', profileId);

    if (error) throw error;
  }

  async updateMemberRole(channelId: string, profileId: string, role: ChannelMember['role']): Promise<ChannelMember> {
    const { data: member, error } = await client
      .from('channel_members')
      .update({ role })
      .eq('channel_id', channelId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) throw error;
    if (!member) throw new Error('Member not found');

    return member;
  }

  async getChannelMembers(channelId: string): Promise<ChannelMember[]> {
    // First check if the channel is public
    const { data: channel, error: channelError } = await client
      .from('channels')
      .select('type')
      .eq('id', channelId)
      .single();

    if (channelError) throw channelError;
    if (!channel) throw new Error('Channel not found');

    // if (channel.type === 'public') {
    //   // For public channels, get all users and format them as channel members
    //   const { data: profiles, error: profilesError } = await client
    //     .from('public_profiles')
    //     .select('*');

    //   if (profilesError) throw profilesError;
    //   if (!profiles) return [];

    //   // Convert profiles to channel members format with proper typing
    //   return profiles.map(profile => ({
    //     id: `${channelId}_${profile.id}`,
    //     channel_id: channelId,
    //     profile_id: profile.id,
    //     role: 'member' as const,
    //     joined_at: profile.created_at,
    //     last_read_at: profile.created_at, // Use profile creation as last read date for consistency
    //     is_muted: false,
    //     settings: {
    //       notifications: true,
    //       thread_notifications: true,
    //       mention_notifications: true
    //     },
    //     metadata: {},
    //     profile
    //   }));
    // }

    // For private channels, get explicit members
    const { data, error } = await client
      .from('channel_members')
      .select('*, profile:profiles(*)')
      .eq('channel_id', channelId);

    if (error) throw error;
    return data || [];
  }

  async updateMemberSettings(
    channelId: string,
    profileId: string,
    settings: Partial<ChannelMember['settings']>
  ): Promise<ChannelMember> {
    const { data: member, error } = await client
      .from('channel_members')
      .update({
        settings: settings
      })
      .eq('channel_id', channelId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) throw error;
    if (!member) throw new Error('Member not found');

    return member;
  }

  async updateLastRead(channelId: string, profileId: string): Promise<void> {
    const { error } = await client
      .from('channel_members')
      .update({
        last_read_at: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .eq('profile_id', profileId);

    if (error) throw error;
  }

  async toggleMute(channelId: string, profileId: string, isMuted: boolean): Promise<void> {
    const { error } = await client
      .from('channel_members')
      .update({
        is_muted: isMuted
      })
      .eq('channel_id', channelId)
      .eq('profile_id', profileId);

    if (error) throw error;
  }
}

export const channelService = new ChannelService(); 