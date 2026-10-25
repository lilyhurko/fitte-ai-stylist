import React, { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  LoaderCircle,
  MailCheck,
  Send,
  ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "../../config";

const CODE_LENGTH = 6;

const EmailVerificationCard = ({ email, verifiedAt }) => {
  const inputRefs = useRef([]);
  const [verified, setVerified] = useState(Boolean(verifiedAt));
  const [codeSent, setCodeSent] = useState(false);
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (secondsRemaining === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [secondsRemaining]);

  const sendCode = async (isResend = false) => {
    if (isResend && secondsRemaining > 0) return;

    setError("");
    setMessage("");

    if (isResend) {
      setResending(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/email-verification/request`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się wysłać kodu.");
        return;
      }

      setCodeSent(true);
      setDigits(Array(CODE_LENGTH).fill(""));
      setSecondsRemaining(60);
      setMessage(data.message);
      window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoading(false);
      setResending(false);
    }
  };

  const updateDigits = (value, startIndex) => {
    const numbers = value.replace(/\D/g, "").slice(0, CODE_LENGTH - startIndex);
    const nextDigits = [...digits];

    if (!numbers) {
      nextDigits[startIndex] = "";
      setDigits(nextDigits);
      return;
    }

    numbers.split("").forEach((digit, index) => {
      nextDigits[startIndex + index] = digit;
    });

    setDigits(nextDigits);

    const nextIndex = Math.min(startIndex + numbers.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    const code = digits.join("");

    setError("");
    setMessage("");

    if (code.length !== CODE_LENGTH) {
      setError("Wpisz pełny, sześciocyfrowy kod.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/email-verification/verify`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się potwierdzić kodu.");
        return;
      }

      setVerified(true);
      setMessage(data.message);
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <section className="profile-card md:col-span-2 bg-green-50/60 rounded-[24px] md:rounded-[40px] p-5 md:p-8 border border-green-200 w-full">
        <div className="flex items-start gap-3">
          <BadgeCheck
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-green-700"
            size={22}
          />
          <div>
            <h3 className="font-playfair text-lg md:text-xl text-green-900">
              E-mail potwierdzony
            </h3>
            <p className="mt-1 text-xs md:text-sm text-green-800">
              Adres <strong>{email}</strong> został zweryfikowany.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-card md:col-span-2 bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-8 border border-fitte-sand shadow-sm w-full">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-fitte-terracotta"
            size={22}
          />
          <div>
            <h3 className="font-playfair text-lg md:text-xl text-fitte-brown-dark">
              Potwierdź adres e-mail
            </h3>
            <p className="mt-1 text-xs md:text-sm text-fitte-brown-light">
              Potwierdzenie adresu zwiększa bezpieczeństwo konta. Kod wyślemy na{" "}
              <strong>{email}</strong>.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="text-sm text-green-700" role="status">
            {message}
          </p>
        )}

        {!codeSent ? (
          <button
            className="w-full sm:w-fit bg-fitte-brown-dark text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm touch-manipulation"
            disabled={loading}
            onClick={() => sendCode(false)}
            type="button"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            {loading ? "Wysyłanie..." : "Wyślij kod weryfikacyjny"}
          </button>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={verifyCode}>
            <div
              className="flex flex-wrap gap-2"
              aria-label="Sześciocyfrowy kod weryfikacyjny"
              role="group"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  aria-label={`Cyfra ${index + 1} z ${CODE_LENGTH}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className="h-12 w-10 rounded-xl border border-fitte-sand bg-fitte-cream text-center text-lg font-bold text-fitte-brown-dark outline-none focus:border-fitte-brown-dark focus:ring-2 focus:ring-fitte-sand"
                  inputMode="numeric"
                  maxLength="6"
                  onChange={(event) => updateDigits(event.target.value, index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  type="text"
                  value={digit}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="bg-fitte-brown-dark text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm touch-manipulation"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <MailCheck size={16} />
                )}
                {loading ? "Sprawdzanie..." : "Potwierdź kod"}
              </button>

              {secondsRemaining > 0 ? (
                <span className="text-xs text-fitte-brown-light">
                  Wyślij ponownie za 00:
                  {String(secondsRemaining).padStart(2, "0")}
                </span>
              ) : (
                <button
                  className="text-sm font-bold text-fitte-brown-dark underline"
                  disabled={resending}
                  onClick={() => sendCode(true)}
                  type="button"
                >
                  {resending ? "Wysyłanie..." : "Wyślij kod ponownie"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default EmailVerificationCard;
