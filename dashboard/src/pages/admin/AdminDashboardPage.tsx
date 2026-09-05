import { FormEvent, useMemo, useState } from 'react';
import {
  ChefHat,
  ClipboardList,
  Clock,
  Edit3,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';

type AdminSection = 'orders' | 'menu';
type OrderStatus = 'Novo' | 'Em preparo' | 'Pronto';
type MenuCategory = 'Lanches' | 'Pratos principais' | 'Bebidas' | 'Sobremesas';

type OrderItem = {
  name: string;
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  createdAt: Date;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
};

type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
  image: string;
  discountPercent: number;
};

type MenuFormState = {
  name: string;
  category: MenuCategory;
  price: string;
  description: string;
  image: string;
  hasDiscount: boolean;
  discountPercent: string;
};

const MENU_CATEGORIES: MenuCategory[] = [
  'Lanches',
  'Pratos principais',
  'Bebidas',
  'Sobremesas',
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  Novo: 'status-new',
  'Em preparo': 'status-preparing',
  Pronto: 'status-ready',
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

const INITIAL_ORDERS: Order[] = [
  {
    id: 'PED-1024',
    customerName: 'Mariana Souza',
    createdAt: minutesAgo(31),
    items: [
      { name: 'Frango a Parmegiana', quantity: 1 },
      { name: 'Limonada', quantity: 2 },
    ],
    status: 'Em preparo',
    total: 60.70,
  },
  {
    id: 'PED-1025',
    customerName: 'Rafael Lima',
    createdAt: minutesAgo(24),
    items: [
      { name: 'Hamburguer', quantity: 2 },
      { name: 'Batata Frita', quantity: 1 },
      { name: 'Refrigerante', quantity: 2 },
    ],
    status: 'Novo',
    total: 91.70,
  },
  {
    id: 'PED-1026',
    customerName: 'Camila Torres',
    createdAt: minutesAgo(14),
    items: [
      { name: 'Feijoada', quantity: 1 },
      { name: 'Suco', quantity: 1 },
    ],
    status: 'Novo',
    total: 49.80,
  },
  {
    id: 'PED-1027',
    customerName: 'Bruno Martins',
    createdAt: minutesAgo(8),
    items: [
      { name: 'Cheesecake Oreo', quantity: 1 },
      { name: 'Milkshake', quantity: 1 },
    ],
    status: 'Pronto',
    total: 40.80,
  },
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Hamburguer',
    category: 'Lanches',
    price: 28.90,
    description: 'Pao brioche, carne artesanal, queijo e molho da casa.',
    image: '/menu/meatburger.webp',
    discountPercent: 0,
  },
  {
    id: '12',
    name: 'Batata Frita',
    category: 'Lanches',
    price: 18.90,
    description: 'Porcao crocante com sal fino e acompanhamento especial.',
    image: '/menu/fries.webp',
    discountPercent: 10,
  },
  {
    id: '13',
    name: 'Coxinha',
    category: 'Lanches',
    price: 8.50,
    description: 'Massa cremosa com recheio de frango temperado.',
    image: '/menu/coxinha.webp',
    discountPercent: 0,
  },
  {
    id: '14',
    name: 'Hot Dog',
    category: 'Lanches',
    price: 16.90,
    description: 'Salsicha, molho, batata palha e complementos tradicionais.',
    image: '/menu/hotdog.webp',
    discountPercent: 0,
  },
  {
    id: '2',
    name: 'Caldeirada',
    category: 'Pratos principais',
    price: 54.90,
    description: 'Peixe cozido com legumes, ervas e caldo encorpado.',
    image: '/menu/fishstew.webp',
    discountPercent: 0,
  },
  {
    id: '3',
    name: 'Macarrao Frito',
    category: 'Pratos principais',
    price: 32.90,
    description: 'Massa salteada com vegetais, molho oriental e proteina.',
    image: '/menu/friednoodle.webp',
    discountPercent: 0,
  },
  {
    id: '15',
    name: 'Frango a Parmegiana',
    category: 'Pratos principais',
    price: 42.90,
    description: 'Frango empanado, molho de tomate, queijo e arroz branco.',
    image: '/menu/frangoparmegiana.webp',
    discountPercent: 15,
  },
  {
    id: '16',
    name: 'Feijoada',
    category: 'Pratos principais',
    price: 39.90,
    description: 'Feijao preto, carnes selecionadas e acompanhamentos.',
    image: '/menu/feijoada.webp',
    discountPercent: 0,
  },
  {
    id: '4',
    name: 'Suco',
    category: 'Bebidas',
    price: 9.90,
    description: 'Suco natural preparado na hora.',
    image: '/menu/juicesyrup.webp',
    discountPercent: 0,
  },
  {
    id: '5',
    name: 'Refrigerante',
    category: 'Bebidas',
    price: 7.50,
    description: 'Lata gelada de refrigerante.',
    image: '/menu/soda.webp',
    discountPercent: 0,
  },
  {
    id: '6',
    name: 'Limonada',
    category: 'Bebidas',
    price: 8.90,
    description: 'Limonada gelada com toque citrico equilibrado.',
    image: '/menu/lemonade.webp',
    discountPercent: 0,
  },
  {
    id: '7',
    name: 'Milkshake',
    category: 'Bebidas',
    price: 18.90,
    description: 'Milkshake cremoso servido gelado.',
    image: '/menu/milkshake.webp',
    discountPercent: 0,
  },
  {
    id: '8',
    name: 'Cheesecake Oreo',
    category: 'Sobremesas',
    price: 21.90,
    description: 'Cheesecake gelado com base e cobertura de Oreo.',
    image: '/menu/oreochessecake.webp',
    discountPercent: 0,
  },
  {
    id: '9',
    name: 'Acai',
    category: 'Sobremesas',
    price: 19.90,
    description: 'Acai cremoso com acompanhamentos opcionais.',
    image: '/menu/açaí.webp',
    discountPercent: 0,
  },
  {
    id: '10',
    name: 'Brigadeiro',
    category: 'Sobremesas',
    price: 6.00,
    description: 'Brigadeiro tradicional de chocolate.',
    image: '/menu/brigadeiro.webp',
    discountPercent: 0,
  },
  {
    id: '11',
    name: 'Brownie',
    category: 'Sobremesas',
    price: 14.90,
    description: 'Brownie de chocolate com massa densa e macia.',
    image: '/menu/brownie.webp',
    discountPercent: 0,
  },
];

const EMPTY_MENU_FORM: MenuFormState = {
  name: '',
  category: 'Lanches',
  price: '',
  description: '',
  image: '',
  hasDiscount: false,
  discountPercent: '',
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
    return `ha ${elapsedMinutes} min`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return minutes > 0 ? `ha ${hours}h ${minutes}min` : `ha ${hours}h`;
}

function getNextOrderAction(status: OrderStatus) {
  if (status === 'Novo') {
    return {
      label: 'Iniciar preparo',
      nextStatus: 'Em preparo' as OrderStatus,
    };
  }

  if (status === 'Em preparo') {
    return {
      label: 'Marcar como pronto',
      nextStatus: 'Pronto' as OrderStatus,
    };
  }

  return null;
}

function getDiscountedPrice(item: MenuItem) {
  if (item.discountPercent <= 0) {
    return item.price;
  }

  return item.price * (1 - item.discountPercent / 100);
}

function createFormFromItem(item: MenuItem): MenuFormState {
  return {
    name: item.name,
    category: item.category,
    price: String(item.price),
    description: item.description,
    image: item.image,
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

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminName, logout } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('orders');
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [menuForm, setMenuForm] = useState<MenuFormState>(EMPTY_MENU_FORM);

  const sortedOrders = useMemo(
    () => [...orders].sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime()),
    [orders],
  );

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  function advanceOrderStatus(orderId: string, nextStatus: OrderStatus) {
    setOrders((currentOrders) => currentOrders.map((order) => (
      order.id === orderId ? { ...order, status: nextStatus } : order
    )));
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
    setIsMenuModalOpen(false);
    setEditingItem(null);
    setMenuForm(EMPTY_MENU_FORM);
  }

  function removeMenuItem(itemId: string) {
    const shouldRemove = window.confirm('Remover este item do cardapio?');

    if (!shouldRemove) {
      return;
    }

    setMenuItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function handleMenuFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPrice = normalizePositiveNumber(menuForm.price);
    const nextItem: MenuItem = {
      id: editingItem?.id ?? crypto.randomUUID(),
      name: menuForm.name.trim() || 'Novo item',
      category: menuForm.category,
      price: normalizedPrice,
      description: menuForm.description.trim(),
      image: menuForm.image.trim() || '/menu/meatburger.webp',
      discountPercent: normalizeDiscount(menuForm.discountPercent, menuForm.hasDiscount),
    };

    setMenuItems((currentItems) => {
      if (!editingItem) {
        return [nextItem, ...currentItems];
      }

      return currentItems.map((item) => (item.id === editingItem.id ? nextItem : item));
    });
    closeMenuModal();
  }

  return (
    <main className="dashboard-shell">
      <header className="admin-topbar">
        <div>
          <p>Restaurante X</p>
          <strong>{adminName}</strong>
        </div>

        <button className="ghost-button" onClick={handleLogout} type="button">
          <LogOut size={18} aria-hidden="true" />
          Sair
        </button>
      </header>

      <div className="dashboard-layout">
        <aside className="admin-sidebar" aria-label="Setores do painel">
          <div className="sidebar-title">
            <LayoutDashboard size={20} aria-hidden="true" />
            Operacao
          </div>

          <nav className="section-nav">
            <button
              className={activeSection === 'orders' ? 'section-link is-active' : 'section-link'}
              onClick={() => setActiveSection('orders')}
              type="button"
            >
              <ClipboardList size={19} aria-hidden="true" />
              Fila de Pedidos
            </button>

            <button
              className={activeSection === 'menu' ? 'section-link is-active' : 'section-link'}
              onClick={() => setActiveSection('menu')}
              type="button"
            >
              <Utensils size={19} aria-hidden="true" />
              Cardapio
            </button>
          </nav>
        </aside>

        <section className="dashboard-content">
          {activeSection === 'orders' ? (
            <section aria-labelledby="orders-title">
              <div className="section-header">
                <div>
                  <p className="login-kicker">Fila de Pedidos</p>
                  <h1 id="orders-title">Pedidos em andamento</h1>
                </div>
                <span className="summary-pill">{orders.length} pedidos mockados</span>
              </div>

              <div className="orders-grid">
                {sortedOrders.map((order) => {
                  const nextAction = getNextOrderAction(order.status);

                  return (
                    <article className="order-card" key={order.id}>
                      <div className="order-card-header">
                        <div>
                          <span className="order-id">{order.id}</span>
                          <h2>{order.customerName}</h2>
                        </div>
                        <span className={`status-badge ${STATUS_STYLES[order.status]}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="order-time">
                        <Clock size={17} aria-hidden="true" />
                        <span>{formatElapsedTime(order.createdAt)}</span>
                      </div>

                      <ul className="order-items">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.name}`}>
                            <span>{item.name}</span>
                            <strong>{item.quantity}x</strong>
                          </li>
                        ))}
                      </ul>

                      <div className="order-footer">
                        <strong>{formatCurrency(order.total)}</strong>
                        {nextAction ? (
                          <button
                            className="compact-action"
                            onClick={() => advanceOrderStatus(order.id, nextAction.nextStatus)}
                            type="button"
                          >
                            {nextAction.label}
                          </button>
                        ) : (
                          <span className="ready-note">Pedido pronto</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section aria-labelledby="menu-title">
              <div className="section-header">
                <div>
                  <p className="login-kicker">Cardapio</p>
                  <h1 id="menu-title">Itens do restaurante</h1>
                </div>
                <button className="add-item-button" onClick={openCreateItemModal} type="button">
                  <Plus size={19} aria-hidden="true" />
                  Adicionar item
                </button>
              </div>

              <div className="menu-table" role="table" aria-label="Itens do cardapio">
                <div className="menu-table-row menu-table-head" role="row">
                  <span role="columnheader">Item</span>
                  <span role="columnheader">Categoria</span>
                  <span role="columnheader">Preco</span>
                  <span role="columnheader">Desconto</span>
                  <span role="columnheader">Acoes</span>
                </div>

                {menuItems.map((item) => {
                  const hasDiscount = item.discountPercent > 0;
                  const discountedPrice = getDiscountedPrice(item);

                  return (
                    <div className="menu-table-row" key={item.id} role="row">
                      <div className="menu-item-cell" role="cell">
                        <img src={item.image} alt="" />
                        <div>
                          <strong>{item.name}</strong>
                          <p>{item.description}</p>
                        </div>
                      </div>

                      <span role="cell">{item.category}</span>

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
                          onClick={() => removeMenuItem(item.id)}
                          type="button"
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </div>

      {isMenuModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="menu-modal" aria-labelledby="menu-modal-title" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="login-kicker">Cardapio</p>
                <h2 id="menu-modal-title">{editingItem ? 'Editar item' : 'Adicionar item'}</h2>
              </div>
              <button
                aria-label="Fechar formulario"
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
                  <span>Preco</span>
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

              <label className="form-field">
                <span>Descricao</span>
                <textarea
                  onChange={(event) => (
                    setMenuForm((current) => ({ ...current, description: event.target.value }))
                  )}
                  rows={3}
                  value={menuForm.description}
                />
              </label>

              <label className="form-field">
                <span>Imagem</span>
                <input
                  onChange={(event) => setMenuForm((current) => ({ ...current, image: event.target.value }))}
                  placeholder="/menu/meatburger.webp"
                  type="text"
                  value={menuForm.image}
                />
              </label>

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

              <div className="modal-actions">
                <button className="secondary-button" onClick={closeMenuModal} type="button">
                  Cancelar
                </button>
                <button className="primary-button modal-save" type="submit">
                  <ChefHat size={19} aria-hidden="true" />
                  Salvar item
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
