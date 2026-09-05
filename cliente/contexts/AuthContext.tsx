import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

const DEMO_EMAIL = 'email@email.com';
const DEMO_PASSWORD = '123456';

type AuthContextValue = {
  demoEmail: string;
  demoPassword: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
  userName: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('Visitante');

  const value = useMemo<AuthContextValue>(() => ({
    demoEmail: DEMO_EMAIL,
    demoPassword: DEMO_PASSWORD,
    isAuthenticated,
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
      setIsAuthenticated(false);
    },
    userName,
  }), [isAuthenticated, userName]);

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
