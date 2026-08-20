// 📄 Gerador de currículos com 10 modelos formais e minimalistas.
// Todos os modelos priorizam a leitura 100% por IA de contratação (ATS):
// texto selecionável real, hierarquia clara de títulos, sem imagens
// decorativas, sem colunas que quebrem a leitura automática.
//
// Formatos de saída: PDF (pdfkit) e DOCX (lib "docx").

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} = require("docx");
const { gerarHTML } = require("./renderHTML");
const { htmlParaPDF } = require("./pdf");

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

// Ajustes por modelo (aplicados sobre o layout base)
const ESTILOS = {
  classico:     { cor: "#00324a", fonte: "Helvetica",     tamanho: 10, alinhamento: "center" },
  moderno:      { cor: "#2563eb", fonte: "Helvetica",     tamanho: 10, faixaLateral: true },
  minimal:      { cor: "#111827", fonte: "Helvetica",     tamanho: 10, espacado: true },
  profissional: { cor: "#334155", fonte: "Helvetica",     tamanho: 10, separadores: true },
  executivo:    { cor: "#0f172a", fonte: "Helvetica-Bold",tamanho: 10, separadores: true },
  cronologico:  { cor: "#0e7490", fonte: "Helvetica",     tamanho: 10, espacado: true },
  funcional:    { cor: "#4d7c0f", fonte: "Helvetica",     tamanho: 10, separadores: true },
  compacto:     { cor: "#1f2937", fonte: "Helvetica",     tamanho: 9,  espacado: false },
  soberio:      { cor: "#3b2f2f", fonte: "Times-Roman",   tamanho: 10.5, espacado: true },
  tecnico:      { cor: "#1e3a8a", fonte: "Helvetica",     tamanho: 10, separadores: true },
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
    foto: dados.foto || "",
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
// Gera o PDF a partir do HTML (fonte única de verdade — Opção C).
// O MESMO HTML usado pela pré-visualização é renderizado via Chromium, para
// que o arquivo baixado seja SEMPRE idêntico ao que o usuário viu no preview.
// Não há fallback com outro motor de renderização (pdfkit): isso gerava um
// layout diferente do preview. Se o Chromium falhar, retorna erro (visível),
// em vez de entregar silenciosamente um modelo errado.
async function gerarPDF(modeloId, dadosBrutos) {
  const html = gerarHTML(modeloId, dadosBrutos);
  const buf = await htmlParaPDF(html);
  if (!buf || !buf.length) {
    throw new Error(
      "Renderizador de PDF (Chromium) indisponível no servidor. Instale/configure o Puppeteer para gerar o PDF do currículo."
    );
  }
  return buf;
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------
async function gerarDOCX(modeloId, dadosBrutos) {
  const dados = norm(dadosBrutos);
  const estilo = ESTILOS[modeloId] || ESTILOS.classico;
  const children = [];

  const titulo = (texto) =>
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: estilo.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: dados.nome || "Currículo", bold: true, color: estilo.cor.replace("#", ""), size: 40 })],
    });

  const contato = [dados.email, ...dados.telefones, dados.endereco].filter(Boolean).join("   •   ");
  const linhaContato = contato
    ? new Paragraph({
        alignment: estilo.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: contato, color: "444444", size: 22 })],
        spacing: { after: 200 },
      })
    : null;

  const secao = (texto) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      border: estilo.separadores ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: estilo.cor.replace("#", "") } } : undefined,
      children: [new TextRun({ text: texto.toUpperCase(), bold: true, color: estilo.cor.replace("#", ""), size: 24 })],
    });

  const paragrafo = (texto, opts = {}) =>
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: texto, color: "222222", size: 22, ...opts })],
    });

  // Foto (se houver) — igual à pré-visualização
  if (dados.foto) {
    try {
      const base64 = dados.foto.split(",")[1] || "";
      const fotoBuf = Buffer.from(base64, "base64");
      if (fotoBuf.length) {
        const mime = (dados.foto.match(/^data:image\/(png|jpeg|jpg|gif);/) || [])[1] || "png";
        children.push(new Paragraph({
          alignment: estilo.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new ImageRun({
            data: fotoBuf,
            transformation: { width: 80, height: 80 },
            type: mime === "png" ? "png" : "jpg",
          })],
        }));
      }
    } catch (e) { /* foto inválida: ignora */ }
  }

  if (dados.nome) children.push(titulo());
  if (linhaContato) children.push(linhaContato);

  if (dados.objetivo) {
    children.push(secao("Objetivo"), paragrafo(dados.objetivo));
  }

  const temExp = dados.primeiroEmprego || dados.experiencias.length > 0;
  if (temExp && modeloId !== "funcional") {
    children.push(secao("Experiência Profissional"));
    if (dados.primeiroEmprego) children.push(paragrafo("Primeiro emprego"));
    else {
      dados.experiencias.forEach((e) => {
        children.push(paragrafo(e.empresa + (periodo(e) ? "   |   " + periodo(e) : ""), { bold: true, color: "111111" }));
        if (e.cargo) children.push(paragrafo(e.cargo, { italics: true, color: "444444" }));
        if (e.atividades) children.push(paragrafo(e.atividades));
      });
    }
  }

  if (dados.formacao) {
    children.push(secao("Formação Acadêmica"), paragrafo(dados.formacao));
  }

  if (dados.cursos.length) {
    children.push(secao("Cursos e Certificações"));
    dados.cursos.forEach((c) => {
      let linha = c.nome;
      if (c.instituicao) linha += " - " + c.instituicao;
      if (c.carga) linha += " (" + c.carga + ")";
      children.push(paragrafo("• " + linha));
    });
  }

  if (dados.habilidades) {
    children.push(secao("Habilidades"), paragrafo(dados.habilidades));
  }

  if (temExp && modeloId === "funcional") {
    children.push(secao("Experiência Profissional"));
    if (dados.primeiroEmprego) children.push(paragrafo("Primeiro emprego"));
    else dados.experiencias.forEach((e) => {
      children.push(paragrafo(e.empresa + (periodo(e) ? "   |   " + periodo(e) : ""), { bold: true }));
      if (e.cargo) children.push(paragrafo(e.cargo, { italics: true }));
      if (e.atividades) children.push(paragrafo(e.atividades));
    });
  }

  if (dados.hobbies) {
    children.push(secao("Hobbies e Interesses"), paragrafo(dados.hobbies));
  }

  if (dados.infoAdicional) {
    children.push(secao("Informações Adicionais"), paragrafo(dados.infoAdicional));
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

module.exports = { MODELOS, gerarPDF, gerarDOCX, norm };
