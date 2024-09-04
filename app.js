const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
dotenv.config();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let waitingUsers = [];
let rooms = {};  // To track rooms and partners

io.on('connection', (socket) => {

  socket.on('joinroom', () => {
    if (waitingUsers.length > 0) {
      let partner = waitingUsers.shift();
      const roomName = `${socket.id}-${partner.id}`;

      // Store the room and partners
      rooms[socket.id] = { roomName, partnerId: partner.id };
      rooms[partner.id] = { roomName, partnerId: socket.id };

      socket.join(roomName);
      partner.join(roomName);
      io.to(roomName).emit('partnerjoined', roomName);

    } else {
      waitingUsers.push(socket);
    }
  });

  socket.on('sendmessage', (data) => {
    socket.to(data.room).emit('message', data.message);
  });

  socket.on('singlingMessage', (data) => {
    socket.to(data.room).emit('singlingMessage', data.message);
  });

  socket.on('startVideoChat', ({ room }) => {
    socket.to(room).emit('incomingCall');
  });

  socket.on('acceptCall', ({ room }) => {
    socket.to(room).emit('callAccepted');
  });

  socket.on('declineCall', ({ room }) => {
    socket.to(room).emit('callDeclined');
  });

  socket.on('endCall', ({ room }) => {
    socket.to(room).emit('callEnded');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');

    // Handle disconnection
    const userRoom = rooms[socket.id];
    if (userRoom) {
      const partnerId = userRoom.partnerId;
      const roomName = userRoom.roomName;

      // Notify the partner
      socket.to(roomName).emit('leave chat', 'Your partner has left the chat.');

      // Remove the room data
      delete rooms[socket.id];
      delete rooms[partnerId];

      // Handle partner disconnection
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.leave(roomName);
        waitingUsers.push(partnerSocket);
      }

    } else {
      // If the socket wasn't in a room, remove it from waitingUsers
      const index = waitingUsers.indexOf(socket);
      if (index !== -1) {
        waitingUsers.splice(index, 1);
      }
    }
  });
});

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/chat', (req, res) => {
  res.render('chat');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
