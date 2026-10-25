const { Resend } = require("resend");
const { writeLog } = require("./logger");

const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 15;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Brak konfiguracji RESEND_API_KEY.");
  }

  return new Resend(apiKey);
};

const sendEmailVerificationCodeEmail = async ({ email, code }) => {
  const from = process.env.MAIL_FROM;

  if (!from) {
    throw new Error("Brak konfiguracji MAIL_FROM.");
  }

  const result = await getResendClient().emails.send({
    from,
    to: [email],
    subject: "Potwierdź adres e-mail — Fitte",
    text: [
      "Witaj w Fitte!",
      "",
      `Twój jednorazowy kod weryfikacyjny: ${code}`,
      "",
      `Kod jest ważny przez ${EMAIL_VERIFICATION_CODE_TTL_MINUTES} minut.`,
      "Jeżeli nie zakładałaś konta Fitte, zignoruj tę wiadomość.",
    ].join("\n"),
    html: `
      <main style="font-family: Arial, sans-serif; color: #2d241f; max-width: 560px; margin: 0 auto;">
        <h1 style="margin-bottom: 8px;">Potwierdź swój e-mail w Fitte</h1>
        <p>Wpisz poniższy kod w aplikacji, aby potwierdzić adres e-mail.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 28px 0;">
          ${code}
        </p>
        <p>Kod jest ważny przez ${EMAIL_VERIFICATION_CODE_TTL_MINUTES} minut i można użyć go tylko raz.</p>
        <p>Jeżeli nie zakładałaś konta Fitte, zignoruj tę wiadomość.</p>
      </main>
    `,
  });

  if (result.error) {
    const error = new Error(
      result.error.message || "Nie udało się wysłać e-maila.",
    );
    error.name = "ResendEmailError";

    writeLog("error", "email_verification_email_failed", {
      provider: "resend",
      errorName: error.name,
    });

    throw error;
  }

  writeLog("info", "email_verification_email_sent", {
    provider: "resend",
    emailId: result.data?.id,
  });

  return result.data;
};

module.exports = {
  EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  sendEmailVerificationCodeEmail,
};
