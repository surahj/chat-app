const ws = require('ws');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const secret = process.env.JWT_SECRET;
const jwtSecret = Buffer.from(secret).toString('base64');




async function webSocketServer(server) {
  const wss = new ws.WebSocketServer({server});
  wss.on('connection', (connection, req) => {

    function notifyAboutOnlinePeople() {
      [...wss.clients].forEach(client => {
        client.send(JSON.stringify({
          online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
        }));
      });
    }
  
    connection.isAlive = true;
  
    connection.timer = setInterval(() => {
      connection.ping();
      connection.deathTimer = setTimeout(() => {
        connection.isAlive = false;
        clearInterval(connection.timer);
        connection.terminate();
        notifyAboutOnlinePeople();
        console.log('dead');
      }, 1000);
    }, 5000);
  
    connection.on('pong', () => {
      clearTimeout(connection.deathTimer);
    });
  
    // read username and id form the cookie for this connection
    const cookies = req.headers.cookie;
    if (cookies) {
      const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
      if (tokenCookieString) {
        const token = tokenCookieString.split('=')[1];
        if (token) {
          jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            const {userId, username} = userData;
            connection.userId = userId;
            connection.username = username;
          });
        }
      }
    }

  
    connection.on('message', async (message) => {
      const messageData = JSON.parse(message.toString());
      const {recipient, text, file} = messageData;
      let filename = null;
      if (file) {
        console.log('size', file.data.length);
        const parts = file.name.split('.');
        const ext = parts[parts.length - 1];
        filename = Date.now() + '.'+ext;
        const path = __dirname + '/uploads/' + filename;
        const bufferData = new Buffer(file.data.split(',')[1], 'base64');
        fs.writeFile(path, bufferData, () => {
          console.log('file saved:'+path);
        });
      }
      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender:connection.userId,
          recipient,
          text,
          file: file ? filename : null,
        });
        console.log('created message');
        [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender:connection.userId,
            recipient,
            file: file ? filename : null,
            _id:messageDoc._id,
          })));
      }
    });
  
    // notify everyone about online people (when someone connects)
    notifyAboutOnlinePeople();
  });
} 

module.exports = webSocketServer;
