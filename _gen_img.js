const { gerarPDF } = require("./lib/modelos");
const fs = require("fs");
const dados = {
  nome: "Maria da Silva", email: "m@x.com", telefone: ["(11) 99999-9999"], objetivo: "Objetivo profissional.",
  habilidades: "Excel,Comunicacao,Lideranca", formacao: "Graduacao em Adm", hobbies: "Leitura,Esportes",
  infoAdicional: "CNH B", empresa: ["Empresa X"], cargo: ["Analista"], periodo_inicio: ["01/2020"],
  periodo_fim: ["01/2022"], atividades: ["Atividade descrita"], curso: ["Pacote Office"],
  instituicao: ["SENAI"], carga: ["40h"],
};
const modelos = ["classico","moderno","minimal","profissional","executivo","cronologico","funcional","compacto","soberio","tecnico"];
(async () => {
  let allOk = true;
  for (const m of modelos) {
    try {
      const p = await gerarPDF(m, dados);
      const pok = Buffer.isBuffer(p) && p.slice(0, 5).toString() === "%PDF-";
      console.log("OK", m, "pdf=" + p.length, (pok ? "pdf" : "NOPDF"));
      if (!pok) allOk = false;
    } catch (e) {
      allOk = false;
      console.log("FAIL", m, e.message);
    }
  }
  // salva um exemplo para inspeção
  try {
    fs.writeFileSync("_exemplo.pdf", await gerarPDF("moderno", dados));
    console.log("exemplo salvo");
  } catch (e) { console.log("exemplo err", e.message); }
  console.log(allOk ? "ALL 10 OK" : "SOME FAILED");
  process.exit(allOk ? 0 : 1);
})().catch((e) => { console.log("FATAL", e.message); process.exit(1); });
