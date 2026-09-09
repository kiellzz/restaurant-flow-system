import {
  type ChangeEvent,
  type FormEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChefHat,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Edit3,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
  Utensils,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  ApiMenuCategory,
  ApiMenuItem,
  ApiMenuItemOptionGroup,
  ApiMenuItemTipo,
  ApiOrder,
  ApiOrderStatus,
  ApiOptionGroupTipo,
  ApiSelectedOption,
  CreateOrderPayload,
  MenuItemPayload,
  createOrder,
  createMenuItem,
  deleteMenuItem,
  fetchMenuItems,
  fetchOrders,
  getApiAssetUrl,
  resetDemo,
  resolveDeliveryIssue,
  subscribeToRealtimeEvents,
  updateMenuItem,
  updateOrderStatus,
  uploadMenuItemImage,
} from '../../services/api';
import { hasOpenDeliveryIssue, isCompletedOrder } from '../../utils/orderWorkflow';

type AdminSection = 'orders' | 'menu';
type OrderView = 'active' | 'issues' | 'history';
type OrderStatus = ApiOrderStatus;
type MenuCategory = ApiMenuCategory;
type MenuItemTipo = ApiMenuItemTipo;
type OptionGroupTipo = ApiOptionGroupTipo;

type OrderItem = {
  finalUnitPrice: number | null;
  name: string;
  observation: string;
  selectedOptions: ApiSelectedOption[];
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  createdAt: Date;
  items: OrderItem[];
  tableNumber: number | null;
  status: OrderStatus;
  confirmacaoEntrega: ApiOrder['confirmacaoEntrega'];
  resolucaoEntrega: ApiOrder['resolucaoEntrega'];
  total: number;
};

type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  discountedPrice: number | null;
  description: string;
  image: string;
  imageSrc: string;
  itemType: MenuItemTipo;
  optionGroups: ApiMenuItemOptionGroup[];
  discountPercent: number;
  available: boolean;
};

type OptionFormState = {
  name: string;
  additionalPrice: string;
};

type OptionGroupFormState = {
  name: string;
  selectionType: OptionGroupTipo;
  required: boolean;
  allowsQuantity: boolean;
  options: OptionFormState[];
};

type MenuFormState = {
  name: string;
  category: MenuCategory;
  price: string;
  description: string;
  image: string;
  itemType: MenuItemTipo;
  optionGroups: OptionGroupFormState[];
  available: boolean;
  hasDiscount: boolean;
  discountPercent: string;
};

type ImageCropState = {
  error: string;
  fileName: string;
  isSaving: boolean;
  offsetX: number;
  offsetY: number;
  source: string;
  zoom: number;
};

type CropDragState = {
  pointerId: number;
  startOffsetX: number;
  startOffsetY: number;
  startX: number;
  startY: number;
};

type ManualOrderFormState = {
  customerName: string;
  tableNumber: string;
  quantities: Record<string, number>;
};

const MENU_CATEGORIES: MenuCategory[] = [
  'Lanches',
  'Pratos principais',
  'Bebidas',
  'Sobremesas',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  recebido: 'status-new',
  em_preparo: 'status-preparing',
  pronto: 'status-ready',
  entregue: 'status-delivered',
};

const MENU_IMAGE_BY_KEY: Record<string, string> = {
  acai: '/menu/açaí.webp',
  barbecue: '/menu/barbecue.webp',
  batatafrita: '/menu/fries.webp',
  brigadeiro: '/menu/brigadeiro.webp',
  brownie: '/menu/brownie.webp',
  caldeirada: '/menu/fishstew.webp',
  cheesecakeoreo: '/menu/oreochessecake.webp',
  coxinha: '/menu/coxinha.webp',
  feijoada: '/menu/feijoada.webp',
  frangoaparmegiana: '/menu/frangoparmegiana.webp',
  friednoodle: '/menu/friednoodle.webp',
  fries: '/menu/fries.webp',
  hamburguer: '/menu/meatburger.webp',
  hotdog: '/menu/hotdog.webp',
  juicesyrup: '/menu/juicesyrup.webp',
  lemonade: '/menu/lemonade.webp',
  limonada: '/menu/lemonade.webp',
  macarraofrito: '/menu/friednoodle.webp',
  meatburger: '/menu/meatburger.webp',
  milkshake: '/menu/milkshake.webp',
  oreochessecake: '/menu/oreochessecake.webp',
  refrigerante: '/menu/soda.webp',
  soda: '/menu/soda.webp',
  suco: '/menu/juicesyrup.webp',
  water: '/menu/water.webp',
};

const CROP_FRAME_SIZE = 280;
const CROP_OUTPUT_SIZE = 900;

const EMPTY_MENU_FORM: MenuFormState = {
  name: '',
  category: 'Lanches',
  price: '',
  description: '',
  image: '',
  itemType: 'simples',
  optionGroups: [],
  available: true,
  hasDiscount: false,
  discountPercent: '',
};

const EMPTY_MANUAL_ORDER_FORM: ManualOrderFormState = {
  customerName: '',
  tableNumber: '1',
  quantities: {},
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatElapsedTime(createdAt: Date) {
  const elapsedMinutes = Math.max(
    1,
    Math.floor((Date.now() - createdAt.getTime()) / 60000),
  );

  if (elapsedMinutes < 60) {
    return `há ${elapsedMinutes} min`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return minutes > 0 ? `há ${hours}h ${minutes}min` : `há ${hours}h`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function getMenuImageSrc(item: ApiMenuItem) {
  if (item.imagem.startsWith('http')) {
    return item.imagem;
  }

  if (item.imagem.startsWith('/uploads/')) {
    return getApiAssetUrl(item.imagem);
  }

  if (item.imagem.startsWith('/')) {
    return item.imagem;
  }

  const imageKey = normalizeText(item.imagem.replace(/\.[a-z0-9]+$/i, ''));
  const nameKey = normalizeText(item.nome);

  return MENU_IMAGE_BY_KEY[imageKey] ?? MENU_IMAGE_BY_KEY[nameKey] ?? `/menu/${item.imagem}`;
}

function getMenuFormImageSrc(image: string, itemName: string) {
  const imageValue = image.trim();

  if (imageValue.startsWith('http')) {
    return imageValue;
  }

  if (imageValue.startsWith('/uploads/')) {
    return getApiAssetUrl(imageValue);
  }

  if (imageValue.startsWith('/')) {
    return imageValue;
  }

  const imageKey = normalizeText(imageValue.replace(/\.[a-z0-9]+$/i, ''));
  const nameKey = normalizeText(itemName);

  return MENU_IMAGE_BY_KEY[imageKey] ?? MENU_IMAGE_BY_KEY[nameKey] ?? '/menu/meatburger.webp';
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    image.src = source;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível preparar a imagem.'));
    reader.readAsDataURL(blob);
  });
}

async function createCroppedImageDataUrl(crop: ImageCropState) {
  const image = await loadImage(crop.source);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Não foi possível preparar o recorte.');
  }

  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const frameScale = CROP_OUTPUT_SIZE / CROP_FRAME_SIZE;
  const baseScale = Math.max(
    CROP_OUTPUT_SIZE / image.naturalWidth,
    CROP_OUTPUT_SIZE / image.naturalHeight,
  ) * crop.zoom;
  const drawWidth = image.naturalWidth * baseScale;
  const drawHeight = image.naturalHeight * baseScale;
  const drawX = (CROP_OUTPUT_SIZE - drawWidth) / 2 + crop.offsetX * frameScale;
  const drawY = (CROP_OUTPUT_SIZE - drawHeight) / 2 + crop.offsetY * frameScale;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
      } else {
        reject(new Error('Não foi possível gerar a imagem recortada.'));
      }
    }, 'image/webp', 0.9);
  });

  return blobToDataUrl(blob);
}

function getDisplayOrderId(orderId: string) {
  return `PED-${orderId.slice(-5).toUpperCase()}`;
}

function formatSelectedOption(option: ApiSelectedOption) {
  const quantityLabel = option.quantidade > 1 ? `${option.quantidade}x ` : '';

  return `${quantityLabel}${option.opcaoNome}`;
}

function getOrderItemOptionLines(item: OrderItem) {
  const optionGroups = item.selectedOptions.reduce<Record<string, string[]>>((groups, option) => {
    const groupOptions = groups[option.grupoNome] ?? [];

    return {
      ...groups,
      [option.grupoNome]: [...groupOptions, formatSelectedOption(option)],
    };
  }, {});

  return Object.entries(optionGroups).map(([groupName, options]) => (
    `${groupName}: ${options.join(', ')}`
  ));
}

function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="order-items">
      {order.items.map((item, index) => {
        const optionLines = getOrderItemOptionLines(item);
        return (
          <li key={`${order.id}-${index}`}>
            <div className="order-item-main">
              <strong>{item.quantity}×</strong>
              <span>{item.name}</span>
            </div>
            {(optionLines.length > 0 || item.observation) && (
              <div className="order-item-details">
                {optionLines.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}
                {!!item.observation && <span>Obs.: {item.observation}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DeliveryResolution({ order }: { order: Order }) {
  if (!order.resolucaoEntrega) return null;
  return (
    <div className="delivery-resolution-record">
      <strong><CheckCircle2 size={15} aria-hidden="true" /> Ocorrência resolvida</strong>
      <p>{order.resolucaoEntrega.descricao}</p>
      <small>{order.resolucaoEntrega.atendente} · {new Date(order.resolucaoEntrega.resolvidoEm).toLocaleString('pt-BR')}</small>
      <small>Relato original: cliente informou que não recebeu.</small>
    </div>
  );
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getDiscountPercent(price: number, discountedPrice: number | null) {
  if (!discountedPrice || discountedPrice >= price || price <= 0) {
    return 0;
  }

  return Math.round((1 - discountedPrice / price) * 100);
}

function mapApiOrder(order: ApiOrder): Order {
  return {
    id: order._id,
    customerName: order.cliente?.nome || 'Cliente',
    createdAt: new Date(order.criadoEm),
    items: order.itens.map(item => ({
      finalUnitPrice: item.precoUnitarioFinal ?? null,
      name: item.nome,
      observation: item.observacao ?? '',
      selectedOptions: item.opcoesSelecionadas ?? [],
      quantity: item.quantidade,
    })),
    tableNumber: order.mesa?.numero ?? null,
    status: order.status,
    confirmacaoEntrega: order.confirmacaoEntrega ?? 'pendente',
    resolucaoEntrega: order.resolucaoEntrega ?? null,
    total: order.total,
  };
}

function mapApiMenuItem(item: ApiMenuItem): MenuItem {
  return {
    id: item._id,
    name: item.nome,
    category: item.categoria,
    price: item.preco,
    discountedPrice: item.precoComDesconto,
    description: item.descricao,
    image: item.imagem,
    imageSrc: getMenuImageSrc(item),
    itemType: item.tipo ?? 'simples',
    optionGroups: item.gruposOpcoes ?? [],
    discountPercent: getDiscountPercent(item.preco, item.precoComDesconto),
    available: item.disponivel,
  };
}

function getNextOrderAction(status: OrderStatus) {
  if (status === 'recebido') {
    return {
      label: 'Iniciar preparo',
      nextStatus: 'em_preparo' as OrderStatus,
    };
  }

  if (status === 'em_preparo') {
    return {
      label: 'Marcar como pronto',
      nextStatus: 'pronto' as OrderStatus,
    };
  }

  if (status === 'pronto') {
    return {
      label: 'Entregar pedido',
      nextStatus: 'entregue' as OrderStatus,
    };
  }

  return null;
}

function getDiscountedPrice(item: MenuItem) {
  return item.discountedPrice ?? item.price;
}

function createEmptyOptionForm(): OptionFormState {
  return {
    additionalPrice: '0',
    name: '',
  };
}

function createEmptyOptionGroupForm(): OptionGroupFormState {
  return {
    allowsQuantity: false,
    name: '',
    options: [createEmptyOptionForm()],
    required: false,
    selectionType: 'unica',
  };
}

function mapApiOptionGroupsToForm(groups: ApiMenuItemOptionGroup[]): OptionGroupFormState[] {
  return groups.map(group => ({
    allowsQuantity: group.tipo === 'multipla' && Boolean(group.permiteQuantidade),
    name: group.nome,
    options: group.opcoes.length > 0
      ? group.opcoes.map(option => ({
        additionalPrice: String(option.precoAdicional ?? 0),
        name: option.nome,
      }))
      : [createEmptyOptionForm()],
    required: Boolean(group.obrigatorio),
    selectionType: group.tipo,
  }));
}

function createFormFromItem(item: MenuItem): MenuFormState {
  const optionGroups = mapApiOptionGroupsToForm(item.optionGroups);

  return {
    name: item.name,
    category: item.category,
    price: String(item.price),
    description: item.description,
    image: item.image,
    itemType: item.itemType,
    optionGroups: item.itemType === 'com_acompanhamento' && optionGroups.length === 0
      ? [createEmptyOptionGroupForm()]
      : optionGroups,
    available: item.available,
    hasDiscount: item.discountPercent > 0,
    discountPercent: item.discountPercent > 0 ? String(item.discountPercent) : '',
  };
}

function normalizePositiveNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeDiscount(value: string, hasDiscount: boolean) {
  if (!hasDiscount) {
    return 0;
  }

  const parsed = Number(value.replace(',', '.'));

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(90, Math.max(0, parsed));
}

function normalizeNonNegativeNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clampCropOffset(value: number) {
  return Math.max(-CROP_FRAME_SIZE / 2, Math.min(CROP_FRAME_SIZE / 2, value));
}

function createOptionGroupsPayload(menuForm: MenuFormState): ApiMenuItemOptionGroup[] {
  if (menuForm.itemType === 'simples') {
    return [];
  }

  return menuForm.optionGroups.map((group, groupIndex) => ({
    nome: group.name.trim() || `Grupo ${groupIndex + 1}`,
    obrigatorio: group.required,
    opcoes: group.options.map((option, optionIndex) => ({
      nome: option.name.trim() || `Opção ${optionIndex + 1}`,
      precoAdicional: normalizeNonNegativeNumber(option.additionalPrice),
    })),
    permiteQuantidade: group.selectionType === 'multipla' && group.allowsQuantity,
    tipo: group.selectionType,
  }));
}

function createMenuPayload(menuForm: MenuFormState): MenuItemPayload {
  const price = normalizePositiveNumber(menuForm.price);
  const discountPercent = normalizeDiscount(menuForm.discountPercent, menuForm.hasDiscount);

  return {
    nome: menuForm.name.trim() || 'Novo item',
    categoria: menuForm.category,
    preco: price,
    precoComDesconto: discountPercent > 0
      ? roundCurrency(price * (1 - discountPercent / 100))
      : null,
    descricao: menuForm.description.trim(),
    imagem: menuForm.image.trim() || 'meatburger.webp',
    disponivel: menuForm.available,
    tipo: menuForm.itemType,
    gruposOpcoes: createOptionGroupsPayload(menuForm),
  };
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminName, logout } = useAdminAuth();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cropDragRef = useRef<CropDragState | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderView, setOrderView] = useState<OrderView>('active');
  const [resolvingOrderId, setResolvingOrderId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  const [ordersNotice, setOrdersNotice] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [menuForm, setMenuForm] = useState<MenuFormState>(EMPTY_MENU_FORM);
  const [imageCrop, setImageCrop] = useState<ImageCropState | null>(null);
  const [manualOrderForm, setManualOrderForm] = useState<ManualOrderFormState>(EMPTY_MANUAL_ORDER_FORM);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [menuError, setMenuError] = useState('');
  const [busyOrderIds, setBusyOrderIds] = useState<Set<string>>(() => new Set());
  const [isSavingManualOrder, setIsSavingManualOrder] = useState(false);
  const [manualOrderError, setManualOrderError] = useState('');
  const [isSavingMenuItem, setIsSavingMenuItem] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const loadOrders = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoadingOrders(true);
    }

    try {
      const apiOrders = await fetchOrders();
      setOrders(apiOrders.map(mapApiOrder));
      setOrdersError('');
    } catch (error) {
      console.error(error);
      setOrdersError('Não foi possível carregar a fila de pedidos.');
    } finally {
      if (!silent) {
        setIsLoadingOrders(false);
      }
    }
  }, []);

  const loadMenu = useCallback(async () => {
    setIsLoadingMenu(true);

    try {
      const apiMenuItems = await fetchMenuItems();
      setMenuItems(apiMenuItems.map(mapApiMenuItem));
      setMenuError('');
    } catch (error) {
      console.error(error);
      setMenuError('Não foi possível carregar o cardápio.');
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadMenu();
  }, [loadMenu, loadOrders]);

  useEffect(() => (
    subscribeToRealtimeEvents(event => {
      if (event.type === 'orders:changed' || event.type === 'demo:reset' || event.type === 'connection:open') {
        loadOrders({ silent: true });
      }

      if (event.type === 'menu:changed' || event.type === 'demo:reset') {
        loadMenu();
      }
    })
  ), [loadMenu, loadOrders]);

  const sortedOrders = useMemo(
    () => [...orders].sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime()),
    [orders],
  );

  const activeOrders = sortedOrders.filter(order => !isCompletedOrder(order));
  const issueOrders = activeOrders.filter(hasOpenDeliveryIssue);
  const historyOrders = sortedOrders.filter(isCompletedOrder);
  const visibleOrders = orderView === 'history' ? historyOrders
    : orderView === 'issues' ? issueOrders
      : [...activeOrders].sort((first, second) => Number(hasOpenDeliveryIssue(second)) - Number(hasOpenDeliveryIssue(first)));
  const orderViewTitle = orderView === 'history' ? 'Histórico de pedidos'
    : orderView === 'issues' ? 'Ocorrências de entrega' : 'Pedidos em atendimento';

  const sortedMenuItems = useMemo(
    () => [...menuItems].sort((first, second) => (
      MENU_CATEGORIES.indexOf(first.category) - MENU_CATEGORIES.indexOf(second.category) ||
      first.name.localeCompare(second.name, 'pt-BR')
    )),
    [menuItems],
  );

  const availableMenuItems = useMemo(
    () => sortedMenuItems.filter(item => item.available),
    [sortedMenuItems],
  );

  const selectedManualOrderItems = useMemo(
    () => availableMenuItems
      .map(item => ({
        item,
        quantity: manualOrderForm.quantities[item.id] ?? 0,
      }))
      .filter(({ quantity }) => quantity > 0),
    [availableMenuItems, manualOrderForm.quantities],
  );

  const manualOrderTotal = useMemo(
    () => selectedManualOrderItems.reduce((sum, { item, quantity }) => (
      sum + getDiscountedPrice(item) * quantity
    ), 0),
    [selectedManualOrderItems],
  );

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  function openManualOrderModal() {
    setManualOrderForm(EMPTY_MANUAL_ORDER_FORM);
    setManualOrderError('');
    setIsManualOrderModalOpen(true);
  }

  function closeManualOrderModal() {
    setIsManualOrderModalOpen(false);
    setManualOrderForm(EMPTY_MANUAL_ORDER_FORM);
    setManualOrderError('');
  }

  function updateManualOrderQuantity(itemId: string, change: number) {
    setManualOrderForm(current => {
      const currentQuantity = current.quantities[itemId] ?? 0;
      const nextQuantity = Math.max(0, currentQuantity + change);
      const nextQuantities = { ...current.quantities };

      if (nextQuantity === 0) {
        delete nextQuantities[itemId];
      } else {
        nextQuantities[itemId] = nextQuantity;
      }

      return {
        ...current,
        quantities: nextQuantities,
      };
    });
  }

  async function handleManualOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedManualOrderItems.length === 0) {
      setManualOrderError('Adicione pelo menos um item ao pedido.');
      return;
    }

    setIsSavingManualOrder(true);
    setManualOrderError('');

    try {
      const payload: CreateOrderPayload = {
        cliente: {
          nome: manualOrderForm.customerName.trim() || 'Cliente balcão',
        },
        mesa: {
          numero: Math.min(99, Math.max(1, Math.round(Number(manualOrderForm.tableNumber) || 1))),
        },
        itens: selectedManualOrderItems.map(({ item, quantity }) => ({
          itemId: item.id,
          nome: item.name,
          precoUnitario: getDiscountedPrice(item),
          precoUnitarioFinal: getDiscountedPrice(item),
          quantidade: quantity,
        })),
        total: roundCurrency(manualOrderTotal),
        formaPagamento: null,
      };
      const savedOrder = await createOrder(payload);
      const mappedOrder = mapApiOrder(savedOrder);

      setOrders(currentOrders => [mappedOrder, ...currentOrders]);
      closeManualOrderModal();
    } catch (error) {
      console.error(error);
      setManualOrderError('Não foi possível adicionar o pedido manual.');
    } finally {
      setIsSavingManualOrder(false);
    }
  }

  async function advanceOrderStatus(orderId: string, nextStatus: OrderStatus) {
    setBusyOrderIds((currentIds) => new Set(currentIds).add(orderId));

    try {
      const updatedOrder = await updateOrderStatus(orderId, nextStatus);
      const mappedOrder = mapApiOrder(updatedOrder);
      setOrders((currentOrders) => currentOrders.map((order) => (
        order.id === orderId ? mappedOrder : order
      )));
      setOrdersError('');
    } catch (error) {
      console.error(error);
      setOrdersError('Não foi possível atualizar o status do pedido.');
    } finally {
      setBusyOrderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(orderId);
        return nextIds;
      });
    }
  }

  async function handleResolveDelivery(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    if (!resolutionNote.trim() || busyOrderIds.has(orderId)) return;
    setBusyOrderIds(current => new Set(current).add(orderId));
    setResolutionError('');
    try {
      const updatedOrder = await resolveDeliveryIssue(orderId, resolutionNote, adminName);
      setOrders(current => current.map(order => order.id === orderId ? mapApiOrder(updatedOrder) : order));
      setResolvingOrderId(null);
      setResolutionNote('');
      setOrderView('history');
      setOrdersNotice(`Ocorrência do ${getDisplayOrderId(orderId)} resolvida. Pedido movido para o histórico.`);
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : 'Não foi possível registrar a solução.');
      loadOrders({ silent: true });
    } finally {
      setBusyOrderIds(current => {
        const next = new Set(current);
        next.delete(orderId);
        return next;
      });
    }
  }

  function openCreateItemModal() {
    setEditingItem(null);
    setMenuForm(EMPTY_MENU_FORM);
    setIsMenuModalOpen(true);
  }

  function openEditItemModal(item: MenuItem) {
    setEditingItem(item);
    setMenuForm(createFormFromItem(item));
    setIsMenuModalOpen(true);
  }

  function closeMenuModal() {
    closeImageCropModal();
    setIsMenuModalOpen(false);
    setEditingItem(null);
    setMenuForm(EMPTY_MENU_FORM);
  }

  function openImageFilePicker() {
    imageInputRef.current?.click();
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageCrop({
        error: 'Selecione um arquivo de imagem.',
        fileName: file.name,
        isSaving: false,
        offsetX: 0,
        offsetY: 0,
        source: '',
        zoom: 1,
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImageCrop({
        error: '',
        fileName: file.name,
        isSaving: false,
        offsetX: 0,
        offsetY: 0,
        source: String(reader.result),
        zoom: 1,
      });
    };

    reader.onerror = () => {
      setImageCrop({
        error: 'Não foi possível ler a imagem.',
        fileName: file.name,
        isSaving: false,
        offsetX: 0,
        offsetY: 0,
        source: '',
        zoom: 1,
      });
    };

    reader.readAsDataURL(file);
  }

  function closeImageCropModal() {
    cropDragRef.current = null;
    setImageCrop(null);
  }

  function resetCropPosition() {
    setImageCrop(current => current
      ? {
        ...current,
        error: '',
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
      }
      : current);
  }

  function handleCropZoomChange(value: string) {
    const zoom = Number(value);

    setImageCrop(current => current
      ? {
        ...current,
        error: '',
        zoom: Number.isFinite(zoom) ? zoom : current.zoom,
      }
      : current);
  }

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageCrop?.source) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerId: event.pointerId,
      startOffsetX: imageCrop.offsetX,
      startOffsetY: imageCrop.offsetY,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = cropDragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setImageCrop(current => current
      ? {
        ...current,
        offsetX: clampCropOffset(dragState.startOffsetX + event.clientX - dragState.startX),
        offsetY: clampCropOffset(dragState.startOffsetY + event.clientY - dragState.startY),
      }
      : current);
  }

  function handleCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (cropDragRef.current?.pointerId === event.pointerId) {
      cropDragRef.current = null;
    }
  }

  async function handleSaveCroppedImage() {
    if (!imageCrop?.source || imageCrop.isSaving) {
      return;
    }

    setImageCrop(current => current ? { ...current, error: '', isSaving: true } : current);

    try {
      const dataUrl = await createCroppedImageDataUrl(imageCrop);
      const uploadedImage = await uploadMenuItemImage({
        dataUrl,
        fileName: menuForm.name.trim() || imageCrop.fileName,
      });

      setMenuForm(current => ({
        ...current,
        image: uploadedImage.imagem,
      }));
      closeImageCropModal();
    } catch (error) {
      console.error(error);
      setImageCrop(current => current
        ? {
          ...current,
          error: 'Não foi possível salvar a imagem. Confira se a API está rodando.',
          isSaving: false,
        }
        : current);
    }
  }

  function clearMenuImage() {
    setMenuForm(current => ({
      ...current,
      image: '',
    }));
  }

  function updateMenuItemType(itemType: MenuItemTipo) {
    setMenuForm(current => ({
      ...current,
      itemType,
      optionGroups: itemType === 'com_acompanhamento' && current.optionGroups.length === 0
        ? [createEmptyOptionGroupForm()]
        : current.optionGroups,
    }));
  }

  function addOptionGroup() {
    setMenuForm(current => ({
      ...current,
      optionGroups: [...current.optionGroups, createEmptyOptionGroupForm()],
    }));
  }

  function removeOptionGroup(groupIndex: number) {
    setMenuForm(current => ({
      ...current,
      optionGroups: current.optionGroups.length === 1
        ? current.optionGroups
        : current.optionGroups.filter((_, index) => index !== groupIndex),
    }));
  }

  function updateOptionGroup(
    groupIndex: number,
    updates: Partial<OptionGroupFormState>,
  ) {
    setMenuForm(current => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) => {
        if (index !== groupIndex) {
          return group;
        }

        const nextGroup = { ...group, ...updates };

        if (nextGroup.selectionType === 'unica') {
          nextGroup.allowsQuantity = false;
        }

        return nextGroup;
      }),
    }));
  }

  function addOptionToGroup(groupIndex: number) {
    setMenuForm(current => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) => (
        index === groupIndex
          ? { ...group, options: [...group.options, createEmptyOptionForm()] }
          : group
      )),
    }));
  }

  function removeOptionFromGroup(groupIndex: number, optionIndex: number) {
    setMenuForm(current => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) => {
        if (index !== groupIndex || group.options.length === 1) {
          return group;
        }

        return {
          ...group,
          options: group.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex),
        };
      }),
    }));
  }

  function updateOptionInGroup(
    groupIndex: number,
    optionIndex: number,
    updates: Partial<OptionFormState>,
  ) {
    setMenuForm(current => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) => (
        index === groupIndex
          ? {
            ...group,
            options: group.options.map((option, currentOptionIndex) => (
              currentOptionIndex === optionIndex ? { ...option, ...updates } : option
            )),
          }
          : group
      )),
    }));
  }

  async function removeMenuItem(item: MenuItem) {
    const shouldRemove = window.confirm(`Remover ${item.name} do cardápio?`);

    if (!shouldRemove) {
      return;
    }

    try {
      await deleteMenuItem(item.id);
      setMenuItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
      setMenuError('');
    } catch (error) {
      console.error(error);
      setMenuError('Não foi possível remover o item.');
    }
  }

  async function handleMenuFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingMenuItem(true);

    try {
      const payload = createMenuPayload(menuForm);
      const savedItem = editingItem
        ? await updateMenuItem(editingItem.id, payload)
        : await createMenuItem(payload);
      const mappedItem = mapApiMenuItem(savedItem);

      setMenuItems((currentItems) => {
        if (!editingItem) {
          return [mappedItem, ...currentItems];
        }

        return currentItems.map((item) => (item.id === editingItem.id ? mappedItem : item));
      });
      setMenuError('');
      closeMenuModal();
    } catch (error) {
      console.error(error);
      setMenuError('Não foi possível salvar o item.');
    } finally {
      setIsSavingMenuItem(false);
    }
  }

  async function handleConfirmResetDemo() {
    setIsResetting(true);
    setResetError('');

    try {
      await resetDemo();
      await Promise.all([loadOrders(), loadMenu()]);
      setIsResetModalOpen(false);
    } catch (error) {
      console.error(error);
      setResetError('Não foi possível resetar a demo.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-icon"><ChefHat size={23} aria-hidden="true" /></span>
          <div>
          <p>Restaurante X</p>
          <strong>Painel de atendimento</strong>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="ghost-button reset-demo-button" onClick={() => setIsResetModalOpen(true)} type="button">
            <RefreshCcw size={18} aria-hidden="true" />
            Resetar Demo
          </button>

          <button className="ghost-button" onClick={handleLogout} type="button">
            <LogOut size={18} aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="admin-sidebar" aria-label="Setores do painel">
          <div className="sidebar-title">
            <LayoutDashboard size={20} aria-hidden="true" />
            Operação
          </div>

          <nav className="section-nav">
            <button
              className={activeSection === 'orders' ? 'section-link is-active' : 'section-link'}
              onClick={() => setActiveSection('orders')}
              type="button"
            >
              <ClipboardList size={19} aria-hidden="true" />
              Fila de Pedidos
              <span className="sidebar-count">{activeOrders.length}</span>
            </button>

            <button
              className={activeSection === 'menu' ? 'section-link is-active' : 'section-link'}
              onClick={() => setActiveSection('menu')}
              type="button"
            >
              <Utensils size={19} aria-hidden="true" />
              Cardápio
            </button>
          </nav>
          <div className="sidebar-team"><span>Equipe conectada</span><strong>{adminName}</strong></div>
        </aside>

        <section className="dashboard-content">
          {activeSection === 'orders' ? (
            <section className="orders-section" aria-labelledby="orders-title">
              <div className="section-header">
                <div>
                  <p className="login-kicker">OPERAÇÃO / PEDIDOS</p>
                  <h1 id="orders-title">{orderViewTitle}</h1>
                  <p className="orders-intro">{orderView === 'history' ? 'Entregas finalizadas e registros de atendimento.' : orderView === 'issues' ? 'Atenção aos clientes que precisam de uma resposta.' : 'Organize o preparo e acompanhe cada entrega.'}</p>
                </div>
                <div className="section-actions">
                  <button className="add-item-button" onClick={openManualOrderModal} type="button">
                    <Plus size={19} aria-hidden="true" />
                    Adicionar pedido
                  </button>
                </div>
              </div>

              <dl className="operations-overview" aria-label="Resumo dos pedidos em atendimento">
                {([
                  ['recebido', 'Na fila', ClipboardList],
                  ['em_preparo', 'Em preparo', ChefHat],
                  ['pronto', 'Prontos', CheckCircle2],
                  ['entregue', 'Aguardando confirmação', Clock],
                ] as const).map(([status, label, Icon]) => (
                  <div key={status} data-status={status}>
                    <dt><Icon size={16} aria-hidden="true" />{label}</dt>
                    <dd>{isLoadingOrders && orders.length === 0 ? '—' : activeOrders.filter(order => order.status === status && !hasOpenDeliveryIssue(order)).length}</dd>
                  </div>
                ))}
              </dl>
              <div className="order-view-controls" role="group" aria-label="Visualização dos pedidos">
                {([
                  ['active', 'Em atendimento', activeOrders.length],
                  ['issues', 'Ocorrências', issueOrders.length],
                  ['history', 'Histórico', historyOrders.length],
                ] as const).map(([view, label, count]) => (
                  <button
                    key={view}
                    type="button"
                    className={orderView === view ? 'order-view-button is-active' : 'order-view-button'}
                    aria-pressed={orderView === view}
                    onClick={() => { setOrderView(view); setOrdersNotice(''); }}
                  >
                    {view === 'issues' && count > 0 && <span className="issue-indicator" aria-hidden="true" />}
                    {label} <span className="view-count">{count}</span>
                  </button>
                ))}
              </div>
              <div className="orders-list-heading">
                <p>{orderView === 'history' ? 'Concluídos' : orderView === 'issues' ? 'Precisam de atenção' : 'Fila de atendimento'} <span>· {visibleOrders.length} {visibleOrders.length === 1 ? 'pedido' : 'pedidos'}</span></p>
                <span>{orderView === 'history' ? 'Abra um pedido para ver detalhes' : 'Ocorrências aparecem primeiro'}</span>
              </div>
              {!!ordersNotice && <p className="order-success-notice" role="status">{ordersNotice}</p>}
              {!!ordersError && (
                <div className="inline-error">
                  <span>{ordersError}</span>
                  <button className="secondary-button" onClick={() => loadOrders()} type="button">
                    Tentar novamente
                  </button>
                </div>
              )}

              {isLoadingOrders && orders.length === 0 ? (
                <div className="empty-panel">Carregando pedidos...</div>
              ) : visibleOrders.length === 0 ? (
                <div className="empty-panel orders-empty"><CheckCircle2 size={30} aria-hidden="true" /><strong>{orderView === 'history' ? 'O histórico começa com a primeira entrega' : orderView === 'issues' ? 'Tudo em ordem por aqui' : 'A fila está em dia'}</strong><span>{orderView === 'history' ? 'Pedidos concluídos aparecerão aqui para consulta.' : orderView === 'issues' ? 'Nenhuma ocorrência pendente.' : 'Novos pedidos aparecerão aqui para iniciar o preparo.'}</span></div>
              ) : (
                <div className={orderView === 'history' ? 'orders-grid orders-history' : 'orders-grid'}>
                  {visibleOrders.map((order) => {
                    const nextAction = getNextOrderAction(order.status);
                    const hasIssue = hasOpenDeliveryIssue(order);
                    const isUpdatingStatus = busyOrderIds.has(order.id);

                    if (orderView === 'history') {
                      return (
                        <details className="history-order" key={order.id}>
                          <summary>
                            <span className="history-check"><CheckCircle2 size={19} aria-hidden="true" /></span>
                            <span className="history-customer"><strong>{order.customerName}</strong><span>{getDisplayOrderId(order.id)} · {order.tableNumber ? `Mesa ${String(order.tableNumber).padStart(2, '0')}` : 'Mesa não informada'} · {order.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></span>
                            <span className="history-total">{formatCurrency(order.total)}</span>
                            <ChevronDown className="history-chevron" size={18} aria-hidden="true" />
                          </summary>
                          <div className="history-order-body">
                            <span className="ready-note">{order.resolucaoEntrega ? 'Ocorrência resolvida' : 'Entrega confirmada'}</span>
                            <DeliveryResolution order={order} />
                            <OrderItems order={order} />
                          </div>
                        </details>
                      );
                    }

                    return (
                      <article className={hasIssue ? 'order-card order-card-issue' : 'order-card'} key={order.id}>
                        <div className="order-card-header">
                          <div className="order-customer-heading">
                            <div className="table-marker"><span>MESA</span><strong>{order.tableNumber ? String(order.tableNumber).padStart(2, '0') : '—'}</strong></div>
                            <div>
                            <span className="order-id">{getDisplayOrderId(order.id)}</span>
                            <h2>{order.customerName}</h2>
                            <div className="order-time"><Clock size={13} aria-hidden="true" /><span>{formatElapsedTime(order.createdAt)}</span></div>
                            </div>
                          </div>
                          <span className={`status-badge ${hasIssue ? 'status-issue' : STATUS_STYLES[order.status]}`}>
                            {hasIssue ? 'Entrega contestada' : isCompletedOrder(order) ? 'Concluído' : STATUS_LABELS[order.status]}
                          </span>
                        </div>

                        {hasIssue && (
                          <div className="delivery-issue-notice">
                            <AlertCircle size={19} aria-hidden="true" />
                            <span>Cliente informou que não recebeu. Verifique a entrega e registre como o problema foi resolvido.</span>
                          </div>
                        )}
                        <DeliveryResolution order={order} />
                        <OrderItems order={order} />

                        <div className="order-footer">
                          <div className="order-total-block"><span>Total do pedido</span><strong>{formatCurrency(order.total)}</strong></div>
                          {hasIssue ? (
                            <button className="compact-action" type="button" disabled={isUpdatingStatus} onClick={() => {
                              setResolvingOrderId(order.id);
                              setResolutionNote('');
                              setResolutionError('');
                              setOrdersNotice('');
                            }}>Resolver ocorrência</button>
                          ) : nextAction ? (
                            <button
                              className="compact-action"
                              disabled={isUpdatingStatus}
                              onClick={() => advanceOrderStatus(order.id, nextAction.nextStatus)}
                              type="button"
                            >
                              {isUpdatingStatus ? 'Atualizando...' : nextAction.label}
                              <ArrowRight size={16} aria-hidden="true" />
                            </button>
                          ) : (
                            <span className="ready-note">{order.resolucaoEntrega ? 'Ocorrência resolvida' : order.confirmacaoEntrega === 'confirmado' ? 'Entrega confirmada' : 'Aguardando confirmação'}</span>
                          )}
                        </div>
                        {hasIssue && resolvingOrderId === order.id && (
                          <form className="delivery-resolution-form" onSubmit={event => handleResolveDelivery(event, order.id)}>
                            <label className="form-field">
                              <span>Como a ocorrência foi resolvida?</span>
                              <textarea autoFocus required maxLength={500} rows={3} value={resolutionNote}
                                disabled={isUpdatingStatus}
                                placeholder="Ex.: Entrega conferida e pedido levado à mesa correta."
                                onChange={event => setResolutionNote(event.target.value)} />
                            </label>
                            <p className="order-view-description">O registro será exibido ao cliente e salvo no histórico com seu nome e horário.</p>
                            {!!resolutionError && <p className="form-error" role="alert">{resolutionError}</p>}
                            <div className="modal-actions">
                              <button className="secondary-button" type="button" disabled={isUpdatingStatus} onClick={() => setResolvingOrderId(null)}>Cancelar</button>
                              <button className="primary-button" type="submit" disabled={isUpdatingStatus || !resolutionNote.trim()}>{isUpdatingStatus ? 'Salvando...' : 'Concluir ocorrência'}</button>
                            </div>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section aria-labelledby="menu-title">
              <div className="section-header">
                <div>
                  <p className="login-kicker">Cardápio</p>
                  <h1 id="menu-title">Itens do restaurante</h1>
                </div>
                <button className="add-item-button" onClick={openCreateItemModal} type="button">
                  <Plus size={19} aria-hidden="true" />
                  Adicionar item
                </button>
              </div>

              {!!menuError && (
                <div className="inline-error">
                  <span>{menuError}</span>
                  <button className="secondary-button" onClick={loadMenu} type="button">
                    Tentar novamente
                  </button>
                </div>
              )}

              {isLoadingMenu && menuItems.length === 0 ? (
                <div className="empty-panel">Carregando cardápio...</div>
              ) : sortedMenuItems.length === 0 ? (
                <div className="empty-panel">Nenhum item cadastrado.</div>
              ) : (
                <div className="menu-table" role="table" aria-label="Itens do cardápio">
                  <div className="menu-table-row menu-table-head" role="row">
                    <span role="columnheader">Item</span>
                    <span role="columnheader">Categoria</span>
                    <span role="columnheader">Tipo</span>
                    <span role="columnheader">Preço</span>
                    <span role="columnheader">Desconto</span>
                    <span role="columnheader">Ações</span>
                  </div>

                  {sortedMenuItems.map((item) => {
                    const hasDiscount = item.discountPercent > 0;
                    const discountedPrice = getDiscountedPrice(item);

                    return (
                      <div className="menu-table-row" key={item.id} role="row">
                        <div className="menu-item-cell" role="cell">
                          <img src={item.imageSrc} alt="" />
                          <div>
                            <strong>{item.name}</strong>
                            <p>{item.description}</p>
                            <span className={item.available ? 'availability-pill' : 'availability-pill is-off'}>
                              {item.available ? 'Disponível' : 'Indisponível'}
                            </span>
                          </div>
                        </div>

                        <span role="cell">{item.category}</span>

                        <span className="item-type-pill" role="cell">
                          {item.itemType === 'com_acompanhamento'
                            ? `${item.optionGroups.length} grupo(s)`
                            : 'Simples'}
                        </span>

                        <div className="price-cell" role="cell">
                          {hasDiscount ? (
                            <>
                              <span className="old-price">{formatCurrency(item.price)}</span>
                              <strong>{formatCurrency(discountedPrice)}</strong>
                            </>
                          ) : (
                            <strong>{formatCurrency(item.price)}</strong>
                          )}
                        </div>

                        <span className={hasDiscount ? 'discount-pill is-active' : 'discount-pill'} role="cell">
                          {hasDiscount ? `${item.discountPercent}% off` : 'Sem desconto'}
                        </span>

                        <div className="row-actions" role="cell">
                          <button
                            aria-label={`Editar ${item.name}`}
                            className="icon-action"
                            onClick={() => openEditItemModal(item)}
                            type="button"
                          >
                            <Edit3 size={18} aria-hidden="true" />
                          </button>
                          <button
                            aria-label={`Remover ${item.name}`}
                            className="icon-action is-danger"
                            onClick={() => removeMenuItem(item)}
                            type="button"
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </section>
      </div>

      {isManualOrderModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="menu-modal manual-order-modal" aria-labelledby="manual-order-modal-title" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="login-kicker">Pedido manual</p>
                <h2 id="manual-order-modal-title">Adicionar pedido</h2>
              </div>
              <button
                aria-label="Fechar pedido manual"
                className="icon-action"
                onClick={closeManualOrderModal}
                type="button"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <p className="manual-order-notice">
              Este pedido manual não registra pagamento. Combine a cobrança diretamente com o cliente durante o atendimento.
            </p>

            <form className="menu-form" onSubmit={handleManualOrderSubmit}>
              <div className="form-row manual-order-fields">
                <label className="form-field">
                  <span>Cliente</span>
                  <input
                    onChange={(event) => (
                      setManualOrderForm(current => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    )}
                    placeholder="Nome do cliente"
                    type="text"
                    value={manualOrderForm.customerName}
                  />
                </label>

                <label className="form-field">
                  <span>Mesa</span>
                  <input
                    max="99"
                    min="1"
                    onChange={(event) => (
                      setManualOrderForm(current => ({
                        ...current,
                        tableNumber: event.target.value,
                      }))
                    )}
                    type="number"
                    value={manualOrderForm.tableNumber}
                  />
                </label>
              </div>

              <div className="manual-order-menu">
                {availableMenuItems.length === 0 ? (
                  <div className="empty-panel">Nenhum item disponível no cardápio.</div>
                ) : (
                  availableMenuItems.map(item => {
                    const quantity = manualOrderForm.quantities[item.id] ?? 0;

                    return (
                      <div className="manual-order-item" key={item.id}>
                        <img src={item.imageSrc} alt="" />
                        <div className="manual-order-item-info">
                          <strong>{item.name}</strong>
                          <span>{item.category}</span>
                          <small>{formatCurrency(getDiscountedPrice(item))}</small>
                        </div>

                        <div className="manual-order-quantity">
                          <button
                            aria-label={`Remover ${item.name}`}
                            className="icon-action"
                            disabled={quantity === 0}
                            onClick={() => updateManualOrderQuantity(item.id, -1)}
                            type="button"
                          >
                            -
                          </button>
                          <strong>{quantity}</strong>
                          <button
                            aria-label={`Adicionar ${item.name}`}
                            className="icon-action"
                            onClick={() => updateManualOrderQuantity(item.id, 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="manual-order-summary">
                <span>
                  {selectedManualOrderItems.length === 1
                    ? '1 item selecionado'
                    : `${selectedManualOrderItems.length} itens selecionados`}
                </span>
                <strong>{formatCurrency(manualOrderTotal)}</strong>
              </div>

              {!!manualOrderError && <p className="form-error">{manualOrderError}</p>}

              <div className="modal-actions">
                <button className="secondary-button" onClick={closeManualOrderModal} type="button">
                  Cancelar
                </button>
                <button
                  className="primary-button modal-save"
                  disabled={isSavingManualOrder || selectedManualOrderItems.length === 0}
                  type="submit"
                >
                  <ClipboardList size={19} aria-hidden="true" />
                  {isSavingManualOrder ? 'Adicionando...' : 'Adicionar pedido'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isMenuModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="menu-modal" aria-labelledby="menu-modal-title" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="login-kicker">Cardápio</p>
                <h2 id="menu-modal-title">{editingItem ? 'Editar item' : 'Adicionar item'}</h2>
              </div>
              <button
                aria-label="Fechar formulário"
                className="icon-action"
                onClick={closeMenuModal}
                type="button"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <form className="menu-form" onSubmit={handleMenuFormSubmit}>
              <label className="form-field">
                <span>Nome</span>
                <input
                  onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  type="text"
                  value={menuForm.name}
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span>Preço</span>
                  <input
                    min="0"
                    onChange={(event) => setMenuForm((current) => ({ ...current, price: event.target.value }))}
                    required
                    step="0.01"
                    type="number"
                    value={menuForm.price}
                  />
                </label>

                <label className="form-field">
                  <span>Categoria</span>
                  <select
                    onChange={(event) => (
                      setMenuForm((current) => ({
                        ...current,
                        category: event.target.value as MenuCategory,
                      }))
                    )}
                    value={menuForm.category}
                  >
                    {MENU_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="item-type-control" role="group" aria-label="Tipo do item">
                <button
                  className={menuForm.itemType === 'simples' ? 'item-type-button is-active' : 'item-type-button'}
                  onClick={() => updateMenuItemType('simples')}
                  type="button"
                >
                  Simples
                </button>
                <button
                  className={menuForm.itemType === 'com_acompanhamento' ? 'item-type-button is-active' : 'item-type-button'}
                  onClick={() => updateMenuItemType('com_acompanhamento')}
                  type="button"
                >
                  Com acompanhamento
                </button>
              </div>

              <label className="form-field">
                <span>Descrição</span>
                <textarea
                  onChange={(event) => (
                    setMenuForm((current) => ({ ...current, description: event.target.value }))
                  )}
                  rows={3}
                  value={menuForm.description}
                />
              </label>

              <div className="image-picker">
                <div className="image-picker-preview">
                  <img src={getMenuFormImageSrc(menuForm.image, menuForm.name)} alt="" />
                </div>

                <div className="image-picker-content">
                  <div>
                    <strong>Imagem do item</strong>
                    <span>
                      {menuForm.image
                        ? 'Imagem personalizada selecionada'
                        : 'Escolha uma foto e ajuste o recorte'}
                    </span>
                  </div>

                  <div className="image-picker-actions">
                    <button className="secondary-button image-picker-button" onClick={openImageFilePicker} type="button">
                      <Upload size={17} aria-hidden="true" />
                      Escolher imagem
                    </button>

                    {menuForm.image && (
                      <button className="secondary-button image-picker-button" onClick={clearMenuImage} type="button">
                        <RefreshCcw size={16} aria-hidden="true" />
                        Usar padrão
                      </button>
                    )}
                  </div>

                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="visually-hidden"
                    onChange={handleImageFileChange}
                    ref={imageInputRef}
                    type="file"
                  />
                </div>
              </div>

              <div className="discount-control">
                <label>
                  <input
                    checked={menuForm.hasDiscount}
                    onChange={(event) => (
                      setMenuForm((current) => ({
                        ...current,
                        hasDiscount: event.target.checked,
                      }))
                    )}
                    type="checkbox"
                  />
                  Aplicar desconto
                </label>

                <input
                  aria-label="Percentual de desconto"
                  disabled={!menuForm.hasDiscount}
                  max="90"
                  min="0"
                  onChange={(event) => (
                    setMenuForm((current) => ({ ...current, discountPercent: event.target.value }))
                  )}
                  placeholder="Percentual"
                  type="number"
                  value={menuForm.discountPercent}
                />
              </div>

              <label className="availability-control">
                <input
                  checked={menuForm.available}
                  onChange={(event) => (
                    setMenuForm((current) => ({ ...current, available: event.target.checked }))
                  )}
                  type="checkbox"
                />
                Disponível para pedidos
              </label>

              {menuForm.itemType === 'com_acompanhamento' && (
                <section className="option-groups-builder" aria-label="Grupos de opções">
                  <div className="option-groups-header">
                    <div>
                      <strong>Grupos de opções</strong>
                      <span>{menuForm.optionGroups.length} grupo(s)</span>
                    </div>
                    <button className="secondary-button option-add-button" onClick={addOptionGroup} type="button">
                      <Plus size={17} aria-hidden="true" />
                      Adicionar grupo
                    </button>
                  </div>

                  <div className="option-groups-list">
                    {menuForm.optionGroups.map((group, groupIndex) => (
                      <article className="option-group-panel" key={`option-group-${groupIndex}`}>
                        <div className="option-group-panel-header">
                          <strong>Grupo {groupIndex + 1}</strong>
                          <button
                            aria-label={`Remover grupo ${groupIndex + 1}`}
                            className="icon-action is-danger"
                            disabled={menuForm.optionGroups.length === 1}
                            onClick={() => removeOptionGroup(groupIndex)}
                            type="button"
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </div>

                        <label className="form-field">
                          <span>Nome do grupo</span>
                          <input
                            onChange={(event) => updateOptionGroup(groupIndex, { name: event.target.value })}
                            placeholder="Ex: acompanhamentos/remover ingredientes"
                            required
                            type="text"
                            value={group.name}
                          />
                        </label>

                        <div className="form-row">
                          <label className="form-field">
                            <span>Tipo de seleção</span>
                            <select
                              onChange={(event) => (
                                updateOptionGroup(groupIndex, {
                                  selectionType: event.target.value as OptionGroupTipo,
                                })
                              )}
                              value={group.selectionType}
                            >
                              <option value="unica">Única</option>
                              <option value="multipla">Múltipla</option>
                            </select>
                          </label>

                          <div className="option-flags">
                            <label>
                              <input
                                checked={group.required}
                                onChange={(event) => updateOptionGroup(groupIndex, { required: event.target.checked })}
                                type="checkbox"
                              />
                              Obrigatório
                            </label>
                            <label className={group.selectionType === 'multipla' ? '' : 'is-disabled'}>
                              <input
                                checked={group.allowsQuantity}
                                disabled={group.selectionType !== 'multipla'}
                                onChange={(event) => updateOptionGroup(groupIndex, { allowsQuantity: event.target.checked })}
                                type="checkbox"
                              />
                              Permite quantidade
                            </label>
                          </div>
                        </div>

                        <div className="option-list-editor">
                          <div className="option-list-header">
                            <span>Opções</span>
                            <button
                              className="secondary-button option-add-button"
                              onClick={() => addOptionToGroup(groupIndex)}
                              type="button"
                            >
                              <Plus size={16} aria-hidden="true" />
                              Adicionar opção
                            </button>
                          </div>

                          {group.options.map((option, optionIndex) => (
                            <div className="option-editor-row" key={`option-${groupIndex}-${optionIndex}`}>
                              <label className="form-field">
                                <span>Nome</span>
                                <input
                                  onChange={(event) => (
                                    updateOptionInGroup(groupIndex, optionIndex, { name: event.target.value })
                                  )}
                                  placeholder="Ex: calabresa/remover calabresa"
                                  required
                                  type="text"
                                  value={option.name}
                                />
                              </label>

                              <label className="form-field">
                                <span>Preço adicional</span>
                                <input
                                  min="0"
                                  onChange={(event) => (
                                    updateOptionInGroup(groupIndex, optionIndex, { additionalPrice: event.target.value })
                                  )}
                                  step="0.01"
                                  type="number"
                                  value={option.additionalPrice}
                                />
                              </label>

                              <button
                                aria-label={`Remover opção ${optionIndex + 1}`}
                                className="icon-action is-danger"
                                disabled={group.options.length === 1}
                                onClick={() => removeOptionFromGroup(groupIndex, optionIndex)}
                                type="button"
                              >
                                <Trash2 size={17} aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!!menuError && <p className="form-error">{menuError}</p>}

              <div className="modal-actions">
                <button className="secondary-button" onClick={closeMenuModal} type="button">
                  Cancelar
                </button>
                <button className="primary-button modal-save" disabled={isSavingMenuItem} type="submit">
                  <ChefHat size={19} aria-hidden="true" />
                  {isSavingMenuItem ? 'Salvando...' : 'Salvar item'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {imageCrop && (
        <div className="modal-backdrop crop-backdrop" role="presentation">
          <section className="menu-modal crop-modal" aria-labelledby="crop-modal-title" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="login-kicker">Imagem do item</p>
                <h2 id="crop-modal-title">Recortar imagem</h2>
              </div>
              <button
                aria-label="Fechar recorte"
                className="icon-action"
                disabled={imageCrop.isSaving}
                onClick={closeImageCropModal}
                type="button"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            {imageCrop.source ? (
              <>
                <div
                  className="crop-frame"
                  onPointerDown={handleCropPointerDown}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                >
                  <img
                    alt=""
                    draggable={false}
                    src={imageCrop.source}
                    style={{
                      transform: `translate(${imageCrop.offsetX}px, ${imageCrop.offsetY}px) scale(${imageCrop.zoom})`,
                    }}
                  />
                </div>

                <label className="crop-zoom-control">
                  <span>Zoom</span>
                  <input
                    max="3"
                    min="1"
                    onChange={(event) => handleCropZoomChange(event.target.value)}
                    step="0.05"
                    type="range"
                    value={imageCrop.zoom}
                  />
                </label>
              </>
            ) : (
              <div className="empty-panel">Selecione uma imagem válida.</div>
            )}

            {!!imageCrop.error && <p className="form-error">{imageCrop.error}</p>}

            <div className="modal-actions">
              <button
                className="secondary-button"
                disabled={imageCrop.isSaving}
                onClick={closeImageCropModal}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="secondary-button"
                disabled={imageCrop.isSaving || !imageCrop.source}
                onClick={resetCropPosition}
                type="button"
              >
                <RefreshCcw size={17} aria-hidden="true" />
                Centralizar
              </button>
              <button
                className="primary-button modal-save"
                disabled={imageCrop.isSaving || !imageCrop.source}
                onClick={handleSaveCroppedImage}
                type="button"
              >
                <ImageIcon size={19} aria-hidden="true" />
                {imageCrop.isSaving ? 'Salvando...' : 'Salvar recorte'}
              </button>
            </div>
          </section>
        </div>
      )}

      {isResetModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="menu-modal reset-modal" aria-labelledby="reset-modal-title" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="login-kicker">Reset da demo</p>
                <h2 id="reset-modal-title">Resetar Demo</h2>
              </div>
              <button
                aria-label="Fechar confirmação"
                className="icon-action"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                type="button"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <p className="reset-description">
              Isso vai apagar todos os pedidos e restaurar o cardápio original. Continuar?
            </p>

            {!!resetError && <p className="form-error">{resetError}</p>}

            <div className="modal-actions">
              <button
                className="secondary-button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="primary-button danger-button"
                disabled={isResetting}
                onClick={handleConfirmResetDemo}
                type="button"
              >
                <RefreshCcw size={19} aria-hidden="true" />
                {isResetting ? 'Resetando...' : 'Continuar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
