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

// Conexão com o banco
const db = mysql.createConnection({
  host: 'sql10.freesqldatabase.com',
  user: 'sql10792206',
  password: 'hKT4bm2WIP',
  database: 'sql10792206'
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no banco:', err.sqlMessage);
    return;
  }
  console.log('Conectado ao MySQL');
});

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

// ✅ Nova rota para listar todos os PDFs salvos
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

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});