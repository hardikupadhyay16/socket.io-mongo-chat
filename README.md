# ZodiChat

Simple chat app that uses MongoDB and Socket.io

### Version
1.0.0

## Install Dependencies
```bash
npm install 
```

## Copy Environment Variable File
```bash
 cp .env.example .env
```
 Set Environment Variable as per your configuration
 
## Socket URL
 Uncomment below line from `client.js` for local use    
 
 `var socket_url = '0.0.0.0:4000/';`
 
## Run Server
 ```bash
 npm start
 ```
## Run App
 Open index.html
 and pass room and username as parameter

 Ex. ?room=test&username=pokemon