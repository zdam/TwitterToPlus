$(function() {

    $('#doWork').click(function() {
        $('ul li').remove();

        logProgress("Working..");

        var deferredA = getTwitterFriendList($('#searchName').val());

        deferredA.success(function(friendList){

            var deferredBs = buildSetOfDeferredBCalls(friendList);
            //$.when.apply($, deferredBs).then(kickOffSlowGoogleProfileSearchInWebWorkerFull(friendList));

            $.when.apply($, deferredBs).then(function(){ noop('bboyyaa');});

            //$.when.apply($, deferredBs).then(function(){
            //        logProgress('in suucceess function');
            //});
        });

        //findGPlusPage($('#searchName').val());
    });
});

function noop(message){
logProgress('in noop function '+ message);

}

function logProgress(info) {
    $("#progress").append("<li>" + info + "</li>");
}

function getTwitterFriendList(searchName) {
    // get our friend list
    return $.ajax({
        url: "http://api.twitter.com/1/friends/ids.json",
        data: {screen_name: searchName},
        dataType: "jsonp"
    });
}

function buildSetOfDeferredBCalls(friendList){

    var deferreds = [];

    // chunk into calls of 100 friends
    var sliceSize = 100;
    var len = friendList.length;

    logProgress("Number of friends found: " + len);

    logProgress("Beginning fast pass");

    // we chunk our calls to Twitter to return user details, as Twitter limits number of users we can ask for
    var numCalls = Math.floor(len / sliceSize) + 1;

    for (var i = 0; i < numCalls; i++) {
        var staticIndex = i;

        var slice;
        if (friendList.length > (staticIndex * sliceSize) + sliceSize) {
            slice = friendList.slice(staticIndex * sliceSize, (staticIndex * sliceSize) + sliceSize);
        } else {
            slice = friendList.slice(staticIndex * sliceSize);
        }

        // build up a comma delimited list of twitter user ids
        var twitterIds = "";
        $.each(slice, function(i, item) {
            twitterIds = twitterIds + "," + item;
        });
        twitterIds = twitterIds.substring(1); // strip leading comma

        deferreds.push(searchForGoogleProfileInfo(twitterIds));

/*
        deferreds.push($.ajax("http://api.twitter.com/1/users/lookup.json",{
        data: {user_id: twitterIds},
        dataType: "jsonp"
    }).success(function(twitterFriendInfo) {

            logProgress('returned from twitter');

            // we examine various parts to see if any Google+ info is stored
            $.each(twitterFriendInfo, function(i, item) {

                var found = false;

                var id = item.id_str;
                var url = item.url;
                var desc = item.description;
                var screenName = item.screen_name;

                var friendData = {
                    twitterId: id,
                    screen_name: screenName,
                    url: url,
                    desc: desc,
                    googleLink: ""
                };

                $.data(document.body, "friendData" + id, friendData);

                if (url != null && url.indexOf('gplus.to') > -1) {
                    friendData.googleLink = url;
                } else if (url != null && url.indexOf('plus.google.com') > -1) {
                    friendData.googleLink = url;
                } else if (desc != null && desc.indexOf('gplus.to') > -1) {
                    friendData.googleLink = desc;
                } else if (desc != null && desc.indexOf('plus.google.com') > -1) {
                    friendData.googleLink = desc;
                }

                if (friendData.googleLink !== "") {
                    var display = friendData.screen_name + ", FOUND, " + friendData.googleLink;
                    $("#userDetails").append("<li>" + display + "</li>");
                } else {
                    //logProgress('not found');
                }
            });
        }));
  */
    }

    return deferreds;
}

function searchForGoogleProfileInfo(friendIdSlice) {


    return $.ajax("http://api.twitter.com/1/users/lookup.json",{
        data: {user_id: friendIdSlice},
        dataType: "jsonp"
    }).success(function(twitterFriendInfo) {

            logProgress('returned from twitter');

            // we examine various parts to see if any Google+ info is stored
            $.each(twitterFriendInfo, function(i, item) {

                var found = false;

                var id = item.id_str;
                var url = item.url;
                var desc = item.description;
                var screenName = item.screen_name;

                var friendData = {
                    twitterId: id,
                    screen_name: screenName,
                    url: url,
                    desc: desc,
                    googleLink: ""
                };

                $.data(document.body, "friendData" + id, friendData);

                if (url != null && url.indexOf('gplus.to') > -1) {
                    friendData.googleLink = url;
                } else if (url != null && url.indexOf('plus.google.com') > -1) {
                    friendData.googleLink = url;
                } else if (desc != null && desc.indexOf('gplus.to') > -1) {
                    friendData.googleLink = desc;
                } else if (desc != null && desc.indexOf('plus.google.com') > -1) {
                    friendData.googleLink = desc;
                }

                if (friendData.googleLink !== "") {
                    var display = friendData.screen_name + ", FOUND, " + friendData.googleLink;
                    $("#userDetails").append("<li>" + display + "</li>");
                } else {
                    //logProgress('not found');
                }
            });
        });
}

function kickOffSlowGoogleProfileSearchInWebWorkerFull(friendList) {
    logProgress('in kickoff full');
    var worker = new Worker("javascripts/worker.js");

    worker.onmessage = function(event) {
        var workerData = JSON.parse(event.data);

        if (workerData.messageType === "logMessage") {
            logProgress("from worker: " + workerData.message);
        } else {


            if (workerData.found) {
                var friendData = $.data(document.body, "friendData" + workerData.id);
                friendData.googleLink = "http://gplus.to/" + friendData.screen_name;


                var info = friendData.screen_name + "<a href='" + friendData.googleLink + "'>Linky</a>";
                $("#userDetails").append("<li>" + info + "</li>");
            }
        }
    }

    worker.onerror = function(event) {
        alert(event.message);
        event.preventDefault();
    }


    //var friendListArray = $.data(document.body, "friendList");
    var friendData = {};
    $.each(friendList, function(i, item) {
        var retrieved = $.data(document.body, "friendData" + item);
        friendData[item + ''] = retrieved;
    });

    var messageToWorker = {
        friendIdSlice: friendListArray,
        friendData: friendData
    };

    worker.postMessage(JSON.stringify(messageToWorker));
}

function findGPlusPage(screenName) {
    $.ajax({
        async:false,
        url: "http://0.0.0.0:3000/search/" + screenName,
        dataType: "json",


        success: function(data) {
            // data is Found or NotFound
            //alert(data);
            //debugger;


            var foundIndicator = data;


            var info = screenName + ", " + foundIndicator;
            $("#userDetails").append("<li>" + info + "</li>");
            debugger;
        },
        error: function(x, t, e) {

            //alert("something broke");

        }
    });
}


