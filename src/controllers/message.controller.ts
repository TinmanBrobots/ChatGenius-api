import { Request, Response } from 'express';
import { messageService } from '../services/message.service';
import '../types/express';

export class MessageController {
  getMessages = async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const { limit, before } = req.query;

    try {
      const messages = await messageService.getChannelMessages(
        channelId,
        Number(limit),
        before as string
      );
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  createMessage = async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const { content, parent_message_id } = req.body;

    try {
      const message = await messageService.createMessage(
        channelId,
        req.user.id,
        content,
        parent_message_id
      );
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  addReaction = async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    try {
      const reaction = await messageService.addReaction(
        messageId,
        req.user.id,
        emoji
      );
      res.status(201).json(reaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  removeReaction = async (req: Request, res: Response) => {
    const { messageId, emoji } = req.params;

    try {
      await messageService.removeReaction(
        messageId,
        req.user.id,
        emoji
      );
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const messageController = new MessageController(); 