import type { ApiOrder } from '../services/api';

type DeliveryState = Pick<ApiOrder, 'status' | 'confirmacaoEntrega' | 'resolucaoEntrega'>;

export function hasOpenDeliveryIssue(order: DeliveryState) {
  return order.status === 'entregue' && order.confirmacaoEntrega === 'nao_entregue' && !order.resolucaoEntrega;
}

export function isCompletedOrder(order: DeliveryState) {
  return order.status === 'cancelado' || (order.status === 'entregue' &&
    (order.confirmacaoEntrega === 'confirmado' || Boolean(order.resolucaoEntrega)));
}

export function isManualOrder(order: Pick<ApiOrder, 'formaPagamento' | 'origemPedido'>) {
  return order.origemPedido === 'manual' || (!order.origemPedido && order.formaPagamento === null);
}

export function hasOpenCancellationRequest(order: Pick<ApiOrder, 'solicitacaoCancelamento'>) {
  return order.solicitacaoCancelamento?.status === 'pendente';
}
