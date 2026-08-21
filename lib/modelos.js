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
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
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
// Converte o currículo para Word reproduzindo o MESMO layout visual da
// pré-visualização (fonte única de verdade: lib/renderHTML.js). Cada modelo
// usa a mesma cor, fonte e estrutura (colunas laterais via tabelas sem borda,
// cabeçalho centralizado, etc.) vista no preview/PDF, em página A4 sem margens.

const A4_WIDTH = 11906; // twips
const A4_HEIGHT = 16838; // twips

// Configuração visual por modelo — espelha lib/renderHTML.js (CSS_BASE + CSS do modelo)
const DOCX_ESTILOS = {
  classico:     { cor: "00324A", fonte: "Arial",          alinhamento: "center", separador: true,  lateral: null },
  moderno:      { cor: "2563EB", fonte: "Arial",          alinhamento: "left",   separador: false, lateral: { larg: 34, bg: "2563EB", texto: "FFFFFF", titulo: "FFFFFF", contato: "E8EEFF" } },
  minimal:      { cor: "111827", fonte: "Arial",          alinhamento: "left",   separador: false, lateral: null },
  profissional: { cor: "334155", fonte: "Arial",          alinhamento: "center", separador: true,  lateral: null, banner: { bg: "334155", texto: "FFFFFF", contato: "E5E7EB" } },
  executivo:    { cor: "0F172A", fonte: "Arial",          alinhamento: "left",   separador: false, lateral: { larg: 30, bg: "0F172A", texto: "CBD5E1", titulo: "FFFFFF", contato: "CBD5E1" } },
  cronologico:  { cor: "0E7490", fonte: "Arial",          alinhamento: "left",   separador: false, lateral: null },
  funcional:    { cor: "4D7C0F", fonte: "Arial",          alinhamento: "left",   separador: false, lateral: { larg: 32, bg: "4D7C0F", texto: "F1F5F9", titulo: "FFFFFF", contato: "F1F5F9" } },
  compacto:     { cor: "1F2937", fonte: "Arial",          alinhamento: "left",   separador: false, lateral: { larg: 36, bg: "F8FAFC", texto: "1F2937", titulo: "1F2937", contato: "1F2937", bordaDir: "1F2937" } },
  soberio:      { cor: "3B2F2F", fonte: "Times New Roman", alinhamento: "center", separador: false, lateral: null },
  tecnico:      { cor: "1E3A8A", fonte: "Arial",          alinhamento: "left",   separador: true,  lateral: null, tec: true },
};

function txt(texto, opts = {}) {
  return new TextRun({ text: String(texto == null ? "" : texto), ...opts });
}

function par(texto, opts = {}) {
  const { align, spacing = { after: 120 }, run = {}, ...rest } = opts;
  return new Paragraph({
    alignment: align,
    spacing,
    children: [txt(texto, run)],
    ...rest,
  });
}

function secaoDocx(texto, cfg, opts = {}) {
  const border = cfg.separador || opts.border
    ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: cfg.cor } }
    : undefined;
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border,
    children: [txt(texto.toUpperCase(), { bold: true, color: cfg.cor, size: 24 })],
    alignment: opts.align || (cfg.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT),
  });
}

function semBorda() {
  return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
}

function celula(children, opts = {}) {
  return new TableCell({
    width: opts.largura != null ? { size: opts.largura, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.bg ? { type: ShadingType.CLEAR, fill: opts.bg } : undefined,
    verticalAlign: VerticalAlign.TOP,
    margins: opts.margins || { top: 240, bottom: 240, left: 260, right: 260 },
    borders: opts.borders || {
      top: semBorda(), bottom: semBorda(), left: semBorda(), right: semBorda(),
    },
    children,
  });
}

// Seções de conteúdo (idênticas em texto ao HTML)
function secoesConteudo(dados, cfg, modeloId, { naLateral = false } = {}) {
  const out = [];
  const alinhar = naLateral ? AlignmentType.LEFT : (cfg.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT);

  const exp = () => {
    const out2 = [];
    const temExp = dados.primeiroEmprego || dados.experiencias.length > 0;
    if (!temExp) return out2;
    if (!naLateral) out2.push(secaoDocx("Experiência Profissional", cfg, { align: alinhar }));
    if (dados.primeiroEmprego) out2.push(par("Primeiro emprego", { align: alinhar }));
    else {
      dados.experiencias.forEach((e) => {
        out2.push(par(e.empresa + (periodo(e) ? "   |   " + periodo(e) : ""), { align: alinhar, run: { bold: true, color: "111111" } }));
        if (e.cargo) out2.push(par(e.cargo, { align: alinhar, run: { italics: true, color: "444444" } }));
        if (e.atividades) out2.push(par(e.atividades, { align: alinhar }));
      });
    }
    return out2;
  };

  if (dados.objetivo) out.push(secaoDocx("Objetivo", cfg, { align: alinhar }), par(dados.objetivo, { align: alinhar }));
  if (modeloId !== "funcional" || !naLateral) out.push(...exp());
  if (dados.formacao) out.push(secaoDocx("Formação Acadêmica", cfg, { align: alinhar }), par(dados.formacao, { align: alinhar }));
  if (dados.cursos.length) {
    out.push(secaoDocx("Cursos e Certificações", cfg, { align: alinhar }));
    dados.cursos.forEach((c) => {
      let linha = c.nome;
      if (c.instituicao) linha += " - " + c.instituicao;
      if (c.carga) linha += " (" + c.carga + ")";
      out.push(par("• " + linha, { align: alinhar }));
    });
  }
  return out;
}

function gerarDOCX(modeloId, dadosBrutos) {
  const dados = norm(dadosBrutos);
  const cfg = DOCX_ESTILOS[modeloId] || DOCX_ESTILOS.classico;
  const modelo = modeloId;
  const children = [];

  // Foto (se houver) — igual à pré-visualização
  if (dados.foto) {
    try {
      const base64 = dados.foto.split(",")[1] || "";
      const fotoBuf = Buffer.from(base64, "base64");
      if (fotoBuf.length) {
        const mime = (dados.foto.match(/^data:image\/(png|jpeg|jpg|gif);/) || [])[1] || "png";
        children.push(new Paragraph({
          alignment: cfg.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new ImageRun({ data: fotoBuf, transformation: { width: 80, height: 80 }, type: mime === "png" ? "png" : "jpg" })],
        }));
      }
    } catch (e) { /* foto inválida: ignora */ }
  }

  // ---------- Cabeçalho (nome + contato) ----------
  const contato = [dados.email, ...dados.telefones, dados.endereco].filter(Boolean);
  const contatoLinha = contato.join("   •   ");
  const alinharTitulo = cfg.alinhamento === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;
  const nomePar = new Paragraph({
    alignment: alinharTitulo,
    spacing: { after: 80 },
    children: [txt(dados.nome || "Currículo", { bold: true, color: cfg.cor, size: 40 })],
  });
  const contatoPar = contatoLinha
    ? new Paragraph({
        alignment: alinharTitulo,
        spacing: { after: 200 },
        children: [txt(contatoLinha, { color: "444444", size: 22 })],
      })
    : null;

  const cabecalho = () => {
    const c = [];
    if (dados.nome) c.push(nomePar);
    if (contatoPar) c.push(contatoPar);
    return c;
  };

  // ---------- Modelos com banner superior (profissional) ----------
  if (cfg.banner) {
    children.push(
      celula([
        nomePar,
        contatoPar ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [txt(contatoLinha, { color: cfg.banner.contato, size: 22 })] }) : new Paragraph(""),
      ], { bg: cfg.banner.bg, margins: { top: 480, bottom: 480, left: 720, right: 720 } }),
      new Paragraph({ spacing: { after: 120 }, children: [] }),
      ...secoesConteudo(dados, cfg, modelo)
    );
  }
  // ---------- Modelos com lateral (tabela de 2 colunas) ----------
  else if (cfg.lateral) {
    const latTitulo = (t) => new Paragraph({
      spacing: { before: 240, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: cfg.lateral.titulo } },
      children: [txt(t.toUpperCase(), { bold: true, color: cfg.lateral.titulo, size: 22 })],
    });
    const latPar = (t) => new Paragraph({ spacing: { after: 80 }, children: [txt(t, { color: cfg.lateral.texto, size: 22 })] });
    const latTags = (texto) => texto.split(",").map((s) => s.trim()).filter(Boolean).map((h) => latPar("• " + h));

    // Conteúdo principal (coluna direita / main)
    const dir = [];
    dir.push(...secoesConteudo(dados, cfg, modelo)); // objetivo, experiência, formação, cursos
    if (modelo === "funcional") {
      if (dados.hobbies) dir.push(secaoDocx("Hobbies e Interesses", cfg), par(dados.hobbies));
      if (dados.infoAdicional) dir.push(secaoDocx("Informações Adicionais", cfg), par(dados.infoAdicional));
    } else if (modelo === "compacto") {
      // compacto: col-dir só tem objetivo, experiência, formação, cursos
    } else {
      // moderno / executivo: informações adicionais no main
      if (dados.infoAdicional) dir.push(secaoDocx("Informações Adicionais", cfg), par(dados.infoAdicional));
    }

    // Conteúdo lateral (coluna esquerda)
    const esq = [];
    if (modelo === "compacto") {
      // compacto: nome e contato ficam na coluna esquerda (col-esq)
      esq.push(nomePar);
      if (contatoPar) esq.push(contatoPar);
      if (dados.habilidades) { esq.push(secaoDocx("Habilidades", cfg), par(dados.habilidades)); }
      if (dados.hobbies) { esq.push(secaoDocx("Interesses", cfg), par(dados.hobbies)); }
      if (dados.infoAdicional) esq.push(secaoDocx("Informações Adicionais", cfg), par(dados.infoAdicional));
    } else {
      esq.push(latTitulo("Contato"));
      contato.forEach((c) => esq.push(latPar(c)));
      if (dados.habilidades) {
        esq.push(latTitulo(modelo === "funcional" ? "Competências" : "Habilidades"));
        esq.push(...latTags(dados.habilidades));
      }
      if (modelo !== "funcional" && dados.hobbies) {
        esq.push(latTitulo("Interesses"));
        esq.push(...latTags(dados.hobbies));
      }
    }

    const tabelaLateral = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula(esq, { largura: cfg.lateral.larg, bg: cfg.lateral.bg }),
            celula(dir, { largura: 100 - cfg.lateral.larg }),
          ],
        }),
      ],
    });
    children.push(tabelaLateral);
  }
  // ---------- Modelos de fluxo único (sem lateral) ----------
  else {
    children.push(...cabecalho());
    children.push(...secoesConteudo(dados, cfg));
    if (dados.habilidades) children.push(secaoDocx("Habilidades", cfg), par(dados.habilidades));
    if (dados.hobbies) children.push(secaoDocx("Hobbies e Interesses", cfg), par(dados.hobbies));
    if (dados.infoAdicional) children.push(secaoDocx("Informações Adicionais", cfg), par(dados.infoAdicional));
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: cfg.fonte, size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH, height: A4_HEIGHT },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { MODELOS, gerarPDF, gerarDOCX, norm };
