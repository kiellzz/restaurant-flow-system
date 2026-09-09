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
    if (value && typeof value === 'object' && '$exists' in value) {
      return (order[key] !== undefined) === value.$exists;
    }
    return value === null ? order[key] == null : order[key] === value;
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
  orders = [{ _id: orderId, status: 'recebido', confirmacaoEntrega: 'pendente', resolucaoEntrega: null }];
  events.length = 0;
  mock.method(Order, 'findOneAndUpdate', async (filter, update) => {
    const order = orders.find(item => matches(item, filter));
    if (!order) return null;
    Object.assign(order, update.$set);
    return structuredClone(order);
  });
  mock.method(Order, 'exists', async filter => orders.some(order => matches(order, filter)));
});

afterEach(() => {
  Order.findOneAndUpdate.mock.restore();
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

test('normal delivery is confirmed without creating an occurrence', async () => {
  await deliver();
  const result = await patch('delivery-confirmation', { confirmacaoEntrega: 'confirmado' });
  assert.equal(result.status, 200);
  assert.equal(result.data.confirmacaoEntrega, 'confirmado');
  assert.equal(result.data.resolucaoEntrega, null);
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
