// ─────────────────────────────────────────────────────────────
// Auto-reparo de dependências (serverless / Render).
// Em deploys com cache de build corrompido, o pacote `express` pode chegar
// incompleto (faltando `lib/router`, que `application.js` carrega via
// `require('./router')`), o que derruba o servidor com
// "Cannot find module './router'" na subida. Este bloco roda ANTES de
// qualquer require de módulo npm (usa apenas built-ins do Node) e reinstala
// o express se a estrutura essencial estiver faltando. A instalação é
// pequena e só acontece quando o problema é detectado.
try {
  const _fs = require("fs");
  const _path = require("path");
  const { execSync } = require("child_process");
  const _expressDir = _path.dirname(require.resolve("express/package.json"));
  const _routerIndex = _path.join(_expressDir, "lib", "router", "index.js");
  if (!_fs.existsSync(_routerIndex)) {
    console.log("⚠️ express incompleto (faltando lib/router) — reinstalando express...");
    _fs.rmSync(_expressDir, { recursive: true, force: true });
    execSync("npm install express --no-save --no-audit --no-fund", {
      stdio: "inherit",
      cwd: __dirname,
    });
    console.log("✅ express reinstalado.");
  }
} catch (_e) {
  console.error("⚠️ Aviso: não foi possível verificar/reparar o express:", _e && _e.message);
}

const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { MercadoPagoConfig, Payment } = require("mercadopago");
const { pool, garantirSchema, getPreco } = require("./lib/db");
const { MODELOS, gerarPDF } = require("./lib/modelos");
const { CARTAS, gerarCartaPDF, montarCartaHTML } = require("./lib/cartas");
const { enviarConfirmacao, enviarRecuperacao } = require("./lib/email");
const cron = require("node-cron");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Mercado Pago
const clientMP = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const paymentMP = new Payment(clientMP);

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(express.static("public"));

// Serve o renderizador de currículo (mesmo código usado no servidor) para
// que a pré-visualização use EXATAMENTE o mesmo template do PDF (Opção C).
app.get("/curriculo-render.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.sendFile(path.join(__dirname, "lib", "renderHTML.js"));
});
// Body parser com limite maior para aceitar currículos extensos
// (o default de 100kb pode gerar PayloadTooLargeError).
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Sessão
// Confia no proxy do Render/Heroku para detectar HTTPS (X-Forwarded-Proto),
// garantindo que o cookie de sessão seja tratado corretamente em produção.
app.set("trust proxy", 1);
// Torna o boot resistente a falhas de banco: se o MySQL estiver
// indisponível no momento do boot, usa um store em memória (fallback),
// para o servidor subir mesmo assim em vez de morrer ("Service Unavailable").
let sessionStore;
try {
  sessionStore = new MySQLStore({}, pool);
  // Evita que erros assíncronos do store derrubem o processo Node
  if (sessionStore.on) sessionStore.on("error", (err) => console.error("⚠️ Erro no store de sessão:", err.message));
} catch (err) {
  console.error("⚠️ Falha ao criar MySQLStore, usando store em memória:", err.message);
  sessionStore = new session.MemoryStore();
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || "officeexpress-segredo-super-seguro",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

garantirSchema();
garantirEmpresasSchema();

// Preenche tokens de download faltantes em pedidos pagos antigos (o token é
// gerado no pagamento; pedidos anteriores a essa feature não o tinham). Cada
// pedido recebe um token único. Roda de forma assíncrona após o schema estar
// garantido — não bloqueia a subida.
(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT id FROM pedidos WHERE status = 'pago' AND (download_token IS NULL OR download_token = '')"
    );
    for (const row of rows) {
      await pool.query("UPDATE pedidos SET download_token = ? WHERE id = ?", [gerarToken(), row.id]);
    }
    if (rows.length > 0) console.log(`🔑 Tokens de download retroativos: ${rows.length} pedido(s) atualizado(s).`);
  } catch (e) {
    // silencioso: ambiente sem DB (ex.: desenvolvimento offline)
  }
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function gerarToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Código numérico de 4 dígitos para confirmação de e-mail, digitado pelo
// usuário na tela (sem precisar abrir link em outro contexto/navegador).
function gerarCodigoConfirmacao() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function validarSenha(senha) {
  // Mínimo 8 caracteres, ao menos 1 letra e 1 número
  return typeof senha === "string" && senha.length >= 8 && /[a-zA-Z]/.test(senha) && /\d/.test(senha);
}

function usuarioDaSessao(req) {
  return req.session.usuarioId || null;
}

async function buscarUsuarioPorId(id) {
  const [rows] = await pool.query("SELECT id, nome, email, email_confirmado, created_at FROM usuarios WHERE id = ?", [id]);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// AUTH: cadastro, confirmação, login, logout, me
// ---------------------------------------------------------------------------
app.post("/api/auth/registrar", async (req, res) => {
  const { nome, email, senha, ref } = req.body || {};
  if (!nome || !email || !senha) return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "E-mail inválido." });
  if (!validarSenha(senha)) return res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres, com letras e números." });

  const em = String(email).toLowerCase().trim();
  const [existe] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [em]);
  if (existe.length) return res.status(409).json({ error: "Já existe uma conta com este e-mail." });

  // Associa o usuário ao parceiro indicado pelo link (ref), se válido e ativo.
  // Isso grava o vínculo na conta: assim a comissão não se perde quando o
  // usuário confirma o e-mail em outro navegador/dispositivo (fora da rota
  // do link), pois o parceiro passa a estar salvo no cadastro.
  let parceiroId = null;
  if (ref) {
    const [par] = await pool.query("SELECT id FROM parceiros WHERE codigo = ? AND ativo = 1", [String(ref).slice(0, 40)]);
    if (par.length) parceiroId = par[0].id;
  }

  const hash = await bcrypt.hash(senha, 10);
  const [result] = await pool.query(
    "INSERT INTO usuarios (nome, email, senha, parceiro_id) VALUES (?, ?, ?, ?)",
    [nome.trim(), em, hash, parceiroId]
  );
  const usuarioId = result.insertId;

  // Gera código de confirmação (4 dígitos) e envia por e-mail. O usuário
  // digita o código na tela do site, sem precisar abrir link em outro
  // contexto/navegador (mantém a sessão e o vínculo do parceiro intactos).
  const codigo = gerarCodigoConfirmacao();
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO email_tokens (usuario_id, tipo, token, expira_em) VALUES (?, 'confirmacao', ?, ?)",
    [usuarioId, codigo, expira]
  );
  await enviarConfirmacao(em, nome.trim(), codigo);

  // Já autentica a sessão (email ainda não confirmado)
  req.session.usuarioId = usuarioId;
  req.session.save((err) => {
    if (err) {
      console.error("❌ Falha ao salvar sessão de cadastro:", err.message);
      return res.status(500).json({ error: "Conta criada, mas não foi possível iniciar a sessão. Faça login." });
    }
    res.json({ success: true, message: "Conta criada! Digite o código enviado ao seu e-mail.", usuario: { id: usuarioId, nome: nome.trim(), email: em, email_confirmado: 0 } });
  });
});

app.get("/api/auth/confirmar", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token ausente." });
  const [rows] = await pool.query(
    "SELECT * FROM email_tokens WHERE token = ? AND tipo = 'confirmacao' AND usado = 0 AND expira_em > NOW()",
    [token]
  );
  if (!rows.length) return res.status(400).json({ error: "Link inválido ou expirado." });
  await pool.query("UPDATE usuarios SET email_confirmado = 1 WHERE id = ?", [rows[0].usuario_id]);
  await pool.query("UPDATE email_tokens SET usado = 1 WHERE id = ?", [rows[0].id]);
  res.json({ success: true, message: "E-mail confirmado com sucesso!" });
});

// Confirma o e-mail via código de 4 dígitos digitado na tela do site. O
// usuário continua no ambiente em que está (com a sessão e o vínculo do
// parceiro intactos), sem precisar abrir um link em outro contexto/navegador.
app.post("/api/auth/confirmar-codigo", async (req, res) => {
  const uid = usuarioDaSessao(req);
  if (!uid) return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  const { codigo } = req.body || {};
  if (!codigo || !/^\d{4}$/.test(String(codigo))) {
    return res.status(400).json({ error: "Informe o código de 4 dígitos." });
  }
  const [rows] = await pool.query(
    "SELECT * FROM email_tokens WHERE usuario_id = ? AND tipo = 'confirmacao' AND token = ? AND usado = 0 AND expira_em > NOW()",
    [uid, String(codigo).trim()]
  );
  if (!rows.length) return res.status(400).json({ error: "Código inválido ou expirado." });
  await pool.query("UPDATE usuarios SET email_confirmado = 1 WHERE id = ?", [uid]);
  await pool.query("UPDATE email_tokens SET usado = 1 WHERE id = ?", [rows[0].id]);
  res.json({ success: true, message: "E-mail confirmado com sucesso!" });
});

// Reenvia um novo código de confirmação de 4 dígitos para o usuário logado.
app.post("/api/auth/reenviar-codigo", async (req, res) => {
  const uid = usuarioDaSessao(req);
  if (!uid) return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  const [us] = await pool.query("SELECT id, nome, email, email_confirmado FROM usuarios WHERE id = ?", [uid]);
  if (!us.length) return res.status(404).json({ error: "Usuário não encontrado." });
  if (us[0].email_confirmado) return res.json({ success: true, message: "Seu e-mail já está confirmado." });
  const codigo = gerarCodigoConfirmacao();
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO email_tokens (usuario_id, tipo, token, expira_em) VALUES (?, 'confirmacao', ?, ?)",
    [uid, codigo, expira]
  );
  await enviarConfirmacao(us[0].email, us[0].nome || "usuário", codigo);
  res.json({ success: true, message: "Novo código enviado para o seu e-mail." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, senha, ref } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: "Informe e-mail e senha." });
  const em = String(email).toLowerCase().trim();
  const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [em]);
  if (!rows.length) return res.status(401).json({ error: "E-mail ou senha incorretos." });
  const match = await bcrypt.compare(senha, rows[0].senha);
  // Se a conta ainda não tem parceiro vinculado e o login veio pelo link de
  // um parceiro (ref), grava o vínculo na conta. Isso garante que, mesmo que
  // o usuário confirme o e-mail fora do navegador original (ex.: dentro do
  // Gmail) e só volte a logar depois, a comissão não se perde.
  if (match && !rows[0].parceiro_id && ref) {
    const [par] = await pool.query("SELECT id FROM parceiros WHERE codigo = ? AND ativo = 1", [String(ref).slice(0, 40)]);
    if (par.length) await pool.query("UPDATE usuarios SET parceiro_id = ? WHERE id = ?", [par[0].id, rows[0].id]);
  }
  if (!match) return res.status(401).json({ error: "E-mail ou senha incorretos." });
  req.session.usuarioId = rows[0].id;
  req.session.save((err) => {
    if (err) {
      console.error("❌ Falha ao salvar sessão de login:", err.message);
      return res.status(500).json({ error: "Não foi possível iniciar a sessão. Tente novamente." });
    }
    res.json({ success: true, usuario: { id: rows[0].id, nome: rows[0].nome, email: rows[0].email, email_confirmado: rows[0].email_confirmado } });
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/auth/me", async (req, res) => {
  const id = usuarioDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  try {
    const u = await buscarUsuarioPorId(id);
    if (!u) return res.status(401).json({ error: "Não autenticado." });
    res.json({ usuario: u });
  } catch (err) {
    console.error("❌ Erro ao buscar usuário em /api/auth/me:", err.message);
    res.status(500).json({ error: "Erro ao carregar a conta." });
  }
});

// ---------------------------------------------------------------------------
// AUTH: recuperação de senha
// ---------------------------------------------------------------------------
app.post("/api/auth/esqueci-senha", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Informe seu e-mail." });
  const em = String(email).toLowerCase().trim();
  const [rows] = await pool.query("SELECT id, nome FROM usuarios WHERE email = ?", [em]);
  // Não revela se o e-mail existe (segurança)
  if (rows.length) {
    const token = gerarToken();
    const expira = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO email_tokens (usuario_id, tipo, token, expira_em) VALUES (?, 'recuperacao', ?, ?)",
      [rows[0].id, token, expira]
    );
    await enviarRecuperacao(em, rows[0].nome, token);
  }
  res.json({ success: true, message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." });
});

app.post("/api/auth/redefinir-senha", async (req, res) => {
  const { token, senha } = req.body || {};
  if (!token || !senha) return res.status(400).json({ error: "Informe o token e a nova senha." });
  if (!validarSenha(senha)) return res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres, com letras e números." });
  const [rows] = await pool.query(
    "SELECT * FROM email_tokens WHERE token = ? AND tipo = 'recuperacao' AND usado = 0 AND expira_em > NOW()",
    [token]
  );
  if (!rows.length) return res.status(400).json({ error: "Link inválido ou expirado." });
  const hash = await bcrypt.hash(senha, 10);
  await pool.query("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, rows[0].usuario_id]);
  await pool.query("UPDATE email_tokens SET usado = 1 WHERE id = ?", [rows[0].id]);
  res.json({ success: true, message: "Senha redefinida com sucesso!" });
});

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------
app.get("/api/modelos", async (req, res) => {
  const preco = await getPreco();
  res.json({ modelos: MODELOS, preco });
});

app.get("/api/cartas", async (req, res) => {
  const preco = await getPreco();
  res.json({ cartas: CARTAS, preco });
});

// Renderiza o HTML da prévia da carta aplicando o layout visual do modelo
// escolhido, de forma consistente com o PDF gerado pelo servidor.
app.post("/api/cartas/previa", (req, res) => {
  const { modelo, dados } = req.body || {};
  const valido = modelo && CARTAS.find((m) => m.id === modelo);
  if (!valido) return res.status(400).json({ error: "Modelo inválido." });
  try {
    const html = montarCartaHTML(modelo, dados || {});
    res.json({ ok: true, html });
  } catch (e) {
    console.error("Erro ao renderizar prévia da carta:", e);
    res.status(500).json({ error: "Erro ao gerar a prévia." });
  }
});

// Configuração pública de pagamento (public key do MP + preço)
app.get("/api/config/pagamento", async (req, res) => {
  const preco = await getPreco();
  res.json({ publicKey: process.env.MP_PUBLIC_KEY || "", preco });
});

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
app.post("/api/pedidos", async (req, res) => {
  const { modelo, dados, tipo = "curriculo", ref } = req.body || {};
  const catalogo = tipo === "carta" ? CARTAS : MODELOS;
  if (!modelo || !catalogo.find((m) => m.id === modelo)) return res.status(400).json({ error: "Modelo inválido." });
  if (!dados || !dados.nome) return res.status(400).json({ error: "Dados do currículo incompletos." });
  const valor = await getPreco();
  // Garante que a foto (base64) nunca seja persistida no banco — além de
  // não ser mais usada no currículo, ela inchava a tabela pedidos.
  const dadosLimpos = { ...(dados || {}) };
  if (typeof dadosLimpos === "object" && "foto" in dadosLimpos) delete dadosLimpos.foto;
  // Associa o pedido ao parceiro indicado pelo link (ref), se válido e ativo.
  let parceiroId = null;
  if (ref) {
    const [par] = await pool.query("SELECT id FROM parceiros WHERE codigo = ? AND ativo = 1", [String(ref).slice(0, 40)]);
    if (par.length) parceiroId = par[0].id;
  }
  // Fallback: se o usuário está logado e tem um parceiro vinculado na conta
  // (ex.: veio pelo link, se cadastrou e confirmou o e-mail em outro lugar),
  // usa esse vínculo mesmo que o ref não esteja na URL deste pedido. Assim a
  // comissão não se perde quando o fluxo sai da rota do parceiro.
  if (!parceiroId) {
    const uid = usuarioDaSessao(req);
    if (uid) {
      const [u] = await pool.query("SELECT parceiro_id FROM usuarios WHERE id = ? AND parceiro_id IS NOT NULL", [uid]);
      if (u.length && u[0].parceiro_id) parceiroId = u[0].parceiro_id;
    }
  }
  const [result] = await pool.query(
    "INSERT INTO pedidos (usuario_id, modelo, dados_json, valor, parceiro_id) VALUES (?, ?, ?, ?, ?)",
    [usuarioDaSessao(req), modelo, JSON.stringify({ ...dadosLimpos, _tipo: tipo }), valor, parceiroId]
  );
  res.json({ pedido: { id: result.insertId, modelo, tipo, valor, parceiro_id: parceiroId } });
});

app.get("/api/pedidos/meus", async (req, res) => {
  const id = usuarioDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const [rows] = await pool.query(
    "SELECT id, modelo, valor, status, created_at, pago_at, download_token, dados_json FROM pedidos WHERE usuario_id = ? ORDER BY id DESC",
    [id]
  );
  // Extrai o consentimento (LGPD) para exibição do selo de compartilhamento.
  const pedidos = rows.map((p) => {
    let consentimento = false;
    try { consentimento = !!(JSON.parse(p.dados_json || "{}").consentimento); } catch (e) {}
    const { dados_json, ...resto } = p;
    return { ...resto, consentimento };
  });
  res.json({ pedidos });
});

// ---------------------------------------------------------------------------
// Pagamento (Mercado Pago: Pix e Cartão)
// ---------------------------------------------------------------------------
async function registrarPedidoPago(pedidoId, pagamentoId, tipo) {
  await pool.query(
    "UPDATE pedidos SET status = 'pago', pagamento_id = ?, pagamento_tipo = ?, pago_at = NOW(), download_token = ? WHERE id = ?",
    [pagamentoId, tipo, gerarToken(), pedidoId]
  );
  // Grava a transação financeira imutável — fonte de verdade de receitas e
  // comissões, independente da tabela `pedidos`. O INSERT IGNORE + índice
  // único em pedido_id garante que não duplica mesmo se o webhook e o
  // confirmar-pago chegarem para o mesmo pedido.
  // Arquiva o talento no banco permanente (Companies), se houver consentimento.
  // O arquivamento é interno — não afeta a resposta do pagamento.
  try { await arquivarTalento(pedidoId); } catch (e) {}

  try {
    const [p] = await pool.query("SELECT id, usuario_id, valor, parceiro_id, modelo FROM pedidos WHERE id = ?", [pedidoId]);
    if (p.length) {
      await pool.query(
        "INSERT IGNORE INTO transacoes (pedido_id, usuario_id, parceiro_id, modelo, valor, comissao_pct, tipo, pagamento_tipo) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT comissao FROM parceiros WHERE id = ?), NULL), 'venda', ?)",
        [pedidoId, p[0].usuario_id, p[0].parceiro_id, p[0].modelo, p[0].valor, p[0].parceiro_id, tipo || "pix"]
      );
    }
  } catch (e) {
    console.error("Erro ao registrar transação financeira:", e.message);
  }
}

app.post("/api/pagamento/pix", async (req, res) => {
  const { pedidoId } = req.body || {};
  if (!pedidoId) return res.status(400).json({ error: "Pedido inválido." });
  const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [pedidoId]);
  if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
  const pedido = rows[0];
  try {
    const body = {
      transaction_amount: Number(pedido.valor),
      description: "Currículo profissional - Office Express",
      payment_method_id: "pix",
      external_reference: `pedido-${pedidoId}`,
      payer: { email: req.body.email || "cliente@officeexpress.com.br", first_name: (req.body.nome || "Cliente").split(" ")[0], last_name: (req.body.nome || "Cliente").split(" ").slice(1).join(" ") || "Office" },
      notification_url: `${BASE_URL}/api/webhook/mp`,
    };
    const pago = await paymentMP.create({ body, requestOptions: { idempotencyKey: `pix-${pedidoId}-${Date.now()}` } });
    res.json({
      id: pago.id,
      status: pago.status,
      qr_code: pago.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: pago.point_of_interaction?.transaction_data?.qr_code_base64,
    });
  } catch (err) {
    console.error("❌ Erro ao criar PIX:", err.message);
    res.status(500).json({ error: "Erro ao criar pagamento PIX.", detalhe: err.cause?.message || err.message });
  }
});

app.post("/api/pagamento/cartao", async (req, res) => {
  const { pedidoId, card_token, email } = req.body || {};
  if (!pedidoId || !card_token) return res.status(400).json({ error: "Dados de pagamento incompletos." });
  const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [pedidoId]);
  if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
  const pedido = rows[0];
  try {
    const body = {
      transaction_amount: Number(pedido.valor),
      description: "Currículo profissional - Office Express",
      payment_method_id: "card",
      token: card_token,
      installments: Number(req.body.installments || 1),
      payer: { email: email || "cliente@officeexpress.com.br" },
      external_reference: `pedido-${pedidoId}`,
      notification_url: `${BASE_URL}/api/webhook/mp`,
    };
    const pago = await paymentMP.create({ body, requestOptions: { idempotencyKey: `card-${pedidoId}-${Date.now()}` } });
    res.json({ id: pago.id, status: pago.status, status_detail: pago.status_detail });
  } catch (err) {
    console.error("❌ Erro ao criar pagamento cartão:", err.message);
    res.status(500).json({ error: "Erro ao processar o pagamento com cartão.", detalhe: err.cause?.message || err.message });
  }
});

app.get("/api/pagamento/status/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pago = await paymentMP.get({ id });
    res.json({ status: pago.status, status_detail: pago.status_detail, external_reference: pago.external_reference });
  } catch (err) {
    res.status(500).json({ error: "Erro ao consultar pagamento." });
  }
});

// Webhook do Mercado Pago
app.post("/api/webhook/mp", async (req, res) => {
  res.status(200).send("OK");
  const { type, data } = req.body || {};
  if (type !== "payment" || !data?.id) return;
  try {
    const pago = await paymentMP.get({ id: data.id });
    if (pago.status === "approved") {
      const ref = pago.external_reference || "";
      const pedidoId = parseInt(ref.replace("pedido-", ""), 10);
      if (!isNaN(pedidoId) && pedidoId > 0) {
        await registrarPedidoPago(pedidoId, String(data.id), pago.payment_method_id || "pix");
        console.log("✅ Pedido", pedidoId, "pago via webhook.");
      }
    }
  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
  }
});

// Confirmar pedido pago (chamado pelo front após polling de status)
app.post("/api/pedidos/:id/confirmar-pago", async (req, res) => {
  const { id } = req.params;
  const { pagamentoId, tipo } = req.body || {};
  const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
  if (rows[0].status === "pago") return res.json({ success: true });
  await registrarPedidoPago(id, pagamentoId || null, tipo || "pix");
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Download (só após pagamento; gera o PDF na hora)
// ---------------------------------------------------------------------------
app.get("/api/pedidos/:id/download", async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
  const pedido = rows[0];

  // O download fica disponível enquanto a conta do cliente estiver ativa:
  // exige sessão autenticada e que o pedido pertença ao usuário logado.
  // Alternativa: token único de download (gerado no pagamento). Ele existe
  // para navegadores embutidos (Instagram/Facebook), que não compartilham
  // cookies com o navegador externo — quando o app força a abertura do link
  // fora do in-app browser, a sessão se perde, mas o token segue válido.
  const usuarioId = usuarioDaSessao(req);
  const token = String(req.query.token || "");
  if (!usuarioId && !token) return res.status(401).json({ error: "Faça login para baixar." });
  if (!usuarioId) {
    if (pedido.status !== "pago" || !pedido.download_token || token !== pedido.download_token) {
      return res.status(403).json({ error: "Link de download inválido ou expirado. Faça login para baixar." });
    }
  } else {
    if (pedido.usuario_id !== usuarioId) return res.status(403).json({ error: "Pedido não pertence a esta conta." });
    if (pedido.status !== "pago") return res.status(403).json({ error: "Pagamento não confirmado." });
  }

  let dados;
  try { dados = JSON.parse(pedido.dados_json); } catch (e) { return res.status(500).json({ error: "Dados inválidos." }); }

  const arquivoNome = (dados.nome || "curriculo").replace(/[^a-zA-Z0-9]/g, "_");

  try {
    const tipoPedido = dados._tipo || "curriculo";
    const buffer = tipoPedido === "carta" ? await gerarCartaPDF(pedido.modelo, dados) : await gerarPDF(pedido.modelo, dados);
    res.setHeader("Content-Type", "application/pdf");
    // No iOS/Safari, "attachment" abre pelo Quick Look, que renderiza o PDF de
    // forma errada. Para iOS usamos "inline", fazendo o Safari abrir no
    // visualizador nativo e exibir o modelo corretamente (como no Android).
    // Navegadores embutidos (Instagram/Facebook) também recebem "inline":
    // com "attachment" o app força a abertura fora do in-app browser, onde a
    // sessão não existe — com "inline" o PDF abre dentro do próprio app.
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const ehIOS = /iphone|ipad|ipod/.test(ua) || (ua.indexOf("macintosh") !== -1 && ua.indexOf("mobile") !== -1);
    const ehInApp = /instagram|fbav|fbsv|fb_iab|line\//.test(ua);
    const disposicao = ehIOS || ehInApp ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposicao}; filename="${arquivoNome}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error("❌ Erro ao gerar arquivo:", err.message);
    res.status(500).json({ error: "Erro ao gerar o arquivo." });
  }
});

// Retorna modelo + dados do pedido para o cliente montar a prévia / gerar o
// PDF (html2canvas). Requer sessão e que o pedido pertença ao usuário logado;
// o acesso é liberado para qualquer status para que a prévia correta do
// currículo seja exibida na página de pagamento mesmo antes do pagamento.
app.get("/api/pedidos/:id/dados", async (req, res) => {
  const { id } = req.params;
  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) return res.status(401).json({ error: "Faça login para ver este pedido." });
  const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
  const pedido = rows[0];
  if (pedido.usuario_id !== usuarioId) return res.status(403).json({ error: "Pedido não pertence a esta conta." });
  let dados;
  try { dados = JSON.parse(pedido.dados_json || "{}"); } catch (e) { dados = {}; }
  res.json({ modelo: pedido.modelo, tipo: dados._tipo || "curriculo", valor: pedido.valor, dados });
});

// ---------------------------------------------------------------------------
// Painel admin
// ---------------------------------------------------------------------------
function protegerAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: "Não autorizado." });
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.LOGIN_USER && password === process.env.LOGIN_PASS) {
    req.session.adminId = 1;
    req.session.save(() => res.json({ success: true }));
  } else {
    res.status(401).json({ error: "Credenciais inválidas." });
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/admin/estatisticas", protegerAdmin, async (req, res) => {
  const [pedidos] = await pool.query("SELECT COUNT(*) c FROM pedidos");
  // Valores financeiros vêm da tabela imutável `transacoes`, independente de
  // `pedidos`. Assim, limpar `pedidos` não apaga receitas/pagamentos.
  const [fin] = await pool.query("SELECT COUNT(*) AS pagos, COALESCE(SUM(valor),0) AS faturamento FROM transacoes WHERE tipo='venda'");
  const [usuarios] = await pool.query("SELECT COUNT(*) c FROM usuarios");
  const [porModelo] = await pool.query("SELECT modelo, COUNT(*) c FROM pedidos WHERE status='pago' GROUP BY modelo ORDER BY c DESC");
  const preco = await getPreco();
  res.json({
    totalPedidos: pedidos[0].c,
    pagos: fin[0].pagos || 0,
    faturamento: fin[0].faturamento,
    totalUsuarios: usuarios[0].c,
    porModelo,
    preco,
  });
});

app.get("/api/admin/pedidos", protegerAdmin, async (req, res) => {
  try {
    const { status, q, modelo, page = 1, limit = 50 } = req.query;
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const tamanho = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const params = [];
    let where = " WHERE 1=1";
    if (status) { where += " AND p.status = ?"; params.push(status); }
    if (modelo) { where += " AND p.modelo = ?"; params.push(modelo); }
    if (q) {
      where += " AND (u.nome LIKE ? OR u.email LIKE ? OR p.modelo LIKE ? OR CAST(p.id AS CHAR) = ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, q);
    }
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT p.*, u.nome AS usuario_nome, u.email AS usuario_email FROM pedidos p
       LEFT JOIN usuarios u ON u.id = p.usuario_id ${where}
       ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, tamanho, (pagina - 1) * tamanho]
    );
    res.json({ pedidos: rows, total: total || 0, pagina, limit: tamanho, paginas: Math.ceil((total || 0) / tamanho) });
  } catch (e) {
    console.error("Erro ao listar pedidos:", e.message);
    res.status(500).json({ error: "Erro ao listar pedidos." });
  }
});

app.get("/api/admin/usuarios", protegerAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT id, nome, email, email_confirmado, created_at FROM usuarios ORDER BY id DESC LIMIT 200");
  res.json({ usuarios: rows });
});

app.delete("/api/admin/pedidos", protegerAdmin, async (req, res) => {
  await pool.query("DELETE FROM pedidos");
  res.json({ success: true });
});

app.delete("/api/admin/usuarios/:id", protegerAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Usuário inválido." });
  await pool.query("DELETE FROM pedidos WHERE usuario_id = ?", [id]);
  await pool.query("DELETE FROM email_tokens WHERE usuario_id = ?", [id]);
  const [result] = await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
  if (!result.affectedRows) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ success: true });
});

app.put("/api/admin/preco", protegerAdmin, async (req, res) => {
  const { preco } = req.body || {};
  const v = parseFloat(preco);
  if (isNaN(v) || v <= 0) return res.status(400).json({ error: "Preço inválido." });
  const { setPreco } = require("./lib/db");
  await setPreco(v);
  res.json({ success: true, preco: v });
});

// ---------------------------------------------------------------------------
// Métricas de tráfego em tempo real (visitas, rejeição, origem, funil)
// ---------------------------------------------------------------------------

// Normaliza o dispositivo a partir do User-Agent (valores curtos para o banco).
function detectarDispositivo(ua) {
  if (!ua) return "desconhecido";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

// Detecta acessos feitos por bots de pré-visualização de links e crawlers de
// redes sociais/buscadores. Esses bots abrem a página para gerar o preview
// (título/imagem) ou indexar o conteúdo e, quando executam JavaScript,
// disparam o tracking como se fosse uma visita humana — inflando os acessos
// (ex.: apenas enviar um link no Instagram gera 1-2 "acessos" de preview).
function ehBotNaoHumano(ua) {
  if (!ua) return false;
  // Crawlers/bots conhecidos de redes sociais e buscadores, além de headless.
  if (/(facebookexternalhit|facebot|twitterbot|pinterestbot|linkedinbot|telegrambot|discordbot|slackbot|vkshare|embedly|outbrain|pocket|bitlybot|quora|headless|phantomjs|python-requests|curl|wget|axios|httpclient|googlebot|bingbot|duckduckbot|baiduspider|yandexbot|semrushbot|ahrefsbot|mj12bot|crawler|spider|preview)/i.test(ua)) return true;
  // WhatsApp: só o crawler de preview é bot. O navegador interno do app tem
  // "Mobile/Safari/Chrome" no UA e deve ser contado como visita real.
  if (/whatsapp/i.test(ua) && !/(mobile|safari|chrome)/i.test(ua)) return true;
  // Instagram: só o crawler de preview é bot. O navegador interno do app tem
  // "Mobile/Safari/Chrome/iOS/Android" e deve ser contado como visita real.
  if (/instagram/i.test(ua) && !/(mobile|safari|chrome|ios|android)/i.test(ua)) return true;
  return false;
}

// Extrai o domínio de origem a partir do referer e classifica em grupos.
function classificarOrigem(referer) {
  if (!referer) return "direto";
  try {
    const u = new URL(referer);
    const host = u.hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("wa.me") || host.includes("whatsapp")) return "whatsapp";
    if (host.includes("officeexpress")) return "interno";
    return "outro";
  } catch (e) {
    return "outro";
  }
}

// Gera um id de sessão de navegação (sem depender de cookie, para não
// esbarrar em bloqueadores). O frontend envia o mesmo id em cada evento.
function gerarSessaoId() {
  return crypto.randomBytes(16).toString("hex");
}

// ---------------------------------------------------------------------------
// "Online agora" em tempo real: sessões ativas mantidas em memória.
// O frontend envia um heartbeat (sinal de vida) a cada poucos segundos e um
// evento "sair" ao fechar a página. Assim a entrada aparece na hora e a saída
// zera imediatamente (ou em até HEARTBEAT_TTL quando o navegador é fechado
// sem avisar, como um crash).
// ---------------------------------------------------------------------------
const HEARTBEAT_TTL_MS = 40 * 1000;   // janela para considerar uma sessão online
const sessoesOnline = new Map();      // sessao -> lastBeat (timestamp em ms)

// Remove sessões que pararam de mandar heartbeat (navegador fechado/crash).
function limparSessoesExpiradas() {
  const agora = Date.now();
  for (const [sessao, lastBeat] of sessoesOnline) {
    if (agora - lastBeat > HEARTBEAT_TTL_MS) sessoesOnline.delete(sessao);
  }
  return sessoesOnline.size;
}

// Endpoint de tracking: recebe pageviews, heartbeats e eventos de interação.
// Usado com navigator.sendBeacon no frontend, por isso aceita tanto JSON
// quanto texto.
app.post("/api/track", async (req, res) => {
  try {
    const body = req.body || {};
    const tipo = body.tipo || "pageview";
    const sessao = String(body.sessao || "").slice(0, 64);
    const pagina = String(body.pagina || "").slice(0, 190);
    const path = String(body.path || req.headers.referer || "/").slice(0, 190);
    const valor = String(body.valor || "").slice(0, 255);
    const ua = String(req.headers["user-agent"] || "").slice(0, 255);
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim().slice(0, 45);
    const referer = String(body.referer || "").slice(0, 255);
    const origem = classificarOrigem(referer);
    const dispositivo = detectarDispositivo(ua);
    const uf = String(body.uf || "").slice(0, 2);
    const parceiro = String(body.parceiro || "").slice(0, 40); // código do parceiro (ref)

    if (!sessao) return res.status(400).json({ error: "Sessão ausente." });

    // Heartbeat: mantém a sessão como "online agora" (sem gravar no banco).
    if (tipo === "heartbeat") {
      sessoesOnline.set(sessao, Date.now());
      return res.json({ ok: true, online: sessoesOnline.size });
    }

    // Saída explícita: remove a sessão na hora (fechou a aba / navegou fora).
    if (tipo === "sair") {
      sessoesOnline.delete(sessao);
      return res.json({ ok: true, online: sessoesOnline.size });
    }

    // Qualquer outro tipo (pageview, eventos de conversão) também marca a
    // sessão como ativa, indicando entrada imediata do visitante.
    sessoesOnline.set(sessao, Date.now());

    // Descarta acessos de bots de pré-visualização/crawlers (não são visitas
    // humanas e não devem contar como acesso do parceiro).
    if (ehBotNaoHumano(ua)) {
      return res.json({ ok: true, online: sessoesOnline.size, ignorado: "bot" });
    }

    if (tipo === "pageview") {
      await pool.query(
        `INSERT INTO visitas
          (sessao, path, pagina, referer, origem, user_agent, dispositivo, ip, uf, primeira_visita, parceiro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessao, path, pagina, referer, origem, ua, dispositivo, ip, uf, body.primeiraVisita ? 1 : 0, parceiro]
      );
    } else {
      await pool.query(
        `INSERT INTO eventos (sessao, tipo, valor, pagina, parceiro) VALUES (?, ?, ?, ?, ?)`,
        [sessao, String(tipo).slice(0, 60), valor, pagina || path, parceiro]
      );
    }
    res.json({ ok: true, online: sessoesOnline.size });
  } catch (e) {
    console.error("Erro no tracking:", e);
    // Nunca deixa o tracking quebrar a navegação do usuário.
    res.status(500).json({ error: "Erro interno." });
  }
});

// Dados de tráfego para o painel: online agora, últimas 24h, rejeição,
// origem, páginas e funil de conversão. Tudo agrupado no banco.
app.get("/api/admin/metricas", protegerAdmin, async (req, res) => {
  try {
    const agora = Date.now();

    // Visitantes online agora (tempo real, em memória): sessões com heartbeat
    // recente. Sessões que pararam de enviar (navegador fechado/crash) são
    // removidas aqui, fazendo a contagem refletir a saída logo.
    const onlineAgora = limparSessoesExpiradas();

    // Últimas 24h e últimos 7 dias. Cada usuário/sessão conta como UMA visita,
    // independentemente de quantas páginas visitou (não infla por pageview).
    const [d24] = await pool.query(
      "SELECT COUNT(DISTINCT sessao) AS c FROM visitas WHERE created_at >= (NOW() - INTERVAL 24 HOUR)"
    );
    const [d7] = await pool.query(
      "SELECT COUNT(DISTINCT sessao) AS c FROM visitas WHERE created_at >= (NOW() - INTERVAL 7 DAY)"
    );

    // Páginas mais visitadas nas últimas 24h (número de visualizações de página,
    // métrica de engajamento por pageview, não infla a contagem de visitas).
    const [paginas] = await pool.query(
      `SELECT COALESCE(NULLIF(pagina,''), path) AS pagina, COUNT(*) AS c
       FROM visitas
       WHERE created_at >= (NOW() - INTERVAL 24 HOUR)
       GROUP BY pagina ORDER BY c DESC LIMIT 8`
    );

    // Origens de tráfego nas últimas 24h (1 por usuário, por origem).
    const [origens] = await pool.query(
      `SELECT origem, COUNT(DISTINCT sessao) AS c FROM visitas
       WHERE created_at >= (NOW() - INTERVAL 24 HOUR)
       GROUP BY origem ORDER BY c DESC`
    );

    // Funil: visitas (entradas) vs. eventos de conversão nas últimas 24h.
    const [funil] = await pool.query(
      `SELECT tipo, COUNT(*) AS c FROM eventos
       WHERE created_at >= (NOW() - INTERVAL 24 HOUR)
       GROUP BY tipo ORDER BY c DESC`
    );
    const funilMap = {};
    (funil || []).forEach((f) => { funilMap[f.tipo] = f.c; });

    // Rejeição: % de visitas de uma sessão que não gerou nenhum evento de
    // interação (rebaixadas ou sem clique). Estimada por sessão nas 24h.
    const [rejeicao] = await pool.query(
      `SELECT
        (SELECT COUNT(DISTINCT sessao) FROM visitas WHERE created_at >= (NOW() - INTERVAL 24 HOUR)) AS total_sessoes,
        (SELECT COUNT(DISTINCT sessao) FROM eventos WHERE created_at >= (NOW() - INTERVAL 24 HOUR)) AS sessoes_com_evento`
    );
    const totalSessoes = Number(rejeicao[0].total_sessoes) || 0;
    const sessoesComEvento = Number(rejeicao[0].sessoes_com_evento) || 0;
    const taxaRejeicao = totalSessoes > 0
      ? Math.round(((totalSessoes - sessoesComEvento) / totalSessoes) * 100)
      : 0;

    res.json({
      onlineAgora: onlineAgora,
      ultimas24h: { visitas: d24[0].c || 0 },
      ultimos7dias: { visitas: d7[0].c || 0 },
      taxaRejeicao,
      paginas,
      origens,
      funil: funilMap,
      geradoEm: new Date(agora).toISOString(),
    });
  } catch (e) {
    console.error("Erro ao carregar métricas:", e);
    res.status(500).json({ error: "Erro ao carregar métricas." });
  }
});

// Séries temporais (por hora) das últimas 24h para o gráfico do painel.
app.get("/api/admin/metricas/tendencia", protegerAdmin, async (req, res) => {
  try {
    const [linhas] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:00') AS hora, COUNT(DISTINCT sessao) AS c
       FROM visitas
       WHERE created_at >= (NOW() - INTERVAL 24 HOUR)
       GROUP BY hora ORDER BY hora ASC`
    );
    res.json({ pontos: linhas });
  } catch (e) {
    console.error("Erro ao carregar tendência:", e);
    res.status(500).json({ error: "Erro ao carregar tendência." });
  }
});

// ---------------------------------------------------------------------------
// Painel admin — controle total
// ---------------------------------------------------------------------------

// Registra uma ação do admin na auditoria (admin_log).
async function registrarAdminLog(acao, detalhe) {
  try {
    await pool.query("INSERT INTO admin_log (acao, detalhe) VALUES (?, ?)", [String(acao).slice(0, 60), String(detalhe || "").slice(0, 255)]);
  } catch (e) {
    console.error("Erro ao registrar log do admin:", e.message);
  }
}

// Detalhes completos de um pedido (inclui dados_json do currículo).
app.get("/api/admin/pedidos/:id", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Pedido inválido." });
    const [rows] = await pool.query(
      "SELECT p.*, u.nome AS usuario_nome, u.email AS usuario_email FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
    const pedido = rows[0];
    try { pedido.dados = JSON.parse(pedido.dados_json || "{}"); } catch (e) { pedido.dados = {}; }
    delete pedido.dados_json;
    res.json({ pedido });
  } catch (e) {
    console.error("Erro ao carregar pedido:", e.message);
    res.status(500).json({ error: "Erro ao carregar pedido." });
  }
});

// Altera o status de um pedido (pago / pendente / cancelado) manualmente.
app.put("/api/admin/pedidos/:id/status", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ error: "Pedido inválido." });
    if (!["pago", "pendente", "cancelado"].includes(status)) return res.status(400).json({ error: "Status inválido." });
    const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
    const pedido = rows[0];
    if (status === "pago" && pedido.status !== "pago") {
      await pool.query(
        "UPDATE pedidos SET status = 'pago', pago_at = NOW(), download_token = COALESCE(download_token, ?) WHERE id = ?",
        [gerarToken(), id]
      );
      // Registra a transação financeira (fonte de verdade dos valores),
      // também quando o admin marca um pedido como pago manualmente.
      try {
        await pool.query(
          "INSERT IGNORE INTO transacoes (pedido_id, usuario_id, parceiro_id, modelo, valor, comissao_pct, tipo, pagamento_tipo) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT comissao FROM parceiros WHERE id = ?), NULL), 'venda', ?)",
          [id, pedido.usuario_id, pedido.parceiro_id, pedido.modelo, pedido.valor, pedido.parceiro_id, pedido.pagamento_tipo || "pix"]
        );
      } catch (e) {
        console.error("Erro ao registrar transação financeira (admin):", e.message);
      }
      // Arquiva o talento no banco permanente (Companies).
      try { await arquivarTalento(id); } catch (e) {}
    } else {
      await pool.query("UPDATE pedidos SET status = ? WHERE id = ?", [status, id]);
    }
    await registrarAdminLog("pedido_status", `Pedido ${id} -> ${status}`);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao alterar status:", e.message);
    res.status(500).json({ error: "Erro ao alterar status." });
  }
});

// Edita o valor de um pedido.
app.put("/api/admin/pedidos/:id/valor", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const v = parseFloat((req.body || {}).valor);
    if (!id) return res.status(400).json({ error: "Pedido inválido." });
    if (isNaN(v) || v < 0) return res.status(400).json({ error: "Valor inválido." });
    await pool.query("UPDATE pedidos SET valor = ? WHERE id = ?", [v, id]);
    await registrarAdminLog("pedido_valor", `Pedido ${id} -> ${v}`);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao editar valor:", e.message);
    res.status(500).json({ error: "Erro ao editar valor." });
  }
});

// Baixa o PDF/currículo de um pedido (permite admin ver o entregável,
// mesmo que o pedido ainda não esteja pago — controle total).
app.get("/api/admin/pedidos/:id/download", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
    const pedido = rows[0];
    let dados;
    try { dados = JSON.parse(pedido.dados_json || "{}"); } catch (e) { return res.status(500).json({ error: "Dados inválidos." }); }
    const arquivoNome = (dados.nome || "curriculo").replace(/[^a-zA-Z0-9]/g, "_");
    const tipoPedido = dados._tipo || "curriculo";
    const buffer = tipoPedido === "carta" ? await gerarCartaPDF(pedido.modelo, dados) : await gerarPDF(pedido.modelo, dados);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${arquivoNome}.pdf"`);
    res.send(buffer);
  } catch (e) {
    console.error("Erro ao gerar arquivo (admin):", e.message);
    res.status(500).json({ error: "Erro ao gerar o arquivo." });
  }
});

// Faturamento por período (hoje, 7 dias, 30 dias, total) e por canal (pix/card).
app.get("/api/admin/faturamento", protegerAdmin, async (req, res) => {
  try {
    const periodos = {};
    for (const [chave, intervalo] of [
      ["hoje", "INTERVAL 1 DAY"],
      ["7dias", "INTERVAL 7 DAY"],
      ["30dias", "INTERVAL 30 DAY"],
    ]) {
      const [r] = await pool.query(
        `SELECT COUNT(*) AS pagos, COALESCE(SUM(valor),0) AS total
         FROM transacoes WHERE tipo='venda' AND created_at >= (NOW() - ${intervalo})`
      );
      periodos[chave] = { pagos: r[0].pagos || 0, total: Number(r[0].total) || 0 };
    }
    const [total] = await pool.query("SELECT COUNT(*) AS pagos, COALESCE(SUM(valor),0) AS total FROM transacoes WHERE tipo='venda'");
    periodos.total = { pagos: total[0].pagos || 0, total: Number(total[0].total) || 0 };
    const [porCanal] = await pool.query(
      "SELECT pagamento_tipo, COUNT(*) AS c, COALESCE(SUM(valor),0) AS total FROM transacoes WHERE tipo='venda' GROUP BY pagamento_tipo"
    );
    res.json({ periodos, porCanal });
  } catch (e) {
    console.error("Erro ao carregar faturamento:", e.message);
    res.status(500).json({ error: "Erro ao carregar faturamento." });
  }
});

// Exportação CSV de pedidos (com filtros opcionais).
app.get("/api/admin/exportar/pedidos", protegerAdmin, async (req, res) => {
  try {
    const { status, q } = req.query;
    const params = [];
    let where = " WHERE 1=1";
    if (status) { where += " AND p.status = ?"; params.push(status); }
    if (q) { where += " AND (u.nome LIKE ? OR u.email LIKE ? OR p.modelo LIKE ? OR CAST(p.id AS CHAR) = ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`, q); }
    const [rows] = await pool.query(
      `SELECT p.id, p.modelo, p.valor, p.status, p.pagamento_tipo, p.created_at, p.pago_at, u.nome AS usuario_nome, u.email AS usuario_email
       FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id ${where} ORDER BY p.id DESC`,
      params
    );
    const cab = "id,modelo,valor,status,canal,created_at,pago_at,usuario,email";
    const linhas = rows.map((r) =>
      [r.id, r.modelo, r.valor, r.status, r.pagamento_tipo || "", r.created_at, r.pago_at || "", (r.usuario_nome || "").replace(/,/g, " "), (r.usuario_email || "").replace(/,/g, " ")].join(",")
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=pedidos.csv");
    res.send("\uFEFF" + cab + "\n" + linhas.join("\n"));
  } catch (e) {
    console.error("Erro ao exportar:", e.message);
    res.status(500).json({ error: "Erro ao exportar." });
  }
});

// Ranking de modelos + funil de receita (visitas -> editor -> pagamento -> pago).
app.get("/api/admin/relatorios/vendas", protegerAdmin, async (req, res) => {
  try {
    const [ranking] = await pool.query(
      "SELECT modelo, COUNT(*) AS c, COALESCE(SUM(valor),0) AS total FROM transacoes WHERE tipo='venda' GROUP BY modelo ORDER BY c DESC"
    );
    // Funil de receita (últimos 30 dias): visitas, editor, pagamento, pedidos, pagos.
    const [funil] = await pool.query(`SELECT
      (SELECT COUNT(DISTINCT sessao) FROM visitas WHERE created_at >= (NOW() - INTERVAL 30 DAY)) AS visitas,
      (SELECT COUNT(DISTINCT sessao) FROM eventos WHERE tipo='abrir_editor' AND created_at >= (NOW() - INTERVAL 30 DAY)) AS editores,
      (SELECT COUNT(DISTINCT sessao) FROM eventos WHERE tipo='chegar_pagamento' AND created_at >= (NOW() - INTERVAL 30 DAY)) AS pagamentos,
      (SELECT COUNT(*) FROM pedidos WHERE created_at >= (NOW() - INTERVAL 30 DAY)) AS pedidos,
      (SELECT COUNT(*) FROM pedidos WHERE status='pago' AND created_at >= (NOW() - INTERVAL 30 DAY)) AS pagos`);
    res.json({ ranking, funil: funil[0] });
  } catch (e) {
    console.error("Erro ao carregar relatório:", e.message);
    res.status(500).json({ error: "Erro ao carregar relatório." });
  }
});

// Troca a senha do admin (valida a senha atual do LOGIN_PASS).
app.put("/api/admin/senha", protegerAdmin, async (req, res) => {
  try {
    const { atual, nova } = req.body || {};
    if (atual !== process.env.LOGIN_PASS) return res.status(401).json({ error: "Senha atual incorreta." });
    if (!nova || nova.length < 8) return res.status(400).json({ error: "A nova senha deve ter no mínimo 8 caracteres." });
    process.env.LOGIN_PASS = nova;
    await registrarAdminLog("admin_senha", "Senha do admin alterada");
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao trocar senha:", e.message);
    res.status(500).json({ error: "Erro ao trocar senha." });
  }
});

// Configura/valida o 2FA por e-mail: envia um código e valida na sessão.
// Simples e sem dependências externas: código de 6 dígitos válido por 10 min.
app.post("/api/admin/2fa", protegerAdmin, async (req, res) => {
  try {
    const { acao, codigo } = req.body || {};
    if (acao === "enviar") {
      const codigoGerado = String(Math.floor(100000 + Math.random() * 900000));
      req.session.codigo2fa = codigoGerado;
      req.session.codigo2fa_exp = Date.now() + 10 * 60 * 1000;
      req.session.save(async (err) => {
        if (err) return res.status(500).json({ error: "Erro interno." });
        const { enviarEmail } = require("./lib/email");
        // Sempre usa o e-mail fixo do admin (não há campo de e-mail do admin).
        const adminEmail = process.env.ADMIN_EMAIL || "admin@officeexpress.com.br";
        await enviarEmail({ to: adminEmail, subject: "Código de acesso - Office Express", html: `<p>Seu código de verificação é: <b>${codigoGerado}</b></p><p>Válido por 10 minutos.</p>`, text: `Seu código de verificação é: ${codigoGerado}` });
        res.json({ success: true });
      });
      return;
    }
    if (acao === "validar") {
      if (!codigo) return res.status(400).json({ error: "Informe o código." });
      if (req.session.codigo2fa && String(codigo) === String(req.session.codigo2fa) && req.session.codigo2fa_exp > Date.now()) {
        req.session.verificado2fa = true;
        req.session.save(() => res.json({ success: true }));
      } else {
        res.status(401).json({ error: "Código inválido ou expirado." });
      }
      return;
    }
    res.status(400).json({ error: "Ação inválida." });
  } catch (e) {
    console.error("Erro no 2FA:", e.message);
    res.status(500).json({ error: "Erro no 2FA." });
  }
});

// Histórico de auditoria das ações do admin.
app.get("/api/admin/auditoria", protegerAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM admin_log ORDER BY id DESC LIMIT 200");
    res.json({ logs: rows });
  } catch (e) {
    console.error("Erro ao carregar auditoria:", e.message);
    res.status(500).json({ error: "Erro ao carregar auditoria." });
  }
});

// Reenvia o e-mail de confirmação de um usuário.
app.post("/api/admin/usuarios/:id/reenviar-email", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT id, nome, email, email_confirmado FROM usuarios WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    const u = rows[0];
    if (u.email_confirmado) return res.json({ success: true, message: "E-mail já confirmado." });
    const codigo = gerarCodigoConfirmacao();
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query("INSERT INTO email_tokens (usuario_id, tipo, token, expira_em) VALUES (?, 'confirmacao', ?, ?)", [id, codigo, expira]);
    await enviarConfirmacao(u.email, u.nome, codigo);
    await registrarAdminLog("reenviar_email", `Confirmação reenviada para ${u.email}`);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao reenviar e-mail:", e.message);
    res.status(500).json({ error: "Erro ao reenviar e-mail." });
  }
});

// Lista os e-mails (tokens) já enviados a um usuário.
app.get("/api/admin/usuarios/:id/emails", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      "SELECT tipo, usado, expira_em, created_at FROM email_tokens WHERE usuario_id = ? ORDER BY id DESC LIMIT 50",
      [id]
    );
    res.json({ emails: rows });
  } catch (e) {
    console.error("Erro ao listar e-mails:", e.message);
    res.status(500).json({ error: "Erro ao listar e-mails." });
  }
});

// Backup/exportação dos dados (pedidos + usuários em JSON).
app.get("/api/admin/backup", protegerAdmin, async (req, res) => {
  try {
    const [pedidos] = await pool.query("SELECT * FROM pedidos");
    const [usuarios] = await pool.query("SELECT id, nome, email, email_confirmado, created_at FROM usuarios");
    const backup = {
      geradoEm: new Date().toISOString(),
      pedidos: pedidos.map((p) => ({ ...p, dados: (() => { try { return JSON.parse(p.dados_json || "{}"); } catch (e) { return {}; } })() })),
      usuarios,
    };
    backup.pedidos.forEach((p) => delete p.dados_json);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=backup-officeexpress.json");
    res.send(JSON.stringify(backup, null, 2));
  } catch (e) {
    console.error("Erro no backup:", e.message);
    res.status(500).json({ error: "Erro no backup." });
  }
});

// ---------------------------------------------------------------------------
// Parceiros (afiliados)
// ---------------------------------------------------------------------------
function protegerParceiro(req, res, next) {
  if (!req.session.parceiroId) return res.status(401).json({ error: "Não autorizado." });
  next();
}

async function buscarParceiroPorId(id) {
  const [rows] = await pool.query(
    "SELECT id, nome, email, whatsapp, codigo, dia_pagamento, comissao, aceitou_termos, termos_aceitos_em, ativo, created_at FROM parceiros WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

// Cadastra um novo parceiro (admin) e gera o código/link.
app.post("/api/admin/parceiros", protegerAdmin, async (req, res) => {
  try {
    const { nome, email, whatsapp, senha, dia_pagamento = 5, comissao = 40 } = req.body || {};
    if (!nome || !email) return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    const em = String(email).toLowerCase().trim();
    const [existe] = await pool.query("SELECT id FROM parceiros WHERE email = ?", [em]);
    if (existe.length) return res.status(409).json({ error: "Já existe um parceiro com este e-mail." });
    const codigo = "P" + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
    const senhaHash = senha ? await bcrypt.hash(senha, 10) : null;
    const dia = Math.min(28, Math.max(1, parseInt(dia_pagamento, 10) || 5));
    const com = Math.min(100, Math.max(0, parseFloat(comissao)));
    await pool.query(
      "INSERT INTO parceiros (nome, email, whatsapp, senha, codigo, dia_pagamento, comissao) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nome.trim(), em, whatsapp || null, senhaHash, codigo, dia, com]
    );
    await registrarAdminLog("parceiro_cadastro", `${nome.trim()} (${codigo})`);
    res.json({ success: true, codigo });
  } catch (e) {
    console.error("Erro ao cadastrar parceiro:", e.message);
    res.status(500).json({ error: "Erro ao cadastrar parceiro." });
  }
});

// Lista parceiros (admin) com status de aceite dos termos.
app.get("/api/admin/parceiros", protegerAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, email, whatsapp, codigo, dia_pagamento, comissao, aceitou_termos, termos_aceitos_em, ativo, created_at FROM parceiros ORDER BY id DESC"
    );
    res.json({ parceiros: rows });
  } catch (e) {
    console.error("Erro ao listar parceiros:", e.message);
    res.status(500).json({ error: "Erro ao listar parceiros." });
  }
});

// Ativa/desativa um parceiro (admin).
app.put("/api/admin/parceiros/:id/status", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { ativo } = req.body || {};
    await pool.query("UPDATE parceiros SET ativo = ? WHERE id = ?", [ativo ? 1 : 0, id]);
    await registrarAdminLog("parceiro_status", `Parceiro ${id} -> ${ativo ? "ativo" : "inativo"}`);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao alterar status do parceiro:", e.message);
    res.status(500).json({ error: "Erro ao alterar status do parceiro." });
  }
});

// Exclui um parceiro (admin). Antes de remover, desvincula os pedidos que
// apontavam para ele (parceiro_id -> NULL) para preservar o histórico de
// vendas sem deixar referências órfãs.
app.delete("/api/admin/parceiros/:id", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Parceiro inválido." });
    await pool.query("UPDATE pedidos SET parceiro_id = NULL WHERE parceiro_id = ?", [id]);
    await pool.query("DELETE FROM parceiros WHERE id = ?", [id]);
    await registrarAdminLog("parceiro_excluido", `Parceiro ${id} excluído`);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao excluir parceiro:", e.message);
    res.status(500).json({ error: "Erro ao excluir parceiro." });
  }
});

// Lista os pagamentos (comissões mensais) de todos os parceiros.
app.get("/api/admin/pagamentos", protegerAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pp.id, pp.parceiro_id, pp.mes_ref, pp.valor, pp.status, pp.pago_em,
              COALESCE(p.nome, 'Parceiro removido') AS parceiro_nome
       FROM pagamentos_parceiros pp
       LEFT JOIN parceiros p ON p.id = pp.parceiro_id
       ORDER BY pp.mes_ref DESC, p.nome ASC`
    );
    res.json({ pagamentos: rows });
  } catch (e) {
    console.error("Erro ao listar pagamentos:", e.message);
    res.status(500).json({ error: "Erro ao listar pagamentos." });
  }
});

// Marca um pagamento de comissão como pago (repasse realizado).
app.post("/api/admin/pagamentos/:id/pagar", protegerAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query("UPDATE pagamentos_parceiros SET status='pago', pago_em = NOW() WHERE id = ?", [id]);
    await registrarAdminLog("pagamento_parceiro", `Pagamento ${id} marcado como pago`);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao marcar pagamento como pago:", e.message);
    res.status(500).json({ error: "Erro ao marcar pagamento como pago." });
  }
});

// Dispara manualmente o fechamento das comissões de um mês (ex.: teste ou
// recuperação). Se mes_ref não for informado, usa o mês anterior.
app.post("/api/admin/pagamentos/fechar", protegerAdmin, async (req, res) => {
  try {
    const { mes_ref } = req.body || {};
    let mesRef = mes_ref;
    if (!mesRef) {
      const hoje = new Date();
      const mesAnt = hoje.getMonth() - 1 < 0 ? 11 : hoje.getMonth() - 1;
      const anoAnt = hoje.getMonth() - 1 < 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
      mesRef = `${anoAnt}-${String(mesAnt + 1).padStart(2, "0")}`;
    }
    const qtd = await fecharComissoesMes(mesRef);
    await registrarAdminLog("fechar_comissoes", `Mês ${mesRef} (${qtd} parceiros)`);
    res.json({ success: true, mes_ref: mesRef, parceiros: qtd });
  } catch (e) {
    console.error("Erro ao fechar comissões:", e.message);
    res.status(500).json({ error: "Erro ao fechar comissões." });
  }
});

// ---------------------------------------------------------------------------
// Office Express | Companies — gestão no painel admin
// ---------------------------------------------------------------------------
app.get("/api/admin/empresas", protegerAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT e.id, e.nome, e.cnpj, e.email, e.plano, e.assinatura_ativa, e.status, e.created_at, " +
      "(SELECT COUNT(*) FROM empresas_pagamentos ep WHERE ep.empresa_id = e.id AND ep.status = 'pago') AS pagamentos_pagos " +
      "FROM empresas e ORDER BY e.id DESC"
    );
    res.json({ empresas: rows });
  } catch (e) {
    console.error("Erro ao listar empresas:", e.message);
    res.status(500).json({ error: "Erro ao listar empresas." });
  }
});

app.put("/api/admin/empresas/:id/status", protegerAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["ativo", "inativo"].includes(status)) return res.status(400).json({ error: "Status inválido." });
    await pool.query("UPDATE empresas SET status = ? WHERE id = ?", [status, req.params.id]);
    await registrarAdminLog("empresa_status", `Empresa #${req.params.id} → ${status}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao alterar status da empresa:", e.message);
    res.status(500).json({ error: "Erro ao alterar status." });
  }
});

app.put("/api/admin/empresas/:id/plano", protegerAdmin, async (req, res) => {
  try {
    const { plano, assinatura_ativa } = req.body || {};
    if (!["starter", "pro", "enterprise"].includes(plano)) return res.status(400).json({ error: "Plano inválido." });
    const ativa = assinatura_ativa != null ? (assinatura_ativa ? 1 : 0) : undefined;
    if (ativa != null) {
      await pool.query("UPDATE empresas SET plano = ?, assinatura_ativa = ? WHERE id = ?", [plano, ativa, req.params.id]);
    } else {
      await pool.query("UPDATE empresas SET plano = ? WHERE id = ?", [plano, req.params.id]);
    }
    await registrarAdminLog("empresa_plano", `Empresa #${req.params.id} → ${plano}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao alterar plano da empresa:", e.message);
    res.status(500).json({ error: "Erro ao alterar plano." });
  }
});

// Preços configuráveis das assinaturas (leitura para o admin).
app.get("/api/admin/empresas/planos/precos", protegerAdmin, async (req, res) => {
  try {
    const [starter, pro, enterprise] = await Promise.all([
      getValorPlano("starter"),
      getValorPlano("pro"),
      getValorPlano("enterprise"),
    ]);
    res.json({ planos: { starter, pro, enterprise } });
  } catch (e) {
    console.error("Erro ao carregar preços dos planos (admin):", e.message);
    res.status(500).json({ error: "Erro ao carregar preços dos planos." });
  }
});

// Atualiza os preços configuráveis das assinaturas.
app.put("/api/admin/empresas/planos/precos", protegerAdmin, async (req, res) => {
  try {
    const { starter, pro, enterprise } = req.body || {};
    const dados = { starter, pro, enterprise };
    for (const plano of ["starter", "pro", "enterprise"]) {
      let v = dados[plano];
      if (v === undefined || v === null || v === "") continue;
      v = parseFloat(String(v).replace(",", "."));
      if (isNaN(v) || v < 0) return res.status(400).json({ error: "Valor inválido para o plano " + plano + "." });
      await setValorPlano(plano, v);
    }
    await registrarAdminLog("empresa_precos", `Preços atualizados: starter=${starter}, pro=${pro}, enterprise=${enterprise}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao atualizar preços dos planos:", e.message);
    res.status(500).json({ error: "Erro ao atualizar preços dos planos." });
  }
});

// Editar dados da empresa (nome, CNPJ, e-mail, plano, assinatura e status).
app.put("/api/admin/empresas/:id", protegerAdmin, async (req, res) => {
  try {
    const { nome, cnpj, email, plano, assinatura_ativa, status } = req.body || {};
    const campos = [];
    const valores = [];
    if (nome !== undefined) { campos.push("nome = ?"); valores.push(String(nome).trim()); }
    if (cnpj !== undefined) { campos.push("cnpj = ?"); valores.push(String(cnpj).trim() || null); }
    if (email !== undefined) { campos.push("email = ?"); valores.push(String(email).trim()); }
    if (plano !== undefined) {
      if (!["starter", "pro", "enterprise"].includes(plano)) return res.status(400).json({ error: "Plano inválido." });
      campos.push("plano = ?"); valores.push(plano);
    }
    if (assinatura_ativa !== undefined) { campos.push("assinatura_ativa = ?"); valores.push(assinatura_ativa ? 1 : 0); }
    if (status !== undefined) {
      if (!["ativo", "inativo"].includes(status)) return res.status(400).json({ error: "Status inválido." });
      campos.push("status = ?"); valores.push(status);
    }
    if (!campos.length) return res.status(400).json({ error: "Nenhum campo para atualizar." });
    valores.push(req.params.id);
    await pool.query("UPDATE empresas SET " + campos.join(", ") + " WHERE id = ?", valores);
    await registrarAdminLog("empresa_editar", `Empresa #${req.params.id} atualizada`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao editar empresa:", e.message);
    res.status(500).json({ error: "Erro ao editar empresa." });
  }
});

// Pagamentos de uma empresa.
app.get("/api/admin/empresas/:id/pagamentos", protegerAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, pagamento_id, plano, valor, status, tipo, created_at FROM empresas_pagamentos WHERE empresa_id = ? ORDER BY id DESC",
      [req.params.id]
    );
    res.json({ pagamentos: rows });
  } catch (e) {
    console.error("Erro ao listar pagamentos da empresa:", e.message);
    res.status(500).json({ error: "Erro ao listar pagamentos." });
  }
});

// Currículos visualizados por uma empresa.
app.get("/api/admin/empresas/:id/curriculos", protegerAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, pedido_id, visto_em FROM empresas_curriculos_vistos WHERE empresa_id = ? ORDER BY id DESC",
      [req.params.id]
    );
    res.json({ curriculos: rows });
  } catch (e) {
    console.error("Erro ao listar currículos vistos pela empresa:", e.message);
    res.status(500).json({ error: "Erro ao listar currículos vistos." });
  }
});

// Login do parceiro.
app.post("/api/parceiro/login", async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: "Informe e-mail e senha." });
  const em = String(email).toLowerCase().trim();
  const [rows] = await pool.query("SELECT * FROM parceiros WHERE email = ?", [em]);
  if (!rows.length) return res.status(401).json({ error: "E-mail ou senha incorretos." });
  const p = rows[0];
  if (!p.senha || !(await bcrypt.compare(senha, p.senha))) return res.status(401).json({ error: "E-mail ou senha incorretos." });
  if (!p.ativo) return res.status(403).json({ error: "Parceiro desativado. Fale com o administrador." });
  req.session.parceiroId = p.id;
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: "Erro ao iniciar sessão." });
    res.json({ success: true });
  });
});

// Logout do parceiro.
app.post("/api/parceiro/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Dados do parceiro logado.
app.get("/api/parceiro/me", protegerParceiro, async (req, res) => {
  const p = await buscarParceiroPorId(req.session.parceiroId);
  if (!p) return res.status(401).json({ error: "Parceiro não encontrado." });
  res.json({ parceiro: p });
});

// Aceita os termos e políticas (marca como Aceito).
app.post("/api/parceiro/aceitar-termos", protegerParceiro, async (req, res) => {
  try {
    const { termos, privacidade } = req.body || {};
    if (!termos || !privacidade) return res.status(400).json({ error: "Você deve marcar as duas caixas para aceitar." });
    await pool.query("UPDATE parceiros SET aceitou_termos = 1, termos_aceitos_em = NOW() WHERE id = ?", [req.session.parceiroId]);
    res.json({ success: true });
  } catch (e) {
    console.error("Erro ao aceitar termos:", e.message);
    res.status(500).json({ error: "Erro ao aceitar termos." });
  }
});

// Dashboard do parceiro: link, métricas, comissão e dia de pagamento.
app.get("/api/parceiro/dashboard", protegerParceiro, async (req, res) => {
  try {
    const pid = req.session.parceiroId;
    const p = await buscarParceiroPorId(pid);
    if (!p) return res.status(401).json({ error: "Parceiro não encontrado." });
    const codigo = p.codigo;

    // Acessos vindos do link do parceiro.
    const [acessos] = await pool.query(
      "SELECT COUNT(*) AS c, COUNT(DISTINCT sessao) AS sessoes FROM visitas WHERE parceiro = ? AND created_at >= (NOW() - INTERVAL 30 DAY)",
      [codigo]
    );

    // Pedidos pendentes dos clientes do parceiro (contagem de pedidos).
    const [pendentes] = await pool.query(
      "SELECT COUNT(*) AS c FROM pedidos WHERE parceiro_id = ? AND status = 'pendente'",
      [pid]
    );
    // Receitas do parceiro vêm da tabela imutável `transacoes` (independente
    // de `pedidos`). A comissão usa a porcentagem congelada em cada venda,
    // então mudanças futuras na % do parceiro não alteram valores passados.
    const [pagos] = await pool.query(
      "SELECT COUNT(*) AS c, COALESCE(SUM(valor),0) AS total FROM transacoes WHERE parceiro_id = ? AND tipo='venda'",
      [pid]
    );
    const [comissaoCalc] = await pool.query(
      "SELECT COALESCE(SUM(valor * comissao_pct / 100),0) AS total FROM transacoes WHERE parceiro_id = ? AND tipo='venda' AND comissao_pct IS NOT NULL",
      [pid]
    );
    // Total de comissões fechadas (pagamentos mensais) ainda não pagas.
    const [apagar] = await pool.query(
      "SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos_parceiros WHERE parceiro_id = ? AND status='apagar'",
      [pid]
    );
    const comissao = Number(p.comissao) || 40;
    const valorComissao = Number(comissaoCalc[0].total) || 0;
    const totalApagar = Number(apagar[0].total) || 0;

    // Acessos/pedidos recentes por dia (tendência dos últimos 7 dias).
    const [tendencia] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS dia, COUNT(*) AS c
       FROM visitas WHERE parceiro = ? AND created_at >= (NOW() - INTERVAL 7 DAY)
       GROUP BY dia ORDER BY dia ASC`,
      [codigo]
    );

    res.json({
      parceiro: p,
      link: `${process.env.BASE_URL || "https://www.officeexpress.com.br"}/?ref=${codigo}`,
      acessos30: acessos[0].c || 0,
      sessoes30: acessos[0].sessoes || 0,
      pendentes: pendentes[0].c || 0,
      pagos: pagos[0].c || 0,
      valorVendas: Number(pagos[0].total) || 0,
      comissaoPct: comissao,
      valorComissao,
      totalApagar,
      diaPagamento: p.dia_pagamento,
      tendencia,
    });
  } catch (e) {
    console.error("Erro no dashboard do parceiro:", e.message);
    res.status(500).json({ error: "Erro ao carregar o painel." });
  }
});

// Lista os clientes que vieram pelo link do parceiro.
app.get("/api/parceiro/pedidos", protegerParceiro, async (req, res) => {
  try {
    const pid = req.session.parceiroId;
    const [rows] = await pool.query(
      `SELECT p.id, p.modelo, p.valor, p.status, p.pagamento_tipo, p.created_at,
              COALESCE(u.nome, JSON_UNQUOTE(JSON_EXTRACT(p.dados_json, '$.nome'))) AS cliente_nome
       FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.parceiro_id = ? ORDER BY p.id DESC LIMIT 100`,
      [pid]
    );
    res.json({ pedidos: rows });
  } catch (e) {
    console.error("Erro ao listar pedidos do parceiro:", e.message);
    res.status(500).json({ error: "Erro ao listar pedidos." });
  }
});

// Gera um id de sessão para o tracking do frontend (endpoint leve).
app.get("/api/track/sessao", (req, res) => {
  res.json({ sessao: gerarSessaoId() });
});


// Upload temporário do currículo enviado na página de análise, para que a
// prévia "Original" exiba o documento de forma fiel (via visualizador do
// Office para DOCX). O arquivo é recebido em base64 via JSON.
app.post("/api/upload-curriculo", async (req, res) => {
  try {
    const { nome, base64 } = req.body || {};
    if (!nome || !base64) return res.status(400).json({ error: "Dados inválidos." });
    const ext = path.extname(nome).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") return res.status(400).json({ error: "Formato não suportado." });
    const dir = path.join(__dirname, "public", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const arquivoNome = "curriculo_" + Date.now() + Math.random().toString(36).slice(2, 6) + ext;
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) return res.status(400).json({ error: "Arquivo vazio." });
    fs.writeFileSync(path.join(dir, arquivoNome), buffer);
    res.json({ url: "/uploads/" + arquivoNome });
  } catch (e) {
    console.error("Erro no upload de currículo:", e);
    res.status(500).json({ error: "Erro ao salvar o arquivo." });
  }
});

// ---------------------------------------------------------------------------
// Análise por IA (Gemini): extração estruturada das informações do currículo.
// Se não houver chave configurada (GEMINI_API_KEY), o servidor responde
// disponivel:false e o frontend usa o parser local como fallback.
// ---------------------------------------------------------------------------
app.post("/api/analise-ia", async (req, res) => {
  try {
    const { texto, imagemBase64, mime } = req.body || {};
    const temTexto = texto && String(texto).trim();
    const temImagem = imagemBase64 && String(imagemBase64).trim();
    if (!temTexto && !temImagem) {
      return res.status(400).json({ error: "Nenhum conteúdo enviado." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ ok: false, disponivel: false, error: "IA não configurada." });
    }

    const prompt =
      "Você é um assistente especialista em leitura minuciosa de currículos. " +
      "Analise o currículo fornecido (na imagem e/ou no texto) com EXTREMO cuidado e atenção a TODOS os detalhes.\n\n" +
      "INSTRUÇÕES CRÍTICAS DE LEITURA:\n" +
      "- Identifique o layout do currículo. Se ele tiver DUAS ou mais colunas (coluna lateral + coluna principal, ou duas colunas de conteúdo), leia CADA coluna separadamente, de cima a baixo, sem pular nenhuma.\n" +
      "- NÃO leia apenas a coluna principal: a coluna lateral (esquerda ou direita) costuma conter dados de contato, habilidades e idiomas. Percorra TODO o documento, incluindo cabeçalho e rodapé.\n" +
      "- Dados de contato (nome, e-mail, telefone, endereço, CEP, LinkedIn, GitHub, site, nascimento) podem estar no cabeçalho, no rodapé ou na coluna lateral, muitas vezes em fonte pequena. Procure-os em TODAS as partes e transcreva TODOS.\n" +
      "- Dê atenção EXTRA ao e-mail e ao telefone: examine o documento inteiro até localizá-los, pois são os dados que mais se perdem. Se houver um e-mail em qualquer lugar, capture-o integralmente (ex.: nome@dominio.com).\n" +
      "- Leia a imagem inteira, linha por linha, de cima a baixo, da esquerda para a direita. Não pule nenhuma linha ou seção.\n" +
      "- Transcreva cada informação legível EXATAMENTE como aparece, incluindo acentos, maiúsculas, números e símbolos.\n" +
      "- Capture TODOS os itens de cada lista (todas as experiências, todas as formações, todos os cursos, todas as habilidades, todos os idiomas, todos os contatos).\n" +
      "- Nas experiências, transcreva TODAS as responsabilidades e realizações (não resuma nem trunque).\n" +
      "- Não invente nem adivinhe informações que não estejam visíveis. Use null para campo ausente.\n" +
      "- Se uma informação estiver parcialmente legível, registre a parte legível.\n" +
      "- Preencha TODOS os campos da estrutura abaixo. Não omita nenhum campo do JSON.\n\n" +
      "Devolva SOMENTE um objeto JSON válido, sem texto extra, seguindo exatamente esta estrutura:\n" +
      "{\n" +
      '  "pessoal": { "nome": string|null, "email": string|null, "telefones": [ string ], ' +
      '"cidade": string|null, "uf": string|null, "endereco": string|null, "cep": string|null, ' +
      '"linkedin": string|null, "github": string|null, "site": string|null, "nascimento": string|null },\n' +
      '  "objetivo": string|null,\n' +
      '  "resumo": string|null,\n' +
      '  "experiencias": [ { "cargo": string|null, "empresa": string|null, "periodo": string|null, ' +
      '"local": string|null, "descricao": string|null } ],\n' +
      '  "formacoes": [ { "curso": string|null, "instituicao": string|null, "periodo": string|null, ' +
      '"status": string|null } ],\n' +
      '  "cursos": [ string ],\n' +
      '  "habilidades": string|null,\n' +
      '  "idiomas": [ { "idioma": string|null, "nivel": string|null } ],\n' +
      '  "projetos": [ string ],\n' +
      '  "premios": [ string ],\n' +
      '  "publicacoes": [ string ],\n' +
      '  "voluntariado": [ string ],\n' +
      '  "referencias": [ string ],\n' +
      '  "infoAdicional": string|null,\n' +
      '  "score": number|null,\n' +
      '  "pontosFortes": [ { "titulo": string, "descricao": string } ],\n' +
      '  "pontosMelhorar": [ { "titulo": string, "descricao": string } ]\n' +
      "}\n\n" +
      "REGRA DE PREENCHIMENTO: se um campo não existir no currículo, use null (ou array vazio para listas). " +
      "Preencha habilidades como string separada por vírgula (ex.: 'JavaScript, React, SQL'). " +
      "Idiomas devem ser uma lista de objetos com idioma e nível. Capture o máximo de informação possível.\n\n" +
      "AVALIAÇÃO (importante):\n" +
      "- 'score' deve ser uma nota de 0 a 100 que reflete a QUALIDADE REAL do currículo, avaliando objetivamente:\n" +
      "  presença de informações de contato completas, objetivo/resumo, experiência detalhada com resultados, formação, " +
      "  habilidades, idiomas, organização e volume de conteúdo. Seja justo e criterioso.\n" +
      "- 'pontosFortes': liste de 3 a 6 pontos positivos REAIS presentes no currículo. Cada item tem 'titulo' (curto) e " +
      "  'descricao' (1 a 2 frases explicando por que é um ponto forte, citando o que está no currículo). " +
      "  NÃO invente pontos que não existem no documento.\n" +
      "- 'pontosMelhorar': liste de 2 a 5 sugestões REAIS de melhoria, baseadas APENAS no que está faltando ou fraco no " +
      "  currículo (ex.: contato incompleto, sem objetivo, experiência sem resultados, sem idiomas, seções ausentes). " +
      "  Cada item tem 'titulo' (curto) e 'descricao' (1 a 2 frases com sugestão concreta). Se o currículo estiver " +
      "  completo e sem lacunas relevantes, devolva lista vazia.\n" +
      "- Os pontos fortes e pontos a melhorar DEVEM ser coerentes com as informações realmente presentes no currículo, " +
      "  nunca contradizendo os dados extraídos.\n";

    // Monta as partes do conteúdo: texto (se houver) e imagem (se houver).
    const parts = [{ text: prompt }];
    if (temImagem) {
      const mimeValido = /^image\/(png|jpe?g|webp|bmp|gif)$/.test(String(mime || "")) ? String(mime) : "image/png";
      parts.push({ inlineData: { mimeType: mimeValido, data: String(imagemBase64).trim() } });
    }
    if (temTexto) {
      parts.push({ text: "TEXTO EXTRAÍDO DO CURRÍCULO:\n" + String(texto).slice(0, 12000) });
    }

    const body = {
      contents: [{ parts: parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 4096 },
    };

    // Lista de modelos a tentar em ordem. O primeiro com cota disponível é usado.
    // Prioriza modelos com limite diário (RPD) alto no plano gratuito para evitar
    // esgotamento: gemini-3.1-flash-lite (RPD 500) e gemini-3.5-flash-lite (RPD 500).
    const modelos = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
    let resp = null;
    for (let m = 0; m < modelos.length; m++) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelos[m] + ":generateContent?key=" + apiKey;

      // Retry com backoff para erros temporários (alta demanda, rate limit, quota, etc.).
      // Para 429 (quota/rate limit), aguarda o tempo sugerido pela própria API quando disponível.
      const maxTentativas = 3;
      const backoffs = [0, 3000, 8000]; // backoff base (ms) para cada tentativa
      resp = null;
      for (let i = 0; i < maxTentativas; i++) {
        if (i > 0) {
          // Extrai o tempo de espera sugerido pela API no erro 429, se houver.
          let espera = backoffs[i];
          if (resp) {
            try {
              const corpo = await resp.text().catch(() => "");
              const m = String(corpo).match(/retry in\s+([\d.]+)\s*s/i) || String(corpo).match(/retryDelay['":\s]+(\d+)/i);
              if (m) {
                const sugerido = m[1].indexOf(".") !== -1 ? Math.ceil(parseFloat(m[1]) * 1000) : parseInt(m[1], 10);
                if (sugerido > espera) espera = sugerido;
              }
            } catch (e) { /* ignora */ }
          }
          await new Promise((r) => setTimeout(r, espera));
        }
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } catch (e) {
          resp = null;
        }
        // Sucesso ou erro permanente: para. Se for erro temporário, tenta de novo.
        if (resp && resp.ok) break;
        const status = resp ? resp.status : 0;
        const temporario = status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 0;
        if (!temporario) break;
        console.error("Erro temporário na API Gemini (" + modelos[m] + ", tentativa " + (i + 1) + "): status " + status);
      }

      // Se este modelo respondeu com sucesso, usa-o.
      if (resp && resp.ok) break;
      // Se o erro é permanente (ex.: modelo inexistente) ou cota esgotada, tenta o próximo modelo.
      console.error("Modelo " + modelos[m] + " indisponível (status " + (resp ? resp.status : 0) + "). Tentando próximo modelo.");
    }

    if (!resp || !resp.ok) {
      const textoErro = resp ? await resp.text().catch(() => "") : "sem resposta";
      console.error("Erro na API Gemini:", resp ? resp.status : 0, textoErro.slice(0, 500));
      return res.json({ ok: false, disponivel: true, error: "Falha na API de IA." });
    }

    const data = await resp.json();
    const parte = data && data.candidates && data.candidates[0] && data.candidates[0].content;
    const conteudo = parte && parte.parts && parte.parts[0] && parte.parts[0].text;
    if (!conteudo) {
      return res.json({ ok: false, disponivel: true, error: "Resposta vazia da IA." });
    }

    let dados = null;
    try {
      // Remove possíveis cercas de bloco ```json ... ```
      const limpo = String(conteudo).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      dados = JSON.parse(limpo);
    } catch (e) {
      console.error("Erro ao interpretar JSON da IA:", e);
      return res.json({ ok: false, disponivel: true, error: "Resposta inválida da IA." });
    }

    res.json({ ok: true, dados });
  } catch (e) {
    console.error("Erro na análise por IA:", e);
    res.json({ ok: false, disponivel: true, error: "Erro interno na análise por IA." });
  }
});

// ---------------------------------------------------------------------------
// Office Express | Companies (plataforma B2B)
// ---------------------------------------------------------------------------
const VALORES_PLANOS = { starter: 99, pro: 249, enterprise: 0 };

// Retorna o valor mensal de um plano, lendo o valor configurável (editável
// pelo admin no painel) da tabela `config`, com fallback para o padrão.
async function getValorPlano(plano) {
  const chave = "preco_plano_" + plano;
  try {
    const [rows] = await pool.query("SELECT valor FROM config WHERE chave = ?", [chave]);
    if (rows.length > 0 && rows[0].valor !== null && rows[0].valor !== "") {
      const v = parseFloat(rows[0].valor);
      if (!isNaN(v) && v >= 0) return v;
    }
  } catch (err) {
    // ignora e usa padrão
  }
  return VALORES_PLANOS[plano] != null ? VALORES_PLANOS[plano] : 0;
}

async function setValorPlano(plano, valor) {
  await pool.query(
    "INSERT INTO config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
    ["preco_plano_" + plano, String(valor)]
  );
}


function empresaDaSessao(req) {
  return req.session.empresaId || null;
}

async function buscarEmpresaPorId(id) {
  const [rows] = await pool.query(
    "SELECT id, nome, cnpj, email, plano, assinatura_ativa, status FROM empresas WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

// Preços atuais dos planos (configuráveis pelo admin no painel).
app.get("/api/companies/planos/precos", async (req, res) => {
  try {
    const [starter, pro, enterprise] = await Promise.all([
      getValorPlano("starter"),
      getValorPlano("pro"),
      getValorPlano("enterprise"),
    ]);
    res.json({ planos: { starter, pro, enterprise } });
  } catch (e) {
    console.error("Erro ao carregar preços dos planos:", e.message);
    res.status(500).json({ error: "Erro ao carregar preços dos planos." });
  }
});

async function garantirEmpresasSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INT NOT NULL AUTO_INCREMENT,
        nome VARCHAR(160) NOT NULL,
        cnpj VARCHAR(30) NULL,
        email VARCHAR(160) NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        plano ENUM('starter','pro','enterprise') NOT NULL DEFAULT 'starter',
        assinatura_ativa TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_empresas_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas_pagamentos (
        id INT NOT NULL AUTO_INCREMENT,
        empresa_id INT NOT NULL,
        pagamento_id VARCHAR(80) NULL,
        plano ENUM('starter','pro','enterprise') NOT NULL DEFAULT 'starter',
        valor DECIMAL(10,2) NOT NULL DEFAULT 0,
        status ENUM('pendente','pago','rejeitado','cancelado') NOT NULL DEFAULT 'pendente',
        tipo ENUM('pix','card') NULL,
        periodo_ref VARCHAR(20) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pago_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_empresa_pagamentos (empresa_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas_curriculos_vistos (
        id INT NOT NULL AUTO_INCREMENT,
        empresa_id INT NOT NULL,
        pedido_id INT NOT NULL,
        visto_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_empresa_vistos (empresa_id),
        KEY idx_empresa_vistos_pedido (pedido_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas_contatos (
        id INT NOT NULL AUTO_INCREMENT,
        nome VARCHAR(160) NOT NULL,
        email VARCHAR(160) NOT NULL,
        empresa VARCHAR(160) NULL,
        mensagem TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // ---------------------------------------------------------------------
    // Banco permanente de talentos (Office Express | Companies).
    // Espelha os dados essenciais do currículo pago com consentimento, para
    // que o talento permaneça disponível às empresas mesmo que o pedido
    // original seja apagado (pendentes +24h, limpeza admin, etc.).
    // ---------------------------------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS talentos (
        id INT NOT NULL AUTO_INCREMENT,
        pedido_id INT NULL,
        usuario_id INT NULL,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(200) NULL,
        telefone VARCHAR(60) NULL,
        cargo VARCHAR(200) NULL,
        cidade VARCHAR(120) NULL,
        estado VARCHAR(4) NULL,
        objetivo TEXT NULL,
        dados_json LONGTEXT NOT NULL,
        consentimento TINYINT(1) NOT NULL DEFAULT 0,
        modelo VARCHAR(40) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_talentos_pedido (pedido_id),
        KEY idx_talentos_estado (estado),
        KEY idx_talentos_cidade (cidade),
        KEY idx_talentos_consentimento (consentimento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {
    console.error("⚠️ Não foi possível criar tabelas de empresas:", e.message);
  }
}

// ---------------------------------------------------------------------------
// Banco de talentos: espelhamento permanente.
// arquivarTalento(pedidoId) extrai os dados essenciais do pedido pago e
// grava/atualiza o registro em `talentos`. Idempotente (upsert por pedido_id):
// se o pedido for re-pago ou corrigido, o talento é atualizado, não duplicado.
// ---------------------------------------------------------------------------
async function arquivarTalento(pedidoId) {
  try {
    const [rows] = await pool.query("SELECT id, usuario_id, modelo, status, dados_json FROM pedidos WHERE id = ?", [pedidoId]);
    if (!rows.length) return;
    const p = rows[0];
    // LGPD (proteção interna): apenas pedidos PAGOS podem ser arquivados no
    // banco de talentos. Pendentes/cancelados nunca entram, independente de
    // quem chame a função.
    if (p.status !== "pago") return;
    let d = {};
    try { d = JSON.parse(p.dados_json || "{}"); } catch (e) { d = {}; }

    const cargo = (Array.isArray(d.cargo) && d.cargo.length ? d.cargo[0] : (d.objetivo || "")).toString().slice(0, 200) || null;
    const telefones = Array.isArray(d.telefone) ? d.telefone.filter(Boolean) : [d.telefone].filter(Boolean);
    const telefone = (telefones[0] || "").toString().slice(0, 60) || null;

    await pool.query(
      `INSERT INTO talentos (pedido_id, usuario_id, nome, email, telefone, cargo, cidade, estado, objetivo, dados_json, consentimento, modelo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome = VALUES(nome), email = VALUES(email), telefone = VALUES(telefone),
         cargo = VALUES(cargo), cidade = VALUES(cidade), estado = VALUES(estado),
         objetivo = VALUES(objetivo), dados_json = VALUES(dados_json),
         consentimento = VALUES(consentimento), modelo = VALUES(modelo)`,
      [
        p.id,
        p.usuario_id || null,
        (d.nome || "Candidato").toString().slice(0, 200),
        (d.email || "").toString().slice(0, 200) || null,
        telefone,
        cargo,
        (d.cidade || "").toString().slice(0, 120) || null,
        (d.estado || "").toString().slice(0, 4) || null,
        (d.objetivo || "").toString() || null,
        p.dados_json || "{}",
        d.consentimento ? 1 : 0,
        p.modelo || null,
      ]
    );
  } catch (e) {
    console.error("⚠️ Erro ao arquivar talento do pedido", pedidoId, ":", e.message);
  }
}

// Sincroniza pedidos pagos antigos para a tabela talentos (roda na subida).
// Garante que talentos de antes da feature também sejam permanentes.
(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT id FROM pedidos WHERE status = 'pago' AND dados_json LIKE '%\"consentimento\":true%'"
    );
    for (const r of rows) await arquivarTalento(r.id);
    if (rows.length) console.log(`🗄️ Talentos arquivados na inicialização: ${rows.length} currículo(s) pago(s) com consentimento.`);

    // LGPD (conformidade retroativa): remove da tabela talentos qualquer
    // registro que não corresponda a um pedido PAGO atual (ex.: talentos
    // arquivados de pendentes por versões anteriores do sistema).
    const [del] = await pool.query(
      "DELETE FROM talentos WHERE pedido_id IS NOT NULL AND pedido_id NOT IN (SELECT id FROM pedidos WHERE status = 'pago')"
    );
    if (del.affectedRows > 0) console.log(`🧹 LGPD: ${del.affectedRows} talento(s) sem pagamento confirmado removido(s) do banco.`);
  } catch (e) {
    // silencioso: ambiente sem DB (ex.: desenvolvimento offline)
  }
})();

// Cadastro de empresa
app.post("/api/companies/cadastro", async (req, res) => {
  try {
    const { nome, cnpj, email, senha, plano = "starter" } = req.body || {};
    if (!nome || !email || !senha) return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    if (!validarSenha(senha)) return res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres, com letra e número." });
    if (!["starter", "pro", "enterprise"].includes(plano)) return res.status(400).json({ error: "Plano inválido." });
    const senhaHash = await bcrypt.hash(senha, 10);
    const [result] = await pool.query(
      "INSERT INTO empresas (nome, cnpj, email, senha_hash, plano) VALUES (?, ?, ?, ?, ?)",
      [String(nome).trim(), String(cnpj || "").trim(), String(email).trim().toLowerCase(), senhaHash, plano]
    );
    const empresa = await buscarEmpresaPorId(result.insertId);
    res.json({ ok: true, empresa });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe uma conta com este e-mail." });
    console.error("Erro cadastro empresa:", e.message);
    res.status(500).json({ error: "Erro ao criar conta." });
  }
});

// Login de empresa
app.post("/api/companies/login", async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    const [rows] = await pool.query("SELECT * FROM empresas WHERE email = ?", [String(email || "").trim().toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "E-mail ou senha inválidos." });
    const emp = rows[0];
    if (emp.status === "inativo") return res.status(403).json({ error: "Conta desativada." });
    const okSenha = await bcrypt.compare(String(senha || ""), emp.senha_hash);
    if (!okSenha) return res.status(401).json({ error: "E-mail ou senha inválidos." });
    req.session.empresaId = emp.id;
    res.json({ ok: true, empresa: { id: emp.id, nome: emp.nome, plano: emp.plano } });
  } catch (e) {
    console.error("Erro login empresa:", e.message);
    res.status(500).json({ error: "Erro ao entrar." });
  }
});

// Logout de empresa
app.post("/api/companies/logout", (req, res) => {
  delete req.session.empresaId;
  res.json({ ok: true });
});

// Dados da empresa logada
app.get("/api/companies/me", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const emp = await buscarEmpresaPorId(id);
  if (!emp) return res.status(404).json({ error: "Empresa não encontrada." });
  res.json({ ok: true, empresa: emp });
});

// Empresa logada atualiza os próprios dados cadastrais (nome e CNPJ).
app.put("/api/companies/me/dados", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const { nome, cnpj } = req.body || {};
  if (!nome || !String(nome).trim()) return res.status(400).json({ error: "Informe o nome da empresa." });
  try {
    await pool.query("UPDATE empresas SET nome = ?, cnpj = ? WHERE id = ?", [
      String(nome).trim(),
      cnpj != null && String(cnpj).trim() !== "" ? String(cnpj).trim() : null,
      id,
    ]);
    const emp = await buscarEmpresaPorId(id);
    res.json({ ok: true, empresa: emp });
  } catch (e) {
    console.error("Erro ao atualizar dados da empresa:", e.message);
    res.status(500).json({ error: "Erro ao atualizar dados." });
  }
});

// Contato comercial (vendas)
app.post("/api/companies/contato", async (req, res) => {
  const { nome, email, empresa, mensagem } = req.body || {};
  if (!nome || !email || !mensagem) return res.status(400).json({ error: "Preencha nome, e-mail e mensagem." });
  try {
    await pool.query(
      "INSERT INTO empresas_contatos (nome, email, empresa, mensagem) VALUES (?, ?, ?, ?)",
      [String(nome).trim(), String(email).trim().toLowerCase(), String(empresa || "").trim(), String(mensagem).trim()]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro contato empresas:", e.message);
    res.status(500).json({ error: "Erro ao enviar mensagem." });
  }
});

// Gera Pix para assinatura da empresa
app.post("/api/companies/assinatura/pix", async (req, res) => {
  const { empresaId, plano = "starter" } = req.body || {};
  const valor = await getValorPlano(plano);
  if (!empresaId || valor == null || valor <= 0) return res.status(400).json({ error: "Dados de assinatura inválidos." });
  const emp = await buscarEmpresaPorId(empresaId);
  if (!emp) return res.status(404).json({ error: "Empresa não encontrada." });
  try {
    const body = {
      transaction_amount: valor,
      description: "Assinatura Office Express Companies - " + plano,
      payment_method_id: "pix",
      external_reference: `empresa-${empresaId}-${plano}`,
      payer: { email: emp.email || "empresa@officeexpress.com.br", first_name: (emp.nome || "Empresa").split(" ")[0], last_name: (emp.nome || "Office").split(" ").slice(1).join(" ") || "Office" },
      notification_url: `${BASE_URL}/api/companies/webhook/mp`,
    };
    const pago = await paymentMP.create({ body, requestOptions: { idempotencyKey: `empresa-pix-${empresaId}-${plano}-${Date.now()}` } });
    await pool.query(
      "INSERT INTO empresas_pagamentos (empresa_id, pagamento_id, plano, valor, status, tipo) VALUES (?, ?, ?, ?, 'pendente', 'pix')",
      [empresaId, String(pago.id), plano, valor]
    );
    res.json({
      id: pago.id,
      status: pago.status,
      qr_code: pago.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: pago.point_of_interaction?.transaction_data?.qr_code_base64,
    });
  } catch (e) {
    console.error("Erro assinatura pix empresa:", e.message);
    res.status(500).json({ error: "Erro ao gerar Pix da assinatura." });
  }
});

// Cartão para assinatura da empresa
app.post("/api/companies/assinatura/cartao", async (req, res) => {
  const { empresaId, plano = "starter", card_token } = req.body || {};
  const valor = await getValorPlano(plano);
  if (!empresaId || !card_token || valor == null || valor <= 0) return res.status(400).json({ error: "Dados de assinatura inválidos." });
  const emp = await buscarEmpresaPorId(empresaId);
  if (!emp) return res.status(404).json({ error: "Empresa não encontrada." });
  try {
    const body = {
      transaction_amount: valor,
      description: "Assinatura Office Express Companies - " + plano,
      payment_method_id: "card",
      token: card_token,
      installments: 1,
      payer: { email: emp.email || "empresa@officeexpress.com.br" },
      external_reference: `empresa-${empresaId}-${plano}`,
      notification_url: `${BASE_URL}/api/companies/webhook/mp`,
    };
    const pago = await paymentMP.create({ body, requestOptions: { idempotencyKey: `empresa-card-${empresaId}-${plano}-${Date.now()}` } });
    if (pago.status === "approved") {
      await pool.query("UPDATE empresas SET plano = ?, assinatura_ativa = 1 WHERE id = ?", [plano, empresaId]);
    }
    await pool.query(
      "INSERT INTO empresas_pagamentos (empresa_id, pagamento_id, plano, valor, status, tipo) VALUES (?, ?, ?, ?, ?, 'card')",
      [empresaId, String(pago.id), plano, valor, pago.status === "approved" ? "pago" : "pendente"]
    );
    res.json({ status: pago.status });
  } catch (e) {
    console.error("Erro assinatura cartao empresa:", e.message);
    res.status(500).json({ error: "Erro ao processar cartão." });
  }
});

// Status da assinatura
app.get("/api/companies/assinatura/status/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT pagamento_id FROM empresas_pagamentos WHERE pagamento_id = ?", [String(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: "Pagamento não encontrado." });
    const pago = await paymentMP.get({ id: String(req.params.id) });
    res.json({ status: pago.status });
  } catch (e) {
    res.json({ status: "pending" });
  }
});

// Webhook Mercado Pago da assinatura de empresa
app.post("/api/companies/webhook/mp", async (req, res) => {
  try {
    const data = req.body || {};
    const pagamentoId = data.data && data.data.id ? String(data.data.id) : (data.id ? String(data.id) : null);
    if (!pagamentoId) return res.sendStatus(200);
    const pago = await paymentMP.get({ id: pagamentoId });
    const ref = pago.external_reference || "";
    const m = ref.match(/^empresa-(\d+)-(starter|pro|enterprise)$/);
    if (m && pago.status === "approved") {
      const empresaId = parseInt(m[1], 10);
      const plano = m[2];
      await pool.query("UPDATE empresas SET plano = ?, assinatura_ativa = 1 WHERE id = ?", [plano, empresaId]);
      await pool.query("UPDATE empresas_pagamentos SET status = 'pago', pago_at = NOW() WHERE pagamento_id = ?", [pagamentoId]);
      console.log("✅ Assinatura de empresa", empresaId, "(", plano, ") paga.");
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("Erro webhook empresa:", e.message);
    res.sendStatus(200);
  }
});

// Alterar plano da empresa logada
app.put("/api/companies/plano", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const { plano } = req.body || {};
  if (!["starter", "pro", "enterprise"].includes(plano)) return res.status(400).json({ error: "Plano inválido." });
  try {
    if (plano === "enterprise") {
      await pool.query("UPDATE empresas SET plano = ?, assinatura_ativa = 0 WHERE id = ?", [plano, id]);
      return res.json({ ok: true });
    }
    const valor = await getValorPlano(plano);
    const body = {
      transaction_amount: valor,
      description: "Alteração de plano Office Express Companies - " + plano,
      payment_method_id: "pix",
      external_reference: `empresa-${id}-${plano}`,
      payer: { email: "empresa@officeexpress.com.br", first_name: "Empresa" },
      notification_url: `${BASE_URL}/api/companies/webhook/mp`,
    };
    await paymentMP.create({ body, requestOptions: { idempotencyKey: `empresa-troca-${id}-${plano}-${Date.now()}` } });
    res.json({ ok: true, mensagem: "Gere um novo pagamento para ativar o novo plano." });
  } catch (e) {
    console.error("Erro troca plano:", e.message);
    res.status(500).json({ error: "Erro ao trocar plano." });
  }
});

// Lista currículos autorizados (com consentimento) para empresas com assinatura ativa
app.get("/api/companies/curriculos", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const emp = await buscarEmpresaPorId(id);
  if (!emp) return res.status(404).json({ error: "Empresa não encontrada." });
  if (emp.plano === "enterprise" ? false : !emp.assinatura_ativa) {
    return res.status(403).json({ error: "Empresa sem assinatura ativa." });
  }
  try {
    const cargo = req.query.cargo ? String(req.query.cargo).trim() : "";
    const cidade = req.query.cidade ? String(req.query.cidade).trim() : "";
    const estado = req.query.estado ? String(req.query.estado).trim() : "";

    // Lê do banco PERMANENTE de talentos — os dados sobrevivem à exclusão
    // do pedido original (pendentes +24h, limpeza admin, exclusão de usuário).
    let sql = "SELECT id, nome, cargo, cidade, estado FROM talentos WHERE consentimento = 1";
    const params = [];
    if (cargo) { sql += " AND (cargo LIKE ? OR objetivo LIKE ?)"; params.push("%" + cargo + "%", "%" + cargo + "%"); }
    if (cidade) { sql += " AND cidade LIKE ?"; params.push("%" + cidade + "%"); }
    if (estado) { sql += " AND estado = ?"; params.push(estado); }
    sql += " ORDER BY id DESC LIMIT 200";
    const [rows] = await pool.query(sql, params);

    const curriculos = rows.map((r) => ({
      id: r.id,
      nome: r.nome || "Candidato",
      cargo: r.cargo || "",
      cidade: r.cidade || "",
      estado: r.estado || "",
      experiencia: null,
    }));

    // Contadores
    const [v] = await pool.query("SELECT COUNT(DISTINCT pedido_id) AS c FROM empresas_curriculos_vistos WHERE empresa_id = ?", [id]);
    res.json({ ok: true, curriculos, total: curriculos.length, vistos: v[0].c || 0, contatados: 0 });
  } catch (e) {
    console.error("Erro listar curriculos empresas:", e.message);
    res.status(500).json({ error: "Erro ao buscar currículos." });
  }
});

// Currículos já visualizados pela empresa logada (histórico do portal).
app.get("/api/companies/vistos", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  try {
    const [rows] = await pool.query(
      `SELECT v.pedido_id AS id, MAX(v.visto_em) AS visto_em
       FROM empresas_curriculos_vistos v
       WHERE v.empresa_id = ?
       GROUP BY v.pedido_id
       ORDER BY visto_em DESC
       LIMIT 200`,
      [id]
    );
    const vistos = [];
    for (const r of rows) {
      // Resolve os dados pelo banco permanente de talentos. O visto grava o
      // pedido_id; se o pedido foi apagado, o talento permanece acessível.
      let t = null;
      if (r.id) {
        const [tt] = await pool.query("SELECT id, nome, cargo, cidade, estado FROM talentos WHERE pedido_id = ?", [r.id]);
        t = tt[0] || null;
      }
      if (!t && r.id) {
        // Registros antigos podem ter gravado o id do talento diretamente.
        const [tt2] = await pool.query("SELECT id, nome, cargo, cidade, estado FROM talentos WHERE id = ?", [r.id]);
        t = tt2[0] || null;
      }
      vistos.push({
        id: t ? t.id : r.id,
        nome: t ? t.nome : "Candidato",
        cargo: t ? (t.cargo || "") : "",
        cidade: t ? t.cidade : "",
        estado: t ? t.estado : "",
        visto_em: r.visto_em,
      });
    }
    res.json({ ok: true, vistos });
  } catch (e) {
    console.error("Erro listar vistos:", e.message);
    res.status(500).json({ error: "Erro ao carregar histórico de visualizações." });
  }
});

// Pagamentos da empresa logada (histórico de assinatura).
app.get("/api/companies/pagamentos", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  try {
    const [rows] = await pool.query(
      "SELECT id, plano, valor, status, tipo, created_at, pago_at FROM empresas_pagamentos WHERE empresa_id = ? ORDER BY id DESC",
      [id]
    );
    res.json({ ok: true, pagamentos: rows });
  } catch (e) {
    console.error("Erro listar pagamentos empresa:", e.message);
    res.status(500).json({ error: "Erro ao carregar pagamentos." });
  }
});

// Detalhe de um currículo (registra visualização)
app.get("/api/companies/curriculos/:id/detalhe", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const emp = await buscarEmpresaPorId(id);
  if (!emp) return res.status(404).json({ error: "Empresa não encontrada." });
  if (emp.plano === "enterprise" ? false : !emp.assinatura_ativa) {
    return res.status(403).json({ error: "Empresa sem assinatura ativa." });
  }
  try {
    // Lê do banco PERMANENTE de talentos. O id recebido é o id do talento;
    // se o pedido original já foi apagado, o talento continua acessível.
    const [rows] = await pool.query("SELECT id, pedido_id, dados_json FROM talentos WHERE id = ? AND consentimento = 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Currículo não encontrado." });
    let d = {};
    try { d = JSON.parse(rows[0].dados_json || "{}"); } catch (e) { d = {}; }
    if (!d.consentimento) return res.status(403).json({ error: "Currículo sem autorização para consulta." });

    await pool.query("INSERT IGNORE INTO empresas_curriculos_vistos (empresa_id, pedido_id) VALUES (?, ?)", [id, rows[0].pedido_id || rows[0].id]);

    const arr = (k) => (Array.isArray(d[k]) ? d[k].filter(Boolean) : []);
    const empresas = arr("empresa");
    const cargos = arr("cargo");
    const experiencias = empresas.map(function (e, i) {
      var t = (e || "") + (cargos[i] ? " - " + cargos[i] : "");
      return t || null;
    }).filter(Boolean);

    const cursos = arr("curso");
    const instituicoes = arr("instituicao");
    const formacoes = cursos.map(function (c, i) {
      var t = c || "";
      if (instituicoes[i]) t += " - " + instituicoes[i];
      return t || null;
    }).filter(Boolean);

    res.json({
      ok: true,
      curriculo: {
        id: rows[0].id,
        pedido_id: rows[0].pedido_id,
        nome: d.nome || "Candidato",
        cargo: (Array.isArray(d.cargo) && d.cargo.length ? d.cargo[0] : (d.objetivo || "")).toString(),
        cidade: d.cidade || "",
        estado: d.estado || "",
        telefone: arr("telefone")[0] || "",
        email: d.email || "",
        resumo: d.objetivo || "",
        experiencias: experiencias,
        formacoes: formacoes,
        habilidades: String(d.habilidades || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12),
        idiomas: []
      }
    });
  } catch (e) {
    console.error("Erro detalhe curriculo:", e.message);
    res.status(500).json({ error: "Erro ao abrir currículo." });
  }
});

// Registrar contato com candidato
app.post("/api/companies/contatar/:id", async (req, res) => {
  const id = empresaDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  try {
    await pool.query("INSERT IGNORE INTO empresas_curriculos_vistos (empresa_id, pedido_id) VALUES (?, ?)", [id, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true });
  }
});

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.get("/companies", (req, res) => res.sendFile(path.join(__dirname, "public", "companies.html")));
app.get("/companies/pagar", (req, res) => res.sendFile(path.join(__dirname, "public", "companies-pagar.html")));

// Página de confirmação de email e redefinição de senha (rotas de API de token já tratadas acima)
app.get("/confirmar-email", (req, res) => res.sendFile(path.join(__dirname, "public", "confirmar-email.html")));
app.get("/recuperar-senha", (req, res) => res.sendFile(path.join(__dirname, "public", "recuperar-senha.html")));

// Fluxo antigo removido — redireciona para o fluxo atual (seleção de modelo).
// Essas rotas apontavam para páginas legadas (curriculo, visualizar, loading,
// carrinho e pagamentos antigos) que foram removidas em favor do fluxo
// editor -> preview -> /api/pedidos -> pagamento -> sucesso.
const ROTAS_ANTIGAS = [
  "/curriculo", "/visualizar", "/loading", "/carrinho",
  "/pagamentototal", "/pagamentoanalise", "/pagamentototalanalise",
];
ROTAS_ANTIGAS.forEach((rota) => {
  app.get(rota, (req, res) => res.redirect("/modelos"));
});

// Serve páginas estáticas com extensão .html automaticamente
app.get("/:page", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Rota não encontrada" });
  const file = path.join(__dirname, "public", `${req.params.page}.html`);
  res.sendFile(file, (err) => { if (err) res.status(404).send("Página não encontrada"); });
});

// Handlers globais: impedem que erros não capturados (ex: falha momentânea
// de banco) derrubem o processo e causem "Service Unavailable" no Render.
process.on("uncaughtException", (err) => {
  console.error("❌ Exceção não capturada (mantendo o servidor ativo):", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Rejeição não tratada (mantendo o servidor ativo):", reason && reason.message ? reason.message : reason);
});

app.listen(PORT, () => {
  console.log(`✅ Office Express rodando em http://localhost:${PORT}`);
});

// ---------------------------------------------------------------------------
// Limpeza semanal automática dos logs de tráfego e visitas.
// Todo domingo às 00h00 (horário de Brasília) apaga os registros de visitas e
// eventos, que alimentam as métricas de visitas, páginas mais acessadas,
// origens, tendência e rejeição do painel admin.
// ---------------------------------------------------------------------------
cron.schedule(
  "0 0 0 * * 0",
  async () => {
    console.log("🧹 Limpeza semanal: apagando logs de tráfego e visitas...");
    try {
      const [r1] = await pool.query("DELETE FROM visitas");
      const [r2] = await pool.query("DELETE FROM eventos");
      console.log(`✅ Logs apagados (${r1.affectedRows} visitas, ${r2.affectedRows} eventos).`);
    } catch (e) {
      console.error("❌ Erro na limpeza semanal dos logs:", e.message);
    }
  },
  { timezone: "America/Sao_Paulo" }
);
console.log("🗓️ Limpeza semanal agendada: todo domingo às 00h00 (Brasília).");

// ---------------------------------------------------------------------------
// Fechamento mensal das comissões dos parceiros (Opção 2).
// Todo dia 05 às 00h00 (Brasília), fecha o mês anterior e registra, para cada
// parceiro, o valor de comissão a pagar referente às vendas pagas daquele mês.
// O admin marca como "pago" quando faz o repasse. Não zera nem apaga nada:
// apenas registra o valor mensal de forma imutável.
// ---------------------------------------------------------------------------
async function fecharComissoesMes(mesRef) {
  const [rows] = await pool.query(
    `SELECT parceiro_id, SUM(valor * comissao_pct / 100) AS total
     FROM transacoes
     WHERE tipo='venda' AND parceiro_id IS NOT NULL AND comissao_pct IS NOT NULL
       AND DATE_FORMAT(created_at, '%Y-%m') = ?
     GROUP BY parceiro_id`,
    [mesRef]
  );
  for (const r of rows) {
    await pool.query(
      "INSERT INTO pagamentos_parceiros (parceiro_id, mes_ref, valor) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
      [r.parceiro_id, mesRef, Number(r.total) || 0]
    );
  }
  console.log(`🗓️ Comissões do mês ${mesRef} fechadas (${rows.length} parceiro(s)).`);
  return rows.length;
}

cron.schedule(
  "0 0 5 * *",
  async () => {
    console.log("🗓️ Fechamento mensal de comissões: dia 05 às 00h00 (Brasília)...");
    try {
      const hoje = new Date();
      // Calcula o mês anterior (0 = janeiro).
      const mesAnt = hoje.getMonth() - 1 < 0 ? 11 : hoje.getMonth() - 1;
      const anoAnt = hoje.getMonth() - 1 < 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
      const mesRef = `${anoAnt}-${String(mesAnt + 1).padStart(2, "0")}`;
      await fecharComissoesMes(mesRef);
    } catch (e) {
      console.error("❌ Erro no fechamento mensal de comissões:", e.message);
    }
  },
  { timezone: "America/Sao_Paulo" }
);
console.log("🗓️ Fechamento mensal agendado: dia 05 às 00h00 (Brasília).");

// ---------------------------------------------------------------------------
// Expiração de pedidos pendentes (currículos não pagos).
// Pedidos com status 'pendente' criados há mais de 24 horas são apagados do
// sistema. Executa na inicialização do servidor e depois a cada hora, para
// que nenhum pendente sobreviva por mais de 24h + 1h no máximo.
// ---------------------------------------------------------------------------
async function expirarPedidosPendentes() {
  try {
    // LGPD: currículos pendentes NÃO entram no banco de talentos. Somente
    // pedidos pagos são arquivados (consentimento + contraprestação). O
    // pendente expirado é simplesmente removido do sistema.
    const [r] = await pool.query(
      "DELETE FROM pedidos WHERE status = 'pendente' AND created_at < (NOW() - INTERVAL 24 HOUR)"
    );
    if (r.affectedRows > 0) {
      console.log(`🧹 Pedidos pendentes expirados: ${r.affectedRows} pedido(s) com mais de 24h apagado(s).`);
    }
    return r.affectedRows;
  } catch (e) {
    console.error("❌ Erro ao expirar pedidos pendentes:", e.message);
    return 0;
  }
}

// Roda na inicialização (garante a regra mesmo que o servidor fique offline).
expirarPedidosPendentes();
// Roda a cada hora (minuto 7 para não coincidir com outras rotinas).
cron.schedule(
  "0 7 * * * *",
  async () => {
    await expirarPedidosPendentes();
  },
  { timezone: "America/Sao_Paulo" }
);
console.log("🗓️ Expiração de pedidos pendentes agendada: a cada hora (24h de tolerância).");
