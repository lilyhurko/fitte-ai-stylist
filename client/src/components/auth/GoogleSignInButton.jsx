import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const GoogleSignInButton = ({ onSuccess }) => {
  const buttonRef = useRef(null);
  const [runtimeError, setRuntimeError] = useState("");
  const { loginWithGoogle } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const error = !clientId
    ? "Logowanie Google nie jest jeszcze skonfigurowane."
    : runtimeError;

  const handleGoogleResponse = useCallback(
    async (response) => {
      setRuntimeError("");

      if (!response?.credential) {
        setRuntimeError("Google nie przekazało danych logowania.");
        return;
      }

      const result = await loginWithGoogle(response.credential);

      if (result.success) {
        onSuccess();
        return;
      }

      setRuntimeError(result.error);
    },
    [loginWithGoogle, onSuccess],
  );

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let attempts = 0;

    const renderButton = () => {
      if (cancelled) return;

      if (!window.google?.accounts?.id) {
        attempts += 1;

        if (attempts < 50) {
          window.setTimeout(renderButton, 100);
          return;
        }

        setRuntimeError("Nie udało się załadować logowania Google.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (buttonRef.current) {
        buttonRef.current.replaceChildren();

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 320,
          locale: "pl",
        });
      }
    };

    renderButton();

    return () => {
      cancelled = true;
    };
  }, [clientId, handleGoogleResponse]);

  return (
    <div className="google-login-section">
      <div className="auth-separator" aria-hidden="true">
        <span>lub</span>
      </div>

      <div
        ref={buttonRef}
        className="google-sign-in-button"
        aria-label="Zaloguj się przez Google"
      />

      {error && (
        <p className="auth-error-msg google-login-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
