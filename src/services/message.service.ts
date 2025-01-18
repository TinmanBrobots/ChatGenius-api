import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin, getClientWithToken } from '../config/supabase';
import { Database, Message, MessageReaction } from '../types/database';
import { RAGService } from './rag.service';

interface ChannelMemberBasic {
  channel_id: string;
}

interface MessageWithChannel extends Message {
  channel?: {
    name: string;
  };
}

export class MessageService {
  private client: SupabaseClient<Database>;
  private ragService: RAGService;

  constructor(token: string) {
    this.client = process.env.NODE_ENV === 'test' ? supabaseAdmin : getClientWithToken(token);
    this.ragService = new RAGService(token);
  }

  // Initialize RAG service
  private async ensureRAGInitialized(): Promise<void> {
    try {
      await this.ragService.initialize();
    } catch (error) {
      console.error('Failed to initialize RAG service:', error);
      // Don't throw - we want message operations to work even if RAG fails
    }
  }

  // Core Message Operations
  async createMessage(data: Partial<Message> & { mentioned_users?: string[] }, asSystem: boolean = false): Promise<Message> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user && !asSystem) throw new Error('Unauthorized');

    console.log(asSystem);

    // Create the message
    const { data: message, error } = await (asSystem ? supabaseAdmin : this.client)
      .from('messages')
      .insert({
        ...data,
        sender_id: data.sender_id || user?.id,
        metadata: {
          ...data.metadata,
        }
      })
      .select('*, sender:profiles(*), channel:channels!inner(type, name)')
      .single();

    if (error) throw error;
    if (!message) throw new Error('Failed to create message');

    if (!asSystem) {
      this.uploadMessageToRAG(message);
    }

    // Process message with RAG in the background
    if (data.metadata?.mentioned_users?.length) {
      this.processMessageWithRAG(message, data.metadata.mentioned_users)
      .catch(error => {
        console.error('Failed to process message with RAG:', error);
      });
    }

    return message;
  }

  private async uploadMessageToRAG(message: Message): Promise<void> {
    await this.ensureRAGInitialized();
    await this.ragService.processMessage(message);
  }

  // Process message with RAG and handle @mentions
  private async processMessageWithRAG(
    message: Message & { channel: { type: string, name: string } },
    mentionedUserIds: string[]
  ): Promise<void> {
    try {
      await this.ensureRAGInitialized();

      // Add message to vector database
      await this.ragService.processMessage(message);

      // Get mentioned users' profiles
      const { data: mentionedUsers, error: usersError } = await this.client
        .from('profiles')
        .select('*')
        .in('id', mentionedUserIds);

      if (usersError || !mentionedUsers) {
        throw new Error('Failed to fetch mentioned users');
      }

      // Generate responses for each mentioned user
      for (const mentionedUser of mentionedUsers) {
        try {
          console.log("Generating response for @", mentionedUser.username);
          const response = await this.ragService.handleMentionQuery(
            message.content,
            message.channel_id,
            mentionedUser.id
          );

          console.log("Response generated for @", mentionedUser.username);
          console.log("Creating response message");

          // Create response message
          await this.createMessage({
            channel_id: message.channel_id,
            content: response.response,
            parent_id: message.id, // Link as a reply
            sender_id: mentionedUser.id,
            type: 'system',
            metadata: {
              isRAGResponse: true,
              confidence: response.confidence,
              mentionedUser: mentionedUser.username
            }
          }, true);

        } catch (error) {
          console.error(`Failed to generate response for @${mentionedUser.username}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to process message with RAG:', error);
    }
  }

  async getMessage(id: string): Promise<Message> {
    const { data: message, error } = await this.client
      .from('messages')
      .select('*, sender:profiles(*), reactions:message_reactions(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!message) throw new Error('Message not found');

    return message;
  }

  async updateMessage(id: string, content: string): Promise<Message> {
    const { data: message, error } = await this.client
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
    const { error } = await this.client
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async restoreMessage(id: string): Promise<void> {
    const { error } = await this.client
      .from('messages')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  }

  // Thread Operations
  async createThreadReply(parentId: string, data: Partial<Message>): Promise<Message> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: message, error } = await this.client
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
    const { data, error } = await this.client
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
    let query = this.client
      .from('messages')
      .select('*, sender:profiles(*), reactions:message_reactions(*)')
      .eq('channel_id', channelId)
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
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // First get the channels the user is a member of
    const { data: userChannels, error: userChannelsError } = await this.client
      .from('channel_members')
      .select('channel_id')
      .eq('profile_id', user.id);

    if (!userChannels) return [];

    const channelIds = userChannels.map((cm: ChannelMemberBasic) => cm.channel_id);

    let dbQuery = this.client
      .from('messages')
      .select(`
        *,
        sender:profiles(*),
        channel:channels(id, name)
      `)
      .textSearch('content', query)
      .in('channel_id', channelIds)
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

    return (data || []).map((message: MessageWithChannel) => ({
      ...message,
      channel_name: message.channel?.name,
      channel: undefined
    }));
  }

  // Reaction Operations
  async addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: reaction, error } = await this.client
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
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await this.client
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('profile_id', user.id)
      .eq('emoji', emoji);

    if (error) throw error;
  }

  async getReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await this.client
      .from('message_reactions')
      .select('*, profile:profiles(*)')
      .eq('message_id', messageId);

    if (error) throw error;
    return data || [];
  }
} 