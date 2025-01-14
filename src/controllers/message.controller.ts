import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { z } from 'zod';

// Validation schemas
const createMessageSchema = z.object({
  channel_id: z.string().uuid(),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file', 'system']).default('text'),
  parent_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

const updateMessageSchema = z.object({
  content: z.string().min(1)
});

const reactionSchema = z.object({
  emoji: z.string().min(1)
});

const searchQuerySchema = z.object({
  q: z.string(),
  channelId: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional()
});

export class MessageController {
  // Message Operations
  async createMessage(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const data = createMessageSchema.parse(req.body);
      const message = await messageService.createMessage(data);
      res.status(201).json(message);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  async getMessage(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const message = await messageService.getMessage(req.params.id);
      res.json(message);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateMessage(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const { content } = updateMessageSchema.parse(req.body);
      const message = await messageService.updateMessage(req.params.id, content);
      res.json(message);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      await messageService.deleteMessage(req.params.id);
      res.json({ message: 'Message deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async restoreMessage(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      await messageService.restoreMessage(req.params.id);
      res.json({ message: 'Message restored successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Thread Operations
  async createThreadReply(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const data = createMessageSchema.parse(req.body);
      const message = await messageService.createThreadReply(req.params.parentId, data);
      res.status(201).json(message);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  async getThreadReplies(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const messages = await messageService.getThreadReplies(req.params.parentId);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Channel Messages
  async getChannelMessages(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const messages = await messageService.getChannelMessages(
        req.params.channelId,
        {
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          before: req.query.before ? new Date(req.query.before as string) : undefined,
          after: req.query.after ? new Date(req.query.after as string) : undefined
        }
      );
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async searchMessages(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const { q: query, channelId, limit, offset } = searchQuerySchema.parse(req.query);
      
      const messages = await messageService.searchMessages(
        query,
        {
          channelId: channelId,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined
        }
      );
      res.json(messages);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid search parameters' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  // Reaction Operations
  async addReaction(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const { emoji } = reactionSchema.parse(req.body);
      const reaction = await messageService.addReaction(req.params.messageId, emoji);
      res.status(201).json(reaction);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  async removeReaction(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      await messageService.removeReaction(req.params.messageId, req.params.emoji);
      res.json({ message: 'Reaction removed successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getReactions(req: Request, res: Response) {
    try {
      const messageService = new MessageService(req.token);
      const reactions = await messageService.getReactions(req.params.messageId);
      res.json(reactions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const messageController = new MessageController(); 