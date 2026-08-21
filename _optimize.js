require("dotenv").config();
const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME, port: Number(process.env.DB_PORT) || 3306,
  });
  const [cnt] = await c.query("SELECT COUNT(*) AS n FROM pedidos");
  console.log("Contagem REAL pedidos =", cnt[0].n);

  const sizeBefore = async (t) => {
    const [r] = await c.query("SELECT (data_length+index_length) AS b FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?", [t]);
    return r[0] ? r[0].b : 0;
  };

  // Otimiza as tabelas principais para liberar espaço físico
  for (const t of ["pedidos", "logs", "mensagens", "sessions"]) {
    const b = await sizeBefore(t);
    console.log("Optimizando", t, "(antes", (b/1024).toFixed(0), "KB)...");
    try {
      await c.query(`OPTIMIZE TABLE \`${t}\``);
      const a = await sizeBefore(t);
      console.log("  depois", (a/1024).toFixed(0), "KB | liberado", ((b-a)/1024).toFixed(0), "KB");
    } catch (e) {
      console.log("  OPTIMIZE falhou:", e.message, "-> tenta ALTER");
      try { await c.query(`ALTER TABLE \`${t}\` ENGINE=InnoDB`); console.log("  ALTER OK"); }
      catch (e2) { console.log("  ALTER falhou:", e2.message); }
    }
  }

  const [tab] = await c.query("SELECT table_name, (data_length+index_length) AS b FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY (data_length+index_length) DESC LIMIT 3");
  console.log("Top tabelas agora:");
  tab.forEach((t) => console.log("  " + t.table_name + ": " + (t.b/1024).toFixed(0) + "KB"));
  await c.end();
})().catch((e) => console.log("ERR", e.message));
