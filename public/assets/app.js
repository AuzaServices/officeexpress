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
    window.location.href = "/";
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
  var sessaoAtual = (function () {
    try { return localStorage.getItem(SESS_KEY); } catch (e) { return ""; }
  })();

  function novaSessao() {
    var s = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(SESS_KEY, s); } catch (e) { /* ignora */ }
    sessaoAtual = s;
    return s;
  }

  // Envia um beacon de tracking sem bloquear a navegação. Retorna true se
  // conseguiu usar sendBeacon (fallback para fetch em navegadores antigos).
  function beacon(dados) {
    if (!sessaoAtual) sessaoAtual = novaSessao();
    dados.sessao = sessaoAtual;
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
    try {
      var chave = "oe_pv_" + path;
      primeira = !sessionStorage.getItem(chave);
      if (primeira) sessionStorage.setItem(chave, "1");
    } catch (e) { primeira = false; }
    data.primeiraVisita = primeira;
    beacon(data);
  }

  // Registra um evento de conversão (ex.: abrir editor, gerar PDF, pagamento).
  function trackEvento(tipo, valor) {
    beacon({ tipo: tipo, valor: valor || "", pagina: window.location.pathname });
  }

  return { api, authMe, mostrarAlerta, limparAlerta, logout, formatarPreco, carregarHeader, track: trackEvento, registrarPageview };
})();

document.addEventListener("DOMContentLoaded", function () {
  const paginaPainel = /(^|\/)painel(?:\.html)?(?:$|\?)/i.test(window.location.pathname + window.location.search);
  if (!paginaPainel) {
    // Registra a visita na página para as métricas de tráfego do painel.
    try { window.App.registrarPageview && window.App.registrarPageview(); } catch (e) { /* ignora */ }
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
