import { supabase, supabaseAdmin } from '../config/supabase';
import { Message, MessageReaction } from '../types/database';

// Use admin client in test environment to bypass RLS
const client = process.env.NODE_ENV === 'test' ? supabaseAdmin : supabase;

export class MessageService {
  // Core Message Operations
  async createMessage(data: Partial<Message>): Promise<Message> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    console.log(data)

    console.log({...data, sender_id: user.id})

    const { data: message, error } = await client
      .from('messages')
      .insert({
        ...data,
        sender_id: user.id
      })
      .select('*, sender:profiles(*)')
      .single();

    if (error) throw error;
    if (!message) throw new Error('Failed to create message');

    return message;
  }

  async getMessage(id: string): Promise<Message> {
    const { data: message, error } = await client
      .from('messages')
      .select('*, sender:profiles(*), reactions:message_reactions(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!message) throw new Error('Message not found');

    return message;
  }

  async updateMessage(id: string, content: string): Promise<Message> {
    const { data: message, error } = await client
      .from('messages')
      .update({ content })
      .eq('id', id)
      .select('*, sender:profiles(*)')
      .single();

    if (error) throw error;
    if (!message) throw new Error('Message not found');

    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await client
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async restoreMessage(id: string): Promise<void> {
    const { error } = await client
      .from('messages')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  }

  // Thread Operations
  async createThreadReply(parentId: string, data: Partial<Message>): Promise<Message> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: message, error } = await client
      .from('messages')
      .insert({
        ...data,
        parent_id: parentId,
        sender_id: user.id
      })
      .select('*, sender:profiles(*)')
      .single();

    if (error) throw error;
    if (!message) throw new Error('Failed to create thread reply');

    return message;
  }

  async getThreadReplies(parentId: string): Promise<Message[]> {
    const { data, error } = await client
      .from('messages')
      .select('*, sender:profiles(*), reactions:message_reactions(*)')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Query Operations
  async getChannelMessages(channelId: string, options: {
    limit?: number;
    before?: Date;
    after?: Date;
  } = {}): Promise<Message[]> {
    let query = client
      .from('messages')
      .select('*, sender:profiles(*), reactions:message_reactions(*)')
      .eq('channel_id', channelId)
      .is('parent_id', null) // Only get top-level messages
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.before) {
      query = query.lt('created_at', options.before.toISOString());
    }

    if (options.after) {
      query = query.gt('created_at', options.after.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async searchMessages(query: string, options: {
    channelId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Message[]> {
    let dbQuery = client
      .from('messages')
      .select('*, sender:profiles(*)')
      .textSearch('content', query)
      .order('created_at', { ascending: false });

    if (options.channelId) {
      dbQuery = dbQuery.eq('channel_id', options.channelId);
    }

    if (options.limit) {
      dbQuery = dbQuery.limit(options.limit);
    }

    if (options.offset) {
      dbQuery = dbQuery.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;
    return data || [];
  }

  // Reaction Operations
  async addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: reaction, error } = await client
      .from('message_reactions')
      .insert({
        message_id: messageId,
        profile_id: user.id,
        emoji
      })
      .select()
      .single();

    if (error) throw error;
    if (!reaction) throw new Error('Failed to add reaction');

    return reaction;
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await client
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('profile_id', user.id)
      .eq('emoji', emoji);

    if (error) throw error;
  }

  async getReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await client
      .from('message_reactions')
      .select('*, profile:profiles(*)')
      .eq('message_id', messageId);

    if (error) throw error;
    return data || [];
  }
}

export const messageService = new MessageService(); 