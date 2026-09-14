const fs = require("fs");

// ============ 2) app.js: tornar o sino idempotente de verdade ============
// nav.innerHTML é reescrito a cada carregarHeader() (remove o sino desktop),
// mas o clone mobile (fora da nav) persiste — a 2ª chamada inseria um 2º clone.
// Agora: remove clones antigos antes de inserir e registra listeners só 1x.
let app = fs.readFileSync("public/assets/app.js", "utf8");

const oldIns = `    // Mobile: insere à esquerda do hambúrguer (dentro do wrap do header).
    // Desktop: insere à direita do dropdown do avatar (fim da nav).
    // Idempotente: carregarHeader pode rodar mais de uma vez na mesma página
    // (a página chama App.carregarHeader() e o app.js chama de novo no
    // DOMContentLoaded). Sem esta guarda, o sino mobile era duplicado —
    // por isso apareciam DOIS sinos no painel do cliente.
    if (document.getElementById("notificWrap")) return;

    if (hamburger && hamburger.parentNode) {`;
const newIns = `    // Mobile: insere à esquerda do hambúrguer (dentro do wrap do header).
    // Desktop: insere à direita do dropdown do avatar (fim da nav).
    // Idempotente: carregarHeader pode rodar mais de uma vez na mesma página
    // (a página chama App.carregarHeader() e o app.js chama de novo no
    // DOMContentLoaded). Além disso, carregarHeader reescreve o innerHTML da
    // nav (o que apaga o sino desktop), mas o clone mobile — fora da nav —
    // persiste. Sem limpar os clones antigos, o sino mobile era duplicado:
    // por isso apareciam DOIS sinos no painel do cliente.
    // Os listeners globais (clique fora / atualização periódica) são
    // registrados apenas UMA vez.
    if (iniciarSinoNotificacoes._init) {
      // Reinsere o sino desktop se a nav foi reescrita desde a última vez.
      if (nav && !document.getElementById("notificWrap")) nav.insertAdjacentHTML("beforeend", sinoHtml);
      return;
    }
    iniciarSinoNotificacoes._init = true;
    // Remove qualquer clone mobile órfão de uma execução anterior.
    const wrapAntigo = document.getElementById("notificWrapMobile");
    if (wrapAntigo && wrapAntigo.parentElement) wrapAntigo.parentElement.removeChild(wrapAntigo);

    if (hamburger && hamburger.parentNode) {`;
if (app.indexOf(oldIns) < 0) { console.log("APP_INS_NOT_FOUND"); process.exit(1); }
app = app.replace(oldIns, newInsinterno());
function newInsinterno(){ return newIns; }
fs.writeFileSync("public/assets/app.js", app);
console.log("APP_INS_FIXED");
