import type { CartItem } from '@/contexts/CartContext';

export type ApiMenuCategory = 'Lanches' | 'Pratos principais' | 'Bebidas' | 'Sobremesas';
export type ApiPaymentMethod = 'pix' | 'cartao' | null;
export type CheckoutPaymentMethod = Exclude<ApiPaymentMethod, null>;
export type ApiOrderStatus = 'recebido' | 'em_preparo' | 'pronto' | 'entregue';
export type ApiDeliveryConfirmation = 'pendente' | 'confirmado' | 'nao_entregue';
export type ApiDeliveryResolution = {
  descricao: string;
  atendente: string;
  resolvidoEm: string;
};
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
  total: number;
  formaPagamento: ApiPaymentMethod;
  status: ApiOrderStatus;
  confirmacaoEntrega?: ApiDeliveryConfirmation;
  resolucaoEntrega?: ApiDeliveryResolution | null;
  criadoEm: string;
};

type CreateOrderPayload = {
  cliente: {
    nome: string;
  };
  mesa: {
    numero: number;
  };
  itens: {
    itemId: string;
    nome: string;
    precoUnitario: number;
    quantidade: number;
    observacao?: string;
    opcoesSelecionadas?: ApiSelectedOption[];
    precoUnitarioFinal?: number;
  }[];
  total: number;
  formaPagamento: CheckoutPaymentMethod;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function getApiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error('Configure EXPO_PUBLIC_API_URL para consumir a API.');
  }

  return `${API_BASE_URL}${path}`;
}

function getRealtimeUrl() {
  if (!API_BASE_URL) {
    throw new Error('Configure EXPO_PUBLIC_API_URL para consumir a API.');
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
    throw new Error(`Erro na API: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function fetchMenuItems() {
  return requestJson<ApiMenuItem[]>('/api/menu');
}

export async function fetchOrders() {
  return requestJson<ApiOrder[]>('/api/orders');
}

export async function updateDeliveryConfirmation(
  orderId: string,
  confirmacaoEntrega: ApiDeliveryConfirmation,
) {
  return requestJson<ApiOrder>(`/api/orders/${orderId}/delivery-confirmation`, {
    body: JSON.stringify({ confirmacaoEntrega }),
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
      reconnectTimer = setTimeout(connect, 3000);
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
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return () => {
    isClosedByApp = true;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    socket?.close();
  };
}

export async function createOrder({
  cartItems,
  customerName,
  paymentMethod,
  tableNumber,
  total,
}: {
  cartItems: CartItem[];
  customerName: string;
  paymentMethod: CheckoutPaymentMethod;
  tableNumber: number;
  total: number;
}) {
  const payload: CreateOrderPayload = {
    cliente: {
      nome: customerName.trim() || 'Cliente Demo',
    },
    mesa: {
      numero: tableNumber,
    },
    itens: cartItems.map(item => ({
      itemId: item.id,
      nome: item.name,
      precoUnitario: item.price,
      quantidade: item.quantity,
      observacao: item.observacao,
      opcoesSelecionadas: item.opcoesSelecionadas,
      precoUnitarioFinal: item.precoUnitarioFinal,
    })),
    total,
    formaPagamento: paymentMethod,
  };

  return requestJson<ApiOrder>('/api/orders', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}
