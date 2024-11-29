
'use strict'

var inMyPeerId = document.querySelector("input#in_my_peer_id");
var btLogin = document.querySelector("button#bt_login");
var localVideo = document.querySelector("video#local_video");
var remoteVideo = document.querySelector("video#remote_video");
var ulPeerList = document.querySelector("ul#peer_list");

var wsConn = null;
var rtcPeerConn = null;
var localStream = null;
var remoteStream = null;
var remoteRtcPeerId = null;
var candidates = [];

var ICE_CFG = {
    // iceServers: [{
    //     urls: 'turn:ip:port',       // 请替换成你自己搭建的STUN/TURN服务地址
    //     username: 'username1',
    //     credential: 'password1'
    // }]
};

function CreateRtcPeerConnection() {
	if (rtcPeerConn) {
        console.log('peer connection has already been created.');
		return;
    }
    rtcPeerConn = new RTCPeerConnection(ICE_CFG);
	
	rtcPeerConn.onicecandidate = (event) => {
		if (event.candidate) {
			var proxyCandidateMessage = {
				messageId: 'PROXY',
                type: 'candidate',
                fromPeerId: inMyPeerId.value,
                toPeerId: remoteRtcPeerId,
                messageData: {
                    candidate: event.candidate
                }
			};
			wsConn.send(JSON.stringify(proxyCandidateMessage));
		}
	}
    rtcPeerConn.oniceconnectionstatechange = (event) => {
        console.log('oniceconnectionstatechange', rtcPeerConn.iceConnectionState);
    }
	rtcPeerConn.ontrack = (event) => {
        if (remoteStream === null) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
            remoteVideo.style.display = 'inline-block';
        }
        remoteStream.addTrack(event.track);
	}
}

function CloseRtcPeerConnection() {
    if (rtcPeerConn) {
        rtcPeerConn.close();
        rtcPeerConn = null;
    }
}

async function GetLocalMediaStream() {
	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
	    console.log('getUserMedia is not supported!');
	    return null;
    } else if (localStream) {
        console.log('localStream already exist.');
        return localStream;
	} else {
		var constraints = {
			video: true,
			audio: true
		};
		return navigator.mediaDevices.getUserMedia(constraints);
	}
}

function CloseLocalMediaStream() {
    if (localStream != null) {
        localStream.getTracks().forEach((track) => {
            track.stop();
        });
        localStream = null;
    }
}

function AttachMediaStreamToLocalVideo() {
	localVideo.srcObject = localStream;
    localVideo.muted = true;
    localVideo.style.display = 'inline-block';
}

function AttachMediaStreamToPeerConnection() {
	localStream.getTracks().forEach(track => {
        rtcPeerConn.addTrack(track);
    });
}

function CreateOffer() {
	var offerOptions = {
		offerToReceiveAudio: true,
		offerToReceiveVideo: true
	};
	rtcPeerConn.createOffer(offerOptions)
		.then(desc => {
			rtcPeerConn.setLocalDescription(desc);
			var proxySdpMessage = {
				messageId: 'PROXY',
                type: 'sdp',
                fromPeerId: inMyPeerId.value,
                toPeerId: remoteRtcPeerId,
                messageData: {
                    sdp: desc
                }
			};
			wsConn.send(JSON.stringify(proxySdpMessage));
		})
		.catch(err => {
			console.log(`createOffer failed, error name: ${err.name}, error message: ${err.message}`);
		});
}

function CreateAnswer() {
    rtcPeerConn.createAnswer()
        .then(desc => {
            rtcPeerConn.setLocalDescription(desc);
            var proxySdpMessage = {
				messageId: 'PROXY',
                type: 'sdp',
                fromPeerId: inMyPeerId.value,
                toPeerId: remoteRtcPeerId,
				messageData: {
                    sdp: desc
                }
			};
			wsConn.send(JSON.stringify(proxySdpMessage));
        })
        .catch(err => {
            console.log(`createAnswer failed, error name: ${err.name}, error message: ${err.message}`);
        });
}

async function StartCall(isInitiator, remotePeerId) {
    remoteRtcPeerId = remotePeerId;
    CreateRtcPeerConnection();
	localStream = await GetLocalMediaStream();
	AttachMediaStreamToLocalVideo();
	AttachMediaStreamToPeerConnection();
    if (isInitiator) {
        var startCallMessage = {
            messageId: 'PROXY',
            type: 'start_call',
            fromPeerId: inMyPeerId.value,
            toPeerId: remotePeerId
        }
        wsConn.send(JSON.stringify(startCallMessage));
    } else {
        var receiveCallMessage = {
            messageId: 'PROXY',
            type: 'receive_call',
            fromPeerId: inMyPeerId.value,
            toPeerId: remotePeerId
        }
        wsConn.send(JSON.stringify(receiveCallMessage));
    }
}

function EndCall() {
    CloseLocalMediaStream();
    CloseRtcPeerConnection();
    localVideo.style.display = 'none';
    remoteVideo.style.display = 'none';
    remoteStream = null;
    remoteRtcPeerId = null;
}

function HandleOfferSdp(data) {
	rtcPeerConn.setRemoteDescription(new RTCSessionDescription(data))
        .then(() => {
            CreateAnswer();
        })
        .catch(err => {
            console.log('rtcPeerConn setRemoteDescription failed', err);
        });
}

function HandleAnswerSdp(data) {
	rtcPeerConn.setRemoteDescription(new RTCSessionDescription(data));
}

function HandleCandidate(data) {
    rtcPeerConn.addIceCandidate(new RTCIceCandidate(data));
}

function Login() {
	var myPeerId = inMyPeerId.value;
	if (myPeerId === '') {
		alert('用户名不能为空');
		return;
	}
    // 这里需要 wws 
	wsConn = new WebSocket(`wss://${window.location.hostname}:4445/?peerId=${myPeerId}`);

	wsConn.onopen = function() {
		console.log('Connect signal server success');
        btLogin.textContent = '登出';
	}

	wsConn.onclose = function() {
		console.log('Disconnect from signal server');
	}

	wsConn.onerror = function(error) {
		console.log('Connect signal server failed, error:', error);
	}

	wsConn.onmessage = function(event) {
		var message = event.data;
		var messageObj = JSON.parse(message);

        // ws msg事件-当前所有在线 client
		if (messageObj.messageId === 'CURRENT_PEERS') {
            console.log('Recv CURRENT_PEERS message, peerList:', messageObj.messageData.peerList);
            ulPeerList.innerHTML = '';
            messageObj.messageData.peerList.forEach(peerId => {
                const li = document.createElement('li');
                li.textContent = peerId;
                li.onclick = function() {
                    StartCall(true, peerId);
                }
                ulPeerList.appendChild(li);
            });
        }
        // ws msg事件-client 加入
        if (messageObj.messageId === 'PEER_JOIN') {
            console.log('Recv PEER_JOIN message, peerId:', messageObj.messageData.peerId);
            const li = document.createElement('li');
            li.textContent = messageObj.messageData.peerId;
            // 给加入的 client 名称上面绑定点击事件
            li.onclick = function() {
                StartCall(true, messageObj.messageData.peerId);
            }
            ulPeerList.appendChild(li);
        }
        // ws msg事件-client 离开
        if (messageObj.messageId === 'PEER_LEAVE') {
            console.log('Recv PEER_LEAVE message, peerId:', messageObj.messageData.peerId);
            var liPeerElements = ulPeerList.getElementsByTagName("li");
            for (let i = 0;i < liPeerElements.length;i++) {
                if (liPeerElements[i].textContent === messageObj.messageData.peerId) {
                    ulPeerList.removeChild(liPeerElements[i]);
                    if (remoteRtcPeerId === messageObj.messageData.peerId) {
                        EndCall();
                    }
                }
            }
        }
        // ws msg事件-client PROXY
        if (messageObj.messageId === 'PROXY') {
            console.log('Recv PROXY message', message);
            if (messageObj.type === 'start_call') {
                StartCall(false, messageObj.fromPeerId);
            } else if (messageObj.type === 'receive_call') {
                CreateOffer();
            } else if (messageObj.type === 'sdp') {
                if (messageObj.messageData.sdp.type === 'offer') {
                    HandleOfferSdp(messageObj.messageData.sdp);
                } else if (messageObj.messageData.sdp.type === 'answer') {
                    HandleAnswerSdp(messageObj.messageData.sdp);
                } else {
                    console.log('Unknown sdp type');
                }
			} else if (messageObj.type === 'candidate') {
				HandleCandidate(messageObj.messageData.candidate);
			} else {
				console.log('Unknown PROXY type');
			}
		}
	}
}

function Logout() {
    if (wsConn) {
        wsConn.close();
        wsConn = null;
    }
    btLogin.textContent = '登录';
    ulPeerList.innerHTML = '';
    EndCall();
}

btLogin.onclick = () => {
    if (btLogin.textContent === '登录') {
        Login();
    } else if (btLogin.textContent === '登出') {
        Logout();
    } else {
        alert('未知动作');
    }
}