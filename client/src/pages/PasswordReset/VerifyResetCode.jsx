import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import "./PasswordReset.css";

const CODE_LENGTH = 6;

const VerifyResetCode = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const email = state?.email;

  useEffect(() => {
    if (secondsRemaining === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [secondsRemaining]);

  const updateDigits = (value, startIndex) => {
    const numbers = value.replace(/\D/g, "").slice(0, CODE_LENGTH - startIndex);

    if (!numbers) {
      const nextDigits = [...digits];
      nextDigits[startIndex] = "";
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    numbers.split("").forEach((digit, index) => {
      nextDigits[startIndex + index] = digit;
    });

    setDigits(nextDigits);

    const nextIndex = Math.min(startIndex + numbers.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key !== "Backspace" || digits[index] || index === 0) {
      return;
    }

    inputRefs.current[index - 1]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const code = digits.join("");

    if (code.length !== CODE_LENGTH) {
      setError("Wpisz pełny, sześciocyfrowy kod.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się potwierdzić kodu.");
        return;
      }

      navigate("/reset-password", {
        state: { email, code },
      });
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsRemaining > 0 || resending) {
      return;
    }

    setError("");
    setInfo("");
    setResending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się wysłać nowego kodu.");
        return;
      }

      setDigits(Array(CODE_LENGTH).fill(""));
      setSecondsRemaining(60);
      setInfo("Jeśli konto istnieje, wysłaliśmy nowy kod.");
      inputRefs.current[0]?.focus();
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setResending(false);
    }
  };

  const formattedSeconds = String(secondsRemaining).padStart(2, "0");

  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2 className="title-serif italic">Potwierdź kod</h2>
          <p className="auth-subtitle">
            Najpierw poproś o kod wysłany na e-mail.
          </p>
          <Link
            className="auth-submit-btn auth-link-button"
            to="/forgot-password"
          >
            Wyślij kod
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="title-serif italic">Wpisz kod</h2>
        <p className="auth-subtitle">
          Wysłaliśmy sześciocyfrowy kod na <strong>{email}</strong>.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error-msg" role="alert">
              {error}
            </div>
          )}

          {info && (
            <div className="password-reset-success" role="status">
              {info}
            </div>
          )}

          <div
            className="reset-code-group"
            role="group"
            aria-label="Kod z e-maila"
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                aria-label={`Cyfra ${index + 1} z ${CODE_LENGTH}`}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                autoFocus={index === 0}
                className="reset-code-input"
                inputMode="numeric"
                maxLength="6"
                onChange={(event) => updateDigits(event.target.value, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                type="text"
                value={digit}
              />
            ))}
          </div>

          <button className="auth-submit-btn" disabled={loading} type="submit">
            {loading ? "Sprawdzanie…" : "Potwierdź kod"}
          </button>
        </form>

        <div className="reset-code-resend" aria-live="polite">
          {secondsRemaining > 0 ? (
            <p>Wyślij ponownie za 00:{formattedSeconds}</p>
          ) : (
            <button
              className="reset-code-resend-button"
              disabled={resending}
              onClick={handleResend}
              type="button"
            >
              {resending ? "Wysyłanie…" : "Wyślij kod ponownie"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyResetCode;
