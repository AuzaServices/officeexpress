// 📄 Gerador de currículos com 10 modelos formais e minimalistas.
// Todos os modelos priorizam a leitura 100% por IA de contratação (ATS):
// texto selecionável real, hierarquia clara de títulos, sem imagens
// decorativas, sem colunas que quebrem a leitura automática.
//
// Formato de saída: PDF (pdfkit).

const { gerarHTML } = require("./renderHTML");
const { htmlParaPDF, htmlParaImagem } = require("./pdf");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Catálogo dos 10 modelos
// ---------------------------------------------------------------------------
const MODELOS = [
  { id: "classico",     nome: "Clássico",     descricao: "O tradicional: cabeçalho centralizado, seções em ordem cronológica. Máxima compatibilidade com qualquer sistema." },
  { id: "moderno",      nome: "Moderno",      descricao: "Toque de cor sutil com faixa lateral fina. Limpo, profissional e ainda 100% legível." },
  { id: "minimal",      nome: "Minimal",      descricao: "Só o essencial. Muito espaço em branco e tipografia elegante. Sofisticado e direto." },
  { id: "profissional", nome: "Profissional", descricao: "Tom sóbrio com separadores discretos. O padrão ouro para áreas corporativas." },
  { id: "executivo",    nome: "Executivo",    descricao: "Para cargos de liderança, com ênfase em realizações e cargos." },
  { id: "cronologico",  nome: "Cronológico",  descricao: "Experiência em destaque, listada em ordem cronológica reversa." },
  { id: "funcional",    nome: "Funcional",    descricao: "Foco em habilidades e competências. Ideal para quem tem pouca experiência." },
  { id: "compacto",     nome: "Compacto",     descricao: "Aproveita bem o espaço. Ótimo para quem tem muita experiência para caber em poucas páginas." },
  { id: "soberio",      nome: "Sóbrio",       descricao: "Fonte serifada, visual clássico e elegante. Sofisticado e atemporal." },
  { id: "tecnico",      nome: "Técnico",      descricao: "Otimizado para áreas técnicas e engenharia, com seções de certificações e projetos." },
  { id: "elegante",     nome: "Elegante",     descricao: "Tipografia refinada e espaçosa, com toque de cor suave. Moderno e sofisticado." },
  { id: "criativo",     nome: "Criativo",     descricao: "Lateral colorida com avatar e destaque para habilidades. Ideal para áreas de criação e comunicação." },
  { id: "limpo",        nome: "Limpo",        descricao: "Visual objetivo e sem ruído, com cabeçalho marcado por linha de destaque." },
  { id: "tradicional",  nome: "Tradicional",  descricao: "Serifado clássico com borda dupla. Perfil conservador e confiável." },
  { id: "contemporaneo", nome: "Contemporâneo", descricao: "Banner colorido e seções com etiquetas. Equilíbrio entre moderno e profissional." },
  // ---- 20 modelos novos (inspirados em referências ATS de Harvard, Jobscan, ResumeGenius e Zety) ----
  { id: "harvard", nome: "Harvard", descricao: "Inspirado no formato oficial de Harvard: bullet points objetivos, ordem reversa e tipografia sóbria. O favorito dos recrutadores." },
  { id: "impacto", nome: "Impacto", descricao: "Cabeçalho em destaque com faixa de cor e foco em realizações. Ideal para quem quer ser lembrado em segundos." },
  { id: "executivo-escuro", nome: "Executivo Escuro", descricao: "Cabeçalho escuro elegante com corpo claro. Autoridade para cargos de direção e alta gestão." },
  { id: "diplomatico", nome: "Diplomático", descricao: "Traços finos e equilíbrio perfeito entre formalidade e modernidade. Agrada a qualquer recrutador." },
  { id: "academico", nome: "Acadêmico", descricao: "Formato clássico para vagas acadêmicas, pesquisa e mestrado, com ênfase em formação e publicações." },
  { id: "consultor", nome: "Consultor", descricao: "Layout de consultoria: resumo profissional forte, competências em destaque e resultados mensuráveis." },
  { id: "vendas", nome: "Vendas", descricao: "Feito para comerciais: metas batidas e resultados em destaque. Mostre números, não só tarefas." },
  { id: "saude", nome: "Saúde", descricao: "Pensado para profissionais de saúde: registro profissional, especializações e escala de plantões organizadas." },
  { id: "industrial", nome: "Industrial", descricao: "Para chão de fábrica e indústria: competências operacionais, certificações de segurança e turnos em evidência." },
  { id: "logistica", nome: "Logística", descricao: "Rotas, estoques e prazos: o modelo que organiza a operação do jeito que o setor entende." },
  { id: "marketing", nome: "Marketing", descricao: "Criatividade com organização: campanhas, métricas e ferramentas em destaque, sem perder o ATS." },
  { id: "financeiro", nome: "Financeiro", descricao: "Precisão numérica em cada detalhe: para contabilidade, controladoria e análise financeira." },
  { id: "rh", nome: "Recursos Humanos", descricao: "Foco em pessoas: recrutamento, treinamento e cultura organizacional bem estruturados." },
  { id: "ti", nome: "Tecnologia (TI)", descricao: "Stack de tecnologias em evidência, projetos e certificações. O padrão das vagas de tecnologia." },
  { id: "juridico", nome: "Jurídico", descricao: "Serifado formal com áreas de atuação e OAB em destaque. Tradição que a advocacia exige." },
  { id: "educador", nome: "Educador", descricao: "Para professores e educadores: disciplinas, metodologias e formação pedagógica organizadas." },
  { id: "design", nome: "Design", descricao: "Para criativos de verdade: portfólio e ferramentas em evidência, com layout que respira arte sem quebrar o ATS." },
  { id: "estudante", nome: "Estudante", descricao: "Primeiro estágio ou emprego? Cursos, atividades extracurriculares e potencial em primeiro lugar." },
  { id: "transicao", nome: "Transição de Carreira", descricao: "Mudando de área? Habilidades transferíveis em destaque, com a experiência recontada para a nova carreira." },
  { id: "executivo-internacional", nome: "Executivo Internacional", descricao: "Padrão global (inglês/LinkedIn): idiomas, experiência multinacional e formato aceito no exterior." },
];

// Ajustes por modelo (aplicados sobre o layout base do fallback PDF).
const ESTILOS = {
  classico:     { cor: "#00324a", fonte: "Helvetica",      tamanho: 10, alinhamento: "center" },
  moderno:      { cor: "#2563eb", fonte: "Helvetica",      tamanho: 10, faixaLateral: true },
  minimal:      { cor: "#111827", fonte: "Helvetica",      tamanho: 10, espacado: true },
  profissional: { cor: "#334155", fonte: "Helvetica",      tamanho: 10, separadores: true },
  executivo:    { cor: "#0f172a", fonte: "Helvetica-Bold", tamanho: 10, separadores: true },
  cronologico:  { cor: "#0e7490", fonte: "Helvetica",      tamanho: 10, espacado: true },
  funcional:    { cor: "#4d7c0f", fonte: "Helvetica",      tamanho: 10, separadores: true },
  compacto:     { cor: "#1f2937", fonte: "Helvetica",      tamanho: 9,  espacado: false },
  soberio:      { cor: "#3b2f2f", fonte: "Times-Roman",    tamanho: 10.5, espacado: true },
  tecnico:      { cor: "#1e3a8a", fonte: "Helvetica",      tamanho: 10, separadores: true },
  elegante:     { cor: "#0f766e", fonte: "Helvetica",      tamanho: 10, espacado: true },
  criativo:     { cor: "#ea580c", fonte: "Helvetica",      tamanho: 10, faixaLateral: true },
  limpo:        { cor: "#111827", fonte: "Helvetica",      tamanho: 10, espacado: true },
  tradicional:  { cor: "#7c5a3a", fonte: "Times-Roman",    tamanho: 10, espacado: true },
  contemporaneo:{ cor: "#3730a3", fonte: "Helvetica",      tamanho: 10, separadores: true },
  harvard:      { cor: "#1a1a1a", fonte: "Helvetica",      tamanho: 10, espacado: true, separadores: true },
  impacto:      { cor: "#b45309", fonte: "Helvetica-Bold", tamanho: 10, separadores: true },
  "executivo-escuro": { cor: "#111827", fonte: "Helvetica-Bold", tamanho: 10, separadores: true },
  diplomatico:  { cor: "#155e75", fonte: "Helvetica",      tamanho: 10, espacado: true, separadores: true },
  academico:    { cor: "#1f2937", fonte: "Times-Roman",    tamanho: 10.5, espacado: true },
  consultor:    { cor: "#312e81", fonte: "Helvetica",      tamanho: 10, separadores: true },
  vendas:       { cor: "#be123c", fonte: "Helvetica",      tamanho: 10, separadores: true },
  saude:        { cor: "#047857", fonte: "Helvetica",      tamanho: 10, espacado: true, separadores: true },
  industrial:   { cor: "#374151", fonte: "Helvetica",      tamanho: 10, separadores: true },
  logistica:    { cor: "#0c4a6e", fonte: "Helvetica",      tamanho: 10, separadores: true },
  marketing:    { cor: "#9d174d", fonte: "Helvetica",      tamanho: 10, faixaLateral: true },
  financeiro:   { cor: "#065f46", fonte: "Helvetica",      tamanho: 10, separadores: true },
  rh:           { cor: "#7c3aed", fonte: "Helvetica",      tamanho: 10, espacado: true },
  ti:           { cor: "#1d4ed8", fonte: "Helvetica",      tamanho: 10, separadores: true },
  juridico:     { cor: "#292524", fonte: "Times-Roman",    tamanho: 10.5, separadores: true },
  educador:     { cor: "#166534", fonte: "Helvetica",      tamanho: 10, espacado: true },
  design:       { cor: "#c2410c", fonte: "Helvetica",      tamanho: 10, faixaLateral: true },
  estudante:    { cor: "#0369a1", fonte: "Helvetica",      tamanho: 10, espacado: true },
  transicao:    { cor: "#5b21b6", fonte: "Helvetica",      tamanho: 10, separadores: true },
  "executivo-internacional": { cor: "#0f172a", fonte: "Helvetica", tamanho: 10, espacado: true, separadores: true },
};

// ---------------------------------------------------------------------------
// Normalização dos dados (garante arrays alinhados por índice)
// ---------------------------------------------------------------------------
function norm(d) {
  const dados = d || {};
  const arr = (k) => (Array.isArray(dados[k]) ? dados[k] : []);
  const telefones = arr("telefone").filter(Boolean);
  const cursos = arr("curso")
    .map((_, i) => ({
      nome: dados.curso[i],
      instituicao: (dados.instituicao && dados.instituicao[i]) || "",
      carga: (dados.carga && dados.carga[i]) || "",
    }))
    .filter((c) => c.nome);
  const experiencias = arr("empresa")
    .map((_, i) => ({
      empresa: dados.empresa[i],
      cargo: (dados.cargo && dados.cargo[i]) || "",
      inicio: (dados.periodo_inicio && dados.periodo_inicio[i]) || "",
      fim: (dados.periodo_fim && dados.periodo_fim[i]) || "",
      atividades: (dados.atividades && dados.atividades[i]) || "",
    }))
    .filter((e) => e.empresa);
  return {
    nome: dados.nome || "",
    email: dados.email || "",
    telefones,
    endereco: [dados.endereco, dados.numero ? ", " + dados.numero : "", dados.bairro ? " - " + dados.bairro : "", dados.cidade ? " - " + dados.cidade : "", dados.estado ? " - " + dados.estado : ""].join("").trim(),
    objetivo: dados.objetivo || "",
    formacao: dados.formacao || "",
    habilidades: dados.habilidades || "",
    hobbies: dados.hobbies || "",
    infoAdicional: dados.infoAdicional || "",
    primeiroEmprego: dados.primeiroEmprego === "true" || dados.primeiroEmprego === true,
    cursos,
    experiencias,
  };
}

function periodo(e) {
  return [e.inicio, e.fim].filter(Boolean).join(" a ");
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
// Gera o PDF a partir de uma IMAGEM do mesmo HTML da pré-visualização
// (lib/renderHTML.js — fonte única de verdade). Assim o arquivo baixado fica
// idêntico ao preview. Se o Chromium (Puppeteer) não estiver disponível no
// servidor — comum em planos gratuitos — há um fallback em pdfkit que gera o
// PDF direto dos dados, garantindo que o download nunca falhe.
async function gerarPDF(modeloId, dadosBrutos, opts) {
  // marca=false remove a marca d'água (futuro: assinantes premium).
  const comMarca = !opts || opts.marca !== false;
  const html = gerarHTML(modeloId, dadosBrutos, { marca: comMarca });
  let img = null;
  try {
    img = await htmlParaImagem(html);
  } catch (e) {
    img = null;
    console.error("❌ Chromium falhou ao renderizar o modelo (caindo para PDF sem modelo):", e && e.message);
  }
  if (img && img.length) {
    return await imagemParaPDF(img, { marca: comMarca });
  }
  // Fallback: gera o PDF com pdfkit (sem depender de Chromium).
  console.warn("⚠️ PDF gerado SEM modelo (fallback pdfkit) — Chromium não produziu imagem para o modelo:", modeloId);
  const buffer = await gerarPDFDireto(modeloId, dadosBrutos);
  return buffer;
}

// Embutir a imagem PNG em um PDF A4 (210x297mm) sem margens.
function imagemParaPDF(imgBuffer, opts) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [595.28, 841.89], margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    // A imagem é desenhada preenchendo a página A4 inteira.
    doc.image(imgBuffer, 0, 0, { width: 595.28, height: 841.89, fit: [595.28, 841.89] });
    // Reforço da marca d'água direto no pdfkit (caso o HTML não a inclua).
    if (!opts || opts.marca !== false) desenharMarca(doc);
    doc.end();
  });
}

// Marca d'água discreta em pdfkit: site no canto inferior esquerdo e mini logo
// no canto inferior direito. Cinza claro, não interfere na leitura.
function desenharMarca(doc) {
  try {
    const y = doc.page.height - 18;
    doc.save();
    doc.font("Helvetica").fontSize(6.5).fillColor("#9aa5b1");
    doc.text("www.officeexpress.com.br", 18, y, { lineBreak: false });
    // Logo no canto inferior direito; sem arquivo, cai para texto discreto.
    const logoPath = path.join(__dirname, "..", "public", "imagens", "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width - 18 - 46, y - 4, { height: 12, opacity: 0.38 });
    } else {
      doc.fontSize(6).fillColor("#9aa5b1")
        .text("OFFICE EXPRESS", doc.page.width - 130, y, { width: 112, align: "right", lineBreak: false });
    }
    doc.restore();
  } catch (e) { /* marca é decorativa: nunca derruba o PDF */ }
}

// Fallback do PDF: monta o documento diretamente com pdfkit, sem Chromium.
function gerarPDFDireto(modeloId, dadosBrutos) {
  return new Promise((resolve, reject) => {
    try {
      const dados = norm(dadosBrutos);
      const estilo = ESTILOS[modeloId] || ESTILOS.classico;
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const cor = estilo.cor;

      // Faixa lateral (modelo moderno)
      if (estilo.faixaLateral) {
        doc.rect(0, 0, 12, doc.page.height).fill(cor);
      }

      // Cabeçalho / nome
      doc.font(estilo.fonte).fontSize(estilo.tamanho + 12).fillColor(cor);
      if (estilo.alinhamento === "center") doc.text(dados.nome || "Currículo", { align: "center" });
      else doc.text(dados.nome || "Currículo");

      doc.moveDown(0.2);

      // Linha de contato
      const contato = [];
      if (dados.email) contato.push(dados.email);
      if (dados.telefones.length) contato.push(dados.telefones.join(" / "));
      if (dados.endereco) contato.push(dados.endereco);
      if (contato.length) {
        doc.font(estilo.fonte).fontSize(estilo.tamanho - 1).fillColor("#444444");
        if (estilo.alinhamento === "center") doc.text(contato.join("  •  "), { align: "center" });
        else doc.text(contato.join("  •  "));
      }
      doc.moveDown(0.4);

      const secao = (titulo) => {
        doc.moveDown(0.5);
        doc.font(estilo.fonte).fontSize(estilo.tamanho + 2).fillColor(cor);
        doc.text(titulo.toUpperCase());
        if (estilo.separadores) {
          doc.strokeColor(cor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        }
        doc.moveDown(0.2);
      };
      const corpo = () => doc.font(estilo.fonte).fontSize(estilo.tamanho).fillColor("#222222");

      if (dados.objetivo) {
        secao("Objetivo");
        corpo();
        doc.text(dados.objetivo);
      }

      // Experiência (funcional coloca depois de habilidades; demais aqui)
      const temExp = dados.primeiroEmprego || dados.experiencias.length > 0;
      if (temExp && modeloId !== "funcional") {
        secao("Experiência Profissional");
        corpo();
        if (dados.primeiroEmprego) {
          doc.text("Primeiro emprego");
        } else {
          dados.experiencias.forEach((e) => {
            doc.font(estilo.fonte).fontSize(estilo.tamanho).fillColor("#111111").text(e.empresa + (periodo(e) ? "  |  " + periodo(e) : ""));
            if (e.cargo) doc.font(estilo.fonte).fontSize(estilo.tamanho).fillColor("#444444").text(e.cargo);
            if (e.atividades) doc.font(estilo.fonte).fontSize(estilo.tamanho).fillColor("#333333").text(e.atividades);
            doc.moveDown(0.3);
          });
        }
      }

      if (dados.formacao) {
        secao("Formação Acadêmica");
        corpo();
        doc.text(dados.formacao);
      }

      if (dados.cursos.length) {
        secao("Cursos e Certificações");
        corpo();
        dados.cursos.forEach((c) => {
          let linha = c.nome;
          if (c.instituicao) linha += " - " + c.instituicao;
          if (c.carga) linha += " (" + c.carga + ")";
          doc.text("• " + linha);
        });
      }

      if (dados.habilidades) {
        secao("Habilidades");
        corpo();
        doc.text(dados.habilidades);
      }

      // Experiência no modelo funcional (após habilidades)
      if (temExp && modeloId === "funcional") {
        secao("Experiência Profissional");
        corpo();
        if (dados.primeiroEmprego) doc.text("Primeiro emprego");
        else dados.experiencias.forEach((e) => {
          doc.font(estilo.fonte).fontSize(estilo.tamanho).fillColor("#111111").text(e.empresa + (periodo(e) ? "  |  " + periodo(e) : ""));
          if (e.cargo) doc.text(e.cargo);
          if (e.atividades) doc.text(e.atividades);
          doc.moveDown(0.3);
        });
      }

      if (dados.hobbies) {
        secao("Hobbies e Interesses");
        corpo();
        doc.text(dados.hobbies);
      }

      if (dados.infoAdicional) {
        secao("Informações Adicionais");
        corpo();
        doc.text(dados.infoAdicional);
      }

      desenharMarca(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = { MODELOS, gerarPDF, norm };
