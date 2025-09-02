const express = require('express');
const mysql = require('mysql');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();

// Serve arquivos da pasta public
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🔒 Lista de IPs bloqueados
const IPsBloqueados = ['132.255.106.157'];

// 🔄 Função para reconectar ao MySQL automaticamente
let db;
function handleDisconnect() {
  db = mysql.createConnection({
    host: 'sql10.freesqldatabase.com',
    user: 'sql10792206',
    password: 'hKT4bm2WIP',
    database: 'sql10792206'
  });

  db.connect((err) => {
    if (err) {
      console.error('Erro ao conectar no banco:', err.sqlMessage);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Conectado ao MySQL');
    }
  });

  db.on('error', (err) => {
    console.error('Erro na conexão MySQL:', err.code);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// 🔐 Middleware para bloquear IPs
function bloquearIPs(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (IPsBloqueados.includes(ip)) {
    console.log(`Acesso bloqueado para IP: ${ip}`);
    return res.status(403).send('Acesso negado');
  }
  next();
}

// Rota para gerar e salvar PDF no banco
app.post('/gerar-e-salvar-pdf', (req, res) => {
  const doc = new PDFDocument();
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(buffers);
    const filename = `${Date.now()}-curriculo.pdf`;

    const query = 'INSERT INTO pdfs (filename, mimetype, data) VALUES (?, ?, ?)';
    db.query(query, [filename, 'application/pdf', pdfBuffer], (err) => {
      if (err) {
        console.error('Erro ao salvar PDF no banco:', err.sqlMessage);
        return res.status(500).send('Erro ao salvar PDF');
      }
      res.send('PDF gerado e salvo com sucesso');
    });
  });

  doc.text('Currículo de Davi: Desenvolvedor Full Stack nervoso 🔥');
  doc.end();
});

// Rota para receber PDF gerado no frontend e salvar no banco
app.post('/api/upload', upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado');
  }

  const { originalname, mimetype, buffer } = req.file;

  const query = 'INSERT INTO pdfs (filename, mimetype, data) VALUES (?, ?, ?)';
  db.query(query, [originalname, mimetype, buffer], (err, result) => {
    if (err) {
      console.error('Erro ao salvar PDF enviado:', err.sqlMessage);
      return res.status(500).send('Erro ao salvar PDF');
    }
    res.status(200).json({ message: 'PDF enviado e salvo com sucesso', id: result.insertId });
  });
});

// Rota para baixar o PDF do banco
app.get('/baixar-pdf/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT filename, data FROM pdfs WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('PDF não encontrado');
    }

    let { filename, data } = results[0];

    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': data.length,
    });

    res.end(data);
  });
});

// Rota para listar PDFs
app.get('/api/pdfs', (req, res) => {
  const query = 'SELECT id, filename FROM pdfs ORDER BY id DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar PDFs:', err.sqlMessage);
      return res.status(500).send('Erro ao buscar arquivos');
    }
    res.json(results);
  });
});

// ✅ Rota para salvar logs de acesso (com bloqueio de IP)
app.post('/api/logs', bloquearIPs, (req, res) => {
  const { acao, nome, timestamp } = req.body;

  const query = 'INSERT INTO logs (acao, nome, timestamp) VALUES (?, ?, ?)';
  db.query(query, [acao, nome, timestamp], (err) => {
    if (err) {
      console.error('Erro ao salvar log:', err.sqlMessage);
      return res.status(500).send('Erro ao salvar log');
    }
    res.status(200).json({ mensagem: 'Log salvo com sucesso' });
  });
});

// ✅ Rota para listar logs de acesso
app.get('/api/logs', (req, res) => {
  const query = 'SELECT id, acao, nome, timestamp FROM logs ORDER BY id DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar logs:', err.sqlMessage);
      return res.status(500).send('Erro ao buscar logs');
    }
    res.json(results);
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});