import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasOpenDeliveryIssue, isCompletedOrder } from '../src/utils/orderWorkflow.ts';

test('queue and history partition all stages, including legacy and disputed deliveries', () => {
  const orders = [
    { status: 'recebido' },
    { status: 'em_preparo' },
    { status: 'pronto' },
    { status: 'entregue' },
    { status: 'entregue', confirmacaoEntrega: 'pendente' },
    { status: 'entregue', confirmacaoEntrega: 'nao_entregue' },
    { status: 'entregue', confirmacaoEntrega: 'confirmado' },
    { status: 'entregue', confirmacaoEntrega: 'nao_entregue', resolucaoEntrega: { descricao: 'Resolvido' } },
  ];
  assert.equal(orders.filter(order => !isCompletedOrder(order)).length, 6);
  assert.equal(orders.filter(hasOpenDeliveryIssue).length, 1);
  assert.equal(orders.filter(isCompletedOrder).length, 2);
  assert.ok(orders.filter(isCompletedOrder).every(order => !hasOpenDeliveryIssue(order)));
});
