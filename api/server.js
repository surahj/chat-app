const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectToDb = require('./connectToDb');
const app = require('./app');
const webSocketServer = require('./webSocketServer');

dotenv.config({ path: './config.env' });
async function startApp() {
  try {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`App running on port ${port}...`);
    });

    webSocketServer(server);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

startApp();

