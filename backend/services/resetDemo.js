const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { broadcastRealtimeEvent } = require('../realtime');
const menuSeed = require('../seed/menuSeed');

async function resetDemo({ source = 'manual' } = {}) {
  await Order.deleteMany({});
  await MenuItem.deleteMany({});
  await MenuItem.insertMany(menuSeed);

  broadcastRealtimeEvent('orders:changed', { action: 'reset', source });
  broadcastRealtimeEvent('menu:changed', { action: 'reset', source });
  broadcastRealtimeEvent('demo:reset', { source });

  return {
    ok: true,
    mensagem: 'Demo resetada para o estado original.',
    resetAt: new Date().toISOString(),
    source,
  };
}

module.exports = { resetDemo };
