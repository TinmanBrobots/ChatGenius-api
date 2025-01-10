import { Request, Response } from 'express';
import { fileService } from '../services/file.service';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
}).single('file');

export class FileController {
  uploadFile = async (req: Request, res: Response) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'File upload error: ' + err.message });
      }

      try {
        const { channelId } = req.params;
        const userId = req.user!.id;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        const uploadedFile = await fileService.uploadFile(channelId, file, userId);
        res.status(201).json(uploadedFile);
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    });
  };

  getFileUrl = async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.id;

      const signedUrl = await fileService.generatePresignedUrl(fileId, userId);
      res.json({ url: signedUrl });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getFileById = async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.id;

      const file = await fileService.getFileById(fileId, userId);
      res.json(file);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };

  getChannelFiles = async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;
      const { page, limit, sortBy, sortOrder } = req.query;

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      };

      const files = await fileService.getChannelFiles(channelId, userId, options);
      res.json(files);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteFile = async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.id;

      await fileService.deleteFile(fileId, userId);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateFileMetadata = async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.id;
      const metadata = req.body;

      const updatedFile = await fileService.updateFileMetadata(fileId, metadata, userId);
      res.json(updatedFile);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}

export const fileController = new FileController(); 