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

let waitingusers = [];
let rooms = {};



io.on('connection', (socket) => {
 

 socket.on('joinroom',()=>{
  if(waitingusers.length>0){
let partner = waitingusers.shift();
const roomname = `${socket.id}-${partner.id}`;


socket.join(roomname);
partner.join(roomname);
io.to(roomname).emit('partnerjoined',roomname);


  }
  else{
    waitingusers.push(socket);
  }
 })


socket.on('sendmessage',(data)=>{
 socket.broadcast.to(data.room).emit('message',data.message);
})


socket.on("singlingMessage",(data)=>{
  socket.broadcast.to(data.room).emit('singlingMessage',data.message);

})
socket.on('startVideoChat',({room})=>{
  socket.broadcast.to(room).emit('incomingCall')

})

socket.on('acceptCall',({room})=>{
  socket.broadcast.to(room).emit('callAccepted')
})
socket.on('declineCall',({room})=>{
  socket.broadcast.to(room).emit('callDeclined')
})
socket.on('endCall',({room})=>{
  socket.broadcast.to(room).emit('callEnded')
})


  socket.on('disconnect', () => {
    console.log('Client disconnected');
   

    if(waitingusers.includes(socket)){
      waitingusers.splice(waitingusers.indexOf(socket),1);
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
