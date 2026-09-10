export type ApiMenuCategory = 'Lanches' | 'Pratos principais' | 'Bebidas' | 'Sobremesas';
export type ApiOrderStatus = 'recebido' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado';
export type ApiDeliveryConfirmation = 'pendente' | 'confirmado' | 'nao_entregue';
export type ApiDeliveryResolution = {
  descricao: string;
  atendente: string;
  resolvidoEm: string;
};
export type ApiCancellationRequest = {
  motivo: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  solicitadoEm: string;
  revisadoEm?: string | null;
  atendente?: string | null;
};
export type ApiOrderCancellation = {
  origem: 'cliente' | 'equipe';
  motivo?: string | null;
  atendente?: string | null;
  statusAnterior: Exclude<ApiOrderStatus, 'entregue' | 'cancelado'>;
  canceladoEm: string;
};
export type ApiOrderRefund = {
  status: 'concluido_simulado' | 'nao_aplicavel';
  valor: number;
  formaPagamento: 'pix' | 'cartao' | 'nao_informada';
  processadoEm: string;
};
export type ApiPaymentMethod = 'pix' | 'cartao' | null;
export type ApiOrderOrigin = 'cliente' | 'manual';
export type RealtimeEventType = 'connection:open' | 'orders:changed' | 'menu:changed' | 'demo:reset';
export type ApiMenuItemTipo = 'simples' | 'com_acompanhamento';
export type ApiOptionGroupTipo = 'unica' | 'multipla';

export type RealtimeEvent = {
  emittedAt: string;
  payload?: Record<string, unknown>;
  type: RealtimeEventType;
};

export type ApiMenuItemOption = {
  nome: string;
  precoAdicional: number;
};

export type ApiMenuItemOptionGroup = {
  nome: string;
  tipo: ApiOptionGroupTipo;
  obrigatorio: boolean;
  permiteQuantidade: boolean;
  opcoes: ApiMenuItemOption[];
};

export type ApiSelectedOption = {
  grupoNome: string;
  opcaoNome: string;
  precoAdicional: number;
  quantidade: number;
};

export type ApiMenuItem = {
  _id: string;
  nome: string;
  categoria: ApiMenuCategory;
  preco: number;
  precoComDesconto: number | null;
  descricao: string;
  imagem: string;
  disponivel: boolean;
  tipo?: ApiMenuItemTipo;
  gruposOpcoes?: ApiMenuItemOptionGroup[];
};

export type ApiOrder = {
  _id: string;
  cliente: {
    nome: string;
  };
  mesa: {
    numero: number;
  } | null;
  itens: {
    itemId: string;
    nome: string;
    precoUnitario: number;
    quantidade: number;
    observacao?: string;
    opcoesSelecionadas?: ApiSelectedOption[];
    precoUnitarioFinal?: number | null;
  }[];
  observacaoGeral?: string;
  total: number;
  formaPagamento: ApiPaymentMethod;
  origemPedido?: ApiOrderOrigin;
  status: ApiOrderStatus;
  confirmacaoEntrega?: ApiDeliveryConfirmation;
  resolucaoEntrega?: ApiDeliveryResolution | null;
  solicitacaoCancelamento?: ApiCancellationRequest | null;
  cancelamento?: ApiOrderCancellation | null;
  reembolso?: ApiOrderRefund | null;
  historicoEtapas?: { status: ApiOrderStatus; registradoEm: string }[];
  criadoEm: string;
};

export type CreateOrderPayload = {
  cliente: {
    nome: string;
  };
  mesa?: {
    numero: number;
  } | null;
  itens: {
    itemId: string;
    nome: string;
    precoUnitario: number;
    quantidade: number;
    observacao?: string;
    opcoesSelecionadas?: ApiSelectedOption[];
    precoUnitarioFinal?: number;
  }[];
  observacaoGeral?: string;
  total: number;
  formaPagamento?: ApiPaymentMethod;
  origemPedido?: ApiOrderOrigin;
};

export type MenuItemPayload = {
  nome: string;
  categoria: ApiMenuCategory;
  preco: number;
  precoComDesconto: number | null;
  descricao: string;
  imagem: string;
  disponivel: boolean;
  tipo: ApiMenuItemTipo;
  gruposOpcoes: ApiMenuItemOptionGroup[];
};

export type UploadMenuItemImagePayload = {
  dataUrl: string;
  fileName: string;
};

export type UploadMenuItemImageResponse = {
  imagem: string;
  url: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

function getApiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error('Configure VITE_API_URL para consumir a API.');
  }

  return `${API_BASE_URL}${path}`;
}

export function getApiAssetUrl(path: string) {
  if (path.startsWith('/uploads/')) {
    return getApiUrl(path);
  }

  return path;
}

function getRealtimeUrl() {
  if (!API_BASE_URL) {
    throw new Error('Configure VITE_API_URL para consumir a API.');
  }

  return `${API_BASE_URL.replace(/^http/, 'ws')}/ws`;
}

async function requestJson<TResponse>(
  path: string,
  options?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(getApiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.erro || `Erro na API: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export function fetchOrders() {
  return requestJson<ApiOrder[]>('/api/orders');
}

export function createOrder(payload: CreateOrderPayload) {
  return requestJson<ApiOrder>('/api/orders', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export function updateOrderStatus(orderId: string, status: ApiOrderStatus) {
  return requestJson<ApiOrder>(`/api/orders/${orderId}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
  });
}

export function cancelOrder(orderId: string, motivo: string, atendente: string) {
  return requestJson<ApiOrder>(`/api/orders/${orderId}/cancellation`, {
    body: JSON.stringify({ origem: 'equipe', motivo, atendente }),
    method: 'PATCH',
  });
}

export function reviewCancellationRequest(orderId: string, decisao: 'aprovada' | 'recusada', atendente: string) {
  return requestJson<ApiOrder>(`/api/orders/${orderId}/cancellation-review`, {
    body: JSON.stringify({ decisao, atendente }),
    method: 'PATCH',
  });
}

export function fetchMenuItems() {
  return requestJson<ApiMenuItem[]>('/api/menu');
}

export function resolveDeliveryIssue(orderId: string, descricao: string, atendente: string) {
  return requestJson<ApiOrder>(`/api/orders/${orderId}/delivery-resolution`, {
    body: JSON.stringify({ descricao, atendente }),
    method: 'PATCH',
  });
}

export function subscribeToRealtimeEvents(
  onEvent: (event: RealtimeEvent) => void,
  onError?: () => void,
) {
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isClosedByApp = false;
  let socket: WebSocket | null = null;

  function connect() {
    try {
      socket = new WebSocket(getRealtimeUrl());
    } catch (error) {
      console.error(error);
      onError?.();
      reconnectTimer = window.setTimeout(connect, 3000);
      return;
    }

    socket.onmessage = message => {
      try {
        onEvent(JSON.parse(message.data) as RealtimeEvent);
      } catch (error) {
        console.error(error);
      }
    };

    socket.onerror = () => {
      onError?.();
    };

    socket.onclose = () => {
      if (!isClosedByApp) {
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return () => {
    isClosedByApp = true;

    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
    }

    socket?.close();
  };
}

export function createMenuItem(payload: MenuItemPayload) {
  return requestJson<ApiMenuItem>('/api/menu', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export function updateMenuItem(itemId: string, payload: MenuItemPayload) {
  return requestJson<ApiMenuItem>(`/api/menu/${itemId}`, {
    body: JSON.stringify(payload),
    method: 'PUT',
  });
}

export function uploadMenuItemImage(payload: UploadMenuItemImagePayload) {
  return requestJson<UploadMenuItemImageResponse>('/api/menu/uploads', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function deleteMenuItem(itemId: string) {
  await requestJson<{ ok: boolean }>(`/api/menu/${itemId}`, {
    method: 'DELETE',
  });
}

export async function resetDemo() {
  await requestJson<{ ok: boolean }>('/api/reset', {
    method: 'POST',
  });
}
