require("dotenv").config();
const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME, port: Number(process.env.DB_PORT) || 3306,
  });
  const [rows] = await c.query("SELECT id, modelo, status, LENGTH(dados_json) AS sz, dados_json FROM pedidos ORDER BY LENGTH(dados_json) DESC");
  rows.forEach((p) => {
    let keys = [];
    try {
      const d = JSON.parse(p.dados_json);
      keys = Object.keys(d).map((k) => k + "=" + String(d[k]).length);
    } catch (e) { keys = ["JSON INVÁLIDO"]; }
    console.log("id=" + p.id, "modelo=" + p.modelo, "status=" + p.status, "sz=" + p.sz);
    console.log("   keys: " + keys.join(" | "));
    // procura chaves que pareçam imagem/base64
    try {
      const d = JSON.parse(p.dados_json);
      for (const k of Object.keys(d)) {
        const v = String(d[k]);
        if (/data:image|base64|foto|photo|imagem|img/i.test(k) || /data:image|base64/.test(v.slice(0, 200))) {
          console.log("   POSSÍVEL IMAGEM: chave=" + k + " len=" + v.length);
        }
      }
    } catch (e) {}
  });
  await c.end();
})().catch((e) => console.log("ERR", e.message));
