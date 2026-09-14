const fs = require("fs");
let c = fs.readFileSync("server.js", "utf8");

// 1) Garante coluna de status na tabela vagas (idempotente, roda no boot junto
//    com garantirVagas). Inativa em vez de apagar.
const gMarker = "// No boot e a cada 15 minutos.";
const gBloco = `// Garante a coluna de status das vagas (ativa | expirada). Vagas vencidas
// NÃO são mais apagadas: apenas marcadas como expiradas, preservando o
// histórico no painel da empresa e as candidaturas recebidas.
async function garantirVagasStatus() {
  try {
    const [cols] = await pool.query(
      "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vagas' AND COLUMN_NAME = 'status'"
    );
    if (Number(cols[0].c) === 0) {
      await pool.query("ALTER TABLE vagas ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'ativa'");
      // Vagas já vencidas antes da migração entram como expiradas.
      await pool.query("UPDATE vagas SET status = 'expirada' WHERE expira_em <= UTC_TIMESTAMP()");
      console.log("✅ Coluna vagas.status adicionada (garantirVagasStatus)");
    }
  } catch (e) {
    console.error("⚠️ Migração vagas.status:", e.message);
  }
}
garantirVagasStatus();

// No boot e a cada 15 minutos.`;
if (c.indexOf("garantirVagasStatus") < 0) {
  if (c.indexOf(gMarker) < 0) { console.log("MARKER_G_NOT_FOUND"); process.exit(1); }
  c = c.replace(gMarker, gBloco);
}

// 2) expirarVagasVencidas: marca como expirada em vez de apagar.
const oldFn = `async function expirarVagasVencidas() {
  try {
    const [vencidas] = await pool.query(
      "SELECT id, empresa_id, banner_url FROM vagas WHERE expira_em <= UTC_TIMESTAMP()"
    );
    if (!vencidas.length) return;
    for (const v of vencidas) {
      if (v.banner_url) await removerFotoCloudinary(v.banner_url);
      await pool.query("DELETE FROM vagas_candidaturas WHERE vaga_id = ?", [v.id]);
      await pool.query("DELETE FROM vagas WHERE id = ?", [v.id]);
    }
    if (vencidas.length) console.log("🗓️ Vagas expiradas removidas:", vencidas.length);
  } catch (e) {
    console.error("Erro ao expirar vagas:", e.message);
  }
}`;
const newFn = `async function expirarVagasVencidas() {
  try {
    // Marca como expirada (preserva histórico no painel e candidaturas) —
    // a listagem pública /api/vagas já filtra por data, então nada muda lá.
    const [r] = await pool.query(
      "UPDATE vagas SET status = 'expirada' WHERE expira_em <= UTC_TIMESTAMP() AND status = 'ativa'"
    );
    if (r.affectedRows) console.log("🗓️ Vagas marcadas como expiradas:", r.affectedRows);
  } catch (e) {
    console.error("Erro ao expirar vagas:", e.message);
  }
}`;
if (c.indexOf(oldFn) < 0) { console.log("OLD_FN_NOT_FOUND"); process.exit(1); }
c = c.replace(oldFn, newFn);

// 3) Criação de vaga: status explícito 'ativa'.
const oldIns = `      \`INSERT INTO vagas (empresa_id, titulo, area, descricao, cidade, estado, banner_url, ativa_de, expira_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\``;
const newIns = `      \`INSERT INTO vagas (empresa_id, titulo, area, descricao, cidade, estado, banner_url, ativa_de, expira_em, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativa')\``;
if (c.indexOf(oldIns) < 0) { console.log("INS_NOT_FOUND"); process.exit(1); }
c = c.replace(oldIns, newIns);

// 4) Painel da empresa: lista TODAS as vagas (ativas, agendadas, expiradas).
const oldSel = `    const [vagas] = await pool.query(
      \`SELECT v.*, (SELECT COUNT(*) FROM vagas_candidaturas c WHERE c.vaga_id = v.id) AS candidatos
       FROM vagas v WHERE v.empresa_id = ? ORDER BY v.criada_em DESC\`,
      [id]
    );`;
const newSel = `    // Painel lista TODAS as vagas (ativas, agendadas e expiradas) —
    // antes, vagas vencidas eram apagadas pelo cron e "sumiam" da lista
    // até a empresa publicar outra (que reordenava por criada_em).
    const [vagas] = await pool.query(
      \`SELECT v.*, (SELECT COUNT(*) FROM vagas_candidaturas c WHERE c.vaga_id = v.id) AS candidatos
       FROM vagas v WHERE v.empresa_id = ?
       ORDER BY (v.expira_em > UTC_TIMESTAMP() AND v.status = 'ativa') DESC, v.criada_em DESC\`,
      [id]
    );`;
if (c.indexOf(oldSel) < 0) { console.log("SEL_NOT_FOUND"); process.exit(1); }
c = c.replace(oldSel, newSel);

// 5) Encerrar vaga (DELETE): passa a marcar como encerrada + apaga banner,
//    sem deletar candidaturas (histórico mantém).
const oldDel = `    const [rows] = await pool.query("SELECT banner_url FROM vagas WHERE id = ? AND empresa_id = ?", [req.params.id, id]);
    if (!rows.length) return res.status(404).json({ error: "Vaga não encontrada." });
    if (rows[0].banner_url) await removerFotoCloudinary(rows[0].banner_url);
    await pool.query("DELETE FROM vagas_candidaturas WHERE vaga_id = ?", [req.params.id]);
    await pool.query("DELETE FROM vagas WHERE id = ?", [req.params.id]);
    res.json({ ok: true });`;
const newDel = `    const [rows] = await pool.query("SELECT banner_url FROM vagas WHERE id = ? AND empresa_id = ?", [req.params.id, id]);
    if (!rows.length) return res.status(404).json({ error: "Vaga não encontrada." });
    if (rows[0].banner_url) await removerFotoCloudinary(rows[0].banner_url);
    await pool.query("UPDATE vagas SET status = 'encerrada', banner_url = NULL WHERE id = ?", [req.params.id]);
    res.json({ ok: true });`;
if (c.indexOf(oldDel) < 0) { console.log("DEL_NOT_FOUND"); process.exit(1); }
c = c.replace(oldDel, newDel);

fs.writeFileSync("server.js", c);
console.log("VAGAS_FIX_OK");
