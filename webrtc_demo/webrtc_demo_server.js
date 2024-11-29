const https = require('https');
const fs = require('fs');
const express = require('express');
const serveIndex = require('serve-index');
const ws = require('ws');

const tlsOptions = {
    key: fs.readFileSync('./certificate/server.key'),
    cert: fs.readFileSync('./certificate/server.crt')
};

// resource server app

const publicPath = __dirname + '/public';
const webPort = 4443;

const app = express();
app.use(express.static(publicPath));
app.use('/', serveIndex(publicPath, { icons: true }));

const resourceHttpsServer = https.createServer(tlsOptions, app);
resourceHttpsServer.listen(webPort, '0.0.0.0');

// signal server app

var peerConns = new Map();
const wssPort = 4445;

function getPeerList(excludedPeerId) {
    let peerList = [];
    for (let peerId of peerConns.keys()) {
        if (peerId !== excludedPeerId) {
            peerList.push(peerId);
        }
    }
    return peerList;
}

const signalHttpsServer = https.createServer(tlsOptions);
const wssServer = new ws.Server({ server: signalHttpsServer });

wssServer.on('connection', (conn, req) => {
    const url = new URL(req.url, 'http://dummyhost');
    const queryParams = url.searchParams;
    const peerId = queryParams.get('peerId');

    console.log(`Recv new connection request, peerId: ${peerId}`);
    if (peerId === null || peerId === '') {
        conn.close(1000, 'invalid url');
        return;
    }

    conn.on('message', (message) => {
        if (message instanceof Buffer) {
            message = message.toString('utf8');
        }
        var messageObj = JSON.parse(message);
        if (messageObj.messageId === 'PROXY') {
            // 转发 SDP 信息
            var toConn = peerConns.get(messageObj.toPeerId);
            if (toConn) {
                toConn.send(message);
            }
        }
    });

    conn.on('close', () => {
        console.log(`Client ${peerId} disconnected`);
        // 1.client 断开后,从map里面删除
        peerConns.delete(peerId);
        // 2.通知其他在线的
        peerConns.forEach((otherPeerConn, otherPeerId) => {
            var peerLeftMessage = {
                messageId: 'PEER_LEAVE',
                messageData: {
                    peerId
                }
            }
            otherPeerConn.send(JSON.stringify(peerLeftMessage));
        });
    });

    // CURRENT_PEERS-返回当前其他 client
    var peerList = getPeerList(peerId);
    var currentPeersMessage = {
        messageId: 'CURRENT_PEERS',
        messageData: {
            peerList
        }
    };
    conn.send(JSON.stringify(currentPeersMessage));

    // PEER_JOIN-通知其他在线 client 有peer 加入
    peerConns.forEach((otherPeerConn, otherPeerId) => {
        var peerJoinMessage = {
            messageId: 'PEER_JOIN',
            messageData: {
                peerId
            }
        }
        otherPeerConn.send(JSON.stringify(peerJoinMessage));
    });

    // 将当前 client conn 加入 map
    peerConns.set(peerId, conn);
});

signalHttpsServer.listen(wssPort, '0.0.0.0');
