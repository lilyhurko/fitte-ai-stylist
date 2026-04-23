import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css"; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const result = await login(email, password);
    if (result.success) navigate("/");
    else setError(result.error);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="title-serif italic">Witaj ponownie</h2>
        <p className="auth-subtitle">Zaloguj się, aby zarządzać swoją szafą</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error-msg">{error}</div>}
          
          <div className="auth-input-group">
            <label>Email</label>
            <input 
              type="email" 
              required 
              placeholder="twoj@email.com"
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="auth-input-group">
            <label>Hasło</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" className="auth-submit-btn">Zaloguj się</button>
        </form>

        <p className="auth-switch">
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;