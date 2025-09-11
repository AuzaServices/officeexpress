const express = require('express');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const pdfParse = require('pdf-parse'); // 📥 Novo

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));

// 🔁 Conexão com MySQL
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

// 🧠 Função de análise de currículo
function analisarCurriculo(texto) {
  const elogios = [];
  const alertas = [];
  const sugestoes = [];
  const textoLower = texto.toLowerCase();

  const secoesEsperadas = {
    experiencia: ['experiência', 'trajetória', 'histórico profissional'],
    formacao: ['formação', 'educação', 'escolaridade', 'ensino'],
    habilidades: ['habilidades', 'competências', 'skills'],
    idiomas: ['idiomas', 'línguas', 'língua estrangeira'],
    cursos: ['cursos', 'capacitações', 'certificações']
  };

  const faltando = [];
  for (const [secao, termos] of Object.entries(secoesEsperadas)) {
    const presente = termos.some(t => textoLower.includes(t));
    if (!presente) faltando.push(secao);
  }

  if (faltando.length > 0) {
    alertas.push(`Seções ausentes ou não detectadas: ${faltando.join(', ')}`);
  } else {
    elogios.push('Todas as seções principais foram encontradas.');
  }

  if (texto.length < 500) {
    alertas.push('Currículo muito curto. Pode estar incompleto ou pouco detalhado.');
  } else if (texto.length > 3000) {
    alertas.push('Currículo muito longo. Pode estar cansativo ou repetitivo.');
  } else {
    elogios.push('Tamanho do currículo está adequado.');
  }

  const temDatas = /\b(19|20)\d{2}\b/.test(textoLower);
  if (!temDatas) {
    alertas.push('Nenhuma data encontrada. Experiências podem estar mal contextualizadas.');
  } else {
    elogios.push('Datas detectadas. Experiências parecem contextualizadas.');
  }

  const temBullets = texto.includes('•') || texto.includes('- ');
  if (!temBullets) {
    sugestoes.push('Use tópicos (bullet points) para facilitar leitura e escaneabilidade.');
  } else {
    elogios.push('Uso de bullet points detectado. Boa escaneabilidade.');
  }

  const verbosFracos = ['fiz', 'ajudei', 'trabalhei', 'mexi', 'liderei'];
  const sugestoesVerbo = {
    fiz: 'implementei',
    ajudei: 'colaborei',
    trabalhei: 'atuei',
    mexi: 'utilizei',
    liderei: 'coordenei'
  };
  verbosFracos.forEach(verbo => {
    if (textoLower.includes(verbo)) {
      sugestoes.push(`Considere substituir '${verbo}' por '${sugestoesVerbo[verbo]}' para fortalecer a descrição.`);
    }
  });

  const primeiraPessoa = ['eu ', 'meu ', 'minha ', 'me ', 'mim '];
  const usoPessoal = primeiraPessoa.filter(p => textoLower.includes(p));
  if (usoPessoal.length > 2) {
    alertas.push('Uso excessivo de primeira pessoa. Prefira frases objetivas e impessoais.');
  }

  const palavras = textoLower.split(/\s+/);
  const contagem = {};
  palavras.forEach(p => {
    contagem[p] = (contagem[p] || 0) + 1;
  });
  const repetidas = Object.entries(contagem).filter(([p, c]) => c > 10 && p.length > 3);
  if (repetidas.length > 0) {
    const termos = repetidas.map(([p]) => p).join(', ');
    alertas.push(`Repetição excessiva de termos: ${termos}`);
  }

  const temTelefone = /\b\d{4,5}[-.\s]?\d{4}\b/.test(textoLower);
  const temEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(texto);
  if (!temTelefone) {
    alertas.push('Telefone não encontrado no currículo.');
  }
  if (!temEmail) {
    alertas.push('E-mail não encontrado no currículo.');
  }

  const score = Math.max(0, 100 - alertas.length * 10);
  const nota = score >= 80 ? 'Excelente estrutura' :
               score >= 60 ? 'Estrutura boa, com ajustes' :
               'Estrutura fraca, precisa revisão';

  const relatorioFinal = `
Relatório de Análise do Currículo

Estrutura geral: ${nota} (Score: ${score}/100)

${elogios.length > 0 ? 'Pontos positivos:\n- ' + elogios.join('\n- ') : ''}
${alertas.length > 0 ? '\n\nPontos de atenção:\n- ' + alertas.join('\n- ') : ''}
${sugestoes.length > 0 ? '\n\nSugestões de melhoria:\n- ' + sugestoes.join('\n- ') : ''}
  `.trim();

  const indicadores = {
    experiencia: faltando.includes('experiencia') ? 1 : 5,
    formacao: faltando.includes('formacao') ? 1 : 5,
    habilidades: faltando.includes('habilidades') ? 1 : 5,
    idiomas: faltando.includes('idiomas') ? 1 : 5,
    cursos: faltando.includes('cursos') ? 1 : 5,
    tamanho: texto.length < 500 ? 1 : texto.length > 3000 ? 2 : 5,
    datas: temDatas ? 5 : 1,
    escaneabilidade: temBullets ? 4 : 1
  };

  return { texto: relatorioFinal, indicadores };
}
//////////////////////////
// 📤 Upload + Análise
//////////////////////////
app.post('/analisar', upload.single('curriculo'), async (req, res) => {
  if (!req.file) return res.status(400).send('Nenhum arquivo enviado');

  try {
    const data = await pdfParse(req.file.buffer);
    const texto = data.text;
    const relatorio = analisarCurriculo(texto);

    res.send(`<pre>${relatorio}</pre>`);
  } catch (err) {
    console.error('Erro ao analisar currículo:', err.message);
    res.status(500).send('Erro ao processar o arquivo');
  }
});

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
const IPINFO_TOKEN = '83e6d56256238e';


app.post('/api/logs', async (req, res) => {
  let body = req.body;

  // Se o corpo vier como string (via sendBeacon), converte para JSON
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      return res.status(400).json({ error: 'Formato inválido de log' });
    }
  }

  const { acao, nome, timestamp, etapa } = body;

  // Ignora logs que não sejam da ação "etapa"
  if (acao !== 'etapa') {
    console.log(`🔍 Log ignorado: ação recebida foi '${acao}'`);
    return res.status(200).json({ mensagem: 'Log ignorado: ação não é etapa' });
  }

  const ipRaw = getPublicIP(req);
  const ipPublico = ipRaw.replace('::ffff:', '');

  let cidade = 'Desconhecida';
  let estado = 'XX';

  try {
    const response = await axios.get(`https://ipinfo.io/${ipPublico}/json?token=${IPINFO_TOKEN}`);
    const data = response.data;

    cidade = (data.city && data.city.trim() !== '') ? data.city : 'Desconhecida';
    estado = (data.region && data.region.trim() !== '') ? data.region : 'XX';
  } catch (err) {
    console.warn("❌ Falha ao consultar localização:", err.message);
  }

  const localizacao = `${cidade} - ${estado}`;

  try {
    const query = `
      INSERT INTO logs (acao, nome, timestamp, localizacao, ip_raw, ip_publico, etapa)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [acao, nome, timestamp, localizacao, ipRaw, ipPublico, etapa]);

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
    const query = 'SELECT id, acao, nome, timestamp, localizacao, ip_raw, ip_publico, etapa FROM logs ORDER BY id DESC';
    const [results] = await pool.query(query);

    if (!Array.isArray(results)) {
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
// 📥 Analisar e salvar relatório em PDF
//////////////////////////
app.post('/api/analisar-e-salvar', upload.single('curriculo'), async (req, res) => {
  const { nome, telefone } = req.body;
  if (!req.file || !nome || !telefone) {
    return res.status(400).json({ erro: 'Dados incompletos. Envie nome, telefone e o arquivo.' });
  }

  try {
    const mime = req.file.mimetype;
    let textoExtraido;

    if (mime === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      textoExtraido = data.text.trim();

      if (textoExtraido.length < 50) {
        return res.status(400).json({
          erro: 'O PDF parece não conter texto digital. Envie um currículo gerado por editor de texto, não escaneado.'
        });
      }
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      const textract = require('textract');
      textoExtraido = await new Promise((resolve, reject) => {
        textract.fromBufferWithMime(mime, req.file.buffer, (err, text) => {
          if (err) reject(err);
          else resolve(text.trim());
        });
      });

      if (textoExtraido.length < 50) {
        return res.status(400).json({
          erro: 'O documento parece vazio ou ilegível. Envie um currículo válido gerado por editor de texto.'
        });
      }
    } else {
      return res.status(400).json({ erro: 'Formato de arquivo não suportado. Envie PDF ou DOCX.' });
    }

    const { texto: relatorioTexto, indicadores } = analisarCurriculo(textoExtraido);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `relatorio-${Date.now()}.pdf`;

      const query = `
        INSERT INTO analises (nome, telefone, filename, mimetype, pdf_data)
        VALUES (?, ?, ?, ?, ?)
      `;
      await pool.query(query, [nome, telefone, filename, 'application/pdf', pdfBuffer]);

      res.json({ sucesso: true });
    });

    // Cabeçalho
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
       .text('Relatório de Análise do Currículo', { align: 'center' });
    doc.moveDown();

    // Dados do usuário
    doc.font('Helvetica').fontSize(12).fillColor('#333333')
       .text(`Nome: ${nome}`);
    doc.moveDown();

    // Corpo do relatório textual
    relatorioTexto.split('\n').forEach(linha => {
      if (linha.trim() === '') {
        doc.moveDown();
      } else {
        doc.font('Helvetica').fontSize(12).fillColor('#000000').text(linha.trim());
      }
    });

    doc.moveDown().moveDown();

    // Indicadores Visuais com porcentagem e cor nos números
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
       .text('Indicadores Visuais');
    doc.moveDown();

    Object.entries(indicadores).forEach(([secao, valor]) => {
      const porcentagem = Math.round((valor / 5) * 100);
      const label = secao.charAt(0).toUpperCase() + secao.slice(1).padEnd(18);

      let cor;
      if (porcentagem < 15) {
        cor = '#B22222'; // vermelho
      } else if (porcentagem < 50) {
        cor = '#DAA520'; // amarelo
      } else {
        cor = '#228B22'; // verde
      }

      doc.font('Helvetica').fontSize(12).fillColor('#000000').text(`${label}: `, { continued: true });
      doc.fillColor(cor).text(`${porcentagem}%`);
    });

    doc.end();
  } catch (err) {
    console.error('Erro na análise e salvamento:', err.message);
    res.status(500).json({ erro: 'Erro ao processar o arquivo' });
  }
});
app.get('/api/analises', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        nome, 
        telefone, 
        filename, 
        mimetype, 
        criado_em
      FROM analises
      ORDER BY id DESC
    `;
    
    const [results] = await pool.query(query);

    if (!Array.isArray(results)) {
      return res.status(500).json({ error: 'Formato inválido de resposta' });
    }

    res.json(results);
  } catch (err) {
    console.error('❌ Erro ao buscar análises:', {
      mensagem: err.message,
      codigo: err.code,
      sql: err.sql
    });
    res.status(500).json({ error: 'Erro ao buscar análises' });
  }
});

app.get('/api/analises/:id/download', async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'SELECT filename, mimetype, pdf_data FROM analises WHERE id = ?';
    const [results] = await pool.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    const { filename, mimetype, pdf_data } = results[0];
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf_data);
  } catch (err) {
    console.error('Erro ao baixar relatório:', err.message);
    res.status(500).json({ error: 'Erro ao baixar relatório' });
  }
});

//////////////////////////
// 🚀 Iniciar servidor
//////////////////////////
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});