import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import shelfRoutes from './routes/shelf.routes.js';
import linkRoutes from './routes/link.routes.js';
import socialRoutes from './routes/social.routes.js';
import { startDecayReminderScheduler } from './services/decayReminder.service.js';

const REALTIME_ENABLED = process.env.REALTIME_ENABLED === "true";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (origin === CLIENT_URL) return callback(null, true);
  if (origin.startsWith('chrome-extension://')) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
};

const app = express();
const server = http.createServer(app);

let io = null;

if (REALTIME_ENABLED) {
  // Use dynamic import so socket.io is only needed if flag is true (or just standard import).
  // Kept require-style destructured import equivalent for ES modules:
  const { Server } = await import('socket.io');
  io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
  });
  console.log('Socket.IO enabled');
} else {
  console.log('REALTIME_ENABLED=false → starting without Socket.IO');
}

app.set('io', io);

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shelves', shelfRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/social', socialRoutes);
app.get('/', (req, res) => res.json({ message: 'SHELFLIFE API running' }));

// Friendly body-size error for uploads encoded as base64 JSON.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload too large. Please use an image under 4MB.' });
  }
  return next(err);
});

// Socket.IO event handlers
if (REALTIME_ENABLED && io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-shelf', ({ shelfId, userName }) => {
      socket.join(shelfId);
      socket.data.shelfId = shelfId;
      socket.data.userName = userName;
      io.to(shelfId).emit('presence-update', { type: 'join', shelfId, userName, socketId: socket.id });
    });

    socket.on('leave-shelf', () => {
      const { shelfId, userName } = socket.data || {};
      if (shelfId) {
        socket.leave(shelfId);
        io.to(shelfId).emit('presence-update', { type: 'leave', shelfId, userName, socketId: socket.id });
      }
    });

    socket.on('cursor-move', ({ shelfId, x, y, userName, userId }) => {
      socket.to(shelfId).emit('cursor-update', { socketId: socket.id, userName, userId, x, y });
    });

    socket.on('disconnect', () => {
      const { shelfId, userName } = socket.data || {};
      if (shelfId) {
        io.to(shelfId).emit('presence-update', { type: 'leave', shelfId, userName, socketId: socket.id });
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
}

// Async startup: connect DB, optionally attach Redis adapter, then listen
async function startServer() {
  try {
    await connectDB();

    // Redis adapter (Brownie: Distributed Synapse)
    if (REALTIME_ENABLED && io && process.env.REDIS_URL) {
      try {
        const { createClient } = await import('redis');
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter connected ✓');
      } catch (redisErr) {
        console.warn('Redis adapter failed — running without it:', redisErr.message);
      }
    } else if (REALTIME_ENABLED && io) {
      console.warn('REDIS_URL not set — Socket.IO running in single-node mode');
    } else {
      console.log('Redis/Socket.IO adapter disabled');
    }

    startDecayReminderScheduler();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

startServer();
