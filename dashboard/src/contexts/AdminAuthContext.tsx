import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { authenticateDashboardUser, type DashboardRole, TEST_DASHBOARD_USERS } from '../utils/dashboardAuth';

type AdminAuthContextValue = {
  adminName: string;
  isAuthenticated: boolean;
  role: DashboardRole | null;
  testUsers: typeof TEST_DASHBOARD_USERS;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [role, setRole] = useState<DashboardRole | null>(null);

  const value = useMemo<AdminAuthContextValue>(() => ({
    adminName,
    isAuthenticated,
    role,
    testUsers: TEST_DASHBOARD_USERS,
    login: (email, password) => {
      const user = authenticateDashboardUser(email, password);
      if (user) {
        setAdminName(user.name);
        setRole(user.role);
        setIsAuthenticated(true);
      }
      return Boolean(user);
    },
    logout: () => {
      setAdminName('');
      setRole(null);
      setIsAuthenticated(false);
    },
  }), [adminName, isAuthenticated, role]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  }

  return context;
}
