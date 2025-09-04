const express = require('express');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const multer = require('multer');
const fetch = require('node-fetch');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🔁 Pool de conexões MySQL
const pool = mysql.createPool({
  host: 'sql10.freesqldatabase.com',
  user: 'sql10792206',
  password: 'hKT4bm2WIP',
  database: 'sql10792206',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 🔍 Função para extrair IP público
function getPublicIP(req) {
  const ipList = req.headers['x-forwarded-for']?.split(',') || [];
  for (let ip of ipList) {
    ip = ip.trim();
    if (
      !ip.startsWith('10.') &&
      !ip.startsWith('192.') &&
      !ip.startsWith('127.') &&
      !ip.startsWith('::') &&
      !ip.startsWith('172.')
    ) {
      return ip;
    }
  }
  return req.connection.remoteAddress;
}

//////////////////////////
// 📄 Gerar e salvar PDF
//////////////////////////
app.post('/gerar-e-salvar-pdf', async (req, res) => {
  try {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `${Date.now()}-curriculo.pdf`;

      const query = 'INSERT INTO pdfs (filename, mimetype, data) VALUES (?, ?, ?)';
      await pool.query(query, [filename, 'application/pdf', pdfBuffer]);

      res.json({ message: 'PDF gerado e salvo com sucesso' });
    });

    doc.text('Currículo de Davi: Desenvolvedor Full Stack nervoso 🔥');
    doc.end();
  } catch (err) {
    console.error('Erro ao salvar PDF:', err.message);
    res.status(500).json({ error: 'Erro ao salvar PDF' });
  }
});

//////////////////////////
// 📤 Upload de PDF + telefone
//////////////////////////
app.post('/api/upload', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const { originalname, mimetype, buffer } = req.file;
  const { telefone } = req.body;

  try {
    const query = 'INSERT INTO pdfs (filename, mimetype, data, telefone) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [originalname, mimetype, buffer, telefone]);

    res.status(200).json({ message: 'PDF e telefone salvos com sucesso', id: result.insertId });
  } catch (err) {
    console.error('Erro ao salvar PDF e telefone:', err.message);
    res.status(500).json({ error: 'Erro ao salvar PDF' });
  }
});

//////////////////////////
// 📥 Baixar PDF por ID
//////////////////////////
app.get('/api/pdfs/:id/download', async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'SELECT filename, mimetype, data FROM pdfs WHERE id = ?';
    const [results] = await pool.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'PDF não encontrado' });
    }

    const { filename, mimetype, data } = results[0];
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (err) {
    console.error('Erro ao baixar PDF:', err.message);
    res.status(500).json({ error: 'Erro ao baixar PDF' });
  }
});

//////////////////////////
// 📋 Listar PDFs
//////////////////////////
app.get('/api/pdfs', async (req, res) => {
  try {
    const query = 'SELECT id, filename, telefone, created_at FROM pdfs ORDER BY id DESC';
    const [results] = await pool.query(query);
    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar PDFs:', err.message);
    res.status(500).json({ error: 'Erro ao buscar arquivos' });
  }
});

//////////////////////////
// 📝 Salvar log de acesso com localização
//////////////////////////
app.post('/api/logs', async (req, res) => {
  const { acao, nome, timestamp } = req.body;

  const ipRaw = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const ipPublico = getPublicIP(req);
  console.log("IP público usado:", ipPublico);

  let cidade = 'Desconhecida';
  let estado = 'XX';

  try {
    const response = await fetch(`https://ipapi.co/${ipPublico}/json/`);
    const data = await response.json();

    cidade = data.city || cidade;
    estado = data.region_code || estado;
  } catch (err) {
    console.warn("Falha ao consultar localização:", err.message);
  }

  const localizacao = `${cidade} - ${estado}`;

  try {
    const query = 'INSERT INTO logs (acao, nome, timestamp, localizacao, ip_raw, ip_publico) VALUES (?, ?, ?, ?, ?, ?)';
    await pool.query(query, [acao, nome, timestamp, localizacao, ipRaw, ipPublico]);

    res.status(200).json({ mensagem: 'Log salvo com sucesso', localizacao });
  } catch (err) {
    console.error('Erro ao salvar log com localização:', err.message);
    res.status(500).json({ error: 'Erro ao salvar log' });
  }
});

//////////////////////////
// 📜 Listar logs de acesso
//////////////////////////
app.get('/api/logs', async (req, res) => {
  try {
    const query = 'SELECT id, acao, nome, timestamp, localizacao, ip_raw, ip_publico FROM logs ORDER BY id DESC';
    const [results] = await pool.query(query);

    if (!Array.isArray(results)) {
      console.warn('⚠️ Resposta inesperada do banco:', results);
      return res.status(500).json({ error: 'Formato inválido de resposta' });
    }

    res.json(results);
  } catch (err) {
    console.error('❌ Erro ao buscar logs:', {
      mensagem: err.message,
      codigo: err.code,
      sql: err.sql
    });
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

//////////////////////////
// 🚀 Iniciar servidor
//////////////////////////
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});