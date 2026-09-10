import { replaceCartItem } from '@/utils/cartEditing';
import { restoreCart, reconcileCart } from '@/utils/savedCart';
import { cartStorageKey, readLocalState, writeLocalState } from '@/services/localState';
import { fetchMenuItems, subscribeToRealtimeEvents, type ApiMenuItem } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
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

export type AddItemConfig = {
  observacao?: string;
  opcoesSelecionadas?: SelectedOptionSnapshot[];
  precoUnitarioFinal?: number;
};

type CartContextValue = {
  addItem: (item: MenuItem, config?: AddItemConfig) => void;
  updateItem: (cartKey: string, item: MenuItem, config: AddItemConfig) => void;
  cart: Cart;
  cartItems: CartItem[];
  clearCart: () => void;
  getItemQuantity: (id: string) => number;
  increaseItemQuantity: (cartKey: string) => void;
  removeItem: (id: string) => void;
  removeItemByMenuId: (id: string) => void;
  totalItems: number;
  totalPrice: number;
  canCheckout: boolean;
  recoveryNotices: string[];
  itemIssues: Record<string, string>;
  validationStatus: 'checking' | 'ready' | 'error';
  retryValidation: () => Promise<void>;
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
  const { sessionId } = useAuth();
  const storageKey = sessionId ? cartStorageKey(sessionId) : null;
  const [ready, setReady] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [recoveryNotices, setRecoveryNotices] = useState<string[]>([]);
  const [storageError, setStorageError] = useState('');
  const [menu, setMenu] = useState<ApiMenuItem[] | null>(null);
  const [validationStatus, setValidationStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const cartRef = React.useRef(cart);
  cartRef.current = cart;
  const requestRef = React.useRef(0);

  React.useEffect(() => {
    let active = true;
    if (!storageKey) { setReady(true); return; }
    readLocalState(storageKey).then(value => {
      if (!active) return;
      const saved = restoreCart(value);
      setCart(saved);
      cartRef.current = saved;
      if (Object.keys(saved).length) setRecoveryNotices(['Seu carrinho e suas escolhas foram recuperados.']);
      setCanPersist(true);
    }).catch(() => { if (active) setStorageError('Não foi possível recuperar o carrinho salvo neste dispositivo.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; requestRef.current += 1; };
  }, [storageKey]);

  React.useEffect(() => {
    if (!ready || !canPersist || !storageKey) return;
    void writeLocalState(storageKey, Object.keys(cart).length ? { version: 1, items: Object.values(cart) } : null)
      .catch(() => setStorageError('Não foi possível salvar o carrinho neste dispositivo. Evite fechar o aplicativo.'));
  }, [cart, ready, canPersist, storageKey]);

  const retryValidation = React.useCallback(async () => {
    const request = ++requestRef.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setValidationStatus('checking');
    try {
      const currentMenu = await fetchMenuItems(controller.signal);
      if (request !== requestRef.current) return;
      const result = reconcileCart(cartRef.current, currentMenu);
      setCart(result.cart);
      cartRef.current = result.cart;
      setMenu(currentMenu);
      setRecoveryNotices(previous => [...new Set([...previous, ...result.notices])]);
      setValidationStatus('ready');
    } catch {
      if (request === requestRef.current) setValidationStatus('error');
    } finally { clearTimeout(timeout); }
  }, []);

  React.useEffect(() => {
    if (!ready || !sessionId) return;
    void retryValidation();
    return subscribeToRealtimeEvents(event => {
      if (['menu:changed', 'demo:reset', 'connection:open'].includes(event.type)) void retryValidation();
    });
  }, [ready, sessionId, retryValidation]);

  const itemIssues = useMemo(() => menu ? reconcileCart(cart, menu).issues : {}, [cart, menu]);
  const canCheckout = validationStatus === 'ready' && Object.keys(itemIssues).length === 0;

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
    updateItem: (cartKey, item, config) => {
      setCart(prev => replaceCartItem(prev, cartKey, item, config));
    },
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
    clearCart: () => {
      setCart({});
      cartRef.current = {};
      setRecoveryNotices([]);
      if (storageKey) void writeLocalState(storageKey, null).catch(() => setStorageError('Não foi possível apagar o carrinho salvo neste dispositivo.'));
    },
    getItemQuantity: (id) => cartItems
      .filter(item => item.id === id)
      .reduce((sum, item) => sum + item.quantity, 0),
    increaseItemQuantity: (cartKey) => {
      setCart(prev => {
        const existing = prev[cartKey];

        if (!existing) {
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
    canCheckout,
    recoveryNotices: storageError ? [...recoveryNotices, storageError] : recoveryNotices,
    itemIssues,
    validationStatus,
    retryValidation,
  }), [cart, cartItems, totalItems, totalPrice, canCheckout, recoveryNotices, storageError, itemIssues, validationStatus, retryValidation, storageKey]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center' }}><ActivityIndicator color="#C92525" accessibilityLabel="Recuperando carrinho" /></View>;

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
