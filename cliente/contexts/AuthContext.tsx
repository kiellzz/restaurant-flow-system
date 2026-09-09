import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

const DEMO_EMAIL = 'email@email.com';
const DEMO_PASSWORD = '123456';

type AuthContextValue = {
  demoEmail: string;
  demoPassword: string;
  isAuthenticated: boolean;
  lastTableChangeAt: number | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
  setSessionTableNumber: (tableNumber: number, options?: { startCooldown?: boolean }) => void;
  tableNumber: number | null;
  userName: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastTableChangeAt, setLastTableChangeAt] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [userName, setUserName] = useState('Visitante');

  const value = useMemo<AuthContextValue>(() => ({
    demoEmail: DEMO_EMAIL,
    demoPassword: DEMO_PASSWORD,
    isAuthenticated,
    lastTableChangeAt,
    login: (email, password) => {
      const isDemoUser = email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

      if (isDemoUser) {
        setUserName('Cliente Demo');
        setIsAuthenticated(true);
      }

      return isDemoUser;
    },
    register: (name, email) => {
      setUserName(name.trim() || email.trim() || 'Cliente');
      setIsAuthenticated(true);
    },
    logout: () => {
      setUserName('Visitante');
      setTableNumber(null);
      setLastTableChangeAt(null);
      setIsAuthenticated(false);
    },
    setSessionTableNumber: (nextTableNumber, options) => {
      setTableNumber(Math.min(99, Math.max(1, Math.round(nextTableNumber))));

      if (options?.startCooldown) {
        setLastTableChangeAt(Date.now());
      }
    },
    tableNumber,
    userName,
  }), [isAuthenticated, lastTableChangeAt, tableNumber, userName]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
