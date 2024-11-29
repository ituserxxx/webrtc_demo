
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia is not supported');
} else {
    var contraints = {
        audio: true,
        video: {
            width: 1280,
            height: 720,
            frameRate: { min: 10, ideal: 20 }
        }
    };
    navigator.mediaDevices.getUserMedia(contraints)
        .then(stream => {
            stream.getTracks().forEach(track => {
                console.log(`id ${track.id}, kind: ${track.kind}, label: ${track.label}`);
                console.log(JSON.stringify(track.getConstraints()));
                console.log(JSON.stringify(track.getSettings()));
            });
        }).catch(err => {
            console.log('getUserMedia failed, ', err);
        });
}