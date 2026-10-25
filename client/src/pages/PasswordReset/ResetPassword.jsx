import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import "./PasswordReset.css";

const ResetPassword = () => {
  const { state } = useLocation();
  const email = state?.email;
  const code = state?.code;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!email || !code) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2 className="title-serif italic">Sesja wygasła</h2>
          <p className="auth-subtitle">
            Aby zmienić hasło, poproś o nowy kod i potwierdź go ponownie.
          </p>
          <Link
            className="auth-submit-btn auth-link-button"
            to="/forgot-password"
          >
            Wyślij nowy kod
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Hasła muszą być identyczne.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się zmienić hasła.");
        return;
      }

      setSuccess(data.message);

      window.setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="title-serif italic">Ustaw nowe hasło</h2>
        <p className="auth-subtitle">
          Kod został potwierdzony. Ustaw nowe, prywatne hasło.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-msg" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="password-reset-success" role="status">
              {success}
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="new-password">Nowe hasło</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              placeholder="Minimum 8 znaków"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="confirm-password">Powtórz nowe hasło</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              placeholder="Powtórz hasło"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || Boolean(success)}
          >
            {loading ? "Zapisywanie…" : "Zmień hasło"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
