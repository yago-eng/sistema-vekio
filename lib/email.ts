// Envio de e-mail via SMTP do Google Workspace (Gmail), usando uma senha de
// app da conta remetente (GMAIL_USER / GMAIL_APP_PASSWORD nas variáveis de
// ambiente). Evita depender de verificação de domínio em serviços externos.

import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

export async function enviarEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = process.env.GMAIL_USER;
  const t = getTransporter();
  if (!t || !user) {
    return { ok: false, error: "GMAIL_USER / GMAIL_APP_PASSWORD não configuradas." };
  }

  try {
    await t.sendMail({
      from: `Vekio Engenharia <${user}>`,
      to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
      subject: input.subject,
      html: input.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao enviar e-mail" };
  }
}
