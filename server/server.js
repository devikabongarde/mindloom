import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import shelfRoutes from './routes/shelf.routes.js';
import linkRoutes from './routes/link.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.IO
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

app.set('io', io);

connectDB();

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Serve Puppeteer screenshots statically at /static/screenshots/...
app.use('/static', express.static(path.join(__dirname, 'public')));

// HTTP Routes
app.use('/api/auth', authRoutes);
app.use('/api/shelves', shelfRoutes);
app.use('/api/links', linkRoutes);
app.get('/', (req, res) => res.json({ message: 'SHELFLIFE API running' }));

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-shelf', ({ shelfId, userName }) => {
    socket.join(shelfId);
    socket.data.shelfId = shelfId;
    socket.data.userName = userName;
    io.to(shelfId).emit('presence-update', {
      type: 'join', shelfId, userName, socketId: socket.id,
    });
  });

  socket.on('leave-shelf', () => {
    const { shelfId, userName } = socket.data;
    if (shelfId) {
      socket.leave(shelfId);
      io.to(shelfId).emit('presence-update', {
        type: 'leave', shelfId, userName, socketId: socket.id,
      });
    }
  });

  socket.on('disconnect', () => {
    const { shelfId, userName } = socket.data || {};
    if (shelfId) {
      io.to(shelfId).emit('presence-update', {
        type: 'leave', shelfId, userName, socketId: socket.id,
      });
    }
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
