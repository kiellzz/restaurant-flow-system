import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

export type MenuItemTipo = 'simples' | 'com_acompanhamento';

export type SelectedOptionSnapshot = {
  grupoNome: string;
  opcaoNome: string;
  precoAdicional: number;
  quantidade: number;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  image?: string;
  price: number;
  tipo?: MenuItemTipo;
};

export type CartItem = MenuItem & {
  cartKey: string;
  observacao: string;
  opcoesSelecionadas: SelectedOptionSnapshot[];
  precoUnitarioFinal: number;
  quantity: number;
  tipo: MenuItemTipo;
};

type Cart = Record<string, CartItem>;

type AddItemConfig = {
  observacao?: string;
  opcoesSelecionadas?: SelectedOptionSnapshot[];
  precoUnitarioFinal?: number;
};

type CartContextValue = {
  addItem: (item: MenuItem, config?: AddItemConfig) => void;
  cart: Cart;
  cartItems: CartItem[];
  clearCart: () => void;
  getItemQuantity: (id: string) => number;
  increaseItemQuantity: (cartKey: string) => void;
  removeItem: (id: string) => void;
  removeItemByMenuId: (id: string) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function createSimpleCartKey(itemId: string, observacao: string) {
  return observacao ? `${itemId}:obs:${observacao}` : itemId;
}

function createCustomCartKey(itemId: string) {
  return `${itemId}:custom:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function getOptionsTotal(opcoesSelecionadas: SelectedOptionSnapshot[]) {
  return opcoesSelecionadas.reduce((sum, option) => (
    sum + option.precoAdicional * option.quantidade
  ), 0);
}

export function CartProvider({ children }: PropsWithChildren) {
  const [cart, setCart] = useState<Cart>({});

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.precoUnitarioFinal * item.quantity, 0),
    [cartItems]
  );

  const value = useMemo<CartContextValue>(() => ({
    addItem: (item, config) => {
      setCart(prev => {
        const tipo = item.tipo ?? 'simples';
        const observacao = config?.observacao?.trim() ?? '';
        const opcoesSelecionadas = config?.opcoesSelecionadas ?? [];
        const precoUnitarioFinal =
          config?.precoUnitarioFinal ?? item.price + getOptionsTotal(opcoesSelecionadas);
        const cartKey = tipo === 'com_acompanhamento'
          ? createCustomCartKey(item.id)
          : createSimpleCartKey(item.id, observacao);
        const existing = prev[cartKey];

        if (existing) {
          return {
            ...prev,
            [cartKey]: {
              ...existing,
              quantity: existing.quantity + 1,
            },
          };
        }

        return {
          ...prev,
          [cartKey]: {
            ...item,
            cartKey,
            observacao,
            opcoesSelecionadas,
            precoUnitarioFinal,
            quantity: 1,
            tipo,
          },
        };
      });
    },
    cart,
    cartItems,
    clearCart: () => setCart({}),
    getItemQuantity: (id) => cartItems
      .filter(item => item.id === id)
      .reduce((sum, item) => sum + item.quantity, 0),
    increaseItemQuantity: (cartKey) => {
      setCart(prev => {
        const existing = prev[cartKey];

        if (!existing || existing.tipo === 'com_acompanhamento') {
          return prev;
        }

        return {
          ...prev,
          [cartKey]: {
            ...existing,
            quantity: existing.quantity + 1,
          },
        };
      });
    },
    removeItem: (cartKey) => {
      setCart(prev => {
        const existing = prev[cartKey];

        if (!existing) return prev;

        if (existing.quantity === 1) {
          const nextCart = { ...prev };
          delete nextCart[cartKey];
          return nextCart;
        }

        return {
          ...prev,
          [cartKey]: {
            ...existing,
            quantity: existing.quantity - 1,
          },
        };
      });
    },
    removeItemByMenuId: (id) => {
      setCart(prev => {
        const cartKey = Object.values(prev).find(item => item.id === id)?.cartKey;

        if (!cartKey) {
          return prev;
        }

        const existing = prev[cartKey];

        if (existing.quantity === 1) {
          const nextCart = { ...prev };
          delete nextCart[cartKey];
          return nextCart;
        }

        return {
          ...prev,
          [cartKey]: {
            ...existing,
            quantity: existing.quantity - 1,
          },
        };
      });
    },
    totalItems,
    totalPrice,
  }), [cart, cartItems, totalItems, totalPrice]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider');
  }

  return context;
}
