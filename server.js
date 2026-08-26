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

// Endpoint de tracking: recebe pageviews e eventos de interação. Usado com
// navigator.sendBeacon no frontend, por isso aceita tanto JSON quanto texto.
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

    if (!sessao) return res.status(400).json({ error: "Sessão ausente." });

    if (tipo === "pageview") {
      await pool.query(
        `INSERT INTO visitas
          (sessao, path, pagina, referer, origem, user_agent, dispositivo, ip, uf, primeira_visita)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessao, path, pagina, referer, origem, ua, dispositivo, ip, uf, body.primeiraVisita ? 1 : 0]
      );
    } else {
      await pool.query(
        `INSERT INTO eventos (sessao, tipo, valor, pagina) VALUES (?, ?, ?, ?)`,
        [sessao, String(tipo).slice(0, 60), valor, pagina || path]
      );
    }
    res.json({ ok: true });
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

    // Visitantes online agora (pageview nos últimos 5 minutos).
    const [online] = await pool.query(
      "SELECT COUNT(DISTINCT sessao) AS c FROM visitas WHERE created_at >= (NOW() - INTERVAL 5 MINUTE)"
    );

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
      onlineAgora: online[0].c || 0,
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

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + apiKey;
    const body = {
      contents: [{ parts: parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 4096 },
    };

    // Retry com backoff para erros temporários (alta demanda, rate limit, quota, etc.).
    // Para 429 (quota/rate limit), aguarda o tempo sugerido pela própria API quando disponível.
    let resp = null;
    const maxTentativas = 4;
    const backoffs = [0, 5000, 12000, 20000]; // backoff base (ms) para cada tentativa
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
      console.error("Erro temporário na API Gemini (tentativa " + (i + 1) + "): status " + status);
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
