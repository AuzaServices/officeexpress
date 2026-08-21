const fs = require("fs");
const path = require("path");

console.log("=== 1. Arquivos deletados (devem NAO existir) ===");
for (const f of ["public/analise.html", "public/login-parceiro.html", "public/parceiros.html"]) {
  console.log((fs.existsSync(f) ? "AINDA EXISTE (ERRO): " : "deletado OK: ") + f);
}

console.log("\n=== 2. login-admin.html (fluxo atual, deve existir) ===");
console.log((fs.existsSync("public/login-admin.html") ? "existe OK" : "NAO EXISTE (ERRO)") + ": public/login-admin.html");

console.log("\n=== 3. Links /analise remanescentes em arquivos ativos ===");
const htmlFiles = fs.readdirSync("public").filter((f) => f.endsWith(".html"));
const jsFiles = ["public/assets/app.js", "public/components.js"];
for (const f of [...htmlFiles.map((x) => "public/" + x), ...jsFiles]) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((l, i) => {
    if (/href="\/analise"|location.*\/analise|action="\/analise"/.test(l)) {
      console.log(f + ":" + (i + 1) + ": " + l.trim().slice(0, 80));
    }
  });
}
console.log("(fim da listagem)");

console.log("\n=== 4. Logo imgur remanescente em public/*.html ===");
for (const f of htmlFiles) {
  const c = fs.readFileSync("public/" + f, "utf8");
  if (c.includes("imgur.com")) {
    console.log("imgur em: public/" + f);
  }
}
console.log("(fim da listagem)");

console.log("\n=== 5. Logo local em politica.html e termos.html ===");
for (const f of ["politica.html", "termos.html"]) {
  const c = fs.readFileSync("public/" + f, "utf8");
  const local = (c.match(/\/imagens\/logo\.png/g) || []).length;
  console.log(f + ": ocorrencias de /imagens/logo.png = " + local);
}
