const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const usersRouter = require('./routes/users');
const recognitionRouter = require("./routes/recognition");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const API_PREFIX = '/api/v1';

app.use(cors());
app.use(express.json());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));

app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/recognition`, recognitionRouter);

app.get(API_PREFIX, (req, res) => {
  res.json({
    message: 'SignCast ASL recognition API',
    status: 'ok',
    env: process.env.NODE_ENV || 'unknown'
  });
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    status: 'ok',
    mongoConnected: mongoose.connection.readyState === 1
  });
});

const DIRECT_MONGO_URI =
  `mongodb://bumatayjilian_db_user:UB0zUzwcS4wPeKtj@` +
  `ac-j8fqpfd-shard-00-00.evoccgn.mongodb.net:27017,` +
  `ac-j8fqpfd-shard-00-01.evoccgn.mongodb.net:27017,` +
  `ac-j8fqpfd-shard-00-02.evoccgn.mongodb.net:27017` +
  `/SignCast?ssl=true&replicaSet=atlas-10w0km&authSource=admin`;

const startServer = async () => {
  if (process.env.MONGO_URI) {
    // Try SRV URI first
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 8000
      });
      console.log('Connected to MongoDB');
    } catch (srvError) {
      // SRV DNS lookup may fail on some networks — fall back to direct hosts
      if (srvError.message.includes('querySrv') || srvError.message.includes('ECONNREFUSED') || srvError.message.includes('DNS')) {
        console.warn('SRV DNS lookup failed. Retrying MongoDB with direct host URI...');
        try {
          await mongoose.connect(DIRECT_MONGO_URI, {
            serverSelectionTimeoutMS: 8000
          });
          console.log('Connected to MongoDB using direct URI fallback');
        } catch (directError) {
          console.error('Failed to connect to MongoDB (direct):', directError.message);
        }
      } else {
        console.error('Failed to connect to MongoDB:', srvError.message);
      }
    }
  } else {
    console.warn('MONGO_URI is not set; skipping MongoDB connection');
  }

  app.listen(PORT, () => {
    console.log(`SignCast backend running on http://localhost:${PORT}${API_PREFIX}`);
  });
};

startServer();
