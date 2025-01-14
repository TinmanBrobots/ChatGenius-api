import { Request, Response } from 'express';
import { ChannelService } from '../services/channel.service';
import { Channel } from '../types/database';

export class ChannelController {
  async createChannel(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const channel = await channelService.createChannel(
        req.body.channelData,
        req.body.member_ids
      );
      res.status(201).json(channel);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getChannel(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const channel = await channelService.getChannelById(req.params.id);
      res.json(channel);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateChannel(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const channel = await channelService.updateChannel(
        req.params.id,
        req.body
      );
      res.json(channel);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async archiveChannel(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      await channelService.archiveChannel(req.params.id);
      res.json({ message: 'Channel archived successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteChannel(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      await channelService.deleteChannel(req.params.id);
      res.json({ message: 'Channel deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async listChannels(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const channels = await channelService.listChannels({
        types: req.query.types as Channel['type'][],
        isArchived: req.query.isArchived === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      });
      res.json(channels);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async searchChannels(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        throw new Error('Search query is required');
      }
      const channels = await channelService.searchChannels(query);
      res.json(channels);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addMember(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { profileId, role } = req.body;
      const member = await channelService.addMember(req.params.channelId, profileId, role);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { channelId, profileId } = req.params;
      await channelService.removeMember(channelId, profileId);
      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateMemberRole(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { channelId, profileId } = req.params;
      const { role } = req.body;
      const member = await channelService.updateMemberRole(channelId, profileId, role);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getChannelMembers(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const members = await channelService.getChannelMembers(req.params.channelId);
      res.json(members);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateMemberSettings(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { channelId, profileId } = req.params;
      const { settings } = req.body;
      const member = await channelService.updateMemberSettings(
        channelId,
        profileId,
        settings
      );
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateLastRead(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { channelId } = req.params;
      await channelService.updateLastRead(channelId, req.user.id);
      res.json({ message: 'Last read updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async toggleMute(req: Request, res: Response) {
    try {
      const channelService = new ChannelService(req.token);
      const { channelId } = req.params;
      const { isMuted } = req.body;
      await channelService.toggleMute(channelId, req.user.id, isMuted);
      res.json({ message: 'Channel mute status updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const channelController = new ChannelController(); 