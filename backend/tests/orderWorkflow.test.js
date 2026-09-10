const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, mock, test } = require('node:test');
const express = require('express');
const Order = require('../models/Order');
const realtime = require('../realtime');

// Exercise the real HTTP routes with an isolated in-memory persistence adapter.
// No connection to the configured demo database is made by this suite.
const events = [];
mock.method(realtime, 'broadcastRealtimeEvent', (...args) => events.push(args));
const routes = require('../routes/orderRoutes');
let server;
let baseUrl;
let orders;
const orderId = '507f1f77bcf86cd799439011';

function matches(order, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(option => matches(order, option));
    const actual = key.split('.').reduce((current, part) => current?.[part], order);
    if (value && typeof value === 'object' && '$in' in value) return value.$in.includes(actual);
    if (value && typeof value === 'object' && '$exists' in value) {
      return (actual !== undefined) === value.$exists;
    }
    return value === null ? actual == null : actual === value;
  });
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', routes);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/orders`;
});

beforeEach(() => {
  orders = [{ _id: orderId, origemPedido: 'cliente', status: 'recebido', confirmacaoEntrega: 'pendente', resolucaoEntrega: null }];
  events.length = 0;
  mock.method(Order, 'findOneAndUpdate', async (filter, update) => {
    const order = orders.find(item => matches(item, filter));
    if (!order) return null;
    Object.assign(order, update.$set);
    if (update.$push?.historicoEtapas) {
      order.historicoEtapas ??= [];
      order.historicoEtapas.push(update.$push.historicoEtapas);
    }
    return structuredClone(order);
  });
  mock.method(Order, 'findOne', async filter => {
    const order = orders.find(item => matches(item, filter));
    return order ? structuredClone(order) : null;
  });
  mock.method(Order, 'exists', async filter => orders.some(order => matches(order, filter)));
});

afterEach(() => {
  Order.findOneAndUpdate.mock.restore();
  Order.findOne.mock.restore();
  Order.exists.mock.restore();
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  mock.restoreAll();
});

async function patch(path, body, id = orderId) {
  const response = await fetch(`${baseUrl}/${id}/${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

async function deliver() {
  for (const status of ['em_preparo', 'pronto', 'entregue']) {
    assert.equal((await patch('status', { status })).status, 200);
  }
}

test('creation records the initial server timestamp and ignores supplied history', async () => {
  const start = Date.now();
  mock.method(Order, 'create', async payload => {
    const document = new Order(payload);
    await document.validate();
    return document.toObject();
  });
  try {
    const response = await fetch(baseUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente: { nome: 'Cliente' }, itens: [], total: 10,
        formaPagamento: 'pix',
        status: 'entregue', criadoEm: '2000-01-01', historicoEtapas: [{ status: 'entregue', registradoEm: '2000-01-01' }] }),
    });
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.equal(data.status, 'recebido');
    assert.equal(data.historicoEtapas.length, 1);
    assert.equal(data.historicoEtapas[0].status, 'recebido');
    assert.equal(data.historicoEtapas[0].registradoEm, data.criadoEm);
    assert.equal(data.origemPedido, 'cliente');
    assert.ok(Date.parse(data.criadoEm) >= start);

    const manualResponse = await fetch(baseUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente: { nome: 'Balcão' }, itens: [], total: 10, formaPagamento: null, origemPedido: 'manual' }),
    });
    const manualData = await manualResponse.json();
    assert.equal(manualResponse.status, 201);
    assert.equal(manualData.origemPedido, 'manual');
  } finally { Order.create.mock.restore(); }
});

test('status and history advance atomically and concurrent repeats add only one entry', async () => {
  const start = Date.now();
  const responses = await Promise.all([patch('status', { status: 'em_preparo' }), patch('status', { status: 'em_preparo' })]);
  assert.deepEqual(responses.map(result => result.status).sort(), [200, 409]);
  assert.equal(orders[0].historicoEtapas.length, 1);
  assert.equal((await patch('status', { status: 'entregue' })).status, 409);
  assert.equal(orders[0].historicoEtapas.length, 1);
  await patch('status', { status: 'pronto' });
  const result = await patch('status', { status: 'entregue' });
  assert.deepEqual(result.data.historicoEtapas.map(entry => entry.status), ['em_preparo', 'pronto', 'entregue']);
  const dates = result.data.historicoEtapas.map(entry => Date.parse(entry.registradoEm));
  assert.ok(dates.every((date, index) => date >= (index ? dates[index - 1] : start)));
  await patch('delivery-confirmation', { confirmacaoEntrega: 'confirmado' });
  assert.equal(orders[0].historicoEtapas.length, 3);
});

test('normal delivery is confirmed without creating an occurrence', async () => {
  await deliver();
  assert.equal(orders[0].confirmacaoEntrega, 'pendente');
  const result = await patch('delivery-confirmation', { confirmacaoEntrega: 'confirmado' });
  assert.equal(result.status, 200);
  assert.equal(result.data.confirmacaoEntrega, 'confirmado');
  assert.equal(result.data.resolucaoEntrega, null);
});

test('manual delivery is completed by the store without customer confirmation', async () => {
  orders[0].origemPedido = 'manual';
  orders[0].formaPagamento = null;
  await deliver();
  assert.equal(orders[0].status, 'entregue');
  assert.equal(orders[0].confirmacaoEntrega, 'confirmado');
  assert.equal(orders[0].historicoEtapas.at(-1).status, 'entregue');
});

test('customer cancellation before preparation needs no reason and records simulated PIX refund', async () => {
  orders[0].formaPagamento = 'pix';
  orders[0].total = 37.8;
  orders[0].historicoEtapas = [{ status: 'recebido', registradoEm: new Date() }];
  const result = await patch('cancellation', { origem: 'cliente' });
  assert.equal(result.status, 200);
  assert.equal(result.data.status, 'cancelado');
  assert.equal(result.data.cancelamento.origem, 'cliente');
  assert.equal(result.data.cancelamento.motivo, null);
  assert.equal(result.data.cancelamento.statusAnterior, 'recebido');
  assert.equal(result.data.reembolso.status, 'concluido_simulado');
  assert.equal(result.data.reembolso.valor, 37.8);
  assert.equal(result.data.reembolso.formaPagamento, 'pix');
  assert.deepEqual(result.data.historicoEtapas.map(entry => entry.status), ['recebido', 'cancelado']);
  assert.deepEqual(events.at(-1), ['orders:changed', { action: 'cancelled', orderId, status: 'cancelado', origem: 'cliente' }]);
});

test('customer cannot cancel after preparation, while team can with attendant attribution', async () => {
  await patch('status', { status: 'em_preparo' });
  assert.equal((await patch('cancellation', { origem: 'cliente' })).status, 409);
  const result = await patch('cancellation', { origem: 'equipe', motivo: 'Item indisponível na cozinha.', atendente: 'Equipe Demo' });
  assert.equal(result.status, 200);
  assert.equal(result.data.cancelamento.statusAnterior, 'em_preparo');
  assert.equal(result.data.cancelamento.atendente, 'Equipe Demo');
  assert.equal(result.data.reembolso.status, 'nao_aplicavel');
  assert.equal(result.data.reembolso.valor, 0);
});

test('customer requests cancellation during preparation and the team can reject it', async () => {
  await patch('status', { status: 'em_preparo' });
  assert.equal((await patch('cancellation-request', { motivo: 'x' })).status, 400);
  const request = await patch('cancellation-request', { motivo: 'Preciso sair do restaurante.' });
  assert.equal(request.status, 200);
  assert.equal(request.data.status, 'em_preparo');
  assert.equal(request.data.solicitacaoCancelamento.status, 'pendente');
  assert.equal(request.data.solicitacaoCancelamento.motivo, 'Preciso sair do restaurante.');
  assert.equal((await patch('cancellation-request', { motivo: 'Segunda solicitação.' })).status, 409);

  const review = await patch('cancellation-review', { decisao: 'recusada', atendente: 'Equipe Demo' });
  assert.equal(review.status, 200);
  assert.equal(review.data.status, 'em_preparo');
  assert.equal(review.data.solicitacaoCancelamento.status, 'recusada');
  assert.equal(review.data.solicitacaoCancelamento.atendente, 'Equipe Demo');
  assert.deepEqual(events.at(-1), ['orders:changed', { action: 'cancellation_rejected', orderId, status: 'em_preparo' }]);
});

test('approved preparation cancellation stops the order and refunds the customer', async () => {
  orders[0].formaPagamento = 'cartao';
  orders[0].total = 54.9;
  await patch('status', { status: 'em_preparo' });
  await patch('cancellation-request', { motivo: 'Pedido feito por engano.' });
  const review = await patch('cancellation-review', { decisao: 'aprovada', atendente: 'Equipe Demo' });
  assert.equal(review.status, 200);
  assert.equal(review.data.status, 'cancelado');
  assert.equal(review.data.cancelamento.origem, 'cliente');
  assert.equal(review.data.cancelamento.motivo, 'Pedido feito por engano.');
  assert.equal(review.data.cancelamento.atendente, 'Equipe Demo');
  assert.equal(review.data.solicitacaoCancelamento.status, 'aprovada');
  assert.equal(review.data.reembolso.status, 'concluido_simulado');
  assert.equal(review.data.reembolso.formaPagamento, 'cartao');
  assert.equal(review.data.reembolso.valor, 54.9);
  assert.deepEqual(events.at(-1), ['orders:changed', { action: 'cancellation_approved', orderId, status: 'cancelado' }]);
});

test('delivered, repeated, concurrent and invalid cancellations are rejected safely', async () => {
  for (const body of [
    { origem: 'equipe', motivo: 'x', atendente: 'Equipe' },
    { origem: 'equipe', motivo: 'Motivo válido', atendente: '' },
    { origem: 'sistema', motivo: 'Motivo válido' },
  ]) assert.equal((await patch('cancellation', body)).status, 400);

  const attempts = await Promise.all([
    patch('cancellation', { origem: 'equipe', motivo: 'Falha operacional.', atendente: 'Equipe A' }),
    patch('cancellation', { origem: 'equipe', motivo: 'Outro motivo válido.', atendente: 'Equipe B' }),
  ]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 409]);
  assert.equal(orders[0].historicoEtapas.filter(entry => entry.status === 'cancelado').length, 1);
  assert.equal((await patch('cancellation', { origem: 'equipe', motivo: 'Terceiro motivo.', atendente: 'Equipe' })).status, 409);

  orders[0] = { _id: orderId, status: 'entregue', cancelamento: null };
  assert.equal((await patch('cancellation', { origem: 'equipe', motivo: 'Pedido entregue.', atendente: 'Equipe' })).status, 409);
});

test('non-receipt is resolved with original report, attendant and server timestamp preserved', async () => {
  await deliver();
  assert.equal((await patch('delivery-confirmation', { confirmacaoEntrega: 'nao_entregue' })).status, 200);
  const startTime = Date.now();
  const result = await patch('delivery-resolution', { descricao: '  Pedido levado à mesa correta.  ', atendente: ' Equipe Demo ' });
  assert.equal(result.status, 200);
  assert.equal(result.data.confirmacaoEntrega, 'nao_entregue');
  assert.equal(result.data.resolucaoEntrega.descricao, 'Pedido levado à mesa correta.');
  assert.equal(result.data.resolucaoEntrega.atendente, 'Equipe Demo');
  assert.ok(new Date(result.data.resolucaoEntrega.resolvidoEm).getTime() >= startTime);
  assert.deepEqual(events.at(-1), ['orders:changed', { action: 'delivery_resolved', orderId, status: 'entregue' }]);
});

test('pending and confirmed deliveries cannot be resolved as occurrences', async () => {
  await deliver();
  const body = { descricao: 'Entrega conferida.', atendente: 'Equipe' };
  assert.equal((await patch('delivery-resolution', body)).status, 409);
  await patch('delivery-confirmation', { confirmacaoEntrega: 'confirmado' });
  assert.equal((await patch('delivery-resolution', body)).status, 409);
  assert.equal(orders[0].resolucaoEntrega, null);
});

test('simultaneous resolutions only save once, and later actions cannot overwrite the record', async () => {
  await deliver();
  await patch('delivery-confirmation', { confirmacaoEntrega: 'nao_entregue' });
  const results = await Promise.all([
    patch('delivery-resolution', { descricao: 'Entrega conferida.', atendente: 'Equipe A' }),
    patch('delivery-resolution', { descricao: 'Segunda alteração.', atendente: 'Equipe B' }),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const saved = structuredClone(orders[0]);
  assert.equal((await patch('delivery-confirmation', { confirmacaoEntrega: 'confirmado' })).status, 409);
  assert.equal((await patch('status', { status: 'entregue' })).status, 409);
  assert.deepEqual(orders[0], saved);
  assert.equal(events.filter(([, payload]) => payload.action === 'delivery_resolved').length, 1);
});

test('delivery cannot be confirmed before delivery or skip preparation', async () => {
  assert.equal((await patch('delivery-confirmation', { confirmacaoEntrega: 'nao_entregue' })).status, 409);
  assert.equal((await patch('status', { status: 'entregue' })).status, 409);
  assert.equal((await patch('status', { status: 'invalido' })).status, 400);
  assert.equal((await patch('status', { status: '__proto__' })).status, 400);
  assert.equal((await patch('delivery-confirmation', { confirmacaoEntrega: 'pendente' })).status, 400);
  assert.equal(events.length, 0);
});

test('invalid resolution and missing order return useful errors', async () => {
  for (const descricao of ['', '   ', 123, 'x'.repeat(501)]) {
    assert.equal((await patch('delivery-resolution', { descricao, atendente: 'Equipe' })).status, 400);
  }
  assert.equal((await patch('delivery-resolution', { descricao: 'Resolvido', atendente: '' })).status, 400);
  assert.equal((await patch('delivery-resolution', { descricao: 'Resolvido', atendente: 'Equipe' }, '507f1f77bcf86cd799439012')).status, 404);
});

test('legacy delivered orders without confirmation fields still accept confirmation', async () => {
  orders[0] = { _id: orderId, status: 'entregue' };
  assert.equal((await patch('delivery-confirmation', { confirmacaoEntrega: 'nao_entregue' })).status, 200);
  assert.equal((await patch('delivery-resolution', { descricao: 'Conferido na mesa.', atendente: 'Equipe' })).status, 200);
});

test('mongoose persists the resolution fields and validates the note', async () => {
  const order = new Order({
    cliente: { nome: 'Cliente Demo' }, itens: [], total: 10,
    resolucaoEntrega: { descricao: '  Entrega conferida. ', atendente: ' Equipe ', resolvidoEm: new Date() },
  });
  await order.validate();
  assert.equal(order.toObject().resolucaoEntrega.descricao, 'Entrega conferida.');
  order.resolucaoEntrega.descricao = 'x'.repeat(501);
  await assert.rejects(order.validate(), /500/);
});

test('mongoose requires a reason only when the team cancels', async () => {
  const baseCancellation = {
    statusAnterior: 'recebido',
    canceladoEm: new Date(),
  };
  const customerOrder = new Order({
    cliente: { nome: 'Cliente' }, itens: [], total: 10,
    cancelamento: { ...baseCancellation, origem: 'cliente' },
  });
  await customerOrder.validate();
  assert.equal(customerOrder.cancelamento.motivo, null);

  const teamOrder = new Order({
    cliente: { nome: 'Cliente' }, itens: [], total: 10,
    cancelamento: { ...baseCancellation, origem: 'equipe', atendente: 'Equipe' },
  });
  await assert.rejects(teamOrder.validate(), /motivo/);
});

test('mongoose trims and limits the general order observation', async () => {
  const order = new Order({
    cliente: { nome: 'Cliente' }, itens: [], total: 10,
    observacaoGeral: '  Entregar talheres junto ao pedido.  ',
  });
  await order.validate();
  assert.equal(order.observacaoGeral, 'Entregar talheres junto ao pedido.');
  order.observacaoGeral = 'x'.repeat(501);
  await assert.rejects(order.validate(), /500/);
});
