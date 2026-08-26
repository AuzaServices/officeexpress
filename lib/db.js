const mysql = require("mysql2/promise");

require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: "utf8mb4",
});

// 🧬 Migrações defensivas: garantem que as tabelas existam no banco.
// São idempotentes e seguras de rodar a cada boot.
async function garantirSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(190) NOT NULL,
        email VARCHAR(190) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        email_confirmado TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX uniq_usuario_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo ENUM('confirmacao','recuperacao') NOT NULL,
        token VARCHAR(190) NOT NULL,
        expira_em DATETIME NOT NULL,
        usado TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_tokens_usuario (usuario_id),
        INDEX idx_email_tokens_token (token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NULL,
        modelo VARCHAR(40) NOT NULL,
        dados_json LONGTEXT NULL,
        valor DECIMAL(10,2) NOT NULL DEFAULT 0,
        status ENUM('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente',
        pagamento_id VARCHAR(80) NULL,
        pagamento_tipo ENUM('pix','card') NULL,
        download_token VARCHAR(80) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pago_at DATETIME NULL,
        INDEX idx_pedidos_usuario (usuario_id),
        INDEX idx_pedidos_status (status),
        INDEX idx_pedidos_pagamento (pagamento_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS config (
        chave VARCHAR(80) PRIMARY KEY,
        valor VARCHAR(190) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Tabela de sessões usada pelo express-mysql-session. Criada
    // explicitamente aqui para o store funcionar mesmo quando o usuário
    // do banco não tem permissão de CREATE TABLE em tempo de execução.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
        expires int(11) unsigned NOT NULL,
        data mediumtext COLLATE utf8mb4_bin,
        PRIMARY KEY (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Tabela de visitas (pageview) para métricas de tráfego em tempo real.
    // Cada linha representa uma sessão de navegação de um visitante.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessao VARCHAR(64) NOT NULL,
        path VARCHAR(190) NOT NULL,
        pagina VARCHAR(190) NULL,
        referer VARCHAR(255) NULL,
        origem VARCHAR(40) NULL,
        user_agent VARCHAR(255) NULL,
        dispositivo VARCHAR(20) NULL,
        ip VARCHAR(45) NULL,
        uf VARCHAR(2) NULL,
        primeira_visita TINYINT(1) NOT NULL DEFAULT 0,
        timeout TINYINT(1) NOT NULL DEFAULT 0,
        duracao_seg INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_visitas_created (created_at),
        INDEX idx_visitas_path (path),
        INDEX idx_visitas_sessao (sessao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Tabela de eventos de interação (abrir editor, gerar PDF, clicar em
    // pagamento etc.) para medir conversão e rejeição no funil.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessao VARCHAR(64) NOT NULL,
        tipo VARCHAR(60) NOT NULL,
        valor VARCHAR(255) NULL,
        pagina VARCHAR(190) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eventos_sessao (sessao),
        INDEX idx_eventos_tipo (tipo),
        INDEX idx_eventos_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Garante colunas novas em tabelas já existentes (criadas antes destas
    // melhorias), de forma idempotente e segura.
    await garantirColuna("visitas", "primeira_visita", "primeira_visita TINYINT(1) NOT NULL DEFAULT 0");
    await garantirColuna("visitas", "timeout", "timeout TINYINT(1) NOT NULL DEFAULT 0");
    await garantirColuna("visitas", "duracao_seg", "duracao_seg INT NOT NULL DEFAULT 0");
    await garantirColuna("visitas", "origem", "origem VARCHAR(40) NULL");
    await garantirColuna("visitas", "uf", "uf VARCHAR(2) NULL");

    // Garante a coluna email_confirmado em tabelas antigas, caso já existam usuários
    const [uCols] = await pool.query(
      "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_confirmado'"
    );
    if (Number(uCols[0].c) === 0) {
      await pool.query("ALTER TABLE usuarios ADD COLUMN email_confirmado TINYINT(1) NOT NULL DEFAULT 0");
    }

    // Garante colunas de tabelas criadas antes de existirem no schema atual.
    // O CREATE TABLE IF NOT EXISTS não altera tabelas já existentes, então
    // precisamos adicionar as colunas ausentes explicitamente.
    async function garantirColuna(tabela, coluna, definicao) {
      const [cols] = await pool.query(
        "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [tabela, coluna]
      );
      if (Number(cols[0].c) === 0) {
        await pool.query(`ALTER TABLE \`${tabela}\` ADD COLUMN ${definicao}`);
        console.log(`✅ Coluna ${tabela}.${coluna} adicionada`);
      }
    }

    await garantirColuna("usuarios", "created_at", "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await garantirColuna("pedidos", "created_at", "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await garantirColuna("pedidos", "pago_at", "pago_at DATETIME NULL");

    // Migração de dados: remove o campo "foto" (base64) dos dados_json de
    // pedidos antigos. A foto deixou de existir no currículo, e guardá-la
    // em base64 inchava a tabela pedidos (dezenas de KB por linha), podendo
    // estourar o limite do banco no plano gratuito. Roda uma vez por boot,
    // de forma idempotente e segura.
    try {
      const [comFoto] = await pool.query(
        "SELECT id, dados_json FROM pedidos WHERE dados_json LIKE '%\"foto\"%' LIMIT 2000"
      );
      for (const p of comFoto) {
        try {
          const dados = JSON.parse(p.dados_json);
          let mudou = false;
          if (dados && typeof dados === "object" && "foto" in dados) {
            delete dados.foto;
            mudou = true;
          }
          if (mudou) {
            await pool.query("UPDATE pedidos SET dados_json = ? WHERE id = ?", [JSON.stringify(dados), p.id]);
          }
        } catch (e) {
          // JSON inválido: ignora este registro
        }
      }
      if (comFoto.length) console.log(`🧹 Removidas ${comFoto.length} foto(s) dos dados de pedidos antigos`);
    } catch (err) {
      console.error("⚠️ Falha ao limpar fotos dos pedidos:", err.message);
    }

    console.log("✅ Schema do banco garantido");
  } catch (err) {
    console.error("⚠️ Não foi possível garantir o schema:", err.message);
  }
}

// Preço padrão do serviço (valor fixo único, editável no painel admin)
// Temporariamente R$ 1,00 para testes.
const PRECO_PADRAO = 1.0;

async function getPreco() {
  try {
    const [rows] = await pool.query("SELECT valor FROM config WHERE chave = 'preco_curriculo'");
    if (rows.length > 0 && rows[0].valor) {
      const v = parseFloat(rows[0].valor);
      if (!isNaN(v) && v > 0) return v;
    }
  } catch (err) {
    // ignora e usa padrão
  }
  return PRECO_PADRAO;
}

async function setPreco(valor) {
  await pool.query(
    "INSERT INTO config (chave, valor) VALUES ('preco_curriculo', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
    [String(valor)]
  );
}

module.exports = { pool, garantirSchema, getPreco, setPreco };
