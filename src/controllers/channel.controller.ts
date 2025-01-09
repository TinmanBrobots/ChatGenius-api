import { Request, Response } from 'express';
import { channelService } from '../services/channel.service';
import { Channel, ChannelMember } from '../types/database';

export class ChannelController {
  // Channel Operations
  async createChannel(req: Request, res: Response) {
    try {
      const channel = await channelService.createChannel(req.body);
      res.status(201).json(channel);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getChannel(req: Request, res: Response) {
    try {
      const channel = await channelService.getChannelById(req.params.id);
      res.json(channel);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  }

  async updateChannel(req: Request, res: Response) {
    try {
      const channel = await channelService.updateChannel(req.params.id, req.body);
      res.json(channel);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async archiveChannel(req: Request, res: Response) {
    try {
      await channelService.archiveChannel(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async deleteChannel(req: Request, res: Response) {
    try {
      await channelService.deleteChannel(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async listChannels(req: Request, res: Response) {
    try {
      const options = {
        type: req.query.type as Channel['type'],
        isArchived: req.query.isArchived === 'true',
        limit: parseInt(req.query.limit as string) || undefined,
        offset: parseInt(req.query.offset as string) || undefined
      };
      const channels = await channelService.listChannels(options);
      res.json(channels);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async searchChannels(req: Request, res: Response) {
    try {
      const channels = await channelService.searchChannels(req.query.q as string);
      res.json(channels);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // Channel Member Operations
  async addMember(req: Request, res: Response) {
    try {
      const member = await channelService.addMember(
        req.params.channelId,
        req.body.profileId,
        req.body.role
      );
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      await channelService.removeMember(
        req.params.channelId,
        req.params.profileId
      );
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async updateMemberRole(req: Request, res: Response) {
    try {
      const member = await channelService.updateMemberRole(
        req.params.channelId,
        req.params.profileId,
        req.body.role as ChannelMember['role']
      );
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getChannelMembers(req: Request, res: Response) {
    try {
      const members = await channelService.getChannelMembers(req.params.channelId);
      res.json(members);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async updateMemberSettings(req: Request, res: Response) {
    try {
      const member = await channelService.updateMemberSettings(
        req.params.channelId,
        req.params.profileId,
        req.body.settings
      );
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async updateLastRead(req: Request, res: Response) {
    try {
      await channelService.updateLastRead(
        req.params.channelId,
        req.params.profileId
      );
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async toggleMute(req: Request, res: Response) {
    try {
      await channelService.toggleMute(
        req.params.channelId,
        req.params.profileId,
        req.body.isMuted
      );
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}

export const channelController = new ChannelController(); 