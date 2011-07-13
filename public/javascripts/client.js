$(function() {

    checkTwitterApiLimit();


    $('#doWork').click(function() {
        $('ul li').remove();

        logProgress("Working..");

        var friendListCall = getTwitterFriendList($('#searchName').val());

        friendListCall.success(function(friendList) {

            var deferredTwitterCalls = buildSetOfDeferredTwitterDetailCalls(friendList);

            $.when.apply($, deferredTwitterCalls).then(function() {
                kickOffSlowGoogleProfileSearchInWebWorker(friendList);
            });
        });
    });
});

function checkTwitterApiLimit(){
    $('#doWork').attr('disabled', true);
    $('#searchName').attr('disabled', true);
    $('#sorryOverLimit').hide();

    $.ajax({
        url:"http://api.twitter.com/1/account/rate_limit_status.json",
        dataType:"jsonp"
    }).success(function(rateInfo){
        if(rateInfo.remaining_hits<10){
            $('#sorryOverLimit').show();
        }else{
            $('#doWork').attr('disabled', false);
            $('#searchName').attr('disabled', false);
        };
    });
}

function logProgress(info) {
    $("#progress").append("<li>" + info + "</li>");
}

function getTwitterFriendList(searchName) {
    return $.ajax({
        url: "http://api.twitter.com/1/friends/ids.json",
        data: {screen_name: searchName},
        dataType: "jsonp"
    });
}

function buildSetOfDeferredTwitterDetailCalls(friendList) {

    var deferreds = [];

    // chunk into calls of 100 friends
    var sliceSize = 100;
    var len = friendList.length;

    logProgress("Number of friends found: " + len);

    logProgress("Beginning fast search");

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
    }

    return deferreds;
}

function searchForGoogleProfileInfo(friendIdSlice) {

    return $.ajax("http://api.twitter.com/1/users/lookup.json", {
        data: {user_id: friendIdSlice},
        dataType: "jsonp"
    }).success(function(twitterFriendInfo) {

            logProgress('Returned a slice from twitter');

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

                var isKnownUrl = false;
                if (url != null && url.indexOf('gplus.to') > -1) {
                    friendData.googleLink = url;
                    isKnownUrl = true;
                } else if (url != null && url.indexOf('plus.google.com') > -1) {
                    friendData.googleLink = url;
                    isKnownUrl = true;
                } else if (desc != null && desc.indexOf('gplus.to') > -1) {
                    friendData.googleLink = desc;
                } else if (desc != null && desc.indexOf('plus.google.com') > -1) {
                    friendData.googleLink = desc;
                }

                if (friendData.googleLink !== "") {
                    var display = '';
                    if(isKnownUrl){
                        display = '<a href="'+friendData.googleLink+'">'+friendData.screen_name+'</a>';
                    }else{
                        display = friendData.screen_name + ", " + friendData.googleLink;
                    }

                    $("#userDetails").append("<li>" + display + "</li>");
                } else {
                    //logProgress('not found');
                }
            });
        });
}

function kickOffSlowGoogleProfileSearchInWebWorker(friendList) {
    logProgress('Beginning slow search, could take a while.. Google+ profile links will appear as they are found');
    var worker = new Worker("javascripts/worker.js");

    worker.onmessage = function(event) {
        var workerData = JSON.parse(event.data);

        if (workerData.messageType === "logMessage") {
            //logProgress("from worker: " + workerData.message);
            if(workerData.message.indexOf('omplete')> -1){
                logProgress('** Search Complete **');
                $("#userDetails").append("<li>** Search Complete **</li>");
            }
            $('#staticProgress').text($('#staticProgress').text()+'.');
        } else {
            if (workerData.found) {
                var friendData = $.data(document.body, "friendData" + workerData.id);
                friendData.googleLink = "http://gplus.to/" + friendData.screen_name;

                var info = "<a href='" + friendData.googleLink + "'>" +friendData.screen_name +"</a>";
                $("#userDetails").append("<li>" + info + "</li>");
            }
        }
    }

    worker.onerror = function(event) {
        alert(event.message);
        event.preventDefault();
    }

    var friendData = {};
    $.each(friendList, function(i, item) {
        var retrieved = $.data(document.body, "friendData" + item);
        friendData[item + ''] = retrieved;
    });

    var messageToWorker = {
        friendIdSlice: friendList,
        friendData: friendData
    };

    worker.postMessage(JSON.stringify(messageToWorker));
}

// unused, can be called directly to test server side search for google+
function findGPlusPage(screenName) {
    $.ajax({
        async:false,
        url: "http://0.0.0.0:3000/search/" + screenName,
        dataType: "json",

        success: function(data) {
            var foundIndicator = data;

            var info = screenName + ", " + foundIndicator;
            $("#userDetails").append("<li>" + info + "</li>");
            debugger;
        },
        error: function(x, t, e) {
            alert("something broke");
        }
    });
}


