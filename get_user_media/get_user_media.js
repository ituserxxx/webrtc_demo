
var videoPlayer = document.querySelector("video#video_player");

if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia is not supported');
} else {
    var contraints = {
        audio: true,
        video: true
    };
    navigator.mediaDevices.getUserMedia(contraints)
        .then(stream => {
            videoPlayer.srcObject = stream;
        }).catch(err => {
            console.log('getUserMedia failed, ', err);
        });
}