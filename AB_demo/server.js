const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();
const server = https.createServer({
    key: fs.readFileSync('./ssl/private.key'),  // 替换为你的私钥路径
    cert: fs.readFileSync('./ssl/certificate.crt')  // 替换为你的证书路径
}, app);

const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// https://blog.csdn.net/m0_67793437/article/details/141924375
io.on('connection', socket => {
    // console.log("socket socket", socket)
    socket.on('offer', (offer) => {
        // socket.to(offer.to).emit('offer', offer);
        console.log(`--------发送offer的用户--------`);
        console.log(`create  offer Client : ${socket.id}`);
        console.log(`------------------------`);
        socket.to(offer.room).emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.to(answer.to).emit('answer', answer);
    });

    socket.on('candidate', (candidate) => {
        socket.to(candidate.to).emit('candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log(`--------断开的用户--------`);
        console.log(`Client disconnected: ${socket.id}`);
        console.log(`------------------------`);
    });
    // 客户端加入房间
    socket.on('joinRoom', room => {
        console.log(`Client ${socket.id} joining room: ${room}`);
        socket.join(room);
        viewAllClients(room)
    });

});

// 查看房间所有用户
function viewAllClients(room) {
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    console.log(`--------房间所有用户--------`);
    // 如果房间存在且有客户端
    if (clientsInRoom) {
        console.log(`Clients in room ${room}:`);
        clientsInRoom.forEach(clientId => {
            console.log(`Client ID: ${clientId}`);
        });
        console.log(`-------------------------`);
    } else {
        console.log(`Room ${room} is empty or does not exist.`);
        console.log(`-------------------------`);
    }
}
app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Signaling server listening on port 3000');
});