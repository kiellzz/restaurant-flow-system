const express = require('express');
const Order = require('../models/Order');
const { broadcastRealtimeEvent } = require('../realtime');

const router = express.Router();

// POST /api/orders - cliente finaliza o pedido (CheckoutModal)
router.post('/', async (req, res) => {
  try {
    const pedido = await Order.create(req.body);
    res.status(201).json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'created',
      orderId: pedido._id,
      status: pedido.status,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// GET /api/orders - fila de pedidos no dashboard (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const pedidos = await Order.find().sort({ criadoEm: -1 });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// PATCH /api/orders/:id/status - avançar status na fila (dashboard)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const previousStatus = new Map([
      ['em_preparo', 'recebido'], ['pronto', 'em_preparo'], ['entregue', 'pronto'],
    ]).get(status);

    if (!previousStatus) {
      return res.status(400).json({ erro: 'Avanço de status inválido.' });
    }
    const update = { status };

    if (status === 'entregue') {
      update.confirmacaoEntrega = 'pendente';
    }

    const pedido = await Order.findOneAndUpdate(
      { _id: req.params.id, status: previousStatus },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!pedido) return await orderConflict(req.params.id, res);
    res.json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'status_updated',
      orderId: pedido._id,
      status: pedido.status,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// PATCH /api/orders/:id/delivery-confirmation - cliente confirma se recebeu o pedido
router.patch('/:id/delivery-confirmation', async (req, res) => {
  try {
    const { confirmacaoEntrega } = req.body;

    if (!['confirmado', 'nao_entregue'].includes(confirmacaoEntrega)) {
      return res.status(400).json({ erro: 'Confirmação de entrega inválida.' });
    }

    const pedido = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'entregue',
        resolucaoEntrega: null,
        $or: [{ confirmacaoEntrega: 'pendente' }, { confirmacaoEntrega: { $exists: false } }],
      },
      { $set: { confirmacaoEntrega } },
      { new: true, runValidators: true }
    );

    if (!pedido) return await orderConflict(req.params.id, res);

    res.json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'delivery_confirmation_updated',
      confirmacaoEntrega: pedido.confirmacaoEntrega,
      orderId: pedido._id,
      status: pedido.status,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

async function orderConflict(orderId, res) {
  const exists = await Order.exists({ _id: orderId });
  return res.status(exists ? 409 : 404).json({
    erro: exists
      ? 'O pedido já foi atualizado. Atualize a lista para conferir a situação atual.'
      : 'Pedido não encontrado',
  });
}

// Registra a solução sem apagar o relato original de não recebimento.
router.patch('/:id/delivery-resolution', async (req, res) => {
  try {
    const { descricao, atendente } = req.body;
    if (typeof descricao !== 'string' || !descricao.trim() || descricao.trim().length > 500 ||
        typeof atendente !== 'string' || !atendente.trim() || atendente.trim().length > 100) {
      return res.status(400).json({ erro: 'Informe a solução (até 500 caracteres) e o atendente (até 100 caracteres).' });
    }

    const pedido = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'entregue', confirmacaoEntrega: 'nao_entregue', resolucaoEntrega: null },
      { $set: { resolucaoEntrega: {
        descricao: descricao.trim(),
        atendente: atendente.trim(),
        resolvidoEm: new Date(),
      } } },
      { new: true, runValidators: true }
    );

    if (!pedido) return await orderConflict(req.params.id, res);
    res.json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'delivery_resolved',
      orderId: pedido._id,
      status: pedido.status,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

module.exports = router;
