import { Request, Response } from 'express';
import { messageService } from '../services/message.service';
import { z } from 'zod';
import { Message } from '@/types/database';

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

export class MessageController {
  // Message Operations
  async createMessage(req: Request, res: Response) {
    try {
      const data = createMessageSchema.parse(req.body) as Partial<Message>;
      const message = await messageService.createMessage(data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: (error as Error).message });
      }
    }
  }

  async getMessage(req: Request, res: Response) {
    try {
      const message = await messageService.getMessage(req.params.id);
      res.json(message);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  }

  async updateMessage(req: Request, res: Response) {
    try {
      const { content } = updateMessageSchema.parse(req.body);
      const message = await messageService.updateMessage(req.params.id, content);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: (error as Error).message });
      }
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      await messageService.deleteMessage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async restoreMessage(req: Request, res: Response) {
    try {
      await messageService.restoreMessage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Thread Operations
  async createThreadReply(req: Request, res: Response) {
    try {
      const data = createMessageSchema.parse(req.body) as Partial<Message>;
      const message = await messageService.createThreadReply(req.params.parentId, data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: (error as Error).message });
      }
    }
  }

  async getThreadReplies(req: Request, res: Response) {
    try {
      const messages = await messageService.getThreadReplies(req.params.parentId);
      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Channel Messages
  async getChannelMessages(req: Request, res: Response) {
    try {
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        before: req.query.before ? new Date(req.query.before as string) : undefined,
        after: req.query.after ? new Date(req.query.after as string) : undefined
      };
      const messages = await messageService.getChannelMessages(req.params.channelId, options);
      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async searchMessages(req: Request, res: Response) {
    try {
      const options = {
        channelId: req.query.channelId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };
      const messages = await messageService.searchMessages(req.query.q as string, options);
      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Reaction Operations
  async addReaction(req: Request, res: Response) {
    try {
      const { emoji } = reactionSchema.parse(req.body);
      const reaction = await messageService.addReaction(req.params.messageId, emoji);
      res.status(201).json(reaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(400).json({ error: (error as Error).message });
      }
    }
  }

  async removeReaction(req: Request, res: Response) {
    try {
      await messageService.removeReaction(req.params.messageId, req.params.emoji);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getReactions(req: Request, res: Response) {
    try {
      const reactions = await messageService.getReactions(req.params.messageId);
      res.json(reactions);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}

export const messageController = new MessageController(); 