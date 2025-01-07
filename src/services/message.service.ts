import { supabase } from '../config/supabase';

export class MessageService {
  async getChannelMessages(channelId: string, limit: number = 50, before?: string) {
    let query = supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id(username, avatar_url),
        reactions:message_reactions(
          emoji,
          user_id,
          profiles:user_id(username)
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createMessage(channelId: string, userId: string, content: string, parent_message_id?: string) {
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: userId,
        content,
        parent_message_id
      })
      .select(`
        *,
        profiles:user_id(username, avatar_url),
        reactions:message_reactions(
          emoji,
          user_id,
          profiles:user_id(username)
        )
      `)
      .single();

    if (messageError) throw messageError;
    return message;
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const { data, error } = await supabase
      .from('message_reactions')
      .upsert(
        { message_id: messageId, user_id: userId, emoji },
        { onConflict: 'message_id,user_id,emoji' }
      )
      .select(`
        emoji,
        user_id,
        profiles:user_id(username)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .match({ message_id: messageId, user_id: userId, emoji });

    if (error) throw error;
  }
}

export const messageService = new MessageService(); 