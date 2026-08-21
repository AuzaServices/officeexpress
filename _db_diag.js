require("dotenv").config();
const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME, port: Number(process.env.DB_PORT) || 3306,
  });
  const [r] = await c.query("SELECT COUNT(*) AS c, COALESCE(SUM(LENGTH(dados_json)),0) AS total, COALESCE(MAX(LENGTH(dados_json)),0) AS maxl FROM pedidos");
  console.log("pedidos:", r[0].c, "| total bytes dados_json:", r[0].total, "| max:", r[0].maxl);
  const [r2] = await c.query("SELECT COUNT(*) AS c FROM pedidos WHERE dados_json LIKE '%foto%'");
  console.log("pedidos com 'foto' no json:", r2[0].c);
  // amostra de tamanho
  const [r3] = await c.query("SELECT id, LENGTH(dados_json) AS sz, LEFT(dados_json,80) AS amostra FROM pedidos ORDER BY LENGTH(dados_json) DESC LIMIT 5");
  r3.forEach((x) => console.log("  id=" + x.id, "sz=" + x.sz, "| " + (x.amostra || "").replace(/\n/g, " ").slice(0, 70)));
  await c.end();
})().catch((e) => console.log("ERR", e.message));
