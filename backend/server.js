const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const usersRouter = require('./routes/users');
const recognitionRouter = require("./routes/recognition");
const dataRouter = require('./routes/data');
const {
  getMissingSupabaseEnv,
  getMissingSupabasePublicEnv,
  verifySupabaseConnection,
  verifySupabaseTables,
} = require('./utils/supabaseClient');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const API_PREFIX = '/api/v1';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME ;

app.use(cors());
app.use(express.json());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));

app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/recognition`, recognitionRouter);
app.use(`${API_PREFIX}/data`, dataRouter);

app.get(API_PREFIX, (req, res) => {
  res.json({
    message: 'SignCast ASL recognition API',
    status: 'ok',
    env: process.env.NODE_ENV || 'unknown'
  });
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  const missingSupabaseEnv = getMissingSupabaseEnv();
  const missingSupabasePublicEnv = getMissingSupabasePublicEnv();

  res.json({
    status: 'ok',
    mongoConnected: mongoose.connection.readyState === 1,
    supabaseConfigured: missingSupabaseEnv.length === 0,
    missingSupabaseEnv,
    supabasePublicConfigured: missingSupabasePublicEnv.length === 0,
    missingSupabasePublicEnv,
    tableBootstrapFile: 'backend/supabase/init.sql',
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

  const supabaseStatus = await verifySupabaseConnection();
  if (supabaseStatus.ok) {
    console.log('Supabase connection check: OK');
  } else {
    console.warn(`Supabase connection check: FAILED (${supabaseStatus.error})`);
  }

  const tableStatus = await verifySupabaseTables();
  if (tableStatus.ok) {
    console.log('Supabase tables check: OK (user_profiles, app_events)');
  } else {
    const failed = tableStatus.results.filter((item) => !item.ok);
    console.warn('Supabase tables check: FAILED');
    failed.forEach((item) => {
      console.warn(`- ${item.table}: ${item.error}`);
    });
    console.warn('Run backend/supabase/init.sql in Supabase SQL Editor to create missing tables.');
  }

  app.listen(PORT, () => {
    console.log(`SignCast backend running on http://localhost:${PORT}${API_PREFIX}`);
  });
};

startServer();
