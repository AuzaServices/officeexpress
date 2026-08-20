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

  function carregarHeader(ativo) {
    const nav = document.getElementById("navMenu");
    if (!nav) return;
    authMe().then((usuario) => {
      const itens = [
        '<a href="/modelos">Modelos</a>',
        usuario
          ? '<a href="/minha-conta">Minha Conta</a>'
          : '<a href="/login">Entrar</a>',
        usuario
          ? '<a href="#" onclick="App.logout();return false;">Sair</a>'
          : '<a href="/cadastro" class="btn btn-primary" style="margin-left:8px">Criar conta</a>',
      ];
      nav.innerHTML = itens.join("");
      // destaca página atual
      const links = nav.querySelectorAll("a");
      links.forEach((a) => {
        if (ativo && a.getAttribute("href").indexOf(ativo) !== -1) a.style.color = "var(--brand)";
      });
    });
  }

  return { api, authMe, mostrarAlerta, limparAlerta, logout, formatarPreco, carregarHeader };
})();

document.addEventListener("DOMContentLoaded", function () {
  // Menu mobile
  const h = document.getElementById("hamburguer");
  if (h) {
    h.addEventListener("click", function () {
      document.getElementById("mobileMenu").classList.toggle("open");
    });
  }
  window.App.carregarHeader();
});
