//function onmessage(event) {
self.addEventListener('message', function(event) {

    var workerMessage = JSON.parse(event.data);

    var friendIds = workerMessage.friendIdSlice;

    for (var i = 0; i < friendIds.length; i++) {

        var twitterId = friendIds[i];
        var friend = workerMessage.friendData[twitterId];
        if (friend == null || friend == undefined) {
            logMessage('worker: problem with id: ' + twitterId);
        } else {
            callServer(twitterId, workerMessage.baseUrl, friend);
        }
    }

    logMessage('Search complete');
}, false);

function callServer(twitterId, baseUrl, friend) {
    var url = baseUrl + twitterId + "~" + friend.screen_name;

    //logMessage('worker: the url: '+ url);
    try {
        var xhr = new XMLHttpRequest();
        //xhr.open('GET', url += ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime(), false); //force uncached
        xhr.onreadystatechange = function() {
            //logMessage('worker: readystatechange: ' + xhr.readyState);
            if (xhr.readyState == 4) {
                //logMessage('worker: inside callback with id: ' + twitterId);
                if (xhr.status == 200) {

                    var returnData = JSON.parse(xhr.responseText);

                    var messageToHost = {
                        messageType:'appMessage',
                        id:twitterId,
                        found:returnData.wasFound
                    };
                    postMessage(JSON.stringify(messageToHost));
                } else {

                    var returnData = JSON.parse(xhr.responseText);

                    var messageToHost = {
                        messageType:'appMessage',
                        id:twitterId,
                        found:false
                    };
                    postMessage(JSON.stringify(messageToHost));
                }
            }
        }
        xhr.open('GET', url, false);
        //xhr.send(null);
        xhr.send();
    }
    catch (e) {
        //logMessage(JSON.stringify(e));
        var messageToHost = {
            messageType:'appMessage',
            id:twitterId,
            found:false
        };
        postMessage(JSON.stringify(messageToHost));
    }
}


function logMessage(message) {
    var messageToHost = {
        messageType:'logMessage',
        message:message
    };

    postMessage(JSON.stringify(messageToHost));
}