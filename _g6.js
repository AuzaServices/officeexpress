const fs = require("fs");
const s = fs.readFileSync("server.js", "utf8");
// Achar onde o Pix é gerado (valor cobrado do cliente)
const i = s.indexOf("async function gerarPix");
const j = s.indexOf("payment_method", i);
console.log("gerarPix @", i);
// Procure o endpoint que cria cobrança
const k = s.indexOf('app.post("/api/pagamento');
console.log("endpoint criar pagamento @", k, ":", JSON.stringify(s.slice(k, k + 900)));
