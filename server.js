const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// === GLOOV DATA STORE (Simple in-memory for now) ===
let users = {};
let rooms = {
  "gloov-lounge": { name: "GLOOV Lounge", users: [] },
  "love-lounge": { name: "Love Lounge ❤️", users: [] },
  "music-vibes": { name: "Music Vibes 🎵", users: [] }
};
let wallets = {};

app.get('/', (req, res) => {
  res.json({ 
    status: 'GLOOV Backend is LIVE 🔥',
    features: ['Real-time Chat', 'Voice Rooms', 'Dating', 'Wallet', 'Rooms'],
    users_online: Object.keys(users).length,
    rooms: Object.keys(rooms)
  });
});

app.get('/rooms', (req, res) => res.json(rooms));
app.get('/users', (req, res) => res.json(users));

// Socket.io Real-time
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:join', (userData) => {
    users[socket.id] = { id: socket.id, ...userData, online: true };
    io.emit('users:update', users);
  });

  socket.on('room:join', (roomId) => {
    socket.join(roomId);
    if(rooms[roomId]) {
      if(!rooms[roomId].users.includes(socket.id)) rooms[roomId].users.push(socket.id);
      io.to(roomId).emit('room:message', { system: true, text: `New user joined ${roomId}` });
    }
  });

  socket.on('chat:message', (data) => {
    io.emit('chat:message', { ...data, id: Date.now(), from: socket.id });
  });

  socket.on('voice:signal', (data) => {
    socket.to(data.room).emit('voice:signal', { from: socket.id, signal: data.signal });
  });

  socket.on('wallet:update', (data) => {
    wallets[socket.id] = data.balance;
    socket.emit('wallet:update', { balance: data.balance });
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('users:update', users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`GLOOV running on ${PORT}`));
