import { SupabaseClient } from '@supabase/supabase-js';
import { getClientWithToken } from '../config/supabase';
import { Channel, ChannelMember, Database } from '../types/database';

export class ChannelService {

  private client: SupabaseClient<Database>;

  constructor(token: string) {
    this.client = getClientWithToken(token);
  }

  // Core Channel Operations
  async createChannel(channelData: Partial<Channel>, member_ids?: string[]): Promise<Channel> {
    console.log('createChannel', channelData, member_ids);
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // For direct messages, ensure exactly two members
    if (channelData.type === 'direct') {
      if (!member_ids || member_ids.length !== 1) {
        throw new Error('Direct messages must have exactly one other member');
      }
      // Add current user to member_ids for direct messages
      member_ids = [user.id, ...member_ids];
    }

    // Create the channel
    const { data: channel, error } = await this.client
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
        const memberPromises = member_ids!.map(profileId => 
          this.addMember(channel.id, profileId, 'member')
        );
        await Promise.all(memberPromises);
      } else {
        // For regular channels, add creator as owner and other members
        await this.addMember(channel.id, user.id, 'owner');
        
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
      console.error('Error adding members. Cleaning up channel', channel.id)
      await this.deleteChannel(channel.id).catch(console.error);
      throw new Error('Failed to add channel members');
    }
  }

  async getChannelById(id: string): Promise<Channel> {
    const { data: channel, error } = await this.client
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!channel) throw new Error('Channel not found');

    return channel;
  }

  async updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
    const { data: channel, error } = await this.client
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
    const { error } = await this.client
      .from('channels')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteChannel(id: string): Promise<void> {
    const { error } = await this.client
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
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    let query = this.client
      .from('channels')
      .select(`
        *,
        members:channel_members(
          profile_id,
          profile:profiles(
            id,
            username,
            full_name,
            avatar_url,
            status,
            last_seen_at,
            custom_status
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
    const { data, error } = await this.client
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
    const { error: createError } = await this.client
      .from('channel_members')
      .insert({
        channel_id: channelId,
        profile_id: profileId,
        role
      });

    if (createError) throw createError;

    const { data: member, error: readError } = await this.client
      .from('channel_members')
      .select()
      .eq('channel_id', channelId)
      .eq('profile_id', profileId)
      .single();

    if (readError) throw readError;
    if (!member) throw new Error('Failed to add member');

    return member;
  }

  async removeMember(channelId: string, profileId: string): Promise<void> {
    const { error } = await this.client
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('profile_id', profileId);

    if (error) throw error;
  }

  async updateMemberRole(channelId: string, profileId: string, role: ChannelMember['role']): Promise<ChannelMember> {
    const { data: member, error } = await this.client
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
    const { data: channel, error: channelError } = await this.client
      .from('channels')
      .select('type')
      .eq('id', channelId)
      .single();

    if (channelError) throw channelError;
    if (!channel) throw new Error('Channel not found');

    const { data, error } = await this.client
      .from('channel_members')
      .select('*, profile:profiles(*)')
      .eq('channel_id', channelId);

    if (error) throw error;
    return data || [];
  }

  async updateMemberSettings(
    channelId: string,
    profileId: string,
    settings: Partial<ChannelMember['settings']>,
    token?: string
  ): Promise<ChannelMember> {
    const { data: member, error } = await this.client
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
    const { error } = await this.client
      .from('channel_members')
      .update({
        last_read_at: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .eq('profile_id', profileId);

    if (error) throw error;
  }

  async toggleMute(channelId: string, profileId: string, isMuted: boolean): Promise<void> {
    const { error } = await this.client
      .from('channel_members')
      .update({
        is_muted: isMuted
      })
      .eq('channel_id', channelId)
      .eq('profile_id', profileId);

    if (error) throw error;
  }
}