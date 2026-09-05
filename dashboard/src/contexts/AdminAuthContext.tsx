import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

const MOCK_ADMIN_EMAIL = 'admin@restaurante.com';
const MOCK_ADMIN_PASSWORD = 'admin123';

type AdminAuthContextValue = {
  adminName: string;
  isAuthenticated: boolean;
  mockEmail: string;
  mockPassword: string;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState('Administrador');

  const value = useMemo<AdminAuthContextValue>(() => ({
    adminName,
    isAuthenticated,
    mockEmail: MOCK_ADMIN_EMAIL,
    mockPassword: MOCK_ADMIN_PASSWORD,
    login: (email, password) => {
      const isMockAdmin =
        email.trim().toLowerCase() === MOCK_ADMIN_EMAIL &&
        password === MOCK_ADMIN_PASSWORD;

      if (isMockAdmin) {
        setAdminName('Equipe Restaurante X');
        setIsAuthenticated(true);
      }

      return isMockAdmin;
    },
    logout: () => {
      setAdminName('Administrador');
      setIsAuthenticated(false);
    },
  }), [adminName, isAuthenticated]);

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
