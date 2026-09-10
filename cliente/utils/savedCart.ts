import type { CartItem, SelectedOptionSnapshot } from '../contexts/CartContext';
import type { ApiMenuItem } from '../services/api';

type Cart = Record<string, CartItem>;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const quantity = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export function restoreCart(value: unknown): Cart {
  const cart: Cart = {};
  if (!object(value) || value.version !== 1 || !Array.isArray(value.items)) return cart;
  for (const item of value.items) {
    if (!object(item) || typeof item.id !== 'string' || !item.id || typeof item.cartKey !== 'string' ||
      !item.cartKey || ['__proto__', 'constructor', 'prototype'].includes(item.cartKey) ||
      typeof item.name !== 'string' || typeof item.category !== 'string' ||
      typeof item.observacao !== 'string' || !money(item.price) || !quantity(item.quantity) ||
      !['simples', 'com_acompanhamento'].includes(String(item.tipo)) || !Array.isArray(item.opcoesSelecionadas)) continue;
    const options = item.opcoesSelecionadas;
    if (!options.every(option => object(option) && typeof option.grupoNome === 'string' && typeof option.opcaoNome === 'string' && money(option.precoAdicional) && quantity(option.quantidade))) continue;
    cart[item.cartKey] = {
      id: item.id, cartKey: item.cartKey, name: item.name, category: item.category,
      image: typeof item.image === 'string' ? item.image : undefined,
      price: item.price, quantity: item.quantity, tipo: item.tipo as CartItem['tipo'],
      observacao: item.observacao, opcoesSelecionadas: options as SelectedOptionSnapshot[],
      precoUnitarioFinal: Math.round((item.price + options.reduce((sum, option) => sum + option.precoAdicional * option.quantidade, 0)) * 100) / 100,
    };
  }
  return cart;
}

export function reconcileCart(cart: Cart, menu: ApiMenuItem[]) {
  const next: Cart = {};
  const issues: Record<string, string> = {};
  const notices: string[] = [];
  const categories: Record<string, string> = { Lanches: 'snack', 'Pratos principais': 'main', Bebidas: 'drink', Sobremesas: 'dessert' };
  for (const [key, line] of Object.entries(cart)) {
    next[key] = line;
    const current = menu.find(item => item._id === line.id);
    if (!current || !current.disponivel) {
      issues[key] = 'Item indisponível. Remova-o para finalizar o pedido.';
      continue;
    }
    const groups = current.tipo === 'com_acompanhamento' ? current.gruposOpcoes ?? [] : [];
    const selected = line.opcoesSelecionadas.map(option => {
      const group = groups.find(group => group.nome === option.grupoNome);
      const match = group?.opcoes.find(value => value.nome === option.opcaoNome);
      return match ? { ...option, precoAdicional: match.precoAdicional ?? 0 } : null;
    });
    const invalid = selected.some(option => !option) || groups.some(group => {
      const choices = line.opcoesSelecionadas.filter(option => option.grupoNome === group.nome);
      return (group.obrigatorio && choices.length === 0) ||
        (group.tipo === 'unica' && choices.length > 1) ||
        ((!group.permiteQuantidade || group.tipo === 'unica') && choices.some(option => option.quantidade !== 1));
    });
    if (invalid) {
      issues[key] = 'As opções deste item mudaram. Toque em Editar para revisar.';
      continue;
    }
    const options = selected as SelectedOptionSnapshot[];
    const price = current.precoComDesconto ?? current.preco;
    const unit = Math.round((price + options.reduce((sum, option) => sum + option.precoAdicional * option.quantidade, 0)) * 100) / 100;
    if (unit !== line.precoUnitarioFinal) notices.push(`${current.nome}: valor atualizado para R$ ${unit.toFixed(2).replace('.', ',')} por unidade.`);
    next[key] = { ...line, name: current.nome, category: categories[current.categoria], image: current.imagem,
      price, tipo: current.tipo ?? 'simples', opcoesSelecionadas: options, precoUnitarioFinal: unit };
  }
  return { cart: next, issues, notices };
}

export function restoreSession(value: unknown) {
  if (!object(value) || value.version !== 1 || typeof value.sessionId !== 'string' || !value.sessionId ||
    typeof value.userName !== 'string' || !value.userName.trim()) return null;
  return {
    sessionId: value.sessionId,
    userName: value.userName,
    tableNumber: quantity(value.tableNumber) && value.tableNumber <= 99 ? value.tableNumber : null,
    lastTableChangeAt: money(value.lastTableChangeAt) ? value.lastTableChangeAt : null,
  };
}
