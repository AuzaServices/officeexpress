const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const nomes = env
  .split(/\r?\n/)
  .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))
  .map((l) => l.split("=")[0].trim());
console.log("Variaveis definidas no .env:");
nomes.forEach((n) => console.log(" -", n));
