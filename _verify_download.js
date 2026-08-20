const { gerarPDF } = require("./lib/modelos");
const { gerarHTML } = require("./lib/renderHTML");

const dados = {
  nome: "Maria da Silva", email: "maria@email.com", telefone: ["(11) 99999-9999"],
  objetivo: "Objetivo profissional.", habilidades: "Excel, Comunicacao", formacao: "Graduacao em Adm",
  empresa: ["Empresa X"], cargo: ["Analista"], periodo_inicio: ["01/2020"], periodo_fim: ["01/2022"],
  atividades: ["Atividade descrita"], curso: ["Pacote Office"], instituicao: ["SENAI"], carga: ["40h"],
};

const ids = ["classico","moderno","minimal","profissional","executivo","cronologico","funcional","compacto","soberio","tecnico"];

(async () => {
  let allOk = true;
  for (const m of ids) {
    const html = gerarHTML(m, dados);
    const pdf = await gerarPDF(m, dados);
    const ok = pdf && pdf.length > 0 && pdf.slice(0, 5).toString() === "%PDF-";
    console.log((ok ? "OK  " : "FAIL") + " " + m + " pdf=" + (pdf ? pdf.length : 0) + " html=" + html.length);
    if (!ok) allOk = false;
  }
  console.log(allOk ? "ALL 10 MODELS GENERATE PDF FROM PREVIEW HTML" : "SOME FAILED");
})().catch((e) => { console.log("FATAL", e.message); process.exit(1); });
