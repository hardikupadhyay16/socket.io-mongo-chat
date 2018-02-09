(function(){
    var element = function(id){
        return document.getElementById(id);
    };

    // Get Elements
    var status = element('status');
    var messages = element('messages');
    var textarea = element('textarea');
    var username = element('username');
    var clearBtn = element('clear');

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

    // Connect to socket.io
    var socket = io.connect('34.231.52.106:4000');

    document.addEventListener("DOMContentLoaded", function(){

        // Initialize instances:
//            var socket = io.connect();
        console.log('asd');
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
            socket.emit('input', {
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
        socket.on('output', function(data){
            console.log(socket, 'out put object');
            if(data.length){
                for(var x = 0;x < data.length;x++){
                    // Build out message div
                    console.log(data[x].attachment_name, 'attachment');
                    if (data[x].attachment_name != null){
                        var message = document.createElement('img');
                        message.setAttribute('class', 'chat-message');
                        message.setAttribute('src', "svr/uploads/"+data[x].attachment_name);
                        message.setAttribute('width', "100");
                        messages.appendChild(message);
                        messages.insertBefore(message, messages.firstChild);
                        console.log(message);
                    }
                    var message = document.createElement('div');
                    message.setAttribute('class', 'chat-message');
                    message.textContent = data[x].name+": "+data[x].message;
                    messages.appendChild(message);
                    messages.insertBefore(message, messages.firstChild);

                }
            }
        });

        socket.on('typing', function(data){
            // Build typing message div
            var type_div = element('typing');
            type_div.innerHTML = data.message;
            setTimeout(function () {
                type_div.innerHTML = '';
            }, 3000);
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

        // Handle Input
        textarea.addEventListener('keydown', function(event){
            if(event.which === 13 && event.shiftKey == false){
                // Emit to server input
                socket.emit('typing',{room: room});
                socket.emit('input', {
                    name:username.value,
                    message:textarea.value,
                    room: room
                });

                event.preventDefault();
            }
            else
            {
                clearTimeout(5000);
                socket.emit('typing', {name:username.value, room: room});
            }
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
