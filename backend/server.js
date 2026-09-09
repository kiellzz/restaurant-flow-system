require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const connectDB = require('./db');

const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const resetRoutes = require('./routes/resetRoutes');
const { createRealtimeServer } = require('./realtime');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reset', resetRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'restaurant-system API no ar' });
});

const PORT = process.env.PORT || 3333;

createRealtimeServer(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`WebSocket rodando em ws://localhost:${PORT}/ws`);
  });
});
