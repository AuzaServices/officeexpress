const { gerarHTML } = require("./lib/renderHTML");
const puppeteer = require("puppeteer");

const dados = {
  nome: "Maria da Silva", email: "maria@email.com", telefone: ["(11) 99999-9999"],
  objetivo: "Objetivo profissional.", habilidades: "Excel, Comunicacao", formacao: "Graduacao em Adm",
  empresa: ["Empresa X"], cargo: ["Analista"], periodo_inicio: ["01/2020"], periodo_fim: ["01/2022"],
  atividades: ["Atividade descrita"],
};

(async () => {
  const html = gerarHTML("moderno", dados);
  const fs = require("fs");
  fs.writeFileSync("_debug_moderno.html", html);

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.emulateMediaType("print");

  const info = await page.evaluate(() => {
    const lateral = document.querySelector(".modelo-moderno .lateral");
    const main = document.querySelector(".modelo-moderno .main");
    const nome = document.querySelector(".modelo-moderno .nome");
    const cs = (el) => el ? getComputedStyle(el) : null;
    return {
      bodyClass: document.body.className,
      hasLateral: !!lateral,
      hasMain: !!main,
      lateralDisplay: cs(lateral) ? cs(lateral).display : null,
      lateralWidth: cs(lateral) ? cs(lateral).width : null,
      lateralBg: cs(lateral) ? cs(lateral).backgroundColor : null,
      pageDisplay: cs(document.querySelector(".page")) ? cs(document.querySelector(".page")).display : null,
      nomeColor: cs(nome) ? cs(nome).color : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})().catch((e) => { console.log("FATAL", e.message); process.exit(1); });
