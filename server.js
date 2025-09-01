const express = require('express');
const mysql = require('mysql');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Conexão com o banco
const db = mysql.createConnection({
  host: 'sql10.freesqldatabase.com',       // ou o host da Render
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

// Rota para baixar o PDF do banco
app.get('/baixar-pdf/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT filename, mimetype, data FROM pdfs WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('PDF não encontrado');
    }

    const { filename, mimetype, data } = results[0];
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});