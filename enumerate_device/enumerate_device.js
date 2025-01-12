if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("不支持 enumerateDevices() .");
} else {
    console.log("xxxxxxx")
    navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
        devices.forEach(function (device) {
        console.log(
            device.kind + ": " + device.label + " id = " + device.deviceId + " groupId = " + device.groupId
        );
        });
    })
    .catch(function (err) {
        console.log(err.name + ": " + err.message);
    });
}
