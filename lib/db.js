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

    // Garante a coluna email_confirmado em tabelas antigas, caso já existam usuários
    const [uCols] = await pool.query(
      "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email_confirmado'"
    );
    if (Number(uCols[0].c) === 0) {
      await pool.query("ALTER TABLE usuarios ADD COLUMN email_confirmado TINYINT(1) NOT NULL DEFAULT 0");
    }

    console.log("✅ Schema do banco garantido");
  } catch (err) {
    console.error("⚠️ Não foi possível garantir o schema:", err.message);
  }
}

// Preço padrão do serviço (valor fixo único, editável no painel admin)
const PRECO_PADRAO = 9.9;

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
