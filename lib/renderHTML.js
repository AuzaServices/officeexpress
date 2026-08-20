// 🎨 Renderizador de currículo em HTML — FONTE ÚNICA DE VERDADE (Opção C).
//
// Este módulo gera o HTML do currículo a partir de `modeloId` + `dados`.
// O mesmo HTML é usado:
//   1. Pela pré-visualização no navegador (preview / editor);
//   2. Pelo servidor para gerar o PDF (via renderizador HTML->PDF).
//
// Assim, o que o usuário vê é exatamente o que sai no download — sem a
// duplicação de lógica (HTML no cliente vs pdfkit no servidor) que causou
// divergências no passado.

// ---------------------------------------------------------------------------
// Normalização (igual à de modelos.js, para garantir mesmos campos)
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

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function periodo(e) {
  return [e.inicio, e.fim].filter(Boolean).join(" a ");
}

// ---------------------------------------------------------------------------
// Estilos por modelo (só cores e ajustes; o layout real vem do CSS)
// ---------------------------------------------------------------------------
const ESTILOS = {
  classico:     { cor: "#00324a", fonte: "sans" },
  moderno:      { cor: "#2563eb", fonte: "sans" },
  minimal:      { cor: "#111827", fonte: "sans" },
  profissional: { cor: "#334155", fonte: "sans" },
  executivo:    { cor: "#0f172a", fonte: "sans" },
  cronologico:  { cor: "#0e7490", fonte: "sans" },
  funcional:    { cor: "#4d7c0f", fonte: "sans" },
  compacto:     { cor: "#1f2937", fonte: "sans" },
  soberio:      { cor: "#3b2f2f", fonte: "serif" },
  tecnico:      { cor: "#1e3a8a", fonte: "sans" },
};

function corpoHTML(dados, experiencias, naLateral) {
  let h = "";
  if (dados.objetivo) h += `<section><h2>Objetivo</h2><p class="par">${esc(dados.objetivo)}</p></section>`;
  if (dados.experiencias.length || dados.primeiroEmprego) {
    h += `<section><h2>Experiência Profissional</h2>`;
    if (dados.primeiroEmprego) {
      h += `<p class="par">Primeiro emprego</p>`;
    } else {
      h += `<div class="exp">`;
      dados.experiencias.forEach((e) => {
        h += `<div class="exp-item">`;
        h += `<div class="exp-head"><span class="exp-empresa">${esc(e.empresa)}</span><span class="exp-periodo">${esc(periodo(e))}</span></div>`;
        if (e.cargo) h += `<div class="exp-cargo">${esc(e.cargo)}</div>`;
        if (e.atividades) h += `<div class="exp-ativ">${esc(e.atividades)}</div>`;
        h += `</div>`;
      });
      h += `</div>`;
    }
    h += `</section>`;
  }
  if (dados.formacao) h += `<section><h2>Formação Acadêmica</h2><p class="par">${esc(dados.formacao)}</p></section>`;
  if (dados.cursos.length && !naLateral) {
    h += `<section><h2>Cursos e Certificações</h2><ul class="lista">`;
    dados.cursos.forEach((c) => {
      let linha = c.nome;
      if (c.instituicao) linha += " - " + c.instituicao;
      if (c.carga) linha += " (" + c.carga + ")";
      h += `<li>${esc(linha)}</li>`;
    });
    h += `</ul></section>`;
  }
  if (dados.habilidades && !naLateral) h += `<section><h2>Habilidades</h2><p class="par">${esc(dados.habilidades)}</p></section>`;
  if (dados.hobbies && !naLateral) h += `<section><h2>Hobbies e Interesses</h2><p class="par">${esc(dados.hobbies)}</p></section>`;
  if (dados.infoAdicional) h += `<section><h2>Informações Adicionais</h2><p class="par">${esc(dados.infoAdicional)}</p></section>`;
  return h;
}

function gerarHTML(modeloId, dadosBrutos) {
  const dados = norm(dadosBrutos);
  const estilo = ESTILOS[modeloId] || ESTILOS.classico;
  const cor = estilo.cor;

  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const contatoHTML = contato.length ? `<div class="contato">${contato.join('<span class="sep">•</span>')}</div>` : "";

  const fotoHTML = dados.foto ? `<img class="foto" src="${dados.foto}" alt="Foto" />` : "";
  const nomeHTML = `<h1 class="nome">${esc(dados.nome || "Currículo")}</h1>`;

  // Layouts com estrutura própria (sidebar / timeline) precisam de wrappers.
  const naLateral = modeloId === "funcional";
  const corpo = corpoHTML(dados, null, naLateral);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${estilo.fonte === "serif" ? "Georgia, 'Times New Roman', serif" : "'Helvetica Neue', Helvetica, Arial, sans-serif"};
    color: #222;
    font-size: 12px;
    line-height: 1.5;
    width: 210mm;
    min-height: 297mm;
  }
  .page { position: relative; padding: 40px 48px; }
  .nome { font-size: 26px; }
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${cor};
    margin: 18px 0 8px;
  }
  .par { white-space: pre-wrap; }
  .lista { margin: 0 0 0 18px; }
  .lista li { margin-bottom: 3px; }
  .foto { display: block; }
  .contato { margin: 6px 0 4px; }
  .contato .sep { margin: 0 6px; color: #bbb; }
  .exp-head { display: flex; justify-content: space-between; align-items: baseline; }
  .exp-empresa { font-weight: bold; color: #111; }
  .exp-periodo { color: #666; font-size: 11px; white-space: nowrap; }
  .exp-cargo { font-style: italic; color: #444; }
  .exp-ativ { color: #333; margin-top: 2px; }
  .exp-item { margin-bottom: 10px; }

  /* ============ CLÁSSICO ============ */
  .modelo-classico .nome { text-align: center; font-weight: bold; color: ${cor}; }
  .modelo-classico .contato { text-align: center; color: #444; }
  .modelo-classico h2 { text-align: center; }
  .modelo-classico section h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .modelo-classico .foto { margin: 0 auto 10px; width: 84px; height: 84px; border-radius: 50%; object-fit: cover; }

  /* ============ MODERNO (faixa lateral) ============ */
  .modelo-moderno .page { padding-left: 70px; }
  .modelo-moderno .page::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 14px;
    background: ${cor};
  }
  .modelo-moderno .nome { color: ${cor}; }
  .modelo-moderno .foto { width: 90px; height: 90px; border-radius: 12px; object-fit: cover; margin-bottom: 10px; }
  .modelo-moderno h2 { border-left: 3px solid ${cor}; padding-left: 8px; }

  /* ============ MINIMAL ============ */
  .modelo-minimal { font-weight: 300; }
  .modelo-minimal .page { padding: 60px 70px; }
  .modelo-minimal .nome { font-weight: 300; color: ${cor}; letter-spacing: 1px; }
  .modelo-minimal .contato { color: #777; }
  .modelo-minimal h2 { font-weight: 400; color: ${cor}; letter-spacing: 2px; }
  .modelo-minimal .foto { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; }

  /* ============ PROFISSIONAL (banner) ============ */
  .modelo-profissional .page { padding: 0; }
  .modelo-profissional .cab {
    background: ${cor}; color: #fff; padding: 30px 48px; padding-top: 36px;
  }
  .modelo-profissional .cab .nome { color: #fff; }
  .modelo-profissional .cab .contato { color: #e5e7eb; }
  .modelo-profissional .cab .contato .sep { color: #cbd5e1; }
  .modelo-profissional .corpo { padding: 6px 48px 40px; }
  .modelo-profissional h2 { border-bottom: 2px solid ${cor}; padding-bottom: 4px; }
  .modelo-profissional .foto { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 3px solid rgba(255,255,255,0.6); }

  /* ============ EXECUTIVO ============ */
  .modelo-executivo .page { padding: 48px 56px; }
  .modelo-executivo .nome { font-weight: 800; color: ${cor}; letter-spacing: -0.5px; }
  .modelo-executivo .cab { border-bottom: 3px solid ${cor}; padding-bottom: 12px; margin-bottom: 6px; }
  .modelo-executivo h2 { color: ${cor}; }
  .modelo-executivo section { border-top: 1px solid #e5e7eb; margin-top: 14px; padding-top: 6px; }
  .modelo-executivo .foto { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; float: right; margin-left: 16px; }

  /* ============ CRONOLÓGICO (timeline) ============ */
  .modelo-cronologico .nome { color: ${cor}; }
  .modelo-cronologico .exp { border-left: 2px solid ${cor}; margin-left: 4px; padding-left: 14px; }
  .modelo-cronologico .exp-item { position: relative; }
  .modelo-cronologico .exp-item::before {
    content: ""; position: absolute; left: -19px; top: 5px; width: 8px; height: 8px;
    border-radius: 50%; background: ${cor};
  }
  .modelo-cronologico .exp-periodo { font-weight: bold; color: ${cor}; }
  .modelo-cronologico h2 { color: ${cor}; }
  .modelo-cronologico .foto { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; }

  /* ============ FUNCIONAL (sidebar) ============ */
  .modelo-funcional .page { display: flex; padding: 0; }
  .modelo-funcional .sidebar {
    width: 32%; background: ${cor}; color: #fff; padding: 30px 22px;
  }
  .modelo-funcional .sidebar h2 { color: #fff; border-bottom: 1px solid rgba(255,255,255,0.4); padding-bottom: 4px; }
  .modelo-funcional .sidebar .contato { color: #e5e7eb; word-break: break-word; }
  .modelo-funcional .sidebar .contato .sep { color: rgba(255,255,255,0.4); }
  .modelo-funcional .sidebar .par, .modelo-funcional .sidebar .lista { color: #f1f5f9; }
  .modelo-funcional .main { flex: 1; padding: 30px 28px; }
  .modelo-funcional .main .nome { color: ${cor}; }
  .modelo-funcional .foto { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; border: 3px solid rgba(255,255,255,0.5); }

  /* ============ COMPACTO ============ */
  .modelo-compacto { font-size: 10.5px; line-height: 1.35; }
  .modelo-compacto .page { padding: 28px 34px; }
  .modelo-compacto .nome { font-size: 20px; color: ${cor}; }
  .modelo-compacto h2 { margin: 10px 0 4px; font-size: 11px; }
  .modelo-compacto .exp-item { margin-bottom: 5px; }
  .modelo-compacto .foto { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: right; margin-left: 10px; }

  /* ============ SÓBRIO (serifado) ============ */
  .modelo-soberio .nome { font-family: Georgia, 'Times New Roman', serif; font-weight: normal; text-transform: uppercase; letter-spacing: 2px; color: ${cor}; text-align: center; }
  .modelo-soberio .contato { text-align: center; color: #444; font-style: italic; }
  .modelo-soberio h2 { font-family: Georgia, 'Times New Roman', serif; font-weight: bold; color: ${cor}; text-align: center; }
  .modelo-soberio section h2 { border-bottom: 1px solid #d1c9c0; padding-bottom: 4px; }
  .modelo-soberio .foto { margin: 0 auto 10px; width: 82px; height: 82px; border-radius: 50%; object-fit: cover; }

  /* ============ TÉCNICO ============ */
  .modelo-tecnico .nome { color: ${cor}; font-weight: 800; }
  .modelo-tecnico .cab { background: #f1f5f9; border-left: 5px solid ${cor}; padding: 16px 20px; margin-bottom: 8px; }
  .modelo-tecnico h2 { background: #f8fafc; padding: 5px 10px; color: ${cor}; border: 1px solid #e2e8f0; }
  .modelo-tecnico .foto { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; float: right; margin-left: 14px; }
  .modelo-tecnico .exp-periodo { color: ${cor}; font-weight: bold; }
</style>
</head>
<body class="modelo-${esc(modeloId)}">
  <div class="page">
    ${modeloId === "profissional"
      ? `<div class="cab">${fotoHTML}${nomeHTML}${contatoHTML}</div><div class="corpo">${corpo}</div>`
      : modeloId === "funcional"
        ? `<div class="sidebar">${fotoHTML}${contatoHTML}${secoesLateral(dados)}</div><div class="main">${nomeHTML}${corpo}</div>`
        : `${modeloId === "executivo" ? `<div class="cab">${fotoHTML}${nomeHTML}${contatoHTML}</div>` : `${fotoHTML}${nomeHTML}${contatoHTML}`}${corpo}`}
  </div>
</body>
</html>`;
}

// Seções que vão para a sidebar do modelo funcional
function secoesLateral(dados) {
  let h = "";
  if (dados.habilidades) h += `<section><h2>Habilidades</h2><p class="par">${esc(dados.habilidades)}</p></section>`;
  if (dados.cursos.length) {
    h += `<section><h2>Cursos</h2><ul class="lista">`;
    dados.cursos.forEach((c) => h += `<li>${esc(c.nome)}</li>`);
    h += `</ul></section>`;
  }
  if (dados.hobbies) h += `<section><h2>Interesses</h2><p class="par">${esc(dados.hobbies)}</p></section>`;
  return h;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { gerarHTML, norm };
}
if (typeof window !== "undefined") {
  window.renderCurriculo = { gerarHTML, norm };
}
