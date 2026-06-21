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

const startServer = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 8000
      });
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
    }
  } else {
    console.warn('MONGO_URI is not set; skipping MongoDB connection');
  }

  app.listen(PORT, () => {
    console.log(`SignCast backend running on http://localhost:${PORT}${API_PREFIX}`);
  });
};

startServer();
