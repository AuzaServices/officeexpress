const fs = require("fs");
const s = fs.readFileSync("server.js", "utf8");
["garantirSchema", "garantirEmpresasSchema", "listen("].forEach(k => {
  let i = -1, n = 0;
  while ((i = s.indexOf(k, i + 1)) > 0 && n < 4) { n++; console.log(k, "@", i, ":", s.slice(i - 60, i + 80).split("\n")[0]); }
});
