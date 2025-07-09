const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

const setupSocketHandlers = (io) => {
  // Store active meetings and participants
  const activeMeetings = new Map();
  // Store userId to socketId mapping per meeting
  const meetingUserSockets = new Map();

  // Debug endpoint to list active meetings
  io.on('connection', (socket) => {
    socket.on('debug-meetings', () => {
      console.log('=== ACTIVE MEETINGS DEBUG ===');
      activeMeetings.forEach((participants, meetingId) => {
        console.log(`Meeting ${meetingId}:`, Array.from(participants));
      });
      console.log('=============================');
    });
  });

  // Middleware to authenticate socket connections (optional for now)
  io.use(async (socket, next) => {
    try {
      // Get user info from query parameters
      const userId = socket.handshake.query.userId || 'user-' + Date.now();
      const userName = socket.handshake.query.userName || 'User ' + Math.floor(Math.random() * 1000);
      const isGuest = socket.handshake.query.isGuest === 'true';
      
      socket.user = {
        id: userId,
        username: userName,
        isGuest: isGuest
      };
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('SOCKET CONNECTED:');
    console.log('Query userName:', socket.handshake.query.userName);
    console.log('socket.user:', socket.user);
    console.log(`User connected: ${socket.user.username} (${socket.user.id})`);

    // Join meeting room
    socket.on('join-meeting', async (data) => {
      try {
        const { meetingId } = data;
        console.log(`User ${socket.user.username} (${socket.user.id}) joining meeting: ${meetingId}`);
        
        // Join socket room
        socket.join(`meeting-${meetingId}`);
        socket.meetingId = meetingId;

        // Track participants in meeting
        if (!activeMeetings.has(meetingId)) {
          activeMeetings.set(meetingId, new Set());
        }
        if (!meetingUserSockets.has(meetingId)) {
          meetingUserSockets.set(meetingId, new Map());
        }
        const participants = activeMeetings.get(meetingId);
        const userSocketMap = meetingUserSockets.get(meetingId);
        // Send the new user a list of existing participants (excluding themselves)
        // Build participant info array (excluding self)
        const existingUsers = Array.from(participants)
          .filter(uid => uid !== socket.user.id)
          .map(uid => {
            // Try to get socket for this user
            let name = 'Participant';
            let isGuest = true;
            // Find the socket instance for this userId (Map iteration)
            for (let [id, s] of io.sockets.sockets) {
              if (s.user && s.user.id === uid) {
                name = s.user.username || 'Participant';
                isGuest = s.user.isGuest;
                break;
              }
            }
            return { id: uid, name, isGuest };
          });
        socket.emit('existing-users', { users: existingUsers });
        participants.add(socket.user.id);
        userSocketMap.set(socket.user.id, socket.id);

        console.log(`Active participants in meeting ${meetingId}:`, Array.from(participants));

        // Notify other participants
        socket.to(`meeting-${meetingId}`).emit('user-joined', {
          userId: socket.user.id,
          username: socket.user.username,
          isGuest: socket.user.isGuest
        });

        console.log(`User ${socket.user.username} joined meeting ${meetingId}`);

      } catch (error) {
        console.error('Join meeting error:', error);
        socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    // WebRTC signaling - Offer
    socket.on('offer', (data) => {
      try {
        const { to, offer } = data;
        
        if (!socket.meetingId) return;

        const userSocketMap = meetingUserSockets.get(socket.meetingId);
        const targetSocketId = userSocketMap ? userSocketMap.get(to) : null;
        if (targetSocketId) {
          console.log(`Forwarding offer from ${socket.user.id} to ${to} in meeting ${socket.meetingId}`);
          io.to(targetSocketId).emit('offer', {
            from: socket.user.id,
            offer
          });
        } else {
          console.warn(`No socketId found for userId ${to} in meeting ${socket.meetingId}`);
        }

      } catch (error) {
        console.error('Offer error:', error);
      }
    });

    // WebRTC signaling - Answer
    socket.on('answer', (data) => {
      try {
        const { to, answer } = data;
        
        if (!socket.meetingId) return;

        const userSocketMap = meetingUserSockets.get(socket.meetingId);
        const targetSocketId = userSocketMap ? userSocketMap.get(to) : null;
        if (targetSocketId) {
          console.log(`Forwarding answer from ${socket.user.id} to ${to} in meeting ${socket.meetingId}`);
          io.to(targetSocketId).emit('answer', {
            from: socket.user.id,
            answer
          });
        } else {
          console.warn(`No socketId found for userId ${to} in meeting ${socket.meetingId}`);
        }

      } catch (error) {
        console.error('Answer error:', error);
      }
    });

    // WebRTC signaling - ICE Candidate
    socket.on('ice-candidate', (data) => {
      try {
        const { to, candidate } = data;
        
        if (!socket.meetingId) return;

        const userSocketMap = meetingUserSockets.get(socket.meetingId);
        const targetSocketId = userSocketMap ? userSocketMap.get(to) : null;
        if (targetSocketId) {
          console.log(`Forwarding ICE candidate from ${socket.user.id} to ${to} in meeting ${socket.meetingId}`);
          io.to(targetSocketId).emit('ice-candidate', {
            from: socket.user.id,
            candidate
          });
        } else {
          console.warn(`No socketId found for userId ${to} in meeting ${socket.meetingId}`);
        }

      } catch (error) {
        console.error('ICE candidate error:', error);
      }
    });

    // Leave meeting
    socket.on('leave-meeting', (data) => {
      try {
        const { meetingId } = data;
        
        if (socket.meetingId) {
          // Notify other participants
          socket.to(`meeting-${meetingId}`).emit('user-left', {
            userId: socket.user.id,
            username: socket.user.username,
            isGuest: socket.user.isGuest
          });

          // Remove from tracking
          if (activeMeetings.has(meetingId)) {
            activeMeetings.get(meetingId).delete(socket.user.id);
            if (activeMeetings.get(meetingId).size === 0) {
              activeMeetings.delete(meetingId);
            }
          }
          if (meetingUserSockets.has(meetingId)) {
            meetingUserSockets.get(meetingId).delete(socket.user.id);
            if (meetingUserSockets.get(meetingId).size === 0) {
              meetingUserSockets.delete(meetingId);
            }
          }

          socket.leave(`meeting-${meetingId}`);
          socket.meetingId = null;

          console.log(`User ${socket.user.username} left meeting ${meetingId}`);
        }

      } catch (error) {
        console.error('Leave meeting error:', error);
      }
    });

    // Chat messages
    socket.on('chat-message', async (data) => {
      try {
        const { message, messageType = 'text' } = data;
        
        if (!socket.meetingId) return;

        const chatMessage = {
          userId: socket.user.id,
          username: socket.user.username,
          message,
          messageType,
          timestamp: new Date()
        };

        // Broadcast message to all participants
        io.to(`meeting-${socket.meetingId}`).emit('chat-message', chatMessage);

      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.user.id})`);
      
      // Clean up if user was in a meeting
      if (socket.meetingId) {
        socket.to(`meeting-${socket.meetingId}`).emit('user-left', {
          userId: socket.user.id,
          username: socket.user.username,
          isGuest: socket.user.isGuest
        });

        if (activeMeetings.has(socket.meetingId)) {
          activeMeetings.get(socket.meetingId).delete(socket.user.id);
          if (activeMeetings.get(socket.meetingId).size === 0) {
            activeMeetings.delete(socket.meetingId);
          }
        }
        if (meetingUserSockets.has(socket.meetingId)) {
          meetingUserSockets.get(socket.meetingId).delete(socket.user.id);
          if (meetingUserSockets.get(socket.meetingId).size === 0) {
            meetingUserSockets.delete(socket.meetingId);
          }
        }
      }
    });
  });
};

module.exports = { setupSocketHandlers }; 