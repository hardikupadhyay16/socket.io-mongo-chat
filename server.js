function resolveURL(url) {
    var isWin = !!process.platform.match(/^win/);
    if (!isWin) return url;
    return url.replace(/\//g, '\\');
}

// Please use HTTPs on non-localhost domains.
var isUseHTTPs = false;

// var port = 443;
var port = process.env.PORT || 4000;

try {
    process.argv.forEach(function(val, index, array) {
        console.log(val);
        if (!val) return;

        if (val === '--ssl') {
            isUseHTTPs = true;
        }
    });
} catch (e) {}

var fs = require('fs');
var path = require('path');

// see how to use a valid certificate:
var options = {
    //key: fs.readFileSync(path.join(__dirname, resolveURL('keys/privatekey.pem'))),
    //cert: fs.readFileSync(path.join(__dirname, resolveURL('keys/certificate.pem')))
     key: fs.readFileSync('/etc/ssl/private/nginx-selfsigned.key'),
     cert: fs.readFileSync('/etc/ssl/certs/nginx-selfsigned.crt')
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

function cmd_exec(cmd, args, cb_stdout, cb_end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    me.exit = 0;
    me.stdout = "";
    child.stdout.on('data', function(data) {
        cb_stdout(me, data)
    });
    child.stdout.on('end', function() {
        cb_end(me)
    });
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
