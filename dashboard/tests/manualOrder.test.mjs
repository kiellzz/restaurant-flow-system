import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildManualSelectedOptions,
  calculateManualUnitPrice,
  isManualSelectionValid,
  restoreManualSelections,
} from '../src/utils/manualOrder.ts';

const groups = [
  { nome: 'Tamanho', tipo: 'unica', obrigatorio: true, permiteQuantidade: false,
    opcoes: [{ nome: '300 ml', precoAdicional: 0 }, { nome: '500 ml', precoAdicional: 6 }] },
  { nome: 'Extras', tipo: 'multipla', obrigatorio: false, permiteQuantidade: true,
    opcoes: [{ nome: 'Granola', precoAdicional: 2 }] },
];

test('required groups control whether a manual customization can be saved', () => {
  assert.equal(isManualSelectionValid(groups, {}, {}), false);
  assert.equal(isManualSelectionValid(groups, { 0: 1 }, {}), true);
});

test('manual selections preserve option quantities and calculate additions', () => {
  const selected = buildManualSelectedOptions(groups, { 0: 1 }, { 1: { 0: 2 } });
  assert.deepEqual(selected.map(option => [option.opcaoNome, option.quantidade]), [['500 ml', 1], ['Granola', 2]]);
  assert.equal(calculateManualUnitPrice(18, selected), 28);
  assert.deepEqual(restoreManualSelections(groups, selected), { single: { 0: 1 }, multiple: { 1: { 0: 2 } } });
});
