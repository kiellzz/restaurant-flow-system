import { FormEvent, useMemo, useState } from 'react';
import { ChefHat, LockKeyhole, LogIn, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, testUsers } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password],
  );

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  function fillTestCredentials(userIndex: number) {
    const user = testUsers[userIndex];
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const didLogin = login(email, password);

    if (!didLogin) {
      setError('E-mail ou senha incorretos. Use as credenciais de teste.');
      return;
    }

    navigate('/admin', { replace: true });
  }

  return (
    <main className="admin-login-page">
      <section className="login-card" aria-labelledby="admin-login-title">
        <div className="brand-symbol" aria-hidden="true">
          <ChefHat size={32} strokeWidth={2.4} />
        </div>

        <div className="login-heading">
          <p className="login-kicker">Restaurante X</p>
          <h1 id="admin-login-title">Painel do restaurante</h1>
          <p>Entre como administrador ou funcionário para acessar as funções do seu perfil.</p>
        </div>

        <div className="test-account-options" aria-label="Contas de teste">
          {testUsers.map((user, index) => (
            <button
              aria-pressed={email.trim().toLowerCase() === user.email}
              className={`test-account-button is-${user.role}${email.trim().toLowerCase() === user.email ? ' is-selected' : ''}`}
              key={user.role}
              onClick={() => fillTestCredentials(index)}
              type="button"
            >
              <span>{user.role === 'administrador' ? <ShieldCheck size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}</span>
              <span>
                <strong>{user.role === 'administrador' ? 'Administrador' : 'Funcionário'}</strong>
                <small>{user.role === 'administrador' ? 'Acesso completo' : 'Somente fila de pedidos'}</small>
              </span>
            </button>
          ))}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>E-mail</span>
            <span className="input-shell">
              <Mail size={20} aria-hidden="true" />
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@restaurante.com"
                type="email"
                value={email}
              />
            </span>
          </label>

          <label className="field-group">
            <span>Senha</span>
            <span className="input-shell">
              <LockKeyhole size={20} aria-hidden="true" />
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                type="password"
                value={password}
              />
            </span>
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" disabled={!canSubmit} type="submit">
            <LogIn size={20} aria-hidden="true" />
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
