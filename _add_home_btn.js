const fs = require("fs");
const snippet = `
      <a class="auth-home-btn" href="/" aria-label="Voltar para a página inicial" title="Voltar para a home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5"/>
          <path d="M5 9.5V21h14V9.5"/>
          <path d="M10 21v-6h4v6"/>
        </svg>
      </a>`;

const paginas = [
  ["public/login.html", '<div class="auth-card">', "auth-card"],
  ["public/cadastro.html", '<div class="auth-card">', "auth-card"],
  ["public/login-parceiro.html", '<div class="auth-card">', "auth-card"],
  ["public/login-admin.html", '<div class="auth-card">', "auth-card"],
  ["public/esqueci-senha.html", '<div class="auth-card">', "auth-card"],
  ["public/recuperar-senha.html", '<div class="auth-card">', "auth-card"],
  ["public/confirmar-email.html", '<div class="auth-card" style="text-align:center">', "auth-card"],
  ["public/convite.html", '<div class="card">', "card"],
];

let falha = false;
for (const [arq, alvo, nome] of paginas) {
  let html = fs.readFileSync(arq, "utf8");
  if (html.includes("auth-home-btn")) { console.log("JA TEM", arq); continue; }
  const idx = html.indexOf(alvo);
  if (idx === -1) { console.log("ALVO_NAO_ENCONTRADO", arq, alvo); falha = true; continue; }
  const pos = idx + alvo.length;
  html = html.slice(0, pos) + "\n" + snippet + html.slice(pos);
  fs.writeFileSync(arq, html);
  console.log("OK", arq, "(" + nome + ")");
}
process.exit(falha ? 1 : 0);
