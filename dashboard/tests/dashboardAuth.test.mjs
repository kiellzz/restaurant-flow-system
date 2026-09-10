import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticateDashboardUser, canManageMenu, TEST_DASHBOARD_USERS } from '../src/utils/dashboardAuth.ts';

test('administrator and employee use distinct test accounts', () => {
  assert.equal(TEST_DASHBOARD_USERS.length, 2);
  assert.equal(new Set(TEST_DASHBOARD_USERS.map(user => user.email)).size, 2);
  assert.equal(authenticateDashboardUser(' ADMIN@RESTAURANTE.COM ', 'admin123')?.role, 'administrador');
  assert.equal(authenticateDashboardUser('funcionario@restaurante.com', 'func123')?.role, 'funcionario');
  assert.equal(authenticateDashboardUser('funcionario@restaurante.com', 'admin123'), null);
});

test('only administrators can manage the menu', () => {
  assert.equal(canManageMenu('administrador'), true);
  assert.equal(canManageMenu('funcionario'), false);
  assert.equal(canManageMenu(null), false);
});
