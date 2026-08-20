// Teste temporário de rotas HTTP do servidor local (será apagado).
const base = "http://localhost:3000";
(async () => {
  // 1. Endpoint do renderizador
  const r = await fetch(base + "/curriculo-render.js");
  const txt = await r.text();
  console.log("[curriculo-render.js]", r.status, "len:", txt.length, "tem gerarHTML:", txt.includes("gerarHTML"), "tem window.renderCurriculo:", txt.includes("window.renderCurriculo"));

  // 2. Preview page
  const p = await fetch(base + "/preview");
  const phtml = await p.text();
  console.log("[preview]", p.status, "len:", phtml.length, "usa renderCurriculo:", phtml.includes("renderCurriculo"), "tem script src:", phtml.includes("/curriculo-render.js"));

  // 3. Editor page
  const e = await fetch(base + "/editor");
  const ehtml = await e.text();
  console.log("[editor]", e.status, "len:", ehtml.length, "usa renderCurriculo:", ehtml.includes("renderCurriculo"), "tem script src:", ehtml.includes("/curriculo-render.js"));

  // 4. Gerar PDF de ponta a ponta via modelo (testa gerarPDF -> HTML->PDF)
  const { gerarPDF } = require("./lib/modelos");
  const dados = {
    nome: "Ana Souza", email: "ana@email.com", telefone: ["(11) 99999-0000"],
    endereco: "Rua A", numero: "123", cidade: "São Paulo", estado: "SP",
    objetivo: "Busco atuar como desenvolvedora.",
    empresa: ["Tech Corp"], cargo: ["Dev Pleno"], periodo_inicio: ["2022"], periodo_fim: [""],
    atividades: ["Desenvolvimento web."], formacao: "Bacharel em CC",
    curso: ["AWS Cloud"], instituicao: ["AWS"], carga: ["20h"],
    habilidades: "Node.js, React", hobbies: "Leitura", infoAdicional: "Disponível.", foto: ""
  };
  const buf = await gerarPDF("profissional", dados);
  console.log("[gerarPDF profissional]", buf.length, "bytes, magic:", buf.slice(0, 4).toString());
})();
