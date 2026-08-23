const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require("docx");

const CARTAS = [
  { id: "executiva", nome: "Executiva", descricao: "Direta, estratégica e orientada a resultados." },
  { id: "moderna", nome: "Moderna", descricao: "Clara, segura e com linguagem atual." },
  { id: "criativa", nome: "Criativa", descricao: "Autêntica para comunicação, design e marketing." },
  { id: "tecnica", nome: "Técnica", descricao: "Foco em projetos, método e especialidade." },
  { id: "lideranca", nome: "Liderança", descricao: "Posicionamento para gestão e cargos seniores." },
  { id: "primeiro-emprego", nome: "Primeiro emprego", descricao: "Valoriza potencial, formação e atitude." },
  { id: "transicao", nome: "Transição de carreira", descricao: "Conecta experiências transferíveis ao novo objetivo." },
  { id: "estagio", nome: "Estágio", descricao: "Profissional sem perder autenticidade." },
  { id: "academica", nome: "Acadêmica", descricao: "Ideal para pesquisa, bolsas e universidades." },
  { id: "comercial", nome: "Comercial", descricao: "Persuasiva, objetiva e orientada ao cliente." },
  { id: "startup", nome: "Startup", descricao: "Enérgica, flexível e focada em impacto." },
  { id: "formal", nome: "Formal", descricao: "Clássica para empresas tradicionais." },
  { id: "internacional", nome: "Internacional", descricao: "Estrutura profissional para vagas globais." },
  { id: "recolocacao", nome: "Recolocação", descricao: "Reposiciona sua experiência com confiança." },
  { id: "networking", nome: "Networking", descricao: "Apresentação curta para abrir conversas." },
];

function montarTexto(dados) {
  const nome = dados.nome || "Seu nome";
  const saudacao = dados.destinatario ? `Prezado(a) ${dados.destinatario},` : "Prezado(a) recrutador(a),";
  const abertura = dados.motivacao || `Tenho interesse na oportunidade de ${dados.cargo || "profissional"} na ${dados.empresa || "sua empresa"}. Acredito que minha experiência e meu perfil podem contribuir de forma relevante para a equipe.`;
  const experiencia = dados.experiencia || "Ao longo da minha trajetória, desenvolvi competências importantes para a posição e aprendi a transformar desafios em entregas consistentes.";
  const diferenciais = dados.diferenciais || "Entre meus principais diferenciais estão a capacidade de aprender rapidamente, colaborar com diferentes equipes e manter foco em resultados de qualidade.";
  const encerramento = dados.encerramento || "Gostaria de conversar sobre como posso contribuir para os objetivos da empresa. Agradeço a atenção e fico à disposição para uma entrevista.";
  return { nome, saudacao, abertura, experiencia, diferenciais, encerramento, cargo: dados.cargo || "a oportunidade" };
}

function gerarCartaPDF(modeloId, dados) {
  const t = montarTexto(dados);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 72 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const accent = modeloId === "criativa" ? "#ea580c" : modeloId === "moderna" ? "#0e7490" : "#00324a";
    doc.font("Helvetica-Bold").fontSize(24).fillColor(accent).text(t.nome);
    doc.moveDown(.25).font("Helvetica").fontSize(10).fillColor("#64748b").text([dados.email, dados.telefone, dados.cidade].filter(Boolean).join("  |  "));
    doc.moveDown(1.8).fontSize(11).fillColor("#222").text(new Date().toLocaleDateString("pt-BR"));
    doc.moveDown(1).text(t.saudacao);
    doc.moveDown(.8).text(t.abertura, { lineGap: 5 });
    doc.moveDown(.8).text(t.experiencia, { lineGap: 5 });
    doc.moveDown(.8).text(t.diferenciais, { lineGap: 5 });
    doc.moveDown(.8).text(t.encerramento, { lineGap: 5 });
    doc.moveDown(1.3).text("Atenciosamente,");
    doc.moveDown(1.4).font("Helvetica-Bold").text(t.nome);
    doc.end();
  });
}

async function gerarCartaDOCX(modeloId, dados) {
  const t = montarTexto(dados);
  const children = [
    new Paragraph({ children: [new TextRun({ text: t.nome, bold: true, size: 34, color: modeloId === "criativa" ? "EA580C" : "00324A" })] }),
    new Paragraph({ children: [new TextRun({ text: [dados.email, dados.telefone, dados.cidade].filter(Boolean).join("  |  "), color: "64748B", size: 20 })] }),
    new Paragraph({ text: new Date().toLocaleDateString("pt-BR"), spacing: { before: 500 } }),
    new Paragraph({ text: t.saudacao, spacing: { before: 300 } }),
    new Paragraph({ text: t.abertura, spacing: { before: 220, after: 220 }, alignment: AlignmentType.JUSTIFIED }),
    new Paragraph({ text: t.experiencia, spacing: { after: 220 }, alignment: AlignmentType.JUSTIFIED }),
    new Paragraph({ text: t.diferenciais, spacing: { after: 220 }, alignment: AlignmentType.JUSTIFIED }),
    new Paragraph({ text: t.encerramento, spacing: { after: 400 }, alignment: AlignmentType.JUSTIFIED }),
    new Paragraph({ text: "Atenciosamente,", spacing: { after: 350 } }),
    new Paragraph({ children: [new TextRun({ text: t.nome, bold: true })] }),
  ];
  return Packer.toBuffer(new Document({ sections: [{ properties: {}, children }] }));
}

module.exports = { CARTAS, gerarCartaPDF, gerarCartaDOCX };
