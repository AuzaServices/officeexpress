const fs = require("fs");
const s = fs.readFileSync("public/talentos.html", "utf8");
// header / logos atuais
const i = s.indexOf("logo");
console.log("=== primeiras ocorrências de logo ===");
let j = s.indexOf("logo");
while (j !== -1) {
  console.log("@" + j, JSON.stringify(s.slice(Math.max(0, j - 80), j + 120)));
  j = s.indexOf("logo", j + 4);
  if (j > 12000) break;
}
