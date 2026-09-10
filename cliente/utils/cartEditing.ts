import type { AddItemConfig, CartItem, MenuItem, SelectedOptionSnapshot } from '../contexts/CartContext';
import type { ApiMenuItemOptionGroup } from '../services/api';

export function replaceCartItem(cart: Record<string, CartItem>, cartKey: string, item: MenuItem, config: AddItemConfig) {
  const existing = cart[cartKey];
  if (!existing || existing.id !== item.id) return cart;
  const options = config.opcoesSelecionadas ?? [];
  const additional = options.reduce((sum, option) => sum + option.precoAdicional * option.quantidade, 0);
  return {
    ...cart,
    [cartKey]: {
      ...existing,
      ...item,
      cartKey,
      quantity: existing.quantity,
      tipo: item.tipo ?? 'simples',
      observacao: config.observacao?.trim() ?? '',
      opcoesSelecionadas: options,
      precoUnitarioFinal: Math.round((item.price + additional) * 100) / 100,
    },
  };
}

export function restoreSelections(groups: ApiMenuItemOptionGroup[], selected: SelectedOptionSnapshot[]) {
  const single: Record<string, number> = {};
  const multiple: Record<string, Record<string, number>> = {};
  groups.forEach((group, groupIndex) => {
    group.opcoes.forEach((option, optionIndex) => {
      const previous = selected.find(value => value.grupoNome === group.nome && value.opcaoNome === option.nome);
      if (!previous) return;
      if (group.tipo === 'unica') {
        single[String(groupIndex)] = optionIndex;
      } else {
        multiple[String(groupIndex)] ??= {};
        multiple[String(groupIndex)][String(optionIndex)] = group.permiteQuantidade ? Math.max(1, previous.quantidade) : 1;
      }
    });
  });
  return { single, multiple };
}
