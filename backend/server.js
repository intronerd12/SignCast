const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const usersRouter = require('./routes/users');
const categoriesRouter = require("./routes/categories");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const promotionsRouter = require("./routes/promotions");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const API_PREFIX = '/api/v1';

app.use(cors());
app.use(express.json());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));

app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/categories`, categoriesRouter);
app.use(`${API_PREFIX}/products`, productsRouter);
app.use(`${API_PREFIX}/orders`, ordersRouter);
app.use(`${API_PREFIX}/promotions`, promotionsRouter);

app.get(API_PREFIX, (req, res) => {
  res.json({
    message: 'Studyzie backend API',
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
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error.message);
    }
  } else {
    console.warn('MONGO_URI is not set; skipping MongoDB connection');
  }

  app.listen(PORT, () => {
    console.log(`Studyzie backend running on http://localhost:${PORT}${API_PREFIX}`);
  });
};

startServer();
