const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

const app = express();

// Verifica se a pasta 'uploads' existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do multer para salvar arquivos na pasta 'uploads'
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Conexão com MySQL
const db = mysql.createConnection({
  host: 'sql10.freesqldatabase.com',
  user: 'sql10792206',
  password: 'hKT4bm2WIP',
  database: 'sql10792206'
});

// Testa conexão com o banco
db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no banco:', err);
  } else {
    console.log('Conectado ao MySQL!');
  }
});

// Rota de upload
app.post('/api/upload', upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'erro', mensagem: 'Nenhum arquivo enviado' });
  }

  const filename = req.file.filename;
  const filepath = req.file.path;
  const mimetype = req.file.mimetype;
  const uploadedAt = new Date();

  const query = 'INSERT INTO pdfs (filename, filepath, mimetype, uploaded_at) VALUES (?, ?, ?, ?)';
  db.query(query, [filename, filepath, mimetype, uploadedAt], (err) => {
    if (err) {
      console.error('Erro ao salvar no banco:', err.sqlMessage);
      return res.status(500).json({ status: 'erro', mensagem: 'Erro ao salvar no banco' });
    }

    res.redirect('/pagamento.html');
  });
});

// Rota para listar arquivos no painel
app.get('/api/pdfs', (req, res) => {
  const query = 'SELECT id, filename, updated_at FROM pdfs ORDER BY updated_at DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao listar PDFs:', err.sqlMessage);
      return res.status(500).json({ status: 'erro', mensagem: 'Erro ao buscar arquivos' });
    }
    res.json(results);
  });
});

// Rota para download seguro via painel
app.get('/painel/download/:id', (req, res) => {
  const id = req.params.id;

  const query = 'SELECT * FROM pdfs WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar no banco:', err.sqlMessage);
      return res.status(500).send('Erro interno');
    }

    if (results.length === 0) {
      return res.status(404).send('Arquivo não encontrado');
    }

    const { filepath, filename, mimetype } = results[0];

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  });
});

// Porta dinâmica para produção
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));