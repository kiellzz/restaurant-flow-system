const express = require('express');
const Order = require('../models/Order');
const { broadcastRealtimeEvent } = require('../realtime');

const router = express.Router();

// POST /api/orders - cliente finaliza o pedido (CheckoutModal)
router.post('/', async (req, res) => {
  try {
    const now = new Date();
    const pedido = await Order.create({
      ...req.body,
      status: 'recebido',
      confirmacaoEntrega: 'pendente',
      resolucaoEntrega: null,
      solicitacaoCancelamento: null,
      cancelamento: null,
      reembolso: null,
      criadoEm: now,
      atualizadoEm: now,
      historicoEtapas: [{ status: 'recebido', registradoEm: now }],
    });
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
      const currentOrder = await Order.findOne({ _id: req.params.id, status: previousStatus });
      if (!currentOrder) return await orderConflict(req.params.id, res);
      const isManualOrder = currentOrder.origemPedido === 'manual' ||
        (currentOrder.origemPedido == null && currentOrder.formaPagamento == null);
      update.confirmacaoEntrega = isManualOrder ? 'confirmado' : 'pendente';
    }

    const pedido = await Order.findOneAndUpdate(
      { _id: req.params.id, status: previousStatus },
      { $set: update, $push: { historicoEtapas: { status, registradoEm: new Date() } } },
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

// Durante o preparo, o cliente apenas solicita o cancelamento. A equipe decide
// sem interromper o andamento do pedido até a aprovação.
router.patch('/:id/cancellation-request', async (req, res) => {
  try {
    const { motivo } = req.body;
    if (typeof motivo !== 'string' || motivo.trim().length < 5 || motivo.trim().length > 300) {
      return res.status(400).json({ erro: 'Explique o motivo da solicitação em 5 a 300 caracteres.' });
    }
    const now = new Date();
    const pedido = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'em_preparo',
        $or: [{ solicitacaoCancelamento: null }, { solicitacaoCancelamento: { $exists: false } }],
      },
      { $set: { solicitacaoCancelamento: {
        motivo: motivo.trim(), status: 'pendente', solicitadoEm: now,
        revisadoEm: null, atendente: null,
      } } },
      { new: true, runValidators: true }
    );
    if (!pedido) return await orderConflict(req.params.id, res);
    res.json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'cancellation_requested', orderId: pedido._id, status: pedido.status,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.patch('/:id/cancellation-review', async (req, res) => {
  try {
    const { decisao, atendente } = req.body;
    if (!['aprovada', 'recusada'].includes(decisao) || typeof atendente !== 'string' ||
        !atendente.trim() || atendente.trim().length > 100) {
      return res.status(400).json({ erro: 'Informe a decisão e o atendente responsável.' });
    }
    const currentOrder = await Order.findOne({
      _id: req.params.id, status: 'em_preparo', 'solicitacaoCancelamento.status': 'pendente',
    });
    if (!currentOrder) return await orderConflict(req.params.id, res);

    const now = new Date();
    const reviewedRequest = {
      motivo: currentOrder.solicitacaoCancelamento.motivo,
      solicitadoEm: currentOrder.solicitacaoCancelamento.solicitadoEm,
      status: decisao,
      revisadoEm: now,
      atendente: atendente.trim(),
    };
    if (decisao === 'recusada') {
      const pedido = await Order.findOneAndUpdate(
        { _id: req.params.id, status: 'em_preparo', 'solicitacaoCancelamento.status': 'pendente' },
        { $set: { solicitacaoCancelamento: reviewedRequest } },
        { new: true, runValidators: true }
      );
      if (!pedido) return await orderConflict(req.params.id, res);
      res.json(pedido);
      broadcastRealtimeEvent('orders:changed', {
        action: 'cancellation_rejected', orderId: pedido._id, status: pedido.status,
      });
      return;
    }

    const paymentMethod = ['pix', 'cartao'].includes(currentOrder.formaPagamento)
      ? currentOrder.formaPagamento : 'nao_informada';
    const cancellation = {
      origem: 'cliente',
      motivo: currentOrder.solicitacaoCancelamento.motivo,
      atendente: atendente.trim(),
      statusAnterior: 'em_preparo',
      canceladoEm: now,
    };
    const refund = {
      status: paymentMethod === 'nao_informada' ? 'nao_aplicavel' : 'concluido_simulado',
      valor: paymentMethod === 'nao_informada' ? 0 : currentOrder.total,
      formaPagamento: paymentMethod,
      processadoEm: now,
    };
    const pedido = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'em_preparo', 'solicitacaoCancelamento.status': 'pendente' },
      {
        $set: {
          status: 'cancelado', solicitacaoCancelamento: reviewedRequest,
          cancelamento: cancellation, reembolso: refund,
        },
        $push: { historicoEtapas: { status: 'cancelado', registradoEm: now } },
      },
      { new: true, runValidators: true }
    );
    if (!pedido) return await orderConflict(req.params.id, res);
    res.json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'cancellation_approved', orderId: pedido._id, status: pedido.status,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Cancela pedidos ainda não entregues. O cliente só cancela antes do preparo;
// a equipe pode interromper também pedidos em preparo ou prontos.
router.patch('/:id/cancellation', async (req, res) => {
  try {
    const { origem, motivo, atendente } = req.body;
    const teamCancellationIsInvalid = origem === 'equipe' && (
      typeof motivo !== 'string' || motivo.trim().length < 5 || motivo.trim().length > 300 ||
      typeof atendente !== 'string' || !atendente.trim() || atendente.trim().length > 100
    );
    if (!['cliente', 'equipe'].includes(origem) || teamCancellationIsInvalid) {
      return res.status(400).json({ erro: 'Cancelamentos da equipe exigem um motivo entre 5 e 300 caracteres e o nome do atendente.' });
    }

    const allowedStatuses = origem === 'cliente' ? ['recebido'] : ['recebido', 'em_preparo', 'pronto'];
    const currentOrder = await Order.findOne({ _id: req.params.id, status: { $in: allowedStatuses }, cancelamento: null });
    if (!currentOrder) return await orderConflict(req.params.id, res);

    const now = new Date();
    const paymentMethod = ['pix', 'cartao'].includes(currentOrder.formaPagamento)
      ? currentOrder.formaPagamento : 'nao_informada';
    const cancellation = {
      origem,
      motivo: origem === 'equipe' ? motivo.trim() : null,
      atendente: origem === 'equipe' ? atendente.trim() : null,
      statusAnterior: currentOrder.status,
      canceladoEm: now,
    };
    const refund = {
      status: paymentMethod === 'nao_informada' ? 'nao_aplicavel' : 'concluido_simulado',
      valor: paymentMethod === 'nao_informada' ? 0 : currentOrder.total,
      formaPagamento: paymentMethod,
      processadoEm: now,
    };
    const pedido = await Order.findOneAndUpdate(
      { _id: req.params.id, status: currentOrder.status, cancelamento: null },
      {
        $set: { status: 'cancelado', cancelamento: cancellation, reembolso: refund },
        $push: { historicoEtapas: { status: 'cancelado', registradoEm: now } },
      },
      { new: true, runValidators: true }
    );
    if (!pedido) return await orderConflict(req.params.id, res);

    res.json(pedido);
    broadcastRealtimeEvent('orders:changed', {
      action: 'cancelled', orderId: pedido._id, status: pedido.status, origem,
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
