export type DashboardRole = 'administrador' | 'funcionario';

export type TestDashboardUser = {
  email: string;
  name: string;
  password: string;
  role: DashboardRole;
};

export const TEST_DASHBOARD_USERS: TestDashboardUser[] = [
  {
    email: 'admin@restaurante.com',
    name: 'Administrador Demo',
    password: 'admin123',
    role: 'administrador',
  },
  {
    email: 'funcionario@restaurante.com',
    name: 'Funcionário Demo',
    password: 'func123',
    role: 'funcionario',
  },
];

export function authenticateDashboardUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return TEST_DASHBOARD_USERS.find(user => (
    user.email === normalizedEmail && user.password === password
  )) ?? null;
}

export function canManageMenu(role: DashboardRole | null) {
  return role === 'administrador';
}
