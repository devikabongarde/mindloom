require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { computeDecay } = require('./utils/decay');
const Shelf = require('./models/Shelf');

// Import workers
require('./workers/scrapeWorker');
const initDecayCron = require('./workers/decayCron');

const app = express();
const server = http.createServer(app);

// Sockets
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }
});
app.set('io', io); // so routes can access it if needed
global.io = io; // so queue worker can access it

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// MongoDB Connect
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shelflife', { family: 4 })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shelves', require('./routes/shelves'));
app.use('/api/links', require('./routes/links'));
app.use('/api/compost', require('./routes/compost'));
app.use('/api/users', require('./routes/users'));

io.on('connection', (socket) => {
  socket.on('shelf:join', async ({ shelfId }) => {
    socket.join(`shelf:${shelfId}`);
    // Optional: emit user joined if we track identity
    try {
      const shelf = await Shelf.findById(shelfId).select('weather');
      if (shelf?.weather) {
        socket.emit('shelf:weather:update', {
          state: shelf.weather.state,
          activityScore: shelf.weather.activityScore,
        });
      }
    } catch (err) {
      console.warn('Failed to emit shelf weather on join:', err.message);
    }
  });

  socket.on('cursor:move', (data) => {
    // data: { x, y, shelfId, userId, username, color }
    // We broadcast it to everyone else in the room
    socket.to(`shelf:${data.shelfId}`).emit('cursor:update', data);
  });
});

// Setup real cron job for decay mechanics
initDecayCron(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
