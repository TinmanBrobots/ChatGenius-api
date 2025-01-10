import { SupabaseClient } from '@supabase/supabase-js';
import { File } from '../types/database';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { supabase, supabaseAdmin } from '../config/supabase';

// Use admin client in test environment to bypass RLS
const client = process.env.NODE_ENV === 'test' ? supabaseAdmin : supabase;

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class FileService {
  private async initializeStorage(): Promise<void> {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const filesBucket = buckets?.find(bucket => bucket.name === 'files');

    if (!filesBucket) {
      const { error } = await supabaseAdmin.storage.createBucket('files', {
        public: false,
        allowedMimeTypes: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 10 * 1024 * 1024 // 10MB
      });

      if (error) {
        console.error('Failed to create files bucket:', error);
        throw new Error('Failed to initialize storage');
      }
    }
  }

  constructor() {
    // Initialize storage bucket when service is instantiated
    this.initializeStorage().catch(console.error);
  }

  private async checkChannelMembership(channelId: string, userId: string): Promise<boolean> {
    const { data } = await client
      .from('channel_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('profile_id', userId)
      .single();
    
    return !!data;
  }

  async uploadFile(
    channelId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<File> {
    // Verify channel membership
    const isMember = await this.checkChannelMembership(channelId, userId);
    if (!isMember) {
      throw new UnauthorizedError('User is not a member of this channel');
    }

    // Upload file to Supabase Storage
    const storagePath = `channels/${channelId}/${Date.now()}-${file.originalname}`;
    const { error: uploadError } = await client.storage
      .from('files')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new BadRequestError(`Failed to upload file: ${uploadError.message}`);
    }

    // Create file record in database
    const { data: fileRecord, error: dbError } = await client
      .from('files')
      .insert({
        channel_id: channelId,
        uploader_id: userId,
        name: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
        storage_path: storagePath,
        metadata: {}
      })
      .select('*, uploader:profiles(*)')
      .single();

    if (dbError) {
      // Cleanup storage if database insert fails
      await client.storage.from('files').remove([storagePath]);
      throw new BadRequestError(`Failed to create file record: ${dbError.message}`);
    }

    return fileRecord as File;
  }

  async generatePresignedUrl(fileId: string, userId: string): Promise<string> {
    const { data: file } = await client
      .from('files')
      .select('storage_path, channel_id')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Verify channel membership
    const isMember = await this.checkChannelMembership(file.channel_id, userId);
    if (!isMember) {
      throw new UnauthorizedError('User is not a member of this channel');
    }

    const { data, error } = await client.storage
      .from('files')
      .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

    if (error || !data.signedUrl) {
      throw new BadRequestError('Failed to generate signed URL');
    }

    return data.signedUrl;
  }

  async getFileById(fileId: string, userId: string): Promise<File> {
    const { data: file, error } = await client
      .from('files')
      .select('*, uploader:profiles(*)')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      throw new NotFoundError('File not found');
    }

    // Verify channel membership
    const isMember = await this.checkChannelMembership(file.channel_id, userId);
    if (!isMember) {
      throw new UnauthorizedError('User is not a member of this channel');
    }

    return file as File;
  }

  async getChannelFiles(
    channelId: string,
    userId: string,
    options: PaginationOptions = {}
  ): Promise<{ files: File[]; total: number }> {
    // Verify channel membership
    const isMember = await this.checkChannelMembership(channelId, userId);
    if (!isMember) {
      throw new UnauthorizedError('User is not a member of this channel');
    }

    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    const query = client
      .from('files')
      .select('*, uploader:profiles(*)', { count: 'exact' })
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: files, count, error } = await query;

    if (error) {
      throw new BadRequestError(`Failed to fetch channel files: ${error.message}`);
    }

    return {
      files: files as File[],
      total: count || 0
    };
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const { data: file } = await client
      .from('files')
      .select('storage_path, uploader_id, channel_id')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Check if user is file uploader or channel admin
    const { data: channelMember } = await client
      .from('channel_members')
      .select('role')
      .eq('channel_id', file.channel_id)
      .eq('profile_id', userId)
      .single();

    if (
      file.uploader_id !== userId &&
      (!channelMember || !['admin', 'owner'].includes(channelMember.role))
    ) {
      throw new UnauthorizedError('Not authorized to delete this file');
    }

    // Soft delete in database
    const { error: dbError } = await client
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId);

    if (dbError) {
      throw new BadRequestError(`Failed to delete file: ${dbError.message}`);
    }

    // Remove from storage
    const { error: storageError } = await client.storage
      .from('files')
      .remove([file.storage_path]);

    if (storageError) {
      console.error('Failed to remove file from storage:', storageError);
    }
  }

  async updateFileMetadata(
    fileId: string,
    metadata: Partial<File>,
    userId: string
  ): Promise<File> {
    const { data: file } = await client
      .from('files')
      .select('uploader_id')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new NotFoundError('File not found');
    }

    if (file.uploader_id !== userId) {
      throw new UnauthorizedError('Not authorized to update this file');
    }

    const allowedUpdates = ['name', 'metadata'];
    const updates = Object.keys(metadata).reduce((acc, key) => {
      if (allowedUpdates.includes(key)) {
        acc[key] = metadata[key as keyof typeof metadata];
      }
      return acc;
    }, {} as Record<string, any>);

    const { data: updatedFile, error } = await client
      .from('files')
      .update(updates)
      .eq('id', fileId)
      .select('*, uploader:profiles(*)')
      .single();

    if (error) {
      throw new BadRequestError(`Failed to update file: ${error.message}`);
    }

    return updatedFile as File;
  }
}

export const fileService = new FileService(); 