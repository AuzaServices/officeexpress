// 📄 Gerador de currículos com 10 modelos formais e minimalistas.
// Todos os modelos priorizam a leitura 100% por IA de contratação (ATS):
// texto selecionável real, hierarquia clara de títulos, sem imagens
// decorativas, sem colunas que quebrem a leitura automática.
//
// Formatos de saída: PDF (pdfkit) e DOCX (lib "docx").

const { Document, Packer, Paragraph, ImageRun, AlignmentType } = require("docx");
const { gerarHTML } = require("./renderHTML");
const { htmlParaPDF, htmlParaImagem } = require("./pdf");
const PDFDocument = require("pdfkit");

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
];

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
// (lib/renderHTML.js — fonte única de verdade). Como o arquivo baixado é a
// imagem exata do preview, ele fica SEMPRE idêntico ao que o usuário viu,
// independentemente de motor de renderização ou fontes do servidor.
async function gerarPDF(modeloId, dadosBrutos) {
  const html = gerarHTML(modeloId, dadosBrutos);
  const img = await htmlParaImagem(html);
  if (!img || !img.length) {
    throw new Error(
      "Renderizador de imagem (Chromium) indisponível no servidor. Instale/configure o Puppeteer para gerar o PDF do currículo."
    );
  }
  return await imagemParaPDF(img);
}

// Embutir a imagem PNG em um PDF A4 (210x297mm) sem margens.
function imagemParaPDF(imgBuffer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [595.28, 841.89], margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    // A imagem é desenhada preenchendo a página A4 inteira.
    doc.image(imgBuffer, 0, 0, { width: 595.28, height: 841.89, fit: [595.28, 841.89] });
    doc.end();
  });
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------
// Converte o currículo para Word reproduzindo o MESMO layout visual da
// pré-visualização (fonte única de verdade: lib/renderHTML.js). Cada modelo
// usa a mesma cor, fonte e estrutura (colunas laterais via tabelas sem borda,
// cabeçalho centralizado, etc.) vista no preview/PDF, em página A4 sem margens.

const A4_WIDTH = 11906; // twips
const A4_HEIGHT = 16838; // twips

// Gera o Word embutindo a IMAGEM exata do preview (mesmo HTML de
// lib/renderHTML.js capturado em alta resolução). Assim o .docx fica
// IDÊNTICO ao que o usuário viu, sem depender de re-montar o layout em
// texto (que nunca reproduzia colunas, cores e tipografia com fidelidade).
async function gerarDOCX(modeloId, dadosBrutos) {
  const html = gerarHTML(modeloId, dadosBrutos);
  const img = await htmlParaImagem(html);
  if (!img || !img.length) {
    throw new Error(
      "Renderizador de imagem (Chromium) indisponível no servidor. Instale/configure o Puppeteer para gerar o Word do currículo."
    );
  }
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH, height: A4_HEIGHT },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: img,
              transformation: { width: 595, height: 842, type: "px" },
              type: "png",
            }),
          ],
        }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

module.exports = { MODELOS, gerarPDF, gerarDOCX, norm };
