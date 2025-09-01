const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

const app = express();

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do multer para salvar arquivos na pasta 'uploads'
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Conexão com MySQL
const db = mysql.createConnection({
  host: 'sql10.freesqldatabase.com', // ou o host do teu banco remoto
  user: 'sql10792206',
  password: 'hKT4bm2WIP',
  database: 'sql10792206'
});

// Rota de upload
app.post('/api/upload', upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'erro', mensagem: 'Nenhum arquivo enviado' });
  }

  const { filename, path: filepath, mimetype } = req.file;

  const query = 'INSERT INTO pdfs (filename, filepath, mimetype) VALUES (?, ?, ?)';
  db.query(query, [filename, filepath, mimetype], (err) => {
    if (err) {
      console.error('Erro ao salvar no banco:', err);
      return res.status(500).json({ status: 'erro', mensagem: 'Erro ao salvar no banco' });
    }

    // Redireciona para pagamento.html após upload
    res.redirect('/pagamento.html');
  });
});

// Porta dinâmica para produção
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));