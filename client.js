(function(){
    var element = function(id){
        return document.getElementById(id);
    };

    // Get Elements
    var status = element('status');
    var messages = element('messages');
    var textarea = element('textarea');
    var username = element('name');
    var clearBtn = element('clear');
    var videoBtn = element('video-btn');
    var socket_url = '34.231.52.106:4000/'; // live url
    //var socket_url = '0.0.0.0:4000/'; // local url
    // Set default status
    var statusDefault = status.textContent;

    var setStatus = function(s){
        // Set status
        status.textContent = s;

        if(s !== statusDefault){
            var delay = setTimeout(function(){
                setStatus(statusDefault);
            }, 4000);
        }
    };

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    var room = getParameterByName('room');
    var user_name = getParameterByName('username');
    // Connect to socket.io
    var socket = io.connect(socket_url,{ query: "username=" + user_name});

    document.addEventListener("DOMContentLoaded", function(){
        // Initialize instances:
        var siofu = new SocketIOFileUpload(socket);

        // Configure the three ways that SocketIOFileUpload can read files:
        document.getElementById("upload_btn").addEventListener("click", siofu.prompt, false);
        siofu.listenOnInput(document.getElementById("upload_input"));

        // Do something on svr progress:
        siofu.addEventListener("progress", function(event){
            var percent = event.bytesLoaded / event.file.size * 100;
            console.log("File is", percent.toFixed(2), "percent loaded");
        });

        // Do something when a file is uploaded:
        siofu.addEventListener("complete", function(event){
            console.log(event.success);
            console.log(event.file.name);
            socket.emit('send_message', {
                name:username.value,
                message:textarea.value,
                attachment_name: event.file.name,
                attachment_type: event.file.type,
                room: room
            });
        });

    }, false);
    // Check for connection
    if(socket !== undefined){
        console.log('Connected to socket...');
        socket.emit('join', {room: room});
        // Handle Output
        socket.on('get_messages', function(data){
            if(data.length){
                for(var x = 0;x < data.length;x++){
                    // Build out message div
                    if (data[x].attachment_name != null){
                        var message = document.createElement('img');
                        message.setAttribute('class', 'chat-message');
                        message.setAttribute('src', data[x].attachment_name);
                        message.setAttribute('width', "100");
                        messages.appendChild(message);
                        messages.insertBefore(message, messages.firstChild);
                    }
                    var message = document.createElement('div');
                    message.setAttribute('class', 'chat-message');
                    message.textContent = data[x].name+": "+data[x].message;
                    messages.appendChild(message);
                    messages.insertBefore(message, messages.firstChild);

                }
            }
        });

        socket.on('start_typing', function(data){
            var type_div = element('typing');
            type_div.innerHTML = data.message;
            setTimeout(function () {
                type_div.innerHTML = '';
            }, 3000);
        });

        socket.on('stop_typing', function(data){
            var type_div = element('typing');
            type_div.innerHTML = '';
        });

        // Get Status From Server
        socket.on('status', function(data){
            // get message status
            setStatus((typeof data === 'object')? data.message : data);

            // If status is clear, clear text
            if(data.clear){
                textarea.value = '';
            }
        });

        socket.on('user-connected', function(data){
            data = data + ' is online';
            setStatus((typeof data === 'object')? data.message : data);
        });

        socket.on('user-disconnected', function(data){
            data = data + ' is offline';
            setStatus((typeof data === 'object')? data.message : data);
        });

        socket.on('subscribed-users', function(data){
            data = data.length + ' users is online currently.'
            setStatus((typeof data === 'object')? data.message : data);
        });

        // Handle Input
        textarea.addEventListener('keydown', function(event){
            if(event.which === 13 && event.shiftKey == false){
                // Emit to server input
                socket.emit('stop_typing',{room: room});
                socket.emit('send_message', {
                    name:username.value,
                    message:textarea.value,
                    room: room
                });
                event.preventDefault();
            }
            else
            {
                socket.emit('start_typing', {name:username.value, room: room});
            }
        });


        // Handle Video Call
        videoBtn.addEventListener('click',function(){
            var connection = new RTCMultiConnection();
            div =  element('main');
            div.style.display = 'none';

            var predefinedRoomId = room;
                // this line is VERY_important
            connection.socketURL = socket_url;
                // all below lines are optional; however recommended.
            connection.session = {
                audio: true,
                video: true,
                data: true
            };
            connection.socketMessageEvent = 'textchat-plus-fileshare-demo';
            connection.sdpConstraints.mandatory = {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            };
            connection.onstream = function(event) {
                document.body.appendChild( event.mediaElement );
            };
            connection.openOrJoin(predefinedRoomId);
        });

        // Handle Chat Clear
        clearBtn.addEventListener('click', function(){
            socket.emit('clear');
        });

        // Clear Message
        socket.on('cleared', function(){
            messages.textContent = '';
        });
    }

})();
