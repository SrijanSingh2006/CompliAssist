import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Login.css';

const DEMO_CREDENTIALS = {
  email: 'admin@technova.com',
  password: 'demo123',
};

export function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password, rememberMe });
      navigate('/');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function useDemoAccount() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError('');
  }

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="logo justify-center mb-6">
          <div className="logo-mark large">CA</div>
          <h2 className="text-2xl">CompliAssist AI</h2>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Sign in to your workspace</h1>
          <p className="text-secondary text-sm mt-1">
            Demo backend is enabled with seeded MSME compliance data.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span className="text-secondary">Remember me</span>
            </label>
            <button type="button" className="link-button" onClick={useDemoAccount}>
              Use demo account
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Demo access</strong>
          <span>Email: admin@technova.com</span>
          <span>Password: demo123</span>
        </div>
      </div>
    </div>
  );
}
