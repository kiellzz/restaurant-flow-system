import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { cartStorageKey, readLocalState, SESSION_KEY, writeLocalState } from '@/services/localState';
import { restoreSession } from '@/utils/savedCart';

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
  sessionId: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastTableChangeAt, setLastTableChangeAt] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [userName, setUserName] = useState('Visitante');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  React.useEffect(() => {
    let active = true;
    readLocalState(SESSION_KEY).then(value => {
      if (!active) return;
      const saved = restoreSession(value);
      if (saved) {
        setSessionId(saved.sessionId);
        setUserName(saved.userName);
        setTableNumber(saved.tableNumber);
        setLastTableChangeAt(saved.lastTableChangeAt);
        setIsAuthenticated(true);
      }
    }).catch(() => { if (active) setStorageError(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    void writeLocalState(SESSION_KEY, sessionId && isAuthenticated
      ? { version: 1, sessionId, userName, tableNumber, lastTableChangeAt }
      : null).catch(() => setStorageError(true));
  }, [ready, sessionId, isAuthenticated, userName, tableNumber, lastTableChangeAt]);

  const value = useMemo<AuthContextValue>(() => ({
    demoEmail: DEMO_EMAIL,
    demoPassword: DEMO_PASSWORD,
    isAuthenticated,
    sessionId,
    lastTableChangeAt,
    login: (email, password) => {
      const isDemoUser = email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

      if (isDemoUser) {
        setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
        setUserName('Cliente Demo');
        setIsAuthenticated(true);
      }

      return isDemoUser;
    },
    register: (name, email) => {
      setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setUserName(name.trim() || email.trim() || 'Cliente');
      setIsAuthenticated(true);
    },
    logout: () => {
      if (sessionId) void writeLocalState(cartStorageKey(sessionId), null).catch(() => setStorageError(true));
      void writeLocalState(SESSION_KEY, null).catch(() => setStorageError(true));
      setSessionId(null);
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
  }), [isAuthenticated, lastTableChangeAt, tableNumber, userName, sessionId]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center' }}><ActivityIndicator color="#C92525" accessibilityLabel="Restaurando sua sessão" /></View>;

  return (
    <AuthContext.Provider value={value}>
      {storageError && <Text accessibilityRole="alert" style={{ color: '#F08080', backgroundColor: '#252528', padding: 12 }}>Não foi possível salvar a sessão neste dispositivo. Seus dados podem se perder ao sair.</Text>}
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
