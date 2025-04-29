import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import logo from '../../assets/logo.jpg';
import LoadingButton from '../common/LoadingButton';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(username, password);
      if (!success) {
        // El error ya está manejado en el contexto
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo" className="login-logo" />
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <LoadingButton
            type="submit"
            className="login-button"
            isLoading={isLoading}
          >
            Ingresar
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}