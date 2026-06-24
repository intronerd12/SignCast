const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const usersRouter = require('./routes/users');
const recognitionRouter = require("./routes/recognition");
const dataRouter = require('./routes/data');
const {
  getMissingSupabaseEnv,
  getMissingSupabasePublicEnv,
  verifySupabaseConnection,
  verifySupabaseTables,
} = require('./utils/supabaseClient');
const {
  getMissingCloudinaryEnv,
  verifyCloudinaryConnection,
} = require('./utils/cloudinaryClient');

const app = express();

const PORT = process.env.PORT || 5000;
const API_PREFIX = '/api/v1';

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
  const missingCloudinaryEnv = getMissingCloudinaryEnv();

  res.json({
    status: 'ok',
    supabaseConfigured: missingSupabaseEnv.length === 0,
    missingSupabaseEnv,
    supabasePublicConfigured: missingSupabasePublicEnv.length === 0,
    missingSupabasePublicEnv,
    cloudinaryConfigured: missingCloudinaryEnv.length === 0,
    missingCloudinaryEnv,
    tableBootstrapFile: 'backend/supabase/init.sql',
  });
});

const startServer = async () => {
  const supabaseStatus = await verifySupabaseConnection();
  if (supabaseStatus.ok) {
    console.log('Supabase connection check: OK');
  } else {
    console.warn(`Supabase connection check: FAILED (${supabaseStatus.error})`);
  }

  const cloudinaryStatus = await verifyCloudinaryConnection();
  if (cloudinaryStatus.ok) {
    console.log('Cloudinary connection check: OK');
  } else {
    console.warn(`Cloudinary connection check: FAILED (${cloudinaryStatus.error})`);
  }

  const tableStatus = await verifySupabaseTables();
  if (tableStatus.ok) {
    const checkedTables = (tableStatus.results || []).map((item) => item.table).join(', ');
    console.log(`Supabase tables check: OK (${checkedTables})`);
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
