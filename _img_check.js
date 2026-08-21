const { htmlParaImagem } = require("./lib/pdf");
const { gerarHTML } = require("./lib/renderHTML");
const dados = { nome: "Maria da Silva", email: "m@x.com", objetivo: "Objetivo.", habilidades: "Excel,Comunicacao" };
(async () => {
  const html = gerarHTML("moderno", dados);
  const png = await htmlParaImagem(html);
  // PNG header: 8 bytes sig, then width(4), height(4)
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  console.log("PNG dims:", width + "x" + height, "(esperado 2382x3369 ~ A4x3)");
  console.log("bytes:", png.length);
  process.exit(0);
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
