const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the production helper without loading Expo or React Native.
const source = fs.readFileSync(require.resolve('../utils/cartEditing.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject });
const { replaceCartItem, restoreSelections } = exportsObject;
const plain = value => JSON.parse(JSON.stringify(value));
const item = { id: 'milkshake', name: 'Milkshake', category: 'drink', price: 18.9, tipo: 'com_acompanhamento' };
const original = { ...item, cartKey: 'first', quantity: 2, observacao: 'Sem canudo', opcoesSelecionadas: [], precoUnitarioFinal: 18.9 };

test('editing replaces only the chosen line, preserving key, quantity and other customizations', () => {
  const second = { ...original, cartKey: 'second', observacao: 'Outro pedido' };
  const cart = { first: original, second };
  const updated = replaceCartItem(cart, 'first', item, {
    observacao: '  Bem gelado  ',
    opcoesSelecionadas: [{ grupoNome: 'Tamanho', opcaoNome: '700 ml', precoAdicional: 8, quantidade: 1 }],
  });
  assert.equal(updated.first.cartKey, 'first');
  assert.equal(updated.first.quantity, 2);
  assert.equal(updated.first.precoUnitarioFinal, 26.9);
  assert.equal(updated.first.observacao, 'Bem gelado');
  assert.equal(updated.second, second);
  assert.equal(cart.first, original);
  assert.equal(original.precoUnitarioFinal, 18.9);
  assert.equal(Object.keys(updated).length, 2);
  assert.equal(Math.round(Object.values(updated).reduce((sum, line) => sum + line.precoUnitarioFinal * line.quantity, 0) * 100), 9160);
});

test('missing or mismatched items cannot be recreated by a delayed save', () => {
  const cart = { first: original };
  assert.equal(replaceCartItem(cart, 'removed', item, {}), cart);
  assert.equal(replaceCartItem(cart, 'first', { ...item, id: 'other' }, {}), cart);
});

test('additional quantities and updated base prices use cent rounding', () => {
  const updated = replaceCartItem({ first: original }, 'first', { ...item, price: 19.9 }, {
    opcoesSelecionadas: [{ grupoNome: 'Extras', opcaoNome: 'Cobertura', precoAdicional: 3.1, quantidade: 3 }],
  });
  assert.equal(updated.first.precoUnitarioFinal, 29.2);
});

test('restores choices by name after reordering and ignores removed options', () => {
  const groups = [
    { nome: 'Extras', tipo: 'multipla', permiteQuantidade: true, opcoes: [{ nome: 'Granola' }] },
    { nome: 'Tamanho', tipo: 'unica', opcoes: [{ nome: '700 ml' }, { nome: '400 ml' }] },
  ];
  const selected = [
    { grupoNome: 'Tamanho', opcaoNome: '700 ml', quantidade: 1 },
    { grupoNome: 'Extras', opcaoNome: 'Granola', quantidade: 2 },
    { grupoNome: 'Extras', opcaoNome: 'Removida', quantidade: 1 },
  ];
  assert.deepEqual(plain(restoreSelections(groups, selected)), { single: { 1: 0 }, multiple: { 0: { 0: 2 } } });
  groups[0].permiteQuantidade = false;
  assert.equal(restoreSelections(groups, selected).multiple[0][0], 1);
  assert.deepEqual(plain(restoreSelections(groups, [])), { single: {}, multiple: {} });
});
