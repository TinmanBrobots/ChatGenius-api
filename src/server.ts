import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { initializePresenceService } from './services/presence.service';

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);

// Helper function to normalize origin URLs
const normalizeOrigin = (origin: string) => {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    
    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      const allowedDevOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];
      if (allowedDevOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
    }

    // In production, check against allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://v0-chat-genius-51axsjppdpy.vercel.app',
      'https://chat-genius-web.vercel.app'
    ].filter((url): url is string => typeof url === 'string').map(normalizeOrigin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  optionsSuccessStatus: 200
};

const io = new Server(httpServer, {
  cors: corsOptions
});

// Initialize presence service
const presenceService = initializePresenceService(io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Health check endpoint for Railway
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/api', routes);

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log('A user connected');
  
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  // Handle connection with presence service
  await presenceService.handleConnection(socket, userId);

  // Handle channel events
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
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 