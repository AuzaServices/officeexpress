// Gera miniaturas reais (PNG) de cada modelo, a partir do MESMO HTML de
// renderHTML.js (fonte única de verdade). Salva em public/imagens/miniaturas/.
const fs = require("fs");
const path = require("path");
const { gerarHTML } = require("./lib/renderHTML");
const { getBrowser } = require("./lib/pdf");

// Dados de exemplo representativos (mesmos usados nos testes do projeto).
const dados = {
  nome: "Maria da Silva",
  email: "maria.silva@email.com",
  telefone: ["(11) 99999-9999"],
  endereco: "São Paulo, SP",
  objetivo: "Profissional com experiência em gestão de equipes e projetos, buscando novos desafios.",
  habilidades: "Excel,Comunicacao,Lideranca,Gestao de Projetos",
  formacao: "Graduacao em Administracao - Universidade de Sao Paulo",
  hobbies: "Leitura,Esportes",
  infoAdicional: "CNH B",
  empresa: ["Empresa X", "Empresa Y"],
  cargo: ["Analista Senior", "Coordenador"],
  periodo_inicio: ["01/2020", "03/2017"],
  periodo_fim: ["Atual", "12/2019"],
  atividades: ["Gestao de indicadores e metas", "Lideranca de equipe com 8 pessoas"],
  curso: ["Pacote Office", "Gestao de Projetos"],
  instituicao: ["SENAI", "FGV"],
  carga: ["40h", "20h"],
};

const MODELOS = [
  "classico", "moderno", "minimal", "profissional", "executivo",
  "cronologico", "funcional", "compacto", "soberio", "tecnico",
];

const OUT_DIR = path.join(__dirname, "public", "imagens", "miniaturas");

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await getBrowser();
  if (!browser) {
    console.error("Puppeteer indisponível. Não é possível gerar miniaturas.");
    process.exit(1);
  }
  for (const modeloId of MODELOS) {
    let page = null;
    try {
      const html = gerarHTML(modeloId, dados);
      page = await browser.newPage();
      page.setDefaultTimeout(30000);
      // A4 em px (794x1123). deviceScaleFactor 1 para manter a miniatura leve.
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "load" });
      await page.emulateMediaType("screen");
      await new Promise((r) => setTimeout(r, 200));
      const el = await page.$(".page");
      if (!el) {
        console.log("FAIL (sem .page)", modeloId);
        continue;
      }
      const buf = await el.screenshot({ type: "png" });
      const out = path.join(OUT_DIR, `${modeloId}.png`);
      fs.writeFileSync(out, buf);
      console.log("OK", modeloId, buf.length, "bytes ->", path.relative(__dirname, out));
    } catch (e) {
      console.log("FAIL", modeloId, e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }
  if (browser && typeof browser.close === "function") await browser.close().catch(() => {});
  console.log("Concluído.");
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
