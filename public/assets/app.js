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
    return [
      { href: "/", label: "Início" },
      { href: "/modelos", label: "Modelos" },
    ].map((l) => {
      const cls = ativo && l.href !== "/" && l.href.indexOf(ativo) !== -1 ? ' class="ativo"' : "";
      const clsHome = ativo === "" && l.href === "/" ? ' class="ativo"' : "";
      return '<a href="' + l.href + '"' + (cls || clsHome) + ">" + l.label + "</a>";
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
          : '';
        nav.innerHTML = linksComuns + areaConta;
      }

      if (mobile) {
        const areaContaMobile = usuario
          ? '<div class="mobile-user">' +
              '<span class="user-avatar">' + iniciais(usuario.nome) + '</span>' +
              '<span class="user-nome">' + (usuario.nome || "Minha conta") + '</span>' +
            '</div>' +
            '<a href="/minha-conta">Minha conta</a>' +
            '<button type="button" class="mobile-sair" onclick="App.logout();return false;">Sair</button>'
          : '';
        mobile.innerHTML = '<div class="mobile-menu-inner">' + linksComuns + areaContaMobile + '</div>';
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

  return { api, authMe, mostrarAlerta, limparAlerta, logout, formatarPreco, carregarHeader };
})();

document.addEventListener("DOMContentLoaded", function () {
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
