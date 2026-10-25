import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import "./PasswordReset.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się wysłać kodu.");
        return;
      }

      navigate("/verify-reset-code", {
        state: { email: email.trim() },
      });
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="title-serif italic">Odzyskaj dostęp</h2>
        <p className="auth-subtitle">
          Wyślemy jednorazowy kod na adres przypisany do konta.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-msg" role="alert">
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="reset-email">E-mail</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              placeholder="twoj@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Wysyłanie…" : "Wyślij kod"}
          </button>
        </form>

        <p className="auth-switch">
          Pamiętasz hasło? <Link to="/login">Wróć do logowania</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
