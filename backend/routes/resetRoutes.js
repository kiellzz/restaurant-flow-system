const express = require('express');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const menuSeed = require('../seed/menuSeed');
const { broadcastRealtimeEvent } = require('../realtime');

const router = express.Router();

// POST /api/reset - botão "Resetar Demo" no dashboard + cron externo
router.post('/', async (req, res) => {
  try {
    await Order.deleteMany({});
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(menuSeed);
    res.json({ ok: true, mensagem: 'Demo resetada para o estado original.' });
    broadcastRealtimeEvent('orders:changed', { action: 'reset' });
    broadcastRealtimeEvent('menu:changed', { action: 'reset' });
    broadcastRealtimeEvent('demo:reset');
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
