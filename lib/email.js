const axios = require("axios");

require("dotenv").config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || "nao-responda@officeexpress.com.br";
const FROM_NAME = process.env.BREVO_FROM_NAME || "Office Express";
const BASE_URL = process.env.BASE_URL || "https://www.officeexpress.com.br";

async function enviarEmail({ to, subject, html, text }) {
  if (!BREVO_API_KEY) {
    console.error("⚠️ BREVO_API_KEY não configurada. Email não enviado para", to);
    return { skippped: true };
  }
  try {
    const resp = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || "",
      },
      { headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" } }
    );
    return { ok: true, messageId: resp.data?.messageId };
  } catch (err) {
    console.error("❌ Erro ao enviar email via Brevo:", err.response?.data?.message || err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
}

function layoutHtml(conteudo, titulo) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#001f33,#00324a);padding:24px 32px">
      <div style="color:#ff8800;font-size:22px;font-weight:bold">Office Express</div>
      <div style="color:#e0e6eb;font-size:13px">Currículos profissionais</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#001f33;margin:0 0 16px;font-size:20px">${titulo}</h2>
      ${conteudo}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px;text-align:center">
      ${BASE_URL}
    </div>
  </div>`;
}

function botaoHtml(texto, url) {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="background:linear-gradient(135deg,#ff8800,#e67300);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:bold;display:inline-block">${texto}</a>
  </div>`;
}

async function enviarConfirmacao(email, nome, token) {
  const url = `${BASE_URL}/confirmar-email?token=${token}`;
  const conteudo = layoutHtml(`
    <p style="color:#333;line-height:1.6">Olá <strong>${nome}</strong>,</p>
    <p style="color:#333;line-height:1.6">Para ativar sua conta no Office Express, confirme seu e-mail clicando no botão abaixo. O link é válido por <strong>24 horas</strong>.</p>
    ${botaoHtml("Confirmar meu e-mail", url)}
    <p style="color:#94a3b8;font-size:13px">Se você não criou esta conta, ignore este e-mail.</p>
  `, "Confirme seu e-mail");
  const textoSimples = [
    `Olá ${nome},`,
    "",
    "Para ativar sua conta no Office Express, confirme seu e-mail acessando o link abaixo. O link é válido por 24 horas.",
    "",
    url,
    "",
    "Se você não criou esta conta, ignore este e-mail.",
  ].join("\n");
  return enviarEmail({ to: email, subject: "Confirme seu e-mail - Office Express", html: conteudo, text: textoSimples });
}

async function enviarRecuperacao(email, nome, token) {
  const url = `${BASE_URL}/recuperar-senha?token=${token}`;
  const conteudo = layoutHtml(`
    <p style="color:#333;line-height:1.6">Olá <strong>${nome}</strong>,</p>
    <p style="color:#333;line-height:1.6">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
    ${botaoHtml("Redefinir minha senha", url)}
    <p style="color:#94a3b8;font-size:13px">Se você não solicitou, ignore este e-mail.</p>
  `, "Redefinir senha");
  const textoSimples = [
    `Olá ${nome},`,
    "",
    "Recebemos uma solicitação para redefinir sua senha. Acesse o link abaixo para criar uma nova senha. O link é válido por 1 hora.",
    "",
    url,
    "",
    "Se você não solicitou, ignore este e-mail.",
  ].join("\n");
  return enviarEmail({ to: email, subject: "Redefinir sua senha - Office Express", html: conteudo, text: textoSimples });
}

module.exports = { enviarConfirmacao, enviarRecuperacao };
