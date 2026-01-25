const express = require('express');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const pdfParse = require('pdf-parse'); // 📥 Novo
const cron = require('node-cron');
const bcrypt = require('bcrypt'); // para hash seguro da senha

require('dotenv').config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'   // ⬅️ importante
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexão MySQL estabelecida');
    conn.release();
  } catch (err) {
    console.error('❌ Falha ao conectar ao MySQL:', err.code, err.message);
  }
})();

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
  const { telefone, valor, estado, cidade } = req.body; // ➕ captura os novos campos

  try {
    // 1. Verifica quantos PDFs existem
    const [pdfs] = await pool.query('SELECT id FROM pdfs ORDER BY created_at ASC');

    if (pdfs.length >= 5) {
      // 2. Apaga os 5 mais antigos
      const idsParaApagar = pdfs.slice(0, 5).map(pdf => pdf.id);
      const placeholders = idsParaApagar.map(() => '?').join(',');
      await pool.query(`DELETE FROM pdfs WHERE id IN (${placeholders})`, idsParaApagar);
    }

    // 3. Salva o novo PDF com os campos extras
    const query = `
      INSERT INTO pdfs (filename, mimetype, data, telefone, valor, estado, cidade)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      originalname,
      mimetype,
      buffer,
      telefone,
      valor || 5.99,   // ➕ valor padrão do currículo
      estado || null,
      cidade || null
    ]);

    res.status(200).json({ message: 'PDF salvo com sucesso', id: result.insertId });
  } catch (err) {
    console.error('Erro ao salvar PDF:', err.message);
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
    const query = `
      SELECT p.id, p.filename, p.telefone, p.created_at, p.valor, p.estado, p.cidade,
             EXISTS(SELECT 1 FROM registros_pagos r WHERE r.pdf_id = p.id) AS jaPago
      FROM pdfs p
      ORDER BY p.id DESC
    `;
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
const path = require('path');

app.post('/api/analisar-e-salvar', upload.single('curriculo'), async (req, res) => {
  const { nome, telefone, cidade, estado } = req.body;

  // validação obrigatória
  if (!req.file || !nome || !telefone || !cidade || !estado) {
    return res.status(400).json({ erro: 'Dados incompletos. Envie nome, telefone, cidade, estado e o arquivo.' });
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
      try {
        const pdfBuffer = Buffer.concat(buffers);

        // sanitização
        let nomeSanitizado = nome.trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/[\/\\?%*:|"<>]/g, '');
        const filename = `Relatorio - ${nomeSanitizado}.pdf`.slice(0, 255);

        const telefoneLimpo = telefone.slice(0, 20);

        await pool.query(`
          INSERT INTO analises (nome, telefone, cidade, estado, filename, mimetype, pdf_data, valor)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          nome,
          telefoneLimpo,
          cidade,
          estado,
          filename,
          'application/pdf',
          pdfBuffer,
          5.99
        ]);

        res.json({ sucesso: true });
      } catch (err) {
        console.error('❌ Erro ao salvar no banco:', err);
        res.status(500).json({ erro: 'Erro ao salvar no banco' });
      }
    });

    // === Marca d'água central (imagem) ===
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const imgWidth = 300;
    const imgHeight = 300;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    const marcaPath = path.join(__dirname, 'public', 'marca.png');
    doc.image(marcaPath, x, y, { width: imgWidth, height: imgHeight });

    // Cabeçalho do PDF
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
       .text('Relatório de Análise do Currículo', { align: 'center' });
    doc.moveDown();

    // Dados do usuário
    doc.font('Helvetica').fontSize(12).fillColor('#333333')
       .text(`Nome: ${nome}`);
    doc.text(`Telefone: ${telefone}`);
    doc.text(`Cidade: ${cidade}`);
    doc.text(`Estado: ${estado}`);
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

    // Indicadores Visuais
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

    doc.moveDown().moveDown();

    // Frase de incentivo + link
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
       .text('Dica final');

    doc.font('Helvetica').fontSize(12).fillColor('#333333')
       .text('Se seu currículo recebeu alertas importantes, considere criar uma nova versão mais completa e atrativa.');

    doc.moveDown();

    doc.fillColor('#1E90FF').text('Clique aqui para acessar o criador de Currículos OfficeExpress', {
      link: 'https://officeexpress.onrender.com/splash.html',
      underline: true
    });

    if (doc.y > doc.page.height - 100) {
      doc.addPage();

      // Marca d'água também na nova página
      doc.image(marcaPath, x, y, { width: imgWidth, height: imgHeight });
    }

    doc.end();
  } catch (err) {
    console.error('Erro na análise e salvamento:', err);
    res.status(500).json({ erro: 'Erro ao processar o arquivo' });
  }
});

app.get('/api/analises', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.nome,
        a.telefone,
        a.filename,
        a.mimetype,
        a.cidade,
        a.estado,
        a.criado_em,
        a.valor,
        EXISTS(
          SELECT 1 FROM registros_pagos r WHERE r.pdf_id = a.id
        ) AS jaPago
      FROM analises a
      ORDER BY a.id DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows); // devolve array com jaPago junto
  } catch (err) {
    console.error('❌ Erro ao buscar análises:', err);
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
// 🗑️ Apagar PDF por ID
//////////////////////////
app.delete('/api/pdfs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'DELETE FROM pdfs WHERE id = ?';
    await pool.query(query, [id]);
    res.status(204).send(); // sucesso sem conteúdo
  } catch (err) {
    console.error('Erro ao apagar PDF:', err.message);
    res.status(500).json({ error: 'Erro ao apagar PDF' });
  }
});

//////////////////////////
// 🗑️ Apagar TODOS os logs
//////////////////////////
app.delete('/api/logs', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM logs');
    res.status(204).send(); // sucesso sem conteúdo
  } catch (err) {
    console.error('Erro ao apagar todos os logs:', err.message);
    res.status(500).json({ error: 'Erro ao apagar logs' });
  }
});

//////////////////////////
// 🗑️ Apagar relatório por ID
//////////////////////////
app.delete('/api/analises/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = 'DELETE FROM analises WHERE id = ?';
    await pool.query(query, [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao apagar análise:', err.message);
    res.status(500).json({ error: 'Erro ao apagar análise' });
  }
});

// Cadastro
app.post('/api/cadastro', async (req, res) => {
  const { nome, senha, whatsapp } = req.body;

  if (!nome || !senha || !whatsapp) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }

  try {
    // Verifica se já existe usuário com esse nome
    const [rows] = await pool.query('SELECT id FROM usuarios WHERE nome = ?', [nome]);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'Nome já cadastrado, escolha outro' });
    }

    // Valida força da senha
    const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!senhaForte.test(senha)) {
      return res.status(400).json({
        error: 'Senha fraca. Use ao menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos.'
      });
    }

    // Gera hash da senha
    const hash = await bcrypt.hash(senha, 10);

    // Gera código randômico
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insere no banco
    await pool.query(
      'INSERT INTO usuarios (nome, senha, whatsapp, indicacoes, codigo) VALUES (?, ?, ?, 0, ?)',
      [nome, hash, whatsapp, codigo]
    );

    res.json({ success: true, codigo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { nome, senha } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE nome = ?', [nome]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const usuario = rows[0];
    const match = await bcrypt.compare(senha, usuario.senha);
    if (!match) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    res.json({
      message: 'Login realizado com sucesso',
      nome: usuario.nome,
      codigo: usuario.codigo,
      indicacoes: usuario.indicacoes,
      metaAtingida: usuario.indicacoes >= 5
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ error: 'Erro no login' });
  }
});

// Atualizar indicações (quando alguém paga via link)
app.post('/api/indicar', async (req, res) => {
  const { codigo } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE codigo = ?', [codigo]);
    if (rows.length === 0) return res.status(404).json({ error: 'Código não encontrado' });

    await pool.query(`
      UPDATE usuarios 
      SET indicacoes = LEAST(indicacoes + 1, 10),
          link_tipo = CASE 
                        WHEN LEAST(indicacoes + 1, 10) >= 10 THEN 'comum' 
                        ELSE 'indicacao' 
                      END
      WHERE codigo = ?`, [codigo]);

    const [updated] = await pool.query('SELECT indicacoes, link_tipo FROM usuarios WHERE codigo = ?', [codigo]);
    res.json({ message: 'Indicação registrada', indicacoes: updated[0].indicacoes, link_tipo: updated[0].link_tipo });
  } catch (err) {
    console.error('Erro ao registrar indicação:', err.message);
    res.status(500).json({ error: 'Erro ao registrar indicação' });
  }
});


app.get('/api/painel/:nome', async (req, res) => {
  const { nome } = req.params;
  try {
    const [rows] = await pool.query('SELECT nome, codigo, indicacoes FROM usuarios WHERE nome = ?', [nome]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao carregar painel:', err.message);
    res.status(500).json({ error: 'Erro ao carregar painel' });
  }
});

app.get('/api/painel/codigo/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const [rows] = await pool.query('SELECT nome, codigo FROM usuarios WHERE codigo = ?', [codigo]);
  if (rows.length === 0) return res.status(404).json({ error: 'Código não encontrado' });
  res.json(rows[0]);
});

// Confirmar pagamento
app.post('/api/pdfs/:id/pago', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM pdfs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Currículo não encontrado' });
    }

    const registro = rows[0];

    if (registro.pago === 1) {
      return res.status(400).json({ error: 'Este currículo já foi marcado como pago.' });
    }

    await pool.query('UPDATE pdfs SET pago = 1 WHERE id = ?', [id]);

    // 👉 Agora só insere em registros_pagos
    const valorFinal = registro.valor && registro.valor > 0 ? registro.valor : 5.99;
    await pool.query(`
      INSERT INTO registros_pagos (tipo, nome_doc, valor, estado, cidade, data, hora, pago)
      VALUES (?, ?, ?, ?, ?, DATE(NOW()), TIME(NOW()), 1)
    `, [
      "Currículo",
      registro.filename,
      valorFinal,
      registro.estado,
      registro.cidade
    ]);

    res.json({ sucesso: true });
  } catch (err) {
    console.error('❌ Erro ao registrar pagamento do currículo:', err);
    res.status(500).json({ error: 'Erro ao registrar pagamento do currículo' });
  }
});

app.post('/api/indicacoes', async (req, res) => {
  const { codigo, indicado_nome, tipo } = req.body;

  try {
    // Descobre o usuário dono do código
    const [rows] = await pool.query('SELECT id, nome FROM usuarios WHERE codigo = ?', [codigo]);
    if (rows.length === 0) return res.status(404).json({ error: 'Código inválido' });

    const usuario = rows[0];

    // Registra a indicação
    await pool.query(
      'INSERT INTO indicacoes (usuario_id, indicado_nome, codigo, tipo) VALUES (?, ?, ?, ?)',
      [usuario.id, indicado_nome, codigo, tipo]
    );

    // Atualiza contador no usuário com trava no máximo 10
    await pool.query(
      'UPDATE usuarios SET indicacoes = LEAST(indicacoes + 1, 10) WHERE id = ?',
      [usuario.id]
    );

    // Busca valor atualizado para retornar corretamente
    const [updated] = await pool.query('SELECT indicacoes FROM usuarios WHERE id = ?', [usuario.id]);

    res.json({ message: 'Indicação registrada com sucesso', indicacoes: updated[0].indicacoes });
  } catch (err) {
    console.error('Erro ao registrar indicação:', err.message);
    res.status(500).json({ error: 'Erro ao registrar indicação' });
  }
});

app.post('/api/pagamentos', async (req, res) => {
  const { codigo, indicado_nome, tipo } = req.body;
  console.log('Dados recebidos:', req.body);

  try {
    // Verifica se o código existe e qual o tipo do link
    const [rows] = await pool.query('SELECT link_tipo FROM usuarios WHERE codigo = ?', [codigo]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Código inválido' });
    }

    // Se o link já for comum, não registra pagamento como indicação
    if (rows[0].link_tipo === 'comum') {
      return res.json({ message: 'Este link é comum e não gera mais indicações' });
    }

    // Caso contrário, registra normalmente
    await pool.query(
      'INSERT INTO pagamentos (codigo, indicado_nome, tipo, status) VALUES (?, ?, ?, ?)',
      [codigo, indicado_nome, tipo, 'pendente']
    );

    res.json({ message: 'Pagamento registrado como pendente' });
  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    res.status(500).json({ error: err.message });
  }
});

// Confirmar pagamento
// Confirmar pagamento (sem mexer em indicações)
app.post('/api/pagamentos/:id/confirmar', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE pagamentos SET status = "pago" WHERE id = ?', [id]);
    res.json({ message: 'Pagamento confirmado' });
  } catch (err) {
    console.error('Erro ao confirmar pagamento:', err.message);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
});


// Listar todas as indicações/pagamentos
// Listar indicações com nome do indicador
app.get('/api/indicacoes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, u.nome AS indicador_nome, p.indicado_nome, p.codigo, p.tipo, p.status, p.created_at
      FROM pagamentos p
      LEFT JOIN usuarios u ON p.codigo = u.codigo
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao carregar indicações:', err.message);
    res.status(500).json({ error: 'Erro ao carregar indicações' });
  }
});

// Listar todos os pagamentos (para o painel)
// Listar todos os pagamentos/indicações para o painel
app.get('/api/pagamentos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT p.id, u.nome AS indicador_nome, p.indicado_nome, p.codigo, p.tipo, p.status, p.created_at ' +
      'FROM pagamentos p ' +
      'LEFT JOIN usuarios u ON p.codigo = u.codigo ' +
      'ORDER BY p.created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao carregar pagamentos:', err.message);
    res.status(500).json({ error: 'Erro ao carregar pagamentos' });
  }
});

// Apagar indicação/pagamento
app.delete('/api/indicacoes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT codigo FROM pagamentos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Registro não encontrado' });

    await pool.query('DELETE FROM pagamentos WHERE id = ?', [id]);

    res.json({ message: 'Indicação apagada com sucesso (sem alterar pontos)' });
  } catch (err) {
    console.error('Erro ao apagar indicação:', err.message);
    res.status(500).json({ error: 'Erro ao apagar indicação' });
  }
});


// Registrar pagamento da análise
app.post('/api/pagamentos-analise/:id/confirmar', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE pagamentos SET status = "pago" WHERE id = ?', [id]);

    const [rows] = await pool.query('SELECT codigo FROM pagamentos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const codigo = rows[0].codigo;

    await pool.query(`
      UPDATE usuarios 
      SET indicacoes = LEAST(indicacoes + 1, 10),
          link_tipo = CASE 
                        WHEN LEAST(indicacoes + 1, 10) >= 10 THEN 'comum' 
                        ELSE 'indicacao' 
                      END
      WHERE codigo = ?`, [codigo]);

    const [updated] = await pool.query('SELECT indicacoes, link_tipo FROM usuarios WHERE codigo = ?', [codigo]);

    res.json({
      message: 'Pagamento da análise confirmado e indicação registrada',
      indicacoes: updated[0].indicacoes,
      link_tipo: updated[0].link_tipo
    });
  } catch (err) {
    console.error('Erro ao confirmar pagamento da análise:', err.message);
    res.status(500).json({ error: 'Erro ao confirmar pagamento da análise' });
  }
});

// Listar usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, codigo, whatsapp, indicacoes FROM usuarios'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Alterar indicações com limite de 0 a 10
app.post('/api/usuarios/:id/indicacoes', async (req, res) => {
  const { id } = req.params;
  const { acao } = req.body;

  try {
    if (acao === 'mais') {
      await pool.query(`
        UPDATE usuarios 
        SET indicacoes = LEAST(indicacoes + 1, 10),
            link_tipo = CASE 
                          WHEN LEAST(indicacoes + 1, 10) >= 10 THEN 'comum' 
                          ELSE 'indicacao' 
                        END
        WHERE id = ?`, [id]);
    } else if (acao === 'menos') {
      await pool.query(`
        UPDATE usuarios 
        SET indicacoes = GREATEST(indicacoes - 1, 0),
            link_tipo = CASE 
                          WHEN indicacoes < 10 THEN 'indicacao' 
                          ELSE link_tipo 
                        END
        WHERE id = ?`, [id]);
    }

    const [rows] = await pool.query('SELECT indicacoes, link_tipo FROM usuarios WHERE id = ?', [id]);

    res.json({ success: true, indicacoes: rows[0].indicacoes, link_tipo: rows[0].link_tipo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar indicações' });
  }
});


// Apagar usuário
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ success: true, message: 'Usuário apagado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar usuário' });
  }
});


// 1. Rota para salvar pagamento
app.post('/salvar-pago', async (req, res) => {
  const { id, tipo, nome_doc, valor, estado, cidade } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT 1 FROM registros_pagos WHERE pdf_id = ?',
      [id]
    );

    if (rows.length > 0) {
      // já existe
      return res.json({ success: false, alreadyPaid: true });
    }

    await pool.query(`
      INSERT INTO registros_pagos (pdf_id, tipo, nome_doc, valor, estado, cidade, data, hora, pago)
      VALUES (?, ?, ?, ?, ?, ?, DATE(NOW()), TIME(NOW()), 1)
    `, [id, tipo, nome_doc, valor, estado, cidade]);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar pagamento:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// 2. Rota para listar registros pagos por Estado
// Relatório por estado, com filtros opcionais
// Relatório por estado (currículos e análises)
app.get('/api/relatorio/:estado', async (req, res) => {
  const { estado } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT id, tipo, nome_doc, valor, cidade, data
      FROM registros_pagos
      WHERE estado = ?
      ORDER BY data DESC
    `, [estado]);

    res.json(rows); // cada linha = 1 pagamento (currículo ou análise)
  } catch (err) {
    console.error('Erro ao gerar relatório por estado:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório por estado' });
  }
});



// 3. Rota para listar todos os registros pagos
// Listar registros pagos com filtros opcionais
app.get('/api/pagos', async (req, res) => {
  try {
    const { tipo, estado, cidade } = req.query;

    // Base da query
    let sql = 'SELECT * FROM registros_pagos WHERE pago = 1';
    const params = [];

    // Filtros opcionais
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }
    if (estado) {
      sql += ' AND estado = ?';
      params.push(estado);
    }
    if (cidade) {
      sql += ' AND cidade = ?';
      params.push(cidade);
    }

    // Ordenar por data/hora mais recentes
    sql += ' ORDER BY data DESC, hora DESC';

    const [results] = await pool.query(sql, params);
    res.json(results);
  } catch (err) {
    console.error('❌ Erro ao listar pagos:', err.message);
    res.status(500).json({ error: 'Erro ao listar pagos' });
  }
});


// 4. Rota para apagar todos os logs (acessos)
app.delete('/apagar-logs', async (req, res) => {
  try {
    await pool.query('DELETE FROM registros_acessos');
    res.json({ message: 'Todos os logs foram apagados!' });
  } catch (err) {
    console.error('Erro ao apagar logs:', err.message);
    res.status(500).json({ error: 'Erro ao apagar logs' });
  }
});


// 5. Rota para usuários cadastrados
app.get('/usuarios', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM usuarios');
    res.json(results);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});


app.post('/api/analises/:id/pago', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT filename, valor, estado, cidade, pago FROM analises WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Análise não encontrada" });
    }

    const analise = rows[0];

    if (analise.pago === 1) {
      return res.status(400).json({ erro: "Esta análise já foi marcada como paga." });
    }

    const valorFinal = analise.valor && analise.valor > 0 ? analise.valor : 5.99;

    // 👉 Atualiza apenas o status pago
    await pool.query("UPDATE analises SET pago = 1 WHERE id = ?", [id]);

    // 👉 Insere em registros_pagos
    await pool.query(`
      INSERT INTO registros_pagos (tipo, nome_doc, valor, estado, cidade, data, hora, pago)
      VALUES (?, ?, ?, ?, ?, DATE(NOW()), TIME(NOW()), 1)
    `, [
      "Análise",
      analise.filename,
      valorFinal,
      analise.estado,
      analise.cidade
    ]);

    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ Erro ao registrar pagamento da análise:", err);
    res.status(500).json({ erro: "Erro ao registrar pagamento da análise" });
  }
});

// Relatório geral com opção de detalhar por cidade
// Relatório geral (todos os estados)
app.get('/api/relatorio-geral', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT estado,
             COUNT(CASE WHEN tipo = 'Currículo' THEN 1 END) AS curriculos,
             COUNT(CASE WHEN tipo = 'Análise' THEN 1 END) AS analises
      FROM registros_pagos
      WHERE pago = 1
      GROUP BY estado
    `);

    res.json(rows);
  } catch (err) {
    console.error('Erro ao gerar relatório geral:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório geral' });
  }
});


app.delete('/api/registros', async (req, res) => {
  const { senha } = req.body;

  if (senha !== process.env.EXCLUSAO_SENHA) {
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }

  try {
    await pool.query('DELETE FROM registros_pagos');
    res.json({ success: true, message: 'Todos os registros foram excluídos.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro ao excluir todos os registros.' });
  }
});

app.delete('/api/registros/:estado', async (req, res) => {
  const { estado } = req.params;
  const { senha } = req.body;

  if (senha !== process.env.EXCLUSAO_SENHA) {
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }

  try {
    await pool.query('DELETE FROM registros_pagos WHERE estado = ?', [estado]);
    res.json({ success: true, message: `Registros do estado ${estado} foram excluídos.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro ao excluir registros por estado.' });
  }
});

app.post('/api/verificar-senha', (req, res) => {
  const { senha } = req.body;
  console.log("Senha recebida:", senha);
  console.log("Senha do .env:", process.env.EXCLUSAO_SENHA);

  if (!senha) {
    return res.status(400).json({ autorizado: false, error: 'Senha não enviada' });
  }

  if (String(senha).trim() === String(process.env.EXCLUSAO_SENHA).trim()) {
    return res.json({ autorizado: true });
  } else {
    return res.status(401).json({ autorizado: false, error: 'Senha incorreta' });
  }
});

// Relatório completo (todos os registros pagos detalhados)
app.get('/api/relatorio-completo', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, tipo, nome_doc, valor, estado, cidade, data
      FROM registros_pagos
      ORDER BY estado, data DESC
    `);

    res.json(rows); // retorna array detalhado de todos os pagamentos
  } catch (err) {
    console.error('Erro ao gerar relatório completo:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório completo' });
  }
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.LOGIN_USER && password === process.env.LOGIN_PASS) {
    return res.json({ message: 'Login realizado com sucesso' });
  }
  res.status(401).json({ error: 'Usuário ou senha inválidos' });
});

// painel protegido (sem JWT, só exemplo)
app.get('/painel', (req, res) => {
  res.sendFile(__dirname + '/painel.html');
});




//////////////////////////
// 🚀 Iniciar servidor
//////////////////////////
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
// 🧹 Tarefa agendada: limpar logs diariamente às 3h da manhã
cron.schedule('0 3 * * *', async () => {
  try {
    const [result] = await pool.query('DELETE FROM logs');
    console.log(`🧹 Logs limpos automaticamente às 03:00 — ${result.affectedRows} registros apagados`);
  } catch (err) {
    console.error('❌ Erro ao limpar logs automaticamente:', err.message);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    await pool.query('SELECT 1');
    console.log('🔄 Ping ao banco OK');
  } catch (err) {
    console.error('❌ Erro no ping ao banco:', err.message);
  }
});