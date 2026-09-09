import type { ApiOrder } from '../services/api';

type DeliveryState = Pick<ApiOrder, 'status' | 'confirmacaoEntrega' | 'resolucaoEntrega'>;

export function hasOpenDeliveryIssue(order: DeliveryState) {
  return order.status === 'entregue' && order.confirmacaoEntrega === 'nao_entregue' && !order.resolucaoEntrega;
}

export function isCompletedOrder(order: DeliveryState) {
  return order.status === 'entregue' &&
    (order.confirmacaoEntrega === 'confirmado' || Boolean(order.resolucaoEntrega));
}
