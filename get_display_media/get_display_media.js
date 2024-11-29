
var videoPlayer = document.querySelector("video#video_player");

if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    console.log('getDisplayMedia is not supported');
} else {
    navigator.mediaDevices.getDisplayMedia()
        .then(stream => {
            videoPlayer.srcObject = stream;
        }).catch(err => {
            console.log('getDisplayMedia failed, ', err);
        });
}