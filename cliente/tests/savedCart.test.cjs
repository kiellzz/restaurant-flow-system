const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, requireMock) {
  const output = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: requireMock });
  return exports;
}
const { restoreCart, reconcileCart, restoreSession } = load('../utils/savedCart.ts');
const line = {
  id: 'shake', cartKey: 'shake:custom:1', name: 'Milkshake', category: 'drink',
  price: 18.9, quantity: 2, tipo: 'com_acompanhamento', observacao: 'Sem canudo',
  opcoesSelecionadas: [{ grupoNome: 'Tamanho', opcaoNome: '700 ml', precoAdicional: 8, quantidade: 1 }],
  precoUnitarioFinal: 26.9,
};
const product = {
  _id: 'shake', nome: 'Milkshake', categoria: 'Bebidas', preco: 20, precoComDesconto: 18,
  disponivel: true, imagem: 'milkshake.webp', tipo: 'com_acompanhamento',
  gruposOpcoes: [{ nome: 'Tamanho', obrigatorio: true, tipo: 'unica', permiteQuantidade: false,
    opcoes: [{ nome: '700 ml', precoAdicional: 10 }] }],
};
const plain = value => JSON.parse(JSON.stringify(value));

test('snapshot round trip keeps separate customized lines, notes and quantities', () => {
  const second = { ...line, cartKey: 'shake:custom:2', observacao: 'Outro pedido' };
  const cart = restoreCart(JSON.parse(JSON.stringify({ version: 1, items: [line, second] })));
  assert.deepEqual(plain(cart[line.cartKey]), line);
  assert.equal(cart[second.cartKey].observacao, 'Outro pedido');
  assert.equal(Object.keys(cart).length, 2);
});

test('invalid snapshots and quantities are discarded and totals are recomputed', () => {
  for (const snapshot of [null, {}, { version: 9, items: [line] }]) assert.equal(Object.keys(restoreCart(snapshot)).length, 0);
  const cart = restoreCart({ version: 1, items: [
    { ...line, quantity: -1 }, { ...line, cartKey: '__proto__' },
    { ...line, opcoesSelecionadas: [{ quantidade: -1 }] },
    { ...line, precoUnitarioFinal: 999 },
  ] });
  assert.equal(Object.keys(cart).length, 1);
  assert.equal(cart[line.cartKey].precoUnitarioFinal, 26.9);
});

test('restoration uses current discounts and additional prices and reports the change', () => {
  const result = reconcileCart({ [line.cartKey]: line }, [product]);
  assert.equal(result.cart[line.cartKey].precoUnitarioFinal, 28);
  assert.equal(result.cart[line.cartKey].quantity, 2);
  assert.equal(result.notices.length, 1);
  assert.equal(Object.keys(result.issues).length, 0);
  assert.equal(line.precoUnitarioFinal, 26.9);
});

test('deleted or unavailable products remain recoverable but block checkout', () => {
  for (const menu of [[], [{ ...product, disponivel: false }]]) {
    const result = reconcileCart({ [line.cartKey]: line }, menu);
    assert.equal(result.cart[line.cartKey], line);
    assert.match(result.issues[line.cartKey], /indisponível/);
  }
});

test('removed options and new required groups require editing, including after another reload', () => {
  for (const groups of [[], [...product.gruposOpcoes, { nome: 'Sabor', tipo: 'unica', obrigatorio: true, opcoes: [] }]]) {
    const current = { ...product, gruposOpcoes: groups };
    const first = reconcileCart({ [line.cartKey]: line }, [current]);
    assert.match(first.issues[line.cartKey], /Editar/);
    const restored = restoreCart({ version: 1, items: Object.values(first.cart) });
    assert.match(reconcileCart(restored, [current]).issues[line.cartKey], /Editar/);
  }
});

test('session restores the table and rejects invalid session data', () => {
  assert.equal(restoreSession({ version: 1, userName: 'Cliente' }), null);
  const session = restoreSession({ version: 1, sessionId: 'demo-1', userName: 'Cliente', tableNumber: 5, lastTableChangeAt: 123 });
  assert.equal(session.tableNumber, 5);
  assert.equal(restoreSession({ ...session, version: 1, tableNumber: 120 }).tableNumber, null);
});

test('storage writes are ordered so clearing cannot be overwritten by a delayed save', async () => {
  const values = new Map();
  const calls = [];
  const storage = {
    async setItem(key, value) { await new Promise(resolve => setTimeout(resolve, 15)); values.set(key, value); calls.push('save'); },
    async removeItem(key) { values.delete(key); calls.push('clear'); },
    async getItem(key) { return values.get(key) ?? null; },
  };
  const { writeLocalState, readLocalState } = load('../services/localState.ts', () => ({ __esModule: true, default: storage }));
  const saving = writeLocalState('cart', { version: 1, items: [line] });
  const clearing = writeLocalState('cart', null);
  await Promise.all([saving, clearing]);
  assert.deepEqual(calls, ['save', 'clear']);
  assert.equal(await readLocalState('cart'), null);
  values.set('cart', '{broken');
  assert.equal(await readLocalState('cart'), null);
});
