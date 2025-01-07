import { Request, Response } from 'express';
import { channelService } from '../services/channel.service';
import '../types/express';

export class ChannelController {
  getChannels = async (req: Request, res: Response) => {
    try {
      const data = await channelService.getUserChannels(req.user.id);
      res.json({ data });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  createChannel = async (req: Request, res: Response) => {
    const { name, description, is_private, member_ids } = req.body;

    try {
      const channel = await channelService.createChannel(
        name,
        description,
        is_private,
        req.user.id,
        member_ids
      );
      res.status(201).json({ data: channel });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  getChannelMembers = async (req: Request, res: Response) => {
    const { channelId } = req.params;

    try {
      const members = await channelService.getChannelMembers(channelId);
      res.json({ data: members });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  addChannelMember = async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const { user_id, role } = req.body;

    try {
      await channelService.addChannelMember(channelId, user_id, role);
      res.status(201).json({ message: 'Member added successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  removeChannelMember = async (req: Request, res: Response) => {
    const { channelId, userId } = req.params;

    try {
      await channelService.removeChannelMember(channelId, userId);
      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  updateMemberRole = async (req: Request, res: Response) => {
    const { channelId, userId } = req.params;
    const { role } = req.body;

    try {
      await channelService.updateChannelRole(channelId, userId, role);
      res.json({ message: 'Role updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  searchChannels = async (req: Request, res: Response) => {
    const { query } = req.query;

    try {
      const channels = await channelService.searchChannels(query as string, req.user.id);
      res.json({ data: channels });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const channelController = new ChannelController(); 