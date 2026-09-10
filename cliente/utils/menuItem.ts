import type { MenuCategoryFilter } from '@/components/FilterModal';
import type { MenuItemTipo } from '@/contexts/CartContext';
import type { ApiMenuCategory, ApiMenuItem, ApiMenuItemOptionGroup } from '@/services/api';

export type MenuItemData = {
  category: MenuCategoryFilter;
  gruposOpcoes: ApiMenuItemOptionGroup[];
  id: string;
  image: string;
  name: string;
  price: number;
  tipo: MenuItemTipo;
};

const API_CATEGORY_TO_FILTER: Record<ApiMenuCategory, MenuCategoryFilter> = {
  Lanches: 'snack',
  'Pratos principais': 'main',
  Bebidas: 'drink',
  Sobremesas: 'dessert',
};

export function mapApiMenuItem(item: ApiMenuItem): MenuItemData {
  return {
    category: API_CATEGORY_TO_FILTER[item.categoria],
    gruposOpcoes: (item.gruposOpcoes ?? []).map(group => ({
      nome: group.nome,
      obrigatorio: Boolean(group.obrigatorio),
      opcoes: (group.opcoes ?? []).map(option => ({
        nome: option.nome,
        precoAdicional: option.precoAdicional ?? 0,
      })),
      permiteQuantidade: Boolean(group.permiteQuantidade),
      tipo: group.tipo ?? 'unica',
    })),
    id: item._id,
    image: item.imagem,
    name: item.nome,
    price: item.precoComDesconto ?? item.preco,
    tipo: item.tipo ?? 'simples',
  };
}

