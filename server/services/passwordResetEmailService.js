const { Resend } = require("resend");
const { writeLog } = require("./logger");

const PASSWORD_RESET_CODE_TTL_MINUTES = 15;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Brak konfiguracji RESEND_API_KEY.");
  }

  return new Resend(apiKey);
};

const sendPasswordResetCodeEmail = async ({ email, code }) => {
  const from = process.env.MAIL_FROM;

  if (!from) {
    throw new Error("Brak konfiguracji MAIL_FROM.");
  }

  const resend = getResendClient();

  const result = await resend.emails.send({
    from,
    to: [email],
    subject: "Kod resetu hasła — Fitte",
    text: [
      "Otrzymaliśmy prośbę o zmianę hasła do konta Fitte.",
      "",
      `Twój jednorazowy kod: ${code}`,
      "",
      `Kod jest ważny przez ${PASSWORD_RESET_CODE_TTL_MINUTES} minut.`,
      "Jeżeli to nie Ty prosisz o zmianę hasła, zignoruj tę wiadomość.",
    ].join("\n"),
    html: `
      <main style="font-family: Arial, sans-serif; color: #2d241f; max-width: 560px; margin: 0 auto;">
        <h1 style="margin-bottom: 8px;">Reset hasła w Fitte</h1>
        <p>Otrzymaliśmy prośbę o zmianę hasła do Twojego konta.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 28px 0;">
          ${code}
        </p>
        <p>Kod jest ważny przez ${PASSWORD_RESET_CODE_TTL_MINUTES} minut i można użyć go tylko raz.</p>
        <p>Jeżeli to nie Ty prosisz o zmianę hasła, zignoruj tę wiadomość.</p>
      </main>
    `,
  });

  if (result.error) {
    const error = new Error(
      result.error.message || "Nie udało się wysłać e-maila.",
    );
    error.name = "ResendEmailError";

    writeLog("error", "password_reset_email_failed", {
      provider: "resend",
      errorName: error.name,
    });

    throw error;
  }

  writeLog("info", "password_reset_email_sent", {
    provider: "resend",
    emailId: result.data?.id,
  });

  return result.data;
};

module.exports = {
  PASSWORD_RESET_CODE_TTL_MINUTES,
  sendPasswordResetCodeEmail,
};
