import type { ApiMenuItemOptionGroup, ApiSelectedOption } from '../services/api';

export type ManualSingleSelections = Record<string, number>;
export type ManualMultipleSelections = Record<string, Record<string, number>>;

export function buildManualSelectedOptions(
  groups: ApiMenuItemOptionGroup[],
  single: ManualSingleSelections,
  multiple: ManualMultipleSelections,
) {
  return groups.flatMap<ApiSelectedOption>((group, groupIndex) => {
    const groupKey = String(groupIndex);
    if (group.tipo === 'unica') {
      const optionIndex = single[groupKey];
      const option = optionIndex === undefined ? undefined : group.opcoes[optionIndex];
      return option ? [{
        grupoNome: group.nome,
        opcaoNome: option.nome,
        precoAdicional: option.precoAdicional ?? 0,
        quantidade: 1,
      }] : [];
    }
    return group.opcoes.flatMap((option, optionIndex) => {
      const quantity = multiple[groupKey]?.[String(optionIndex)] ?? 0;
      return quantity > 0 ? [{
        grupoNome: group.nome,
        opcaoNome: option.nome,
        precoAdicional: option.precoAdicional ?? 0,
        quantidade: group.permiteQuantidade ? quantity : 1,
      }] : [];
    });
  });
}

export function isManualSelectionValid(
  groups: ApiMenuItemOptionGroup[],
  single: ManualSingleSelections,
  multiple: ManualMultipleSelections,
) {
  return groups.every((group, groupIndex) => {
    if (!group.obrigatorio) return true;
    const groupKey = String(groupIndex);
    return group.tipo === 'unica'
      ? single[groupKey] !== undefined
      : Object.values(multiple[groupKey] ?? {}).some(quantity => quantity > 0);
  });
}

export function calculateManualUnitPrice(basePrice: number, options: ApiSelectedOption[]) {
  return Math.round((basePrice + options.reduce((sum, option) => (
    sum + option.precoAdicional * option.quantidade
  ), 0)) * 100) / 100;
}

export function restoreManualSelections(groups: ApiMenuItemOptionGroup[], selected: ApiSelectedOption[]) {
  const single: ManualSingleSelections = {};
  const multiple: ManualMultipleSelections = {};
  groups.forEach((group, groupIndex) => {
    group.opcoes.forEach((option, optionIndex) => {
      const saved = selected.find(value => value.grupoNome === group.nome && value.opcaoNome === option.nome);
      if (!saved) return;
      const groupKey = String(groupIndex);
      if (group.tipo === 'unica') single[groupKey] = optionIndex;
      else {
        multiple[groupKey] ??= {};
        multiple[groupKey][String(optionIndex)] = group.permiteQuantidade ? Math.max(1, saved.quantidade) : 1;
      }
    });
  });
  return { single, multiple };
}
