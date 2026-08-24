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
const { CARTAS, gerarCartaPDF } = require("./lib/cartas");
const { enviarConfirmacao, enviarRecuperacao } = require("./lib/email");

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function gerarToken() {
  return crypto.randomBytes(32).toString("hex");
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
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha) return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "E-mail inválido." });
  if (!validarSenha(senha)) return res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres, com letras e números." });

  const em = String(email).toLowerCase().trim();
  const [existe] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [em]);
  if (existe.length) return res.status(409).json({ error: "Já existe uma conta com este e-mail." });

  const hash = await bcrypt.hash(senha, 10);
  const [result] = await pool.query("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)", [nome.trim(), em, hash]);
  const usuarioId = result.insertId;

  // Gera token de confirmação e envia e-mail
  const token = gerarToken();
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO email_tokens (usuario_id, tipo, token, expira_em) VALUES (?, 'confirmacao', ?, ?)",
    [usuarioId, token, expira]
  );
  await enviarConfirmacao(em, nome.trim(), token);

  // Já autentica a sessão (email ainda não confirmado)
  req.session.usuarioId = usuarioId;
  req.session.save((err) => {
    if (err) {
      console.error("❌ Falha ao salvar sessão de cadastro:", err.message);
      return res.status(500).json({ error: "Conta criada, mas não foi possível iniciar a sessão. Faça login." });
    }
    res.json({ success: true, message: "Conta criada! Confirme seu e-mail pelo link enviado.", usuario: { id: usuarioId, nome: nome.trim(), email: em, email_confirmado: 0 } });
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

app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ error: "Informe e-mail e senha." });
  const em = String(email).toLowerCase().trim();
  const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [em]);
  if (!rows.length) return res.status(401).json({ error: "E-mail ou senha incorretos." });
  const match = await bcrypt.compare(senha, rows[0].senha);
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

// Configuração pública de pagamento (public key do MP + preço)
app.get("/api/config/pagamento", async (req, res) => {
  const preco = await getPreco();
  res.json({ publicKey: process.env.MP_PUBLIC_KEY || "", preco });
});

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
app.post("/api/pedidos", async (req, res) => {
  const { modelo, dados, tipo = "curriculo" } = req.body || {};
  const catalogo = tipo === "carta" ? CARTAS : MODELOS;
  if (!modelo || !catalogo.find((m) => m.id === modelo)) return res.status(400).json({ error: "Modelo inválido." });
  if (!dados || !dados.nome) return res.status(400).json({ error: "Dados do currículo incompletos." });
  const valor = await getPreco();
  // Garante que a foto (base64) nunca seja persistida no banco — além de
  // não ser mais usada no currículo, ela inchava a tabela pedidos.
  const dadosLimpos = { ...(dados || {}) };
  if (typeof dadosLimpos === "object" && "foto" in dadosLimpos) delete dadosLimpos.foto;
  const [result] = await pool.query(
    "INSERT INTO pedidos (usuario_id, modelo, dados_json, valor) VALUES (?, ?, ?, ?)",
    [usuarioDaSessao(req), modelo, JSON.stringify({ ...dadosLimpos, _tipo: tipo }), valor]
  );
  res.json({ pedido: { id: result.insertId, modelo, tipo, valor } });
});

app.get("/api/pedidos/meus", async (req, res) => {
  const id = usuarioDaSessao(req);
  if (!id) return res.status(401).json({ error: "Não autenticado." });
  const [rows] = await pool.query(
    "SELECT id, modelo, valor, status, created_at, pago_at FROM pedidos WHERE usuario_id = ? ORDER BY id DESC",
    [id]
  );
  res.json({ pedidos: rows });
});

// ---------------------------------------------------------------------------
// Pagamento (Mercado Pago: Pix e Cartão)
// ---------------------------------------------------------------------------
async function registrarPedidoPago(pedidoId, pagamentoId, tipo) {
  await pool.query(
    "UPDATE pedidos SET status = 'pago', pagamento_id = ?, pagamento_tipo = ?, pago_at = NOW(), download_token = ? WHERE id = ?",
    [pagamentoId, tipo, gerarToken(), pedidoId]
  );
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
  if (pedido.status !== "pago") return res.status(403).json({ error: "Pagamento não confirmado." });

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
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const ehIOS = /iphone|ipad|ipod/.test(ua) || (ua.indexOf("macintosh") !== -1 && ua.indexOf("mobile") !== -1);
    const disposicao = ehIOS ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposicao}; filename="${arquivoNome}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error("❌ Erro ao gerar arquivo:", err.message);
    res.status(500).json({ error: "Erro ao gerar o arquivo." });
  }
});

// Retorna modelo + dados do pedido pago para o cliente gerar o PDF
// a partir da IMAGEM do preview (html2canvas) — sem depender do Chromium
// no servidor.
app.get("/api/pedidos/:id/dados", async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM pedidos WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado." });
  const pedido = rows[0];
  if (pedido.status !== "pago") return res.status(403).json({ error: "Pagamento não confirmado." });
  let dados;
  try { dados = JSON.parse(pedido.dados_json || "{}"); } catch (e) { dados = {}; }
  res.json({ modelo: pedido.modelo, tipo: dados._tipo || "curriculo", dados });
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
  const [pedidos] = await pool.query("SELECT COUNT(*) c, COALESCE(SUM(CASE WHEN status='pago' THEN valor ELSE 0 END),0) faturamento, SUM(status='pago') pagos FROM pedidos");
  const [usuarios] = await pool.query("SELECT COUNT(*) c FROM usuarios");
  const [porModelo] = await pool.query("SELECT modelo, COUNT(*) c FROM pedidos WHERE status='pago' GROUP BY modelo ORDER BY c DESC");
  const preco = await getPreco();
  res.json({
    totalPedidos: pedidos[0].c,
    pagos: pedidos[0].pagos || 0,
    faturamento: pedidos[0].faturamento,
    totalUsuarios: usuarios[0].c,
    porModelo,
    preco,
  });
});

app.get("/api/admin/pedidos", protegerAdmin, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT p.*, u.nome AS usuario_nome, u.email AS usuario_email FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id ORDER BY p.id DESC LIMIT 200"
  );
  res.json({ pedidos: rows });
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

// Upload temporário do currículo enviado na página de análise, para que a
// prévia "Original" exiba o documento de forma fiel. O arquivo é recebido em
// base64 via JSON.
app.post("/api/upload-curriculo", async (req, res) => {
  try {
    const { nome, base64 } = req.body || {};
    if (!nome || !base64) return res.status(400).json({ error: "Dados inválidos." });
    const ext = path.extname(nome).toLowerCase();
    if (ext !== ".pdf") return res.status(400).json({ error: "Formato não suportado." });
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
// Páginas
// ---------------------------------------------------------------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

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
