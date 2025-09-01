const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('arquivo'), (req, res) => {
  console.log('Arquivo recebido:', req.file);
  res.json({ status: 'ok', nome: req.file.filename });
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));