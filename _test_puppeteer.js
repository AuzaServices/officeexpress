// Validação de consistência (sem screenshots): verifica que o template único
// renderiza no preview e no editor, e que não há erros de console.
const puppeteer = require("puppeteer");
const base = "http://localhost:3000";

const dados = {
  nome: "Ana Souza", email: "ana@email.com", telefone: ["(11) 99999-0000"],
  endereco: "Rua A", numero: "123", cidade: "São Paulo", estado: "SP",
  objetivo: "Busco atuar como desenvolvedora.",
  empresa: ["Tech Corp", "Startup X"], cargo: ["Dev Pleno", "Dev Júnior"],
  periodo_inicio: ["2022", "2019"], periodo_fim: ["", "2022"],
  atividades: ["Desenvolvimento web.", "Suporte e manutenção."],
  formacao: "Bacharel em Ciência da Computação",
  curso: ["AWS Cloud"], instituicao: ["AWS"], carga: ["20h"],
  habilidades: "Node.js, React, SQL", hobbies: "Leitura",
  infoAdicional: "Disponível para início imediato.", foto: ""
};

(async () => {
  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    // ---- PREVIEW ----
    const p = await browser.newPage();
    const errsP = [];
    p.on("console", (m) => { if (m.type() === "error") errsP.push(m.text()); });
    p.on("pageerror", (e) => errsP.push("PAGEERROR: " + e.message));
    await p.goto(base + "/preview", { waitUntil: "domcontentloaded", timeout: 30000 });
    await p.evaluate((d) => {
      localStorage.setItem("modeloSelecionado", "moderno");
      localStorage.setItem("curriculo", JSON.stringify(d));
    }, dados);
    await p.reload({ waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 800));
    const previewState = await p.evaluate(() => {
      const el = document.getElementById("preview");
      const doc = el ? el.querySelector(".preview-doc") : null;
      const page = doc ? doc.querySelector(".page") : null;
      return {
        hasRC: !!window.renderCurriculo,
        hasDoc: !!doc,
        hasPage: !!page,
        hasName: page ? page.textContent.includes("Ana Souza") : false,
        pageLen: page ? page.innerHTML.length : 0,
      };
    });
    console.log("[PREVIEW]", JSON.stringify(previewState));
    console.log("[PREVIEW erros console]", JSON.stringify(errsP));

    // ---- EDITOR ----
    const e = await browser.newPage();
    const errsE = [];
    e.on("console", (m) => { if (m.type() === "error") errsE.push(m.text()); });
    e.on("pageerror", (err) => errsE.push("PAGEERROR: " + err.message));
    await e.goto(base + "/editor", { waitUntil: "domcontentloaded", timeout: 30000 });
    await e.evaluate((d) => {
      localStorage.setItem("modeloSelecionado", "moderno");
      localStorage.setItem("curriculo", JSON.stringify(d));
    }, dados);
    await e.reload({ waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    const editorState = await e.evaluate(() => {
      const f = document.getElementById("folhaA4");
      const doc = f ? f.querySelector(".preview-doc") : null;
      const page = doc ? doc.querySelector(".page") : null;
      return {
        hasRC: !!window.renderCurriculo,
        hasDoc: !!doc,
        hasPage: !!page,
        hasName: page ? page.textContent.includes("Ana Souza") : false,
        pageLen: page ? page.innerHTML.length : 0,
        scale: doc ? doc.style.transform : null,
      };
    });
    console.log("[EDITOR]", JSON.stringify(editorState));
    console.log("[EDITOR erros console]", JSON.stringify(errsE));
  } finally {
    await browser.close();
  }
})();
