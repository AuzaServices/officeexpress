const fs = require("fs");
const files = ["contato.html", "sobre.html", "indicacao.html", "404.html"];
for (const f of files) {
  const p = "public/" + f;
  const lines = fs.readFileSync(p, "utf8").split("\n");
  console.log("===== " + f + " =====");
  lines.forEach((l, i) => {
    if (l.includes("/analise")) {
      console.log("--- linha " + (i + 1) + " ---");
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 1); j++) {
        console.log((j + 1) + ": " + JSON.stringify(lines[j]));
      }
    }
  });
}
