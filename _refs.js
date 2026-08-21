const fs = require("fs");
const s = fs.readFileSync("lib/modelos.js", "utf8");
const syms = ["DOCX_ESTILOS", "txt(", "par(", "secaoDocx(", "semBorda(", "celula(", "secoesConteudo(", "A4_WIDTH", "A4_HEIGHT", "VerticalAlign", "ShadingType", "WidthType", "BorderStyle", "TableRow", "TableCell", "Table(", "ImageRun"];
for (const sym of syms) {
  const count = s.split(sym).length - 1;
  console.log(sym + ": " + count);
}
