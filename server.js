const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000);

// Connect to mongo
mongo.connect('mongodb://0.0.0.0/mongochat', function(err, db){
    if(err){
        throw err;
    }

    console.log('MongoDB connected...');

    // Connect to Socket.io
    client.on('connection', function(socket){
        var chat = db.collection('chats');
        socket.on('join', function (data) {
            socket.join(data.room); // We are using room of socket io
            // Get chats from mongo collection
            chat.find({room: data.room}).limit(100).sort({_id:1}).toArray(function(err, res){
                if(err){
                    throw err;
                }
                // Emit the messages
                socket.emit('output', res);
            });
        });
        // Create function to send status
        sendStatus = function(s){
            socket.emit('status', s);
        };



        // Handle input events
        socket.on('input', function(data){
            console.log(data, 'input');
            var name = data.name;
            var message = data.message;
            var room = data.room;
            // client[receiver] = socket;
            // Check for name and message
            if(name == '' || message == ''){
                // Send error status
                sendStatus('Please enter a name and message');
            } else {
                // Insert message
                chat.insertOne({name: name, message: message, room: room, created_at: new Date().getTime()}, function(){
                    console.log(room, 'room');
                    client.to(room).emit('output', [data]);
                    // Send status object
                    sendStatus({
                        message: 'Message sent',
                        clear: true
                    });
                });
            }
        });

        // when the client emits 'typing', we broadcast it to others
        socket.on('typing', function (data) {
            var room = data.room;
            if (typeof(data.name) != 'undefined'){
                socket.message = data.name+" is typing..";
            }else{
                socket.message = '';
            }
            socket.broadcast.to(room).emit('typing', {
                message: socket.message
            });
        });

        // Handle clear
        socket.on('clear', function(data){
            // Remove all chats from collection
            chat.deleteMany({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });
    });
});