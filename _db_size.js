require("dotenv").config();
const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME, port: Number(process.env.DB_PORT) || 3306,
  });
  // Tamanho de cada tabela (dados + índice) e total
  const [tab] = await c.query(
    "SELECT table_name, table_rows, ROUND((data_length+index_length)/1024/1024,2) AS mb, data_length, index_length FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY (data_length+index_length) DESC"
  );
  let total = 0;
  tab.forEach((t) => {
    total += t.data_length + t.index_length;
    console.log(`${t.table_name.padEnd(16)} rows=${String(t.table_rows).padStart(6)} data=${(t.data_length/1024).toFixed(0)}KB idx=${(t.index_length/1024).toFixed(0)}KB -> ${t.mb}MB`);
  });
  console.log("TOTAL data+index:", (total/1024/1024).toFixed(2), "MB");

  // Contagem de sessões e tamanho dos dados
  try {
    const [s] = await c.query("SELECT COUNT(*) c, COALESCE(SUM(LENGTH(data)),0) l FROM sessions");
    console.log("sessions: count=" + s[0].c + " totalData=" + (s[0].l/1024).toFixed(0) + "KB");
    const [s2] = await c.query("SELECT session_id, LENGTH(data) sz FROM sessions ORDER BY LENGTH(data) DESC LIMIT 5");
    s2.forEach((x) => console.log("  session " + String(x.session_id).slice(0,20) + "... sz=" + x.sz));
  } catch (e) { console.log("sessions err", e.message); }
  await c.end();
})().catch((e) => console.log("ERR", e.message));
