require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./db');

const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const resetRoutes = require('./routes/resetRoutes');
const { createRealtimeServer } = require('./realtime');
const { uploadRoot } = require('./config/paths');
const { startDemoResetScheduler } = require('./services/demoResetScheduler');
const { resetDemo } = require('./services/resetDemo');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem não permitida pelo CORS.'));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadRoot));

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reset', resetRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'restaurant-system API no ar' });
});

let resetScheduler;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    nextDemoResetAt: resetScheduler?.getNextResetAt().toISOString() ?? null,
  });
});

const PORT = process.env.PORT || 3333;

createRealtimeServer(server);

connectDB().then(async () => {
  if (process.env.DEMO_RESET_ON_START === 'true') {
    await resetDemo({ source: 'startup' });
    console.log('[demo-reset] Demo restaurada durante a inicialização.');
  }

  server.listen(PORT, () => {
    resetScheduler = startDemoResetScheduler();
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`WebSocket rodando em ws://localhost:${PORT}/ws`);
  });
});
