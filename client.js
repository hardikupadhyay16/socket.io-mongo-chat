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
    var socket_url = 'https://34.231.52.106:4000/'; // live url
    // var socket_url = '0.0.0.0:4000/'; // local url
    // Set default status
    var statusDefault = status.textContent;

    var setStatus = function(s){
        // Set status
        status.textContent = (typeof s === 'object')? s.message : s;

        // If status is clear, clear text
        if(s.clear){
            textarea.value = '';
        }

        if(s !== statusDefault){
            var delay = setTimeout(function(){
                setStatus(statusDefault);
            }, 4000);
        }
    };

    // var selectDiv = function () {
    //     console.log('asdasd');
    // };

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    function setAttributes(el, attrs) {
        for(var key in attrs) {
            el.setAttribute(key, attrs[key]);
        }
    }

    var room = getParameterByName('room');
    var user_name = getParameterByName('username');

    // Connect to socket.io
    var socket = io.connect(socket_url,{secure: true, rejectUnauthorized : false, query: "username=" + user_name});

    // Check for connection
    if(socket !== undefined){
        console.log('Connected to socket...');
        socket.emit('join', {room: room});
        // Handle Output
        socket.on('get_messages', function(data){
            if(data.messages.length){
                for(var x = 0;x < data.messages.length;x++){
                    // Build out message div
                    var message = document.createElement('div');
                    var info = document.createElement('div');
                    setAttributes(message, {"class": "chat-message", 'onclick': "selectDiv()"});
                    message.textContent = data.messages[x].name+": "+data.messages[x].message;
                    info.textContent = data.messages[x]._id;
                    setAttributes(info, {"class": "message-id", "hidden": true});
                    if (data.messages[x].attachment_url != null){
                        message = document.createElement('img');
                        setAttributes(message, {"src": data.messages[x].attachment_url, "class": "chat-message", 'width': "100"});
                    }
                    message.appendChild(info);
                    messages.appendChild(message);
                    if (data.current_page === 0){
                        messages.insertBefore(message, messages.firstChild);
                    }else{
                        messages.insertBefore(message, messages.lastChild);
                    }

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
            setStatus(data);
        });

        socket.on('user_leave', function(data){
            setStatus(data);
        });

        socket.on('user_connected', function(data){
            data = data + ' is online';
            setStatus(data);
        });

        socket.on('user_disconnected', function(data){
            data = data + ' is offline';
            setStatus(data);
        });

        socket.on('subscribed_users', function(data){
            data = data.length + ' users is online currently.'
            setStatus(data);
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

            connection.onMediaError = function(e) {
                if (e.message === 'Concurrent mic process limit.') {
                    if (DetectRTC.audioInputDevices.length <= 1) {
                        alert('Please select external microphone. Check github issue number 483.');
                        return;
                    }
                    var secondaryMic = DetectRTC.audioInputDevices[1].deviceId;
                    connection.mediaConstraints.audio = {
                        deviceId: secondaryMic
                    };
                    connection.join(connection.sessionid);
                }
            };

            connection.openOrJoin(predefinedRoomId);
        });

        // Handle Chat Clear
        clearBtn.addEventListener('click', function(){
            var elements = document.getElementsByClassName("message-id");
            data = [];
            for (var i = 0; i < elements.length; i++) {
                data.push(elements[i].innerHTML);
            }
            console.log(data);
            socket.emit('clear', data);
        });

        // Clear Message
        socket.on('cleared', function(data){
            messages.textContent = '';
        });

    }

})();
