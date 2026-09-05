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

async function enviarConfirmacao(email, nome, codigo, token) {
  const url = token ? `${BASE_URL}/confirmar-email?token=${token}` : null;
  const conteudo = layoutHtml(`
    <p style="color:#333;line-height:1.6">Olá <strong>${nome}</strong>,</p>
    <p style="color:#333;line-height:1.6">Para ativar sua conta no Office Express, use o código abaixo na tela do site. Ele é válido por <strong>24 horas</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:20px 32px;font-size:38px;font-weight:800;letter-spacing:10px;color:#001f33">${codigo}</div>
    </div>
    <p style="color:#94a3b8;font-size:13px">Volte à página onde você criou a conta e digite o código acima.</p>
    ${url ? '<p style="color:#94a3b8;font-size:13px">Alternativa: <a href="' + url + '" style="color:#ff8800">confirme pelo link</a>.</p>' : ""}
    <p style="color:#94a3b8;font-size:13px">Se você não criou esta conta, ignore este e-mail.</p>
  `, "Confirme seu e-mail");
  const textoSimples = [
    `Olá ${nome},`,
    "",
    `Para ativar sua conta no Office Express, use o código: ${codigo}`,
    "",
    "Volte à página onde você criou a conta e digite o código.",
    "",
    "Se você não criou esta conta, ignore este e-mail.",
  ].join("\n");
  return enviarEmail({ to: email, subject: `Seu código de confirmação: ${codigo} - Office Express`, html: conteudo, text: textoSimples });
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

async function enviarConviteParceiro(email, nome, convidadoPor, url) {
  const conteudo = layoutHtml(`
    <p style="color:#333;line-height:1.6">Olá <strong>${nome}</strong>,</p>
    <p style="color:#333;line-height:1.6"><strong>${convidadoPor}</strong> convidou você para fazer parte do programa de parceiros da <strong>Office Express</strong> — e ganhar comissão em cada currículo vendido pelo seu link.</p>
    <p style="color:#333;line-height:1.6">Clique no botão abaixo para aceitar o convite, confirmar seu e-mail e criar sua senha de acesso. O link é válido por <strong>48 horas</strong>.</p>
    ${botaoHtml("Aceitar convite", url)}
    <p style="color:#94a3b8;font-size:13px">Se você não esperava este convite, ignore este e-mail.</p>
  `, "Você foi convidado(a)!");
  const textoSimples = [
    `Olá ${nome},`,
    "",
    `${convidadoPor} convidou você para o programa de parceiros da Office Express.`,
    "Aceite o convite e crie sua senha no link abaixo (válido por 48 horas):",
    "",
    url,
    "",
    "Se você não esperava este convite, ignore este e-mail.",
  ].join("\n");
  return enviarEmail({ to: email, subject: `${convidadoPor} convidou você para o programa de parceiros - Office Express`, html: conteudo, text: textoSimples });
}

async function enviarCodigoConvite(email, nome, codigo) {
  const conteudo = layoutHtml(`
    <p style="color:#333;line-height:1.6">Olá <strong>${nome}</strong>,</p>
    <p style="color:#333;line-height:1.6">Use o código abaixo na tela de aceitação do convite para confirmar seu e-mail. Ele é válido por <strong>24 horas</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:20px 32px;font-size:38px;font-weight:800;letter-spacing:10px;color:#001f33">${codigo}</div>
    </div>
    <p style="color:#94a3b8;font-size:13px">Volte à página do convite e digite o código acima.</p>
    <p style="color:#94a3b8;font-size:13px">Se você não solicitou este código, ignore este e-mail.</p>
  `, "Código de confirmação do convite");
  const textoSimples = [
    `Olá ${nome},`,
    "",
    `Use o código ${codigo} na tela do convite para confirmar seu e-mail.`,
    "",
    "Se você não solicitou este código, ignore este e-mail.",
  ].join("\n");
  return enviarEmail({ to: email, subject: `Seu código de confirmação: ${codigo} - Office Express`, html: conteudo, text: textoSimples });
}

// Código de confirmação de e-mail — EMPRESAS (painel Companies)
async function enviarCodigoEmpresa(email, nome, codigo) {
  const conteudo = layoutHtml(`
    <p style="color:#333;line-height:1.6">Olá <strong>${escaparHtml(nome || "Empresa")}</strong>,</p>
    <p style="color:#333;line-height:1.6">Sua conta empresarial no <strong>Office Express | Companies</strong> foi criada. Para ativá-la, digite o código abaixo na tela de confirmação. Ele é válido por <strong>24 horas</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:20px 36px;font-size:40px;font-weight:800;letter-spacing:12px;color:#001f33">${escaparHtml(codigo)}</div>
    </div>
    <p style="color:#94a3b8;font-size:13px">Volte à página onde você criou a conta e digite o código acima.</p>
    <p style="color:#94a3b8;font-size:13px">Se você não criou esta conta, ignore este e-mail.</p>
  `, "Confirme o e-mail da sua empresa");
  const textoSimples = [
    `Olá ${nome || "Empresa"},`,
    "",
    `Sua conta empresarial no Office Express | Companies foi criada.`,
    `Código de confirmação: ${codigo} (válido por 24 horas)`,
    "",
    "Volte à página onde você criou a conta e digite o código.",
    "",
    "Se você não criou esta conta, ignore este e-mail.",
  ].join("\n");
  return enviarEmail({ to: email, subject: `Código de confirmação da empresa: ${codigo} - Office Express`, html: conteudo, text: textoSimples });
}

// Recibo de pagamento da assinatura — EMPRESAS (extremamente profissional,
// com link direto para o painel da empresa já logada).
async function enviarReciboEmpresa(email, dados) {
  const { empresa, plano, valor, pagamentoId, tipo, data } = dados;
  const painelUrl = `${BASE_URL}/companies`;
  const nomeEmpresa = escaparHtml(empresa || "Empresa");
  const planoNome = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" }[plano] || escaparHtml(plano || "");
  const valorFmt = Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const metodo = tipo === "pix" ? "Pix" : "Cartão de crédito";
  const dataFmt = data ? new Date(data).toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleString("pt-BR");
  const reciboNum = "OE-" + String(pagamentoId || Date.now()).slice(-10);

  const linha = (rotulo, valorLinha, forte) => `
    <tr>
      <td style="padding:10px 0;color:#64748b;font-size:13px">${rotulo}</td>
      <td style="padding:10px 0;text-align:right;color:#0f172a;font-size:13px;${forte ? "font-weight:700" : ""}">${valorLinha}</td>
    </tr>`;

  const conteudo = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#001f33,#00324a);padding:28px 32px">
      <div style="color:#ff8800;font-size:22px;font-weight:bold">Office Express</div>
      <div style="color:#e0e6eb;font-size:13px;margin-top:2px">Recibo de assinatura · Companies</div>
    </div>
    <div style="padding:32px">
      <div style="display:inline-block;background:#dcfce7;color:#16a34a;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:6px 14px;border-radius:999px;margin-bottom:18px">Pagamento confirmado</div>
      <h2 style="color:#001f33;margin:0 0 8px;font-size:20px">Obrigado, ${nomeEmpresa}!</h2>
      <p style="color:#333;line-height:1.6;margin:0 0 24px">Recebemos o pagamento da sua assinatura. Seu acesso ao banco de currículos já está <strong>ativo</strong>.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:6px 20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          ${linha("Recibo nº", reciboNum, true)}
          ${linha("Empresa", nomeEmpresa)}
          ${linha("Plano", planoNome, true)}
          ${linha("Método de pagamento", metodo)}
          ${linha("Data", dataFmt)}
          ${linha("ID da transação", escaparHtml(pagamentoId || "—"))}
          <tr><td colspan="2" style="border-top:1px solid #e2e8f0"></td></tr>
          ${linha("Total pago", valorFmt, true)}
        </table>
      </div>

      <p style="color:#333;line-height:1.6;margin:0 0 6px"><strong>O que acontece agora?</strong></p>
      <ol style="color:#475569;line-height:1.8;font-size:14px;margin:0 0 24px;padding-left:20px">
        <li>Clique no botão abaixo para abrir o painel da empresa.</li>
        <li>Sua sessão já estará ativa — sem precisar logar novamente.</li>
        <li>Busque, filtre e contate os candidatos direto pelo WhatsApp.</li>
      </ol>

      ${botaoHtml("Abrir meu painel", painelUrl)}

      <p style="color:#94a3b8;font-size:13px">Guarde este e-mail como comprovante. A assinatura renova mensalmente e você pode cancelar quando quiser diretamente no painel.</p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px;text-align:center">
      Office Express · ${BASE_URL}<br>Este é um recibo automático. Dúvidas? Responda este e-mail.
    </div>
  </div>`;

  const textoSimples = [
    "PAGAMENTO CONFIRMADO - Office Express | Companies",
    "",
    `Recibo: ${reciboNum}`,
    `Empresa: ${empresa}`,
    `Plano: ${planoNome}`,
    `Método: ${metodo}`,
    `Data: ${dataFmt}`,
    `Total pago: ${valorFmt}`,
    "",
    `Seu acesso já está ativo. Abra o painel: ${painelUrl}`,
    "(sessão já ativa no navegador usado no pagamento)",
    "",
    "Guarde este e-mail como comprovante.",
  ].join("\n");
  return enviarEmail({ to: email, subject: `Recibo ${reciboNum} — Assinatura ${planoNome} confirmada · Office Express`, html: conteudo, text: textoSimples });
}

function escaparHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = { enviarConfirmacao, enviarRecuperacao, enviarConviteParceiro, enviarCodigoConvite, enviarCodigoEmpresa, enviarReciboEmpresa };
