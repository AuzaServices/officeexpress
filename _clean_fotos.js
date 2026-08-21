require("dotenv").config();
const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME, port: Number(process.env.DB_PORT) || 3306,
  });
  const before = async () => {
    const [r] = await c.query("SELECT COALESCE(SUM(LENGTH(dados_json)),0) AS total, COUNT(*) AS n FROM pedidos");
    return r[0];
  };
  const [t0] = await c.query("SELECT COALESCE(SUM(LENGTH(dados_json)),0) AS total, COUNT(*) AS n FROM pedidos");
  console.log("ANTES: pedidos=" + t0.n + " bytesDados=" + t0.total);

  const [rows] = await c.query("SELECT id, dados_json FROM pedidos");
  let removidas = 0, atualizadas = 0;
  for (const p of rows) {
    try {
      const dados = JSON.parse(p.dados_json);
      let mudou = false;
      if (dados && typeof dados === "object" && "foto" in dados) {
        delete dados.foto;
        mudou = true;
        removidas++;
      }
      if (mudou) {
        await c.query("UPDATE pedidos SET dados_json = ? WHERE id = ?", [JSON.stringify(dados), p.id]);
        atualizadas++;
      }
    } catch (e) {
      console.log("  JSON inválido id=" + p.id);
    }
  }
  const [t1] = await c.query("SELECT COALESCE(SUM(LENGTH(dados_json)),0) AS total, COUNT(*) AS n FROM pedidos");
  console.log("DEPOIS: pedidos=" + t1.n + " bytesDados=" + t1.total + " | removidasFotos=" + removidas + " atualizados=" + atualizadas);
  console.log("Redução: " + ((t0.total - t1.total) / 1024).toFixed(0) + " KB");

  // Tamanho total do banco após
  const [tab] = await c.query("SELECT table_name, (data_length+index_length) AS bytes FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name='pedidos'");
  console.log("Tabela pedidos agora:", (tab[0].bytes / 1024).toFixed(0) + "KB");
  await c.end();
})().catch((e) => console.log("ERR", e.message));
