const fs = require("fs");
const sv = fs.readFileSync("server.js", "utf8");
// como o painel-parceiro serve logos hoje (parceiro.png já existe?)
const i = sv.indexOf("parceiro.png");
console.log("parceiro.png em server.js @", i);
if (i !== -1) console.log(sv.slice(i - 300, i + 200));
// rotas estáticas de imagens
const k = sv.indexOf("express.static");
console.log("=== static ===");
console.log(sv.slice(k, k + 300));
