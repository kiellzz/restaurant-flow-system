import { FormEvent, useMemo, useState } from 'react';
import { ChefHat, LockKeyhole, LogIn, Mail, Zap } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, mockEmail, mockPassword } = useAdminAuth();
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

  function fillTestCredentials() {
    setEmail(mockEmail);
    setPassword(mockPassword);
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
          <h1 id="admin-login-title">Painel Administrativo</h1>
          <p>Acesse a área interna para acompanhar a operação do restaurante.</p>
        </div>

        <button
          className="test-fill-button"
          onClick={fillTestCredentials}
          type="button"
        >
          <Zap size={18} aria-hidden="true" />
          Preencher dados de teste
        </button>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>E-mail</span>
            <span className="input-shell">
              <Mail size={20} aria-hidden="true" />
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={mockEmail}
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
                placeholder={mockPassword}
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
