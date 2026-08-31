-- ============================================================
-- OFFICE EXPRESS - Estrutura do banco de dados
-- Execute este script no seu banco MySQL para criar todas
-- as tabelas necessárias para o projeto funcionar.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Tabela: usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(190) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `senha` VARCHAR(255) NOT NULL,
  `email_confirmado` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_usuario_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabela: email_tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `tipo` ENUM('confirmacao','recuperacao') NOT NULL,
  `token` VARCHAR(190) NOT NULL,
  `expira_em` DATETIME NOT NULL,
  `usado` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_tokens_usuario` (`usuario_id`),
  KEY `idx_email_tokens_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabela: pedidos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NULL,
  `modelo` VARCHAR(40) NOT NULL,
  `dados_json` LONGTEXT NULL,
  `valor` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` ENUM('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente',
  `pagamento_id` VARCHAR(80) NULL,
  `pagamento_tipo` ENUM('pix','card') NULL,
  `download_token` VARCHAR(80) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pago_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pedidos_usuario` (`usuario_id`),
  KEY `idx_pedidos_status` (`status`),
  KEY `idx_pedidos_pagamento` (`pagamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabela: config
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `config` (
  `chave` VARCHAR(80) NOT NULL,
  `valor` VARCHAR(190) NULL,
  PRIMARY KEY (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabela: sessions (usada pelo express-mysql-session)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Dados iniciais
-- ------------------------------------------------------------
-- Preço padrão do currículo (valor em reais)
INSERT INTO `config` (`chave`, `valor`) VALUES ('preco_curriculo', '1.00')
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Office Express | Companies (plataforma B2B)
-- ============================================================

-- Tabela: empresas
CREATE TABLE IF NOT EXISTS `empresas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(160) NOT NULL,
  `cnpj` VARCHAR(30) NULL,
  `email` VARCHAR(160) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `plano` ENUM('starter','pro','enterprise') NOT NULL DEFAULT 'starter',
  `assinatura_ativa` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresas_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: empresas_pagamentos (recorrência da assinatura)
CREATE TABLE IF NOT EXISTS `empresas_pagamentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `empresa_id` INT NOT NULL,
  `pagamento_id` VARCHAR(80) NULL,
  `plano` ENUM('starter','pro','enterprise') NOT NULL DEFAULT 'starter',
  `valor` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` ENUM('pendente','pago','rejeitado','cancelado') NOT NULL DEFAULT 'pendente',
  `tipo` ENUM('pix','card') NULL,
  `periodo_ref` VARCHAR(20) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pago_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_empresa_pagamentos` (`empresa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: empresas_curriculos_vistos (controle de acesso/visualização)
CREATE TABLE IF NOT EXISTS `empresas_curriculos_vistos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `empresa_id` INT NOT NULL,
  `pedido_id` INT NOT NULL,
  `visto_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_empresa_vistos` (`empresa_id`),
  KEY `idx_empresa_vistos_pedido` (`pedido_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: empresas_contatos (mensagens comerciais)
CREATE TABLE IF NOT EXISTS `empresas_contatos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(160) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `empresa` VARCHAR(160) NULL,
  `mensagem` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIM
-- ============================================================
