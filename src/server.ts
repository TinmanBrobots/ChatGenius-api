import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { profileService } from './services/profile.service';

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map<string, { socketId: string; status: string }>();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Routes
app.use('/api', routes);

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log('A user connected');
  
  // Get user ID from auth token
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;
  
  if (userId) {
    // Update user's status to online
    await profileService.updateStatus(userId, 'online').catch((error) => {
      console.error('Error updating status1:', error);
    });
    
    // Store socket connection
    connectedUsers.set(userId, { socketId: socket.id, status: 'online' });
    
    // Broadcast user's online status to all connected clients
    socket.broadcast.emit('status_update', {
      profileId: userId,
      status: 'online',
      lastSeen: new Date().toISOString()
    });

    // Send current presence data to the newly connected user
    const presenceData = Object.fromEntries(
      Array.from(connectedUsers.entries()).map(([id, data]) => [
        id,
        { status: data.status }
      ])
    );
    socket.emit('presence_sync', presenceData);
  }

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
  });

  socket.on('send_message', async (message) => {
    io.to(message.channel_id).emit('new_message', message);
  });

  socket.on('typing', (data) => {
    socket.to(data.channel_id).emit('user_typing', {
      user_id: data.user_id,
      channel_id: data.channel_id
    });
  });

  socket.on('status_change', async ({ status }) => {
    if (userId) {
      await profileService.updateStatus(userId, status).catch((error) => {
        console.error('Error updating status2:', error);
      });
      connectedUsers.set(userId, { ...connectedUsers.get(userId)!, status });
      socket.broadcast.emit('status_update', {
        profileId: userId,
        status,
        lastSeen: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected');
    if (userId) {
      // Update user's status to offline and last seen
      const now = new Date().toISOString();
      await profileService.updateStatus(userId, 'offline').catch((error) => {
        console.error('Error updating status3:', error);
      });
      await profileService.updateLastSeen(userId).catch((error) => {
        console.error('Error updating last seen:', error);
      });
      
      // Remove from connected users
      connectedUsers.delete(userId);
      
      // Broadcast offline status
      socket.broadcast.emit('status_update', {
        profileId: userId,
        status: 'offline',
        lastSeen: now
      });
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 