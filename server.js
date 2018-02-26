require('dotenv').config({path: __dirname + '/.env'});
function resolveURL(url) {
    var isWin = !!process.platform.match(/^win/);
    if (!isWin) return url;
    return url.replace(/\//g, '\\');
}

// Please use HTTPs on non-localhost domains.
var isUseHTTPs = process.env.IS_HTTPS;
// var port = 443;
var port = process.env.PORT || 4000;

var fs = require('fs');
var path = require('path');

// see how to use a valid certificate:
var options = {
     key: fs.readFileSync(process.env.KEY),
     cert: fs.readFileSync(process.env.CERT)
};

// force auto reboot on failures
var autoRebootServerOnFailure = false;

var server = require(isUseHTTPs ? 'https' : 'http');
var url = require('url');
var app;


if (isUseHTTPs) {
    app = server.createServer(options, function(){});
} else {
    app = server.createServer(function(){});
}

function runServer() {
    app.on('error', function(e) {});

    app = app.listen(port, process.env.IP || '0.0.0.0', function(error) {});

    require('./signaling-server.js')(app, function(socket) {

        try {
            var params = socket.handshake.query;

            if (!params.socketCustomEvent) {
                params.socketCustomEvent = 'custom-message';
            }

            socket.on(params.socketCustomEvent, function(message) {
                try {
                    socket.broadcast.emit(params.socketCustomEvent, message);
                } catch (e) {}
            });
        } catch (e) {}
    });
}

if (autoRebootServerOnFailure) {
    // auto restart app on failure
    var cluster = require('cluster');
    if (cluster.isMaster) {
        cluster.fork();

        cluster.on('exit', function(worker, code, signal) {
            cluster.fork();
        });
    }

    if (cluster.isWorker) {
        runServer();
    }
} else {
    runServer();
}
