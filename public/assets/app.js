// Helpers compartilhados do Office Express
window.App = (function () {
  async function api(url, opts = {}) {
    const resp = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...opts,
    });
    let data = {};
    try { data = await resp.json(); } catch (e) { /* não-JSON */ }
    if (!resp.ok && !data.error) data.error = "Erro no servidor.";
    return { ok: resp.ok, status: resp.status, data };
  }

  async function authMe() {
    const { ok, data } = await api("/api/auth/me");
    return ok ? data.usuario : null;
  }

  function mostrarAlerta(id, msg, tipo) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "alert show alert-" + (tipo || "error");
    el.textContent = msg;
  }

  function limparAlerta(id) {
    const el = document.getElementById(id);
    if (el) { el.className = "alert"; el.textContent = ""; }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    // Ao deslogar, limpa o código do parceiro salvo no navegador. Assim, se
    // outra pessoa usar o mesmo dispositivo, ela não herda a indicação de
    // quem saiu — só é atribuída ao parceiro se clicar no link dele. O vínculo
    // da conta (parceiro_id) permanece no servidor e não se perde.
    limparRef();
    window.location.href = "/";
  }

  // Logout exclusivo da plataforma Companies (sessão de empresa separada).
  async function logoutEmpresa() {
    await api("/api/companies/logout", { method: "POST" });
    window.location.href = "/companies";
  }

  // Dispara o formulário de login da empresa quando a página companies.html
  // está carregada (ela expõe window.mostrarForm).
  function mostrarFormCompanies(tipo) {
    if (typeof window.mostrarForm === "function") window.mostrarForm(tipo);
    else window.location.href = "/companies";
  }

  function formatarPreco(v) {
    return "R$ " + (typeof v === "number" ? v : parseFloat(v || 0)).toFixed(2).replace(".", ",");
  }

  function iniciais(nome) {
    if (!nome) return "?";
    const partes = nome.trim().split(/\s+/);
    const a = partes[0] ? partes[0][0] : "";
    const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
    return (a + b).toUpperCase();
  }

  function linksBase(ativo) {
    const links = [
      { href: "/", label: "Início" },
      { href: "/modelos", label: "Curriculum", dropdown: [{ href: "/modelos", label: "Modelos" }, { href: "/analise", label: "Análise de Currículo (Gratuito)" }] },
      { href: "#", label: "Ferramentas", dropdown: [{ href: "/cartas", label: "Gerar carta de apresentação" }] },
    ];
    return links.map((l) => {
      const cls = ativo && l.href !== "/" && l.href.indexOf(ativo) !== -1 ? ' class="ativo"' : "";
      const clsHome = ativo === "" && l.href === "/" ? ' class="ativo"' : "";
      if (!l.dropdown) return '<a href="' + l.href + '"' + (cls || clsHome) + ">" + l.label + "</a>";
      const dropdown = l.dropdown.map((item) => '<a href="' + item.href + '">' + item.label + '</a>').join("");
      return '<div class="nav-dropdown"><a href="' + l.href + '" class="nav-dropdown-trigger' + ((cls || clsHome).replace(' class="', ' ' ).replace('"', '')) + '">' + l.label + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></a><div class="nav-dropdown-menu">' + dropdown + '</div></div>';
    }).join("");
  }

  function carregarHeader(ativo) {
    const nav = document.getElementById("navMenu");
    const mobile = document.getElementById("mobileMenu");
    if (!nav && !mobile) return;

    // -----------------------------------------------------------------
    // Header 100% dedicado à plataforma Office Express | Companies.
    // Nada do site de clientes (Curriculum, Ferramentas, avatar do
    // cliente): navegação própria e conta da EMPRESA logada.
    // -----------------------------------------------------------------
    if (ativo === "companies") {
      api("/api/companies/me").then((r) => {
        const empresa = r && r.ok ? r.data.empresa : null;
        const linksCompanies =
          '<a href="/companies" class="ativo">Para empresas</a>' +
          '<a href="/companies" onclick="irParaSecao(\'planos\');return false;">Planos</a>' +
          '<a href="/" >Office Express</a>';

        const areaEmpresa = empresa
          ? '<div class="user-menu" id="userMenu">' +
              '<button class="user-menu-btn" id="userMenuBtn" aria-haspopup="true" aria-expanded="false">' +
                '<span class="user-avatar">' + iniciais(empresa.nome) + '</span>' +
                '<span class="user-nome">' + (empresa.nome || "Empresa").split(" ")[0] + '</span>' +
                '<svg class="user-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
              '</button>' +
              '<div class="user-dropdown" id="userDropdown">' +
                '<button type="button" class="user-dropdown-sair" onclick="App.logoutEmpresa();return false;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>Sair</button>' +
              '</div>' +
            '</div>'
          : '<a href="/companies" onclick="mostrarFormCompanies(\'login\');return false;" class="btn-login">Entrar</a>';

        if (nav) nav.innerHTML = linksCompanies + areaEmpresa;

        if (mobile) {
          const areaEmpresaMobile = empresa
            ? '<div class="mobile-user">' +
                '<span class="user-avatar">' + iniciais(empresa.nome) + '</span>' +
                '<span class="user-nome">' + (empresa.nome || "Empresa") + '</span>' +
              '</div>' +
              '<button type="button" class="mobile-sair" onclick="App.logoutEmpresa();return false;">Sair</button>'
            : '<a href="/companies" onclick="mostrarFormCompanies(\'login\');return false;" class="btn-login-mobile">Entrar</a>';
          mobile.innerHTML = '<div class="mobile-menu-inner">' + linksCompanies + areaEmpresaMobile + '</div>';
        }

        setupUserDropdown();
      });
      return;
    }

    authMe().then((usuario) => {
      const linksComuns = linksBase(ativo);

      if (nav) {
        const areaConta = usuario
          ? '<div class="user-menu" id="userMenu">' +
              '<button class="user-menu-btn" id="userMenuBtn" aria-haspopup="true" aria-expanded="false">' +
                '<span class="user-avatar">' + iniciais(usuario.nome) + '</span>' +
                '<span class="user-nome">' + (usuario.nome || "Minha conta").split(" ")[0] + '</span>' +
                '<svg class="user-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
              '</button>' +
              '<div class="user-dropdown" id="userDropdown">' +
                '<a href="/minha-conta"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Minha conta</a>' +
                '<button type="button" class="user-dropdown-sair" onclick="App.logout();return false;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>Sair</button>' +
              '</div>' +
            '</div>'
          : '<a href="/login" class="btn-login">Login</a>';
        nav.innerHTML = linksComuns + areaConta;
      }

      if (mobile) {
        const linksMobile = linksBase(ativo).replace(/<div class="nav-dropdown">/g, '<div class="mobile-nav-group">').replace(/<div class="nav-dropdown-menu">/g, '<div class="mobile-nav-sub">');
        const areaContaMobile = usuario
          ? '<div class="mobile-user">' +
              '<span class="user-avatar">' + iniciais(usuario.nome) + '</span>' +
              '<span class="user-nome">' + (usuario.nome || "Minha conta") + '</span>' +
            '</div>' +
            '<a href="/minha-conta">Minha conta</a>' +
            '<button type="button" class="mobile-sair" onclick="App.logout();return false;">Sair</button>'
          : '<a href="/login" class="btn-login-mobile">Login</a>';
        mobile.innerHTML = '<div class="mobile-menu-inner">' + linksMobile + areaContaMobile + '</div>';
      }

      setupUserDropdown();
    });
  }

  function setupUserDropdown() {
    const btn = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userMenu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const abrir = !menu.classList.contains("open");
      menu.classList.toggle("open", abrir);
      btn.setAttribute("aria-expanded", abrir);
    });
    document.addEventListener("click", function () {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  // ---------------------------------------------------------------------
  // Rastreamento de tráfego (pageviews e eventos) via navigator.sendBeacon.
  // Usa um id de sessão guardado em localStorage, sem depender de cookies,
  // para as métricas de fluxo de entrada e rejeição no painel admin.
  // ---------------------------------------------------------------------
  var SESS_KEY = "oe_sessao";
  var SESS_T_KEY = "oe_sessao_t";
  var SESS_TTL = 30 * 60 * 1000; // 30 min de inatividade = nova visita
  var sessaoAtual = (function () {
    try { return localStorage.getItem(SESS_KEY); } catch (e) { return ""; }
  })();

  function novaSessao() {
    var s = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem(SESS_KEY, s);
      localStorage.setItem(SESS_T_KEY, String(Date.now()));
    } catch (e) { /* ignora */ }
    sessaoAtual = s;
    return s;
  }

  function tocarSessao() {
    try { localStorage.setItem(SESS_T_KEY, String(Date.now())); } catch (e) { /* ignora */ }
  }

  // Devolve a sessão atual ou cria uma nova se o visitante voltou após o
  // tempo de inatividade (assim um retorno conta como uma nova visita).
  function obterSessao() {
    var s = "", t = 0;
    try {
      s = localStorage.getItem(SESS_KEY) || "";
      t = Number(localStorage.getItem(SESS_T_KEY)) || 0;
    } catch (e) { /* ignora */ }
    if (s && (!t || (Date.now() - t) < SESS_TTL)) {
      sessaoAtual = s;
    } else {
      s = novaSessao();
    }
    return s;
  }

  // ---------------------------------------------------------------------
  // Código do parceiro (ref) vindo do link de compartilhamento.
  // Captura o ?ref= da URL, persiste em localStorage e inclui em todos os
  // beacons de tracking e na criação de pedidos para atribuir a comissão.
  // ---------------------------------------------------------------------
  var REF_KEY = "oe_ref";
  function obterRef() {
    // O ?ref= da URL atual tem prioridade: ao entrar pelo link do parceiro,
    // ele sempre atualiza o vínculo salvo. Isso evita que um ref antigo
    // (de um teste/anterior) continue valendo e deixe o cadastro/pedido sem
    // atribuição ao parceiro correto.
    var m = window.location.search.match(/[?&]ref=([^&]+)/);
    if (m) {
      var refAtual = decodeURIComponent(m[1]).slice(0, 40);
      try { localStorage.setItem(REF_KEY, refAtual); } catch (e) { /* ignora */ }
      return refAtual;
    }
    // Sem ?ref= na URL, usa o vínculo persistido anteriormente (para não
    // perder o parceiro quando o usuário navega para fora da rota do link).
    var ref = "";
    try { ref = localStorage.getItem(REF_KEY) || ""; } catch (e) { ref = ""; }
    return ref;
  }
  function limparRef() {
    try { localStorage.removeItem(REF_KEY); } catch (e) { /* ignora */ }
  }

  // Devolve o código do parceiro apenas quando a rota atual é a do link dele
  // (contém ?ref=). O ref não é persistido para o tracking: assim os acessos e
  // eventos só são atribuídos ao parceiro quando o visitante está de fato na
  // página do link de compartilhamento, não em qualquer página depois.
  function refDaRota() {
    var m = window.location.search.match(/[?&]ref=([^&]+)/);
    if (!m) return "";
    try { return decodeURIComponent(m[1]).slice(0, 40); } catch (e) { return ""; }
  }

  // Envia um beacon de tracking sem bloquear a navegação. Retorna true se
  // conseguiu usar sendBeacon (fallback para fetch em navegadores antigos).
  function beacon(dados) {
    var s = obterSessao();
    tocarSessao();
    dados.sessao = s;
    var ref = refDaRota();
    if (ref) dados.parceiro = ref;
    var blob = new Blob([JSON.stringify(dados)], { type: "application/json" });
    try {
      if (navigator.sendBeacon) { return navigator.sendBeacon("/api/track", blob); }
    } catch (e) { /* ignora */ }
    try {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados), keepalive: true }).catch(function () {});
    } catch (e) { /* ignora */ }
    return false;
  }

  function registrarPageview() {
    var path = window.location.pathname + window.location.search;
    var pagina = path.split("/").filter(Boolean).join("/") || "inicio";
    var primeira = false;
    var data = { tipo: "pageview", path: path, pagina: pagina, referer: document.referrer || "" };
    // Marca como "primeira visita" apenas no primeiro pageview desta sessão de
    // navegação (resetado quando o navegador é fechado). Não usa o path para
    // não contar cada página como uma visita separada.
    try {
      primeira = !sessionStorage.getItem("oe_pv_visitou");
      if (primeira) sessionStorage.setItem("oe_pv_visitou", "1");
    } catch (e) { primeira = false; }
    data.primeiraVisita = primeira;
    beacon(data);
  }

  // Registra um evento de conversão (ex.: abrir editor, gerar PDF, pagamento).
  function trackEvento(tipo, valor) {
    beacon({ tipo: tipo, valor: valor || "", pagina: window.location.pathname });
  }

  // ---------------------------------------------------------------------
  // "Online agora" em tempo real: envia um heartbeat (sinal de vida) a cada
  // poucos segundos e avisa o servidor quando a página é fechada, para que o
  // contador de visitantes online suba na entrada e zere na saída.
  // ---------------------------------------------------------------------
  var heartbeatTimer = null;
  function enviarHeartbeat() {
    beacon({ tipo: "heartbeat" });
  }
  function sairDaSessao() {
    try { navigator.sendBeacon("/api/track", new Blob([JSON.stringify({ tipo: "sair", sessao: sessaoAtual })], { type: "application/json" })); } catch (e) { /* ignora */ }
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }
  function iniciarHeartbeat() {
    enviarHeartbeat();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(enviarHeartbeat, 15000);
    // Detecta o fechamento da aba/navegação para remover a sessão na hora.
    window.addEventListener("pagehide", sairDaSessao);
    window.addEventListener("beforeunload", sairDaSessao);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sairDaSessao();
      else if (document.visibilityState === "visible") enviarHeartbeat();
    });
  }

  return { api, authMe, mostrarAlerta, limparAlerta, logout, logoutEmpresa, mostrarFormCompanies, formatarPreco, carregarHeader, track: trackEvento, registrarPageview, iniciarHeartbeat, obterRef, limparRef };
})();

document.addEventListener("DOMContentLoaded", function () {
  const paginaPainel = /(^|\/)(painel|painel-parceiro|login-parceiro)(?:\.html)?(?:$|\?)/i.test(window.location.pathname + window.location.search);
  if (!paginaPainel) {
    // Captura e persiste o código do parceiro (ref) vindo do ?ref= da URL.
    // Isso guarda o vínculo no navegador para uso no cadastro e na criação
    // de pedidos (comissão), sem afetar o tracking (que usa refDaRota).
    try { window.App.obterRef && window.App.obterRef(); } catch (e) { /* ignora */ }
    // Registra a visita na página para as métricas de tráfego do painel.
    try { window.App.registrarPageview && window.App.registrarPageview(); } catch (e) { /* ignora */ }
    // Mantém o visitante "online agora" em tempo real (heartbeat + saída).
    try { window.App.iniciarHeartbeat && window.App.iniciarHeartbeat(); } catch (e) { /* ignora */ }
  }
  if (!paginaPainel) {
    document.body.classList.add("page-enter");
    document.body.classList.add("motion-ready");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.add("carregada"); });
    });

    const elementosRevelaveis = document.querySelectorAll(
      "body > section, body > main, body > main > section, body > .auth-page, body > .container-form"
    );
    elementosRevelaveis.forEach(function (elemento) { elemento.setAttribute("data-reveal", ""); });

    if ("IntersectionObserver" in window) {
      const observador = new IntersectionObserver(function (entradas, observer) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          entrada.target.classList.add("revelado");
          observer.unobserve(entrada.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
      elementosRevelaveis.forEach(function (elemento) { observador.observe(elemento); });
    } else {
      elementosRevelaveis.forEach(function (elemento) { elemento.classList.add("revelado"); });
    }
  }

  // Menu mobile
  const h = document.getElementById("hamburguer");
  const mobileMenu = document.getElementById("mobileMenu");
  if (h && mobileMenu) {
    h.addEventListener("click", function () {
      const abrir = !mobileMenu.classList.contains("open");
      mobileMenu.classList.toggle("open", abrir);
      h.classList.toggle("aberto", abrir);
      h.setAttribute("aria-expanded", abrir);
    });
  }
  window.App.carregarHeader();
});
