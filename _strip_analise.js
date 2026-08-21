const fs = require("fs");
const files = ["contato.html", "sobre.html", "indicacao.html", "404.html"];
for (const f of files) {
  const p = "public/" + f;
  const lines = fs.readFileSync(p, "utf8").split("\n");
  const kept = lines.filter((l) => {
    // remove only nav <li> links pointing to /analise
    return !/^\s*<li><a href="\/analise">.*<\/a><\/li>\s*$/.test(l);
  });
  const removed = lines.length - kept.length;
  fs.writeFileSync(p, kept.join("\n"), "utf8");
  console.log(f + ": removidas " + removed + " linhas de link /analise");
}
