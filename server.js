
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });

});

app.get('/search/:criteria', function(req, res){
    // todo expect that this is called via ajax, and we want to return some

   //console.log('at server');

    var twitterId = req.params.criteria.split('~')[0];
    var screenName = req.params.criteria.split('~')[1];
    console.log('incoming criteria: ' + twitterId+','+screenName);

    var wasFound = false;

    var options = {
        host: 'www.gplus.to',
        port: 80,
        path: '/'+screenName
        
    };

    var http = require('http');
    var innerReq = http.get(options, function(innerRes){
        //console.log('STATUS: ' + innerRes.statusCode);

        // if statusCode == 302, then we found a google plus profile
        // if 200, we didn't find one
        if(parseInt(innerRes.statusCode,10)==302){
            console.log("found: "+twitterId+","+screenName);
            wasFound = true;
        }

        res.writeHead(200, {'content-type': 'text/json' });
        res.write( JSON.stringify({"twittedId":twitterId, "screenName":screenName, "wasFound":wasFound}) );
        res.end('\n');



    }).on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });




});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
