import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
};

export type CartItem = MenuItem & {
  quantity: number;
};

type Cart = Record<string, CartItem>;

type CartContextValue = {
  addItem: (item: MenuItem) => void;
  cart: Cart;
  cartItems: CartItem[];
  clearCart: () => void;
  removeItem: (id: string) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [cart, setCart] = useState<Cart>({});

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const value = useMemo<CartContextValue>(() => ({
    addItem: (item) => {
      setCart(prev => {
        const existing = prev[item.id];

        if (existing) {
          return {
            ...prev,
            [item.id]: {
              ...existing,
              quantity: existing.quantity + 1,
            },
          };
        }

        return {
          ...prev,
          [item.id]: {
            ...item,
            quantity: 1,
          },
        };
      });
    },
    cart,
    cartItems,
    clearCart: () => setCart({}),
    removeItem: (id) => {
      setCart(prev => {
        const existing = prev[id];

        if (!existing) return prev;

        if (existing.quantity === 1) {
          const nextCart = { ...prev };
          delete nextCart[id];
          return nextCart;
        }

        return {
          ...prev,
          [id]: {
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
