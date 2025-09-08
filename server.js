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

  // 🔍 Seções esperadas com sinônimos
  const secoesEsperadas = {
    experiencia: ['experiência', 'trajetória', 'histórico profissional'],
    formacao: ['formação', 'educação', 'escolaridade', 'ensino'],
    habilidades: ['habilidades', 'competências', 'skills'],
    idiomas: ['idiomas', 'línguas', 'língua estrangeira'],
    cursos: ['cursos', 'capacitações', 'certificações']
  };

  // 🔍 Detectar seções
  const faltando = [];
  for (const [secao, termos] of Object.entries(secoesEsperadas)) {
    const presente = termos.some(t => textoLower.includes(t));
    if (!presente) faltando.push(secao);
  }

  if (faltando.length > 0) {
    alertas.push(`⚠️ Seções ausentes ou não detectadas: ${faltando.join(', ')}`);
  } else {
    elogios.push('✅ Todas as seções principais foram encontradas.');
  }

  // 📏 Tamanho do texto
  if (texto.length < 500) {
    alertas.push('📄 Currículo muito curto. Pode estar incompleto ou pouco detalhado.');
  } else if (texto.length > 3000) {
    alertas.push('📄 Currículo muito longo. Pode estar cansativo ou repetitivo.');
  } else {
    elogios.push('📏 Tamanho do currículo está adequado.');
  }

  // 📅 Datas
  const temDatas = /\b(19|20)\d{2}\b/.test(textoLower);
  if (!temDatas) {
    alertas.push('📅 Nenhuma data encontrada. Experiências podem estar mal contextualizadas.');
  } else {
    elogios.push('📅 Datas detectadas. Experiências parecem contextualizadas.');
  }

  // 📌 Bullet points
  const temBullets = texto.includes('•') || texto.includes('- ');
  if (!temBullets) {
    sugestoes.push('📌 Use bullet points para facilitar leitura e escaneabilidade.');
  } else {
    elogios.push('📌 Uso de bullet points detectado. Boa escaneabilidade.');
  }

  // 🔍 Verbos fracos
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
      sugestoes.push(`🔍 Substitua '${verbo}' por algo como '${sugestoesVerbo[verbo]}' para dar mais força à sua descrição.`);
    }
  });

  // 🗣️ Primeira pessoa
  const primeiraPessoa = ['eu ', 'meu ', 'minha ', 'me ', 'mim '];
  const usoPessoal = primeiraPessoa.filter(p => textoLower.includes(p));
  if (usoPessoal.length > 2) {
    alertas.push('🗣️ Uso excessivo de primeira pessoa. Prefira frases objetivas e impessoais.');
  }

  // 🔁 Repetição de termos
  const palavras = textoLower.split(/\s+/);
  const contagem = {};
  palavras.forEach(p => {
    contagem[p] = (contagem[p] || 0) + 1;
  });
  const repetidas = Object.entries(contagem).filter(([p, c]) => c > 10 && p.length > 3);
  if (repetidas.length > 0) {
    const termos = repetidas.map(([p]) => p).join(', ');
    alertas.push(`🔁 Repetição excessiva de termos: ${termos}`);
  }

  // 🧠 Perfil
  let perfil = '🔰 Perfil não identificado';
  if (textoLower.includes('estágio') || textoLower.includes('iniciação') || textoLower.includes('júnior')) {
    perfil = '🟢 Perfil Júnior / Estagiário';
  } else if (
    textoLower.includes('coordenei') ||
    textoLower.includes('gerenciei') ||
    textoLower.includes('liderança') ||
    textoLower.includes('pleno') ||
    textoLower.includes('sênior')
  ) {
    perfil = '🔵 Perfil Pleno / Sênior';
  }

  // 🧮 Score
  const score = Math.max(0, 100 - alertas.length * 10);
  const nota = score >= 80 ? '🟢 Excelente estrutura' :
               score >= 60 ? '🟡 Estrutura boa, com ajustes' :
               '🔴 Estrutura fraca, precisa revisão';

  // 📋 Resultado final
  return `
📋 Relatório de Análise do Currículo

${perfil}
${nota} (Score: ${score}/100)

${elogios.join('\n')}
${alertas.length > 0 ? '\n' + alertas.join('\n') : '\n✅ Nenhum problema crítico detectado.'}
${sugestoes.length > 0 ? '\n\n💡 Sugestões de melhoria:\n' + sugestoes.join('\n') : ''}
  `.trim();
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
  const { acao, nome, timestamp } = req.body;

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
      INSERT INTO logs (acao, nome, timestamp, localizacao, ip_raw, ip_publico)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
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
    const data = await pdfParse(req.file.buffer);
    const texto = data.text;
    const relatorio = analisarCurriculo(texto);

    // Gerar PDF com o relatório
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
// Cabeçalho
doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
   .text('Relatório de Análise do Currículo', { align: 'center' });
doc.moveDown();

doc.font('Helvetica').fontSize(12).fillColor('#333333')
   .text(`Nome: ${nome}`);
doc.moveDown();

// Avaliação Geral
doc.font('Helvetica-Bold').fontSize(14).text('Avaliação Geral');
doc.moveDown();
doc.font('Helvetica').fontSize(12).text(
  'O currículo apresenta limitações que dificultam uma análise mais precisa. Abaixo estão os principais pontos observados:'
);
doc.moveDown();
doc.list([
  'Perfil não identificado.',
  'Currículo muito curto, possivelmente incompleto ou pouco detalhado.',
  'Ausência de datas, o que compromete a contextualização das experiências profissionais.'
]);
doc.moveDown(2);

// Sugestões de Melhoria
doc.font('Helvetica-Bold').fontSize(14).text('Sugestões de Melhoria');
doc.moveDown();
doc.font('Helvetica').fontSize(12).text(
  'Para aprimorar a apresentação e aumentar a efetividade do currículo, recomenda-se:'
);
doc.moveDown();
doc.list([
  'Utilizar tópicos (bullet points) para facilitar a leitura e escaneabilidade.',
  'Incluir seções claras como: Experiência Profissional, Formação Acadêmica, Habilidades Técnicas, Idiomas e Cursos Complementares.',
  'Adicionar datas e descrições objetivas para cada experiência.'
]);
doc.moveDown();

doc.end();
  } catch (err) {
    console.error('Erro na análise e salvamento:', err.message);
    res.status(500).json({ erro: 'Erro ao processar o arquivo' });
  }
});

//////////////////////////
// 🚀 Iniciar servidor
//////////////////////////
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});