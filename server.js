const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Allow connections from anywhere (update origin to your Vercel URL in production for security)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', ({ sessionId, userProfile }) => {
    socket.join(sessionId);
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        sessionId,
        hostId: userProfile.id || userProfile.email,
        members: new Map(),
        queue: [],
        queueIndex: -1,
        currentTrack: null,
        isPlaying: false,
        progress: 0,
        timestamp: Date.now(),
        updatedBy: 'system'
      });
    }

    const session = sessions.get(sessionId);
    const userId = userProfile.id || userProfile.email;
    
    session.members.set(socket.id, {
      id: userId,
      name: userProfile.name,
      picture: userProfile.picture,
      socketId: socket.id
    });

    session.timestamp = Date.now();
    session.updatedBy = 'system';

    io.to(sessionId).emit('session-update', {
      ...session,
      members: Array.from(session.members.values())
    });
  });

  socket.on('update-state', ({ sessionId, userId, updates }) => {
    if (!sessions.has(sessionId)) return;

    const session = sessions.get(sessionId);
    
    Object.assign(session, updates);
    session.updatedBy = userId;
    session.timestamp = Date.now();

    socket.to(sessionId).emit('session-update', {
      ...session,
      members: Array.from(session.members.values())
    });
  });

  const handleDisconnectOrLeave = (sessionId, socketId) => {
    if (!sessions.has(sessionId)) return;
    const session = sessions.get(sessionId);
    
    session.members.delete(socketId);
    session.timestamp = Date.now();
    session.updatedBy = 'system';

    if (session.members.size === 0) {
      sessions.delete(sessionId);
    } else {
      if (session.hostId === socketId) {
        // Migrate host if the host leaves
        const newHostSocket = session.members.keys().next().value;
        session.hostId = session.members.get(newHostSocket).id;
      }
      io.to(sessionId).emit('session-update', {
        ...session,
        members: Array.from(session.members.values())
      });
    }
  };

  socket.on('leave-session', ({ sessionId }) => {
    socket.leave(sessionId);
    handleDisconnectOrLeave(sessionId, socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [sessionId, session] of sessions.entries()) {
      if (session.members.has(socket.id)) {
        handleDisconnectOrLeave(sessionId, socket.id);
      }
    }
  });
});

app.get('/', (req, res) => {
  res.send('SynQplay Socket Server is Running!');
});

server.listen(port, () => {
  console.log(`> Standalone Socket.io Server running on port ${port}`);
});