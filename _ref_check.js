const fs = require("fs");
const path = require("path");
const files = ["server.js", "public/assets/app.js", "public/components.js"]
  .concat(fs.readdirSync("public").filter((f) => f.endsWith(".html")).map((f) => "public/" + f));
const terms = ["login-parceiro", "parceiros", "/analise"];
for (const f of files) {
  const c = fs.readFileSync(f, "utf8");
  for (const term of terms) {
    if (c.includes(term)) {
      const lines = c.split("\n");
      lines.forEach((l, i) => {
        if (l.includes(term) && /href|location|sendFile|redirect|src=|fetch\(|action=/.test(l)) {
          console.log(f + ":" + (i + 1) + ": " + l.trim().slice(0, 95));
        }
      });
    }
  }
}
