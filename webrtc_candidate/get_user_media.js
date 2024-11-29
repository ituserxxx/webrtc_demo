
var amyRemoteVideo = document.querySelector("video#amy_remote_video");
var bobRemoteVideo = document.querySelector("video#bob_remote_video");

var amyRemoteMediaStream = new MediaStream();
var bobRemoteMediaStream = new MediaStream();

const conf = {
    iceServers: [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'turn:121.37.28.125:3478',
            'username': 'username1',
            'credential': 'password1'
        }
    ],
    iceTransportPolicy: "relay"
    // rtcpMuxPolicy: 'negotiate'
}

async function Start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia is not supported');
    } else {
        var pcAmy = new RTCPeerConnection(conf);
        var pcBob = new RTCPeerConnection(conf);

        pcAmy.onicecandidate = (event) => {
            if (event.candidate) {
                //
                pcBob.addIceCandidate(event.candidate);
            }
        }

        pcBob.onicecandidate = (event) => {
            if (event.candidate) {
                pcAmy.addIceCandidate(event.candidate);
            }
        }

        pcAmy.ontrack = (event) => {
            amyRemoteMediaStream.addTrack(event.track);
            amyRemoteVideo.srcObject = amyRemoteMediaStream;
        }

        pcBob.ontrack = (event) => {
            bobRemoteMediaStream.addTrack(event.track);
            bobRemoteVideo.srcObject = bobRemoteMediaStream;
        }

        var contraints = {
            audio: true,
            video: true
        };
        var stream = await navigator.mediaDevices.getUserMedia(contraints);
        stream.getTracks().forEach(track => {
            pcAmy.addTrack(track);
            pcBob.addTrack(track);
        });

        var offerSdp = await pcAmy.createOffer();
        await pcAmy.setLocalDescription(offerSdp);

        // offerSdp通过信令发送给Bob

        await pcBob.setRemoteDescription(offerSdp);
        var answerSdp = await pcBob.createAnswer();
        await pcBob.setLocalDescription(answerSdp);

        // answerSdp通过信令发送给Amy

        await pcAmy.setRemoteDescription(answerSdp);

    }
}

Start();
 