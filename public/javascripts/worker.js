
//function onmessage(event) {
self.addEventListener('message', function(event){

    var workerMessage = JSON.parse(event.data);

    var friendIds = workerMessage.friendIdSlice;

    for(var i=0; i < friendIds.length; i++){

        var twitterId = friendIds[i];
        var url = "http://0.0.0.0:3000/search/" + twitterId + "~" + workerMessage.friendData[twitterId].screen_name;

        logMessage('the url: '+ url);

        var xhr = new XMLHttpRequest();
        //xhr.open('GET', url += ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime(), false); //force uncached 
        xhr.open('GET', url, false);
        xhr.send(null);

        var returnData = JSON.parse(xhr.responseText);

        var messageToHost = {
            messageType:'appMessage',
            id:twitterId,
            found:returnData.wasFound
        };

        postMessage(JSON.stringify(messageToHost));
    }


    logMessage('Search complete');
}, false);


function logMessage(message){
        var messageToHost = {
            messageType:'logMessage',
            message:message
        };

        postMessage(JSON.stringify(messageToHost));
}