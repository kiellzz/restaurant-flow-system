import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasOpenCancellationRequest, hasOpenDeliveryIssue, isCompletedOrder, isManualOrder } from '../src/utils/orderWorkflow.ts';

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
    { status: 'cancelado', cancelamento: { origem: 'cliente' } },
  ];
  assert.equal(orders.filter(order => !isCompletedOrder(order)).length, 6);
  assert.equal(orders.filter(hasOpenDeliveryIssue).length, 1);
  assert.equal(orders.filter(isCompletedOrder).length, 3);
  assert.ok(orders.filter(isCompletedOrder).every(order => !hasOpenDeliveryIssue(order)));
});

test('manual orders are identified explicitly with a fallback for legacy unpaid orders', () => {
  assert.equal(isManualOrder({ origemPedido: 'manual', formaPagamento: null }), true);
  assert.equal(isManualOrder({ origemPedido: 'cliente', formaPagamento: 'pix' }), false);
  assert.equal(isManualOrder({ formaPagamento: null }), true);
  assert.equal(isManualOrder({ formaPagamento: 'cartao' }), false);
});

test('only pending cancellation requests require dashboard attention', () => {
  assert.equal(hasOpenCancellationRequest({ solicitacaoCancelamento: { status: 'pendente' } }), true);
  assert.equal(hasOpenCancellationRequest({ solicitacaoCancelamento: { status: 'aprovada' } }), false);
  assert.equal(hasOpenCancellationRequest({ solicitacaoCancelamento: { status: 'recusada' } }), false);
  assert.equal(hasOpenCancellationRequest({}), false);
});
