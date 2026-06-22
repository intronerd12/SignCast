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

const DIRECT_MONGO_HOSTS = [
  'ac-j8fqpfd-shard-00-00.evoccgn.mongodb.net:27017',
  'ac-j8fqpfd-shard-00-01.evoccgn.mongodb.net:27017',
  'ac-j8fqpfd-shard-00-02.evoccgn.mongodb.net:27017'
];

const buildDirectMongoUri = (mongoUri) => {
  try {
    const parsedUri = new URL(mongoUri);

    if (parsedUri.protocol !== 'mongodb+srv:') {
      return null;
    }

    const username = encodeURIComponent(parsedUri.username);
    const password = encodeURIComponent(parsedUri.password);
    const credentials = username ? `${username}:${password}@` : '';
    const databaseName = parsedUri.pathname && parsedUri.pathname !== '/'
      ? parsedUri.pathname.slice(1)
      : 'SignCast';

    parsedUri.searchParams.set('ssl', 'true');
    parsedUri.searchParams.set('authSource', 'admin');
    parsedUri.searchParams.set('replicaSet', 'atlas-jqz6t9-shard-0');

    return `mongodb://${credentials}${DIRECT_MONGO_HOSTS.join(',')}/${databaseName}?${parsedUri.searchParams.toString()}`;
  } catch (error) {
    return null;
  }
};

const startServer = async () => {
  if (process.env.MONGO_URI) {
    const directMongoUri = buildDirectMongoUri(process.env.MONGO_URI);

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
        if (!directMongoUri) {
          console.error('Failed to build direct MongoDB fallback URI from MONGO_URI');
        } else {
          try {
            await mongoose.connect(directMongoUri, {
              serverSelectionTimeoutMS: 8000
            });
            console.log('Connected to MongoDB using direct URI fallback');
          } catch (directError) {
            console.error('Failed to connect to MongoDB (direct):', directError.message);
          }
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
