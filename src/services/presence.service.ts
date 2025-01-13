import { Server, Socket } from 'socket.io';
import { profileService } from './profile.service';

interface ConnectedUser {
  socketId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActivity: string;
  customStatus?: string;
}

interface PresenceData {
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: string;
  customStatus?: string;
}

export class PresenceService {
  private connectedUsers = new Map<string, ConnectedUser>();
  private io: Server;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => this.cleanupStaleConnections(), 60000);
  }

  public stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private broadcastPresenceUpdate(userId: string, presenceData: Partial<PresenceData>) {
    this.io.emit('status_update', {
      profileId: userId,
      ...presenceData
    });
  }

  private async cleanupStaleConnections() {
    const staleTimeout = 1000 * 60 * 2; // 2 minutes
    const now = Date.now();
    
    for (const [userId, userData] of this.connectedUsers.entries()) {
      const lastActivity = new Date(userData.lastActivity).getTime();
      if (now - lastActivity > staleTimeout) {
        // User hasn't sent a heartbeat in too long
        const socket = this.io.sockets.sockets.get(userData.socketId);
        if (socket) {
          socket.disconnect(true);
        }
        await this.handleDisconnect(userId);
      }
    }
  }

  public async handleConnection(socket: Socket, userId: string) {
    try {
      // Update user's status to online
      await profileService.updateStatus(userId, 'online');
      
      // Store socket connection with activity timestamp
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        status: 'online',
        lastActivity: new Date().toISOString()
      });
      
      // Broadcast user's online status
      this.broadcastPresenceUpdate(userId, {
        status: 'online',
        lastSeen: new Date().toISOString()
      });

      // Send current presence data to the new user
      const presenceData = Object.fromEntries(
        Array.from(this.connectedUsers.entries()).map(([id, data]) => [
          id,
          {
            status: data.status,
            lastSeen: data.lastActivity,
            customStatus: data.customStatus
          }
        ])
      );
      socket.emit('presence_sync', presenceData);

      this.setupSocketListeners(socket, userId);
    } catch (error) {
      console.error('Error handling connection:', error);
      socket.disconnect(true);
    }
  }

  private setupSocketListeners(socket: Socket, userId: string) {
    // Handle heartbeat
    socket.on('heartbeat', () => this.handleHeartbeat(userId));

    // Handle presence events
    socket.on('presence:active', () => this.handleActive(userId));
    socket.on('presence:away', () => this.handleAway(userId));
    socket.on('status_change', ({ status, customStatus }) => 
      this.handleStatusChange(userId, status, customStatus)
    );

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnect(userId));
  }

  private handleHeartbeat(userId: string) {
    const userData = this.connectedUsers.get(userId);
    if (userData) {
      this.connectedUsers.set(userId, {
        ...userData,
        lastActivity: new Date().toISOString()
      });
    }
  }

  private async handleActive(userId: string) {
    const userData = this.connectedUsers.get(userId);
    if (userData && userData.status !== 'online') {
      await profileService.updateStatus(userId, 'online');
      this.connectedUsers.set(userId, {
        ...userData,
        status: 'online',
        lastActivity: new Date().toISOString()
      });
      this.broadcastPresenceUpdate(userId, {
        status: 'online',
        lastSeen: new Date().toISOString()
      });
    }
  }

  private async handleAway(userId: string) {
    const userData = this.connectedUsers.get(userId);
    if (userData && userData.status === 'online') {
      await profileService.updateStatus(userId, 'away');
      this.connectedUsers.set(userId, {
        ...userData,
        status: 'away',
        lastActivity: new Date().toISOString()
      });
      this.broadcastPresenceUpdate(userId, {
        status: 'away',
        lastSeen: new Date().toISOString()
      });
    }
  }

  private async handleStatusChange(userId: string, status: ConnectedUser['status'], customStatus?: string) {
    await profileService.updateStatus(userId, status);
    const userData = this.connectedUsers.get(userId);
    if (userData) {
      this.connectedUsers.set(userId, {
        ...userData,
        status,
        customStatus,
        lastActivity: new Date().toISOString()
      });
    }
    this.broadcastPresenceUpdate(userId, {
      status,
      customStatus,
      lastSeen: new Date().toISOString()
    });
  }

  public async handleDisconnect(userId: string) {
    const now = new Date().toISOString();
    
    try {
      await profileService.updateStatus(userId, 'offline');
      await profileService.updateLastSeen(userId);
      this.connectedUsers.delete(userId);
      
      this.broadcastPresenceUpdate(userId, {
        status: 'offline',
        lastSeen: now
      });
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  public getConnectedUsers() {
    return this.connectedUsers;
  }
}

let presenceService: PresenceService | null = null;

export const initializePresenceService = (io: Server) => {
  presenceService = new PresenceService(io);
  return presenceService;
};

export const getPresenceService = () => {
  if (!presenceService) {
    throw new Error('Presence service not initialized');
  }
  return presenceService;
}; 