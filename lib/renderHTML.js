// 🎨 Renderizador de currículo em HTML — FONTE ÚNICA DE VERDADE.
//
// Este módulo gera o HTML do currículo a partir de `modeloId` + `dados`.
// O mesmo HTML é usado:
//   1. Pela pré-visualização no navegador (preview / editor);
//   2. Pelo servidor para gerar o PDF (via renderizador HTML->PDF com Chromium).
//
// Cada um dos 10 modelos possui um LAYOUT próprio e distinto (não apenas cor).

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

// Cores dos modelos
const ESTILOS = {
  classico:     { cor: "#00324a", accent: "#0e7490" },
  moderno:      { cor: "#2563eb", accent: "#3b82f6" },
  minimal:      { cor: "#111827", accent: "#6b7280" },
  profissional: { cor: "#334155", accent: "#475569" },
  executivo:    { cor: "#0f172a", accent: "#1e293b" },
  cronologico:  { cor: "#0e7490", accent: "#0891b2" },
  funcional:    { cor: "#4d7c0f", accent: "#65a30d" },
  compacto:     { cor: "#1f2937", accent: "#374151" },
  soberio:      { cor: "#3b2f2f", accent: "#5b4a3a" },
  tecnico:      { cor: "#1e3a8a", accent: "#2563eb" },
  elegante:     { cor: "#0f766e", accent: "#14b8a6" },
  criativo:     { cor: "#ea580c", accent: "#f59e0b" },
  limpo:        { cor: "#475569", accent: "#94a3b8" },
  tradicional:  { cor: "#7c5a3a", accent: "#a67c52" },
  contemporaneo:{ cor: "#3730a3", accent: "#6366f1" },
  harvard:      { cor: "#1a1a1a", accent: "#404040" },
  impacto:      { cor: "#b45309", accent: "#f59e0b" },
  "executivo-escuro": { cor: "#111827", accent: "#374151" },
  diplomatico:  { cor: "#155e75", accent: "#22d3ee" },
  academico:    { cor: "#1f2937", accent: "#6b7280" },
  consultor:    { cor: "#312e81", accent: "#818cf8" },
  vendas:       { cor: "#be123c", accent: "#fb7185" },
  saude:        { cor: "#047857", accent: "#34d399" },
  industrial:   { cor: "#374151", accent: "#9ca3af" },
  logistica:    { cor: "#0c4a6e", accent: "#38bdf8" },
  marketing:    { cor: "#9d174d", accent: "#f472b6" },
  financeiro:   { cor: "#065f46", accent: "#6ee7b7" },
  rh:           { cor: "#7c3aed", accent: "#c4b5fd" },
  ti:           { cor: "#1d4ed8", accent: "#60a5fa" },
  juridico:     { cor: "#292524", accent: "#78716c" },
  educador:     { cor: "#166534", accent: "#86efac" },
  design:       { cor: "#c2410c", accent: "#fb923c" },
  estudante:    { cor: "#0369a1", accent: "#7dd3fc" },
  transicao:    { cor: "#5b21b6", accent: "#d8b4fe" },
  "executivo-internacional": { cor: "#0f172a", accent: "#94a3b8" },
};

// Habilidades em forma de lista de tags (para modelos com tags)
function listaHabilidades(dados) {
  return dados.habilidades.split(",").map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Construção das seções de conteúdo
// ---------------------------------------------------------------------------
function secaoObjetivo(dados) {
  return dados.objetivo
    ? `<section class="sec"><h2 class="sec-titulo">Objetivo</h2><p class="par">${esc(dados.objetivo)}</p></section>`
    : "";
}

function secaoExperiencia(dados, clsExp) {
  let h = "";
  if (dados.experiencias.length || dados.primeiroEmprego) {
    h += `<section class="sec"><h2 class="sec-titulo">Experiência Profissional</h2>`;
    if (dados.primeiroEmprego) {
      h += `<p class="par">Primeiro emprego</p>`;
    } else {
      h += `<div class="exp">`;
      dados.experiencias.forEach((e) => {
        h += `<div class="${clsExp || "exp-item"}">`;
        h += `<div class="exp-head"><span class="exp-empresa">${esc(e.empresa)}</span><span class="exp-periodo">${esc(periodo(e))}</span></div>`;
        if (e.cargo) h += `<div class="exp-cargo">${esc(e.cargo)}</div>`;
        if (e.atividades) h += `<div class="exp-ativ">${esc(e.atividades)}</div>`;
        h += `</div>`;
      });
      h += `</div>`;
    }
    h += `</section>`;
  }
  return h;
}

function secaoFormacao(dados) {
  return dados.formacao
    ? `<section class="sec"><h2 class="sec-titulo">Formação Acadêmica</h2><p class="par">${esc(dados.formacao)}</p></section>`
    : "";
}

function secaoCursos(dados) {
  if (!dados.cursos.length) return "";
  let h = `<section class="sec"><h2 class="sec-titulo">Cursos e Certificações</h2><ul class="lista">`;
  dados.cursos.forEach((c) => {
    let linha = c.nome;
    if (c.instituicao) linha += " - " + c.instituicao;
    if (c.carga) linha += " (" + c.carga + ")";
    h += `<li>${esc(linha)}</li>`;
  });
  h += `</ul></section>`;
  return h;
}

function secaoHabilidades(dados, comTags) {
  if (!dados.habilidades) return "";
  if (comTags) {
    const tags = listaHabilidades(dados)
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    return `<section class="sec"><h2 class="sec-titulo">Habilidades</h2><div class="tags">${tags}</div></section>`;
  }
  return `<section class="sec"><h2 class="sec-titulo">Habilidades</h2><p class="par">${esc(dados.habilidades)}</p></section>`;
}

function secaoHobbies(dados) {
  return dados.hobbies
    ? `<section class="sec"><h2 class="sec-titulo">Hobbies e Interesses</h2><p class="par">${esc(dados.hobbies)}</p></section>`
    : "";
}

function secaoInfo(dados) {
  return dados.infoAdicional
    ? `<section class="sec"><h2 class="sec-titulo">Informações Adicionais</h2><p class="par">${esc(dados.infoAdicional)}</p></section>`
    : "";
}

function blocoContato(dados, sep) {
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  if (!contato.length) return "";
  const sepHTML = sep || `<span class="sep">•</span>`;
  return `<div class="contato">${contato.join(sepHTML)}</div>`;
}

// ---------------------------------------------------------------------------
// MODELOS — cada um com estrutura própria
// ---------------------------------------------------------------------------

function montarClassico(dados) {
  const c = ESTILOS.classico.cor;
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarModerno(dados) {
  const c = ESTILOS.moderno.cor;
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const lateralContato = contato.length
    ? `<div class="lat-contato">${contato.join("<br/>")}</div>`
    : "";
  const habilidades = listaHabilidades(dados)
    .map((t) => `<li>${esc(t)}</li>`)
    .join("");
  return `
  <div class="lateral">
    <div class="lat-titulo">Contato</div>
    ${lateralContato}
    ${dados.habilidades ? `<div class="lat-titulo">Habilidades</div><ul class="lat-lista">${habilidades}</ul>` : ""}
    ${dados.hobbies ? `<div class="lat-titulo">Interesses</div><ul class="lat-lista">${listaHabilidades({ habilidades: dados.hobbies }).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  </div>
  <div class="main">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoInfo(dados)}
  </div>
`;
}

function montarMinimal(dados) {
  const c = ESTILOS.minimal.cor;
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarProfissional(dados) {
  const c = ESTILOS.profissional.cor;
  return `
  <div class="cab-banner">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  <div class="corpo">
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoHabilidades(dados)}
    ${secaoHobbies(dados)}
    ${secaoInfo(dados)}
  </div>
`;
}

function montarExecutivo(dados) {
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const cargo = dados.cargoAtual || (dados.experiencias[0] ? dados.experiencias[0].cargo : "");
  return `
  <div class="cab-exec">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${cargo ? `<div class="exec-cargo">${esc(cargo)}</div>` : ""}
    <div class="exec-contato">${contato.join("   •   ") || ""}</div>
  </div>
  <div class="corpo-exec">
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoHabilidades(dados)}
    ${secaoHobbies(dados)}
    ${secaoInfo(dados)}
  </div>
`;
}

function montarCronologico(dados) {
  const c = ESTILOS.cronologico.cor;
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarFuncional(dados) {
  const c = ESTILOS.funcional.cor;
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const habilidades = listaHabilidades(dados)
    .map((t) => `<li>${esc(t)}</li>`)
    .join("");
  return `
  <div class="main">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoHobbies(dados)}
    ${secaoInfo(dados)}
  </div>
  <div class="sidebar">
    <div class="lat-titulo">Contato</div>
    <div class="lat-contato">${contato.join("<br/>") || ""}</div>
    ${dados.habilidades ? `<div class="lat-titulo">Competências</div><ul class="lat-lista">${habilidades}</ul>` : ""}
  </div>
`;
}

function montarCompacto(dados) {
  const c = ESTILOS.compacto.cor;
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const habilidades = listaHabilidades(dados)
    .map((t) => `<li>${esc(t)}</li>`)
    .join("");
  return `
  <div class="col-esq">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    <div class="contato">${contato.join("<br/>") || ""}</div>
    ${dados.habilidades ? `<h2 class="sec-titulo">Habilidades</h2><ul class="lat-lista">${habilidades}</ul>` : ""}
    ${dados.hobbies ? `<h2 class="sec-titulo">Interesses</h2><p class="par">${esc(dados.hobbies)}</p>` : ""}
    ${secaoInfo(dados)}
  </div>
  <div class="col-dir">
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
  </div>
`;
}

function montarSoberio(dados) {
  const c = ESTILOS.soberio.cor;
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarTecnico(dados) {
  const c = ESTILOS.tecnico.cor;
  return `
  <div class="cab-tec">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados, true)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarElegante(dados) {
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    <p class="cargo-linha">${esc(dados.cargoAtual || (dados.experiencias[0] ? dados.experiencias[0].cargo : ""))}</p>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados, true)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarCriativo(dados) {
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const habilidades = listaHabilidades(dados).map((t) => `<li>${esc(t)}</li>`).join("");
  return `
  <div class="sidebar">
    <div class="avatar-inicial">${esc((dados.nome || "?").trim().charAt(0).toUpperCase())}</div>
    <div class="lat-titulo">Contato</div>
    <div class="lat-contato">${contato.join("<br/>") || ""}</div>
    ${dados.habilidades ? `<div class="lat-titulo">Habilidades</div><ul class="lat-lista">${habilidades}</ul>` : ""}
    ${dados.hobbies ? `<div class="lat-titulo">Interesses</div><ul class="lat-lista">${listaHabilidades({ habilidades: dados.hobbies }).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  </div>
  <div class="main">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    <p class="cargo-linha">${esc(dados.cargoAtual || (dados.experiencias[0] ? dados.experiencias[0].cargo : ""))}</p>
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoInfo(dados)}
  </div>
`;
}

function montarLimpo(dados) {
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarTradicional(dados) {
  return `
  <div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    <p class="cargo-linha">${esc(dados.cargoAtual || (dados.experiencias[0] ? dados.experiencias[0].cargo : ""))}</p>
    ${blocoContato(dados)}
  </div>
  ${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}
`;
}

function montarContemporaneo(dados) {
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  return `
  <div class="cab-banner">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    <p class="cargo-linha">${esc(dados.cargoAtual || (dados.experiencias[0] ? dados.experiencias[0].cargo : ""))}</p>
    <div class="banner-contato">${contato.join("   •   ") || ""}</div>
  </div>
  <div class="corpo">
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoHabilidades(dados, true)}
    ${secaoHobbies(dados)}
    ${secaoInfo(dados)}
  </div>
`;
}

// ---------------------------------------------------------------------------
// CSS por modelo
// ---------------------------------------------------------------------------
const CSS = {
  classico: `
    .page { background:#fff; }
    .cab-topo { text-align:center; padding-bottom:14px; border-bottom:3px double #ccd6dd; margin-bottom:6px; }
    .modelo-classico .nome { text-align:center; font-size:30px; font-weight:800; color:#00324a; letter-spacing:1px; }
    .modelo-classico .contato { text-align:center; color:#444; margin-top:4px; }
    .modelo-classico .contato .sep { margin:0 6px; color:#bbb; }
    .modelo-classico h2 { text-align:center; color:#00324a; border-bottom:1px solid #e5e7eb; padding-bottom:5px; }
    .modelo-classico .exp-head { border-bottom:1px dashed #e5e7eb; }
  `,
  moderno: `
    .page { display:flex; padding:0; background:#fff; }
    .modelo-moderno .lateral { width:34%; background:#2563eb; color:#fff; padding:28px 20px; }
    .modelo-moderno .lateral .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,0.4); }
    .modelo-moderno .lateral .contato, .modelo-moderno .lateral .lat-lista { color:#e8eeff; }
    .modelo-moderno .main { flex:1; padding:30px 26px; }
    .modelo-moderno .nome { color:#2563eb; font-size:28px; font-weight:800; }
    .modelo-moderno h2 { color:#2563eb; border-left:3px solid #2563eb; padding-left:10px; }
    .modelo-moderno .lat-lista { list-style:none; margin:0; padding:0; }
    .modelo-moderno .lat-lista li { margin-bottom:4px; }
  `,
  minimal: `
    .page { background:#fff; padding:64px 72px; }
    .modelo-minimal .cab-topo { text-align:left; }
    .modelo-minimal .nome { font-size:34px; font-weight:300; color:#111827; letter-spacing:3px; }
    .modelo-minimal .contato { color:#777; margin-top:6px; }
    .modelo-minimal h2 { font-weight:400; color:#111827; letter-spacing:4px; text-transform:uppercase; border:none; font-size:14px; }
    .modelo-minimal .sec { border-top:1px solid #eee; }
    .modelo-minimal .par { color:#333; }
  `,
  profissional: `
    .page { padding:0; background:#fff; }
    .modelo-profissional .cab-banner { background:#334155; color:#fff; padding:34px 48px; text-align:center; }
    .modelo-profissional .cab-banner .nome { color:#fff; font-size:28px; font-weight:700; }
    .modelo-profissional .cab-banner .contato { color:#e5e7eb; }
    .modelo-profissional .cab-banner .contato .sep { color:#cbd5e1; }
    .modelo-profissional .corpo { padding:6px 48px 40px; }
    .modelo-profissional h2 { color:#334155; border-bottom:2px solid #334155; padding-bottom:4px; }
  `,
  executivo: `
    .page { background:#fff; border-top:8px solid #1e293b; }
    .modelo-executivo .cab-exec { text-align:center; padding:30px 48px 18px; }
    .modelo-executivo .cab-exec .nome { color:#0f172a; font-size:32px; font-weight:800; text-transform:uppercase; letter-spacing:3px; }
    .modelo-executivo .exec-cargo { color:#475569; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-top:6px; }
    .modelo-executivo .exec-contato { color:#64748b; margin-top:12px; font-size:11px; }
    .modelo-executivo .corpo-exec { border-top:3px double #94a3b8; margin-top:12px; padding:18px 48px 40px; }
    .modelo-executivo h2 { color:#0f172a; border-bottom:3px solid #0f172a; padding-bottom:4px; }
    .modelo-executivo .sec { border-top:1px solid #e2e8f0; }
  `,
  cronologico: `
    .page { background:#fff; }
    .cab-topo { border-bottom:2px solid #0e7490; padding-bottom:12px; margin-bottom:6px; }
    .modelo-cronologico .nome { color:#0e7490; font-size:28px; font-weight:700; }
    .modelo-cronologico .contato { color:#444; }
    .modelo-cronologico h2 { color:#0e7490; }
    .modelo-cronologico .exp { border-left:2px solid #0e7490; margin-left:6px; padding-left:16px; }
    .modelo-cronologico .exp-item { position:relative; }
    .modelo-cronologico .exp-item::before { content:""; position:absolute; left:-21px; top:5px; width:9px; height:9px; border-radius:50%; background:#0e7490; }
    .modelo-cronologico .exp-periodo { font-weight:700; color:#0e7490; }
  `,
  funcional: `
    .page { display:flex; padding:0; background:#fff; }
    .modelo-funcional .main { flex:1; padding:30px 28px; }
    .modelo-funcional .nome { color:#4d7c0f; font-size:28px; font-weight:700; }
    .modelo-funcional h2 { color:#4d7c0f; }
    .modelo-funcional .sidebar { width:32%; background:#4d7c0f; color:#fff; padding:30px 22px; border-left:4px solid #365314; }
    .modelo-funcional .sidebar .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,0.4); }
    .modelo-funcional .sidebar .lat-contato, .modelo-funcional .sidebar .lat-lista { color:#f1f5f9; }
    .modelo-funcional .sidebar .lat-lista { list-style:none; padding:0; margin:0; }
  `,
  compacto: `
    .page { display:flex; padding:0; background:#fff; font-size:10px; }
    .modelo-compacto .col-esq { width:36%; background:#f8fafc; padding:22px 18px; border-right:2px solid #1f2937; }
    .modelo-compacto .col-dir { flex:1; padding:22px 20px; }
    .modelo-compacto .nome { color:#1f2937; font-size:20px; font-weight:800; }
    .modelo-compacto h2 { margin:10px 0 4px; font-size:11px; color:#1f2937; }
    .modelo-compacto .exp-item { margin-bottom:5px; }
    .modelo-compacto .lat-lista { list-style:none; padding:0; margin:0; }
  `,
  soberio: `
    .page { background:#fff; padding:56px 64px; }
    .cab-topo { text-align:center; border-bottom:1px solid #d1c9c0; padding-bottom:16px; margin-bottom:8px; }
    .modelo-soberio { font-family:Georgia, 'Times New Roman', serif; }
    .modelo-soberio .nome { font-weight:normal; text-transform:uppercase; letter-spacing:3px; color:#3b2f2f; font-size:28px; text-align:center; }
    .modelo-soberio .contato { text-align:center; color:#5b4a3a; font-style:italic; }
    .modelo-soberio .contato .sep { margin:0 6px; color:#c9bcad; }
    .modelo-soberio h2 { font-family:Georgia, 'Times New Roman', serif; color:#3b2f2f; text-align:center; font-size:14px; letter-spacing:2px; }
    .modelo-soberio .sec { border-top:1px solid #e4dcd0; }
  `,
  tecnico: `
    .page { background:#fff; }
    .cab-tec { background:#f1f5f9; border-left:6px solid #1e3a8a; padding:18px 24px; margin-bottom:10px; }
    .modelo-tecnico .nome { color:#1e3a8a; font-weight:800; font-size:26px; }
    .modelo-tecnico h2 { background:#f8fafc; padding:5px 10px; color:#1e3a8a; border:1px solid #e2e8f0; border-left:4px solid #1e3a8a; }
    .modelo-tecnico .tag { background:#eef2ff; color:#1e3a8a; }
    .modelo-tecnico .exp-periodo { color:#1e3a8a; font-weight:700; }
  `,
  elegante: `
    .page { background:#fff; padding:52px 64px; }
    .modelo-elegante .cab-topo { text-align:center; padding-bottom:16px; border-bottom:1px solid #cbd5e1; margin-bottom:10px; }
    .modelo-elegante .nome { color:#0f766e; font-size:30px; font-weight:500; letter-spacing:2px; }
    .modelo-elegante .cargo-linha { color:#64748b; font-size:12px; letter-spacing:1px; margin-top:4px; }
    .modelo-elegante .contato { color:#475569; margin-top:8px; }
    .modelo-elegante h2 { color:#0f766e; font-weight:500; letter-spacing:2px; border:none; }
    .modelo-elegante .sec { border-top:1px solid #e2e8f0; }
    .modelo-elegante .par { color:#334155; }
  `,
  criativo: `
    .page { display:flex; padding:0; background:#fff; }
    .modelo-criativo .sidebar { width:32%; background:#ea580c; color:#fff; padding:30px 22px; }
    .modelo-criativo .avatar-inicial { width:56px; height:56px; border-radius:50%; background:#fff; color:#ea580c; font-size:26px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
    .modelo-criativo .sidebar .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,0.4); }
    .modelo-criativo .sidebar .lat-contato, .modelo-criativo .sidebar .lat-lista { color:#fff7ed; }
    .modelo-criativo .sidebar .lat-lista { list-style:none; padding:0; margin:0; }
    .modelo-criativo .main { flex:1; padding:30px 28px; }
    .modelo-criativo .nome { color:#ea580c; font-size:28px; font-weight:800; }
    .modelo-criativo .cargo-linha { color:#9a3412; font-size:12px; margin-top:2px; }
    .modelo-criativo h2 { color:#ea580c; }
    .modelo-criativo .exp-periodo { color:#ea580c; font-weight:700; }
  `,
  limpo: `
    .page { background:#fff; padding:48px 56px; }
    .modelo-limpo .cab-topo { text-align:center; padding-bottom:14px; border-bottom:3px solid #111827; margin-bottom:8px; }
    .modelo-limpo .nome { color:#111827; font-size:30px; font-weight:700; letter-spacing:1px; }
    .modelo-limpo .contato { color:#475569; margin-top:6px; }
    .modelo-limpo .contato .sep { color:#cbd5e1; }
    .modelo-limpo h2 { color:#111827; border:none; letter-spacing:2px; }
    .modelo-limpo .par { color:#334155; }
  `,
  tradicional: `
    .page { background:#fff; padding:54px 62px; }
    .modelo-tradicional { font-family:Georgia, 'Times New Roman', serif; }
    .modelo-tradicional .cab-topo { text-align:center; padding-bottom:14px; border-bottom:3px double #7c5a3a; margin-bottom:10px; }
    .modelo-tradicional .nome { font-family:Georgia, 'Times New Roman', serif; color:#7c5a3a; font-weight:700; font-size:30px; letter-spacing:1px; }
    .modelo-tradicional .cargo-linha { color:#a16207; font-style:italic; margin-top:4px; }
    .modelo-tradicional .contato { color:#57534e; font-style:italic; margin-top:8px; }
    .modelo-tradicional .contato .sep { color:#c9a86a; }
    .modelo-tradicional h2 { font-family:Georgia, 'Times New Roman', serif; color:#7c5a3a; border-bottom:1px solid #e7dcc8; }
  `,
  contemporaneo: `
    .page { padding:0; background:#fff; }
    .modelo-contemporaneo .cab-banner { background:#3730a3; color:#fff; padding:34px 48px; text-align:center; }
    .modelo-contemporaneo .cab-banner .nome { color:#fff; font-size:28px; font-weight:800; letter-spacing:1px; }
    .modelo-contemporaneo .cab-banner .cargo-linha { color:#c7d2fe; font-size:12px; margin-top:2px; }
    .modelo-contemporaneo .banner-contato { color:#e0e7ff; margin-top:8px; font-size:11px; }
    .modelo-contemporaneo .corpo { padding:6px 48px 40px; }
    .modelo-contemporaneo h2 { color:#3730a3; border-bottom:2px solid #6366f1; padding-bottom:4px; }
    .modelo-contemporaneo .tag { background:#eef2ff; color:#3730a3; }
  `,
  harvard: `
    .page { background:#fff; }
    .modelo-harvard .cab-topo { border-bottom:2px solid #1a1a1a; padding-bottom:10px; }
    .modelo-harvard .nome { font-size:26px; font-weight:700; color:#1a1a1a; letter-spacing:2px; text-transform:uppercase; }
    .modelo-harvard h2 { font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#1a1a1a; border-bottom:1px solid #d1d5db; }
    .modelo-harvard .exp-ativ { margin-left:14px; }
  `,
  impacto: `
    .page { background:#fff; }
    .modelo-impacto .cab-topo { background:#b45309; color:#fff; margin:-26px -26px 10px; padding:26px; }
    .modelo-impacto .nome { color:#fff; font-size:28px; font-weight:900; }
    .modelo-impacto .contato { color:rgba(255,255,255,.92); }
    .modelo-impacto .contato .sep { color:rgba(255,255,255,.5); }
    .modelo-impacto h2 { color:#b45309; }
    .modelo-impacto .sec-titulo { border-bottom:2px solid #f59e0b; display:inline-block; padding-bottom:3px; }
  `,
  "executivo-escuro": `
    .page { background:#fff; }
    .modelo-executivo-escuro .cab-topo { background:#111827; color:#fff; margin:-26px -26px 12px; padding:30px 26px; border-bottom:4px solid #374151; }
    .modelo-executivo-escuro .nome { color:#fff; font-size:27px; font-weight:800; letter-spacing:1px; }
    .modelo-executivo-escuro .contato { color:#d1d5db; }
    .modelo-executivo-escuro .contato .sep { color:#6b7280; }
    .modelo-executivo-escuro h2 { color:#111827; border-bottom:2px solid #111827; }
  `,
  diplomatico: `
    .page { background:#fff; }
    .modelo-diplomatico .cab-topo { border-bottom:1px solid #155e75; border-top:3px solid #155e75; padding:12px 0; text-align:center; }
    .modelo-diplomatico .nome { text-align:center; color:#155e75; font-weight:600; letter-spacing:3px; }
    .modelo-diplomatico .contato { text-align:center; }
    .modelo-diplomatico h2 { color:#155e75; font-weight:600; letter-spacing:1.5px; border-bottom:1px solid #a5f3fc; }
  `,
  academico: `
    .page { background:#fff; }
    .modelo-academico { font-family:Georgia, 'Times New Roman', serif; }
    .modelo-academico .nome { font-size:26px; color:#1f2937; font-weight:700; }
    .modelo-academico h2 { font-size:13px; text-transform:uppercase; letter-spacing:1.5px; color:#1f2937; border-bottom:1px solid #9ca3af; }
    .modelo-academico .sec-titulo::after { content:""; }
  `,
  consultor: `
    .page { background:#fff; }
    .modelo-consultor .cab-topo { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #312e81; padding-bottom:10px; }
    .modelo-consultor .nome { color:#312e81; font-size:26px; font-weight:800; }
    .modelo-consultor .contato { text-align:right; font-size:11px; }
    .modelo-consultor h2 { color:#312e81; }
    .modelo-consultor .sec-titulo { background:#eef2ff; padding:4px 10px; border-left:4px solid #312e81; display:inline-block; }
  `,
  vendas: `
    .page { background:#fff; }
    .modelo-vendas .cab-topo { border-left:8px solid #be123c; padding-left:14px; }
    .modelo-vendas .nome { color:#be123c; font-size:28px; font-weight:900; }
    .modelo-vendas h2 { color:#be123c; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #fb7185; }
    .modelo-vendas .exp-cargo { font-weight:800; color:#9f1239; }
  `,
  saude: `
    .page { background:#fff; }
    .modelo-saude .cab-topo { border-bottom:3px solid #047857; }
    .modelo-saude .nome { color:#047857; font-size:26px; font-weight:700; }
    .modelo-saude h2 { color:#047857; border-bottom:1px solid #a7f3d0; }
    .modelo-saude .exp-head { background:#ecfdf5; padding:4px 8px; border-radius:4px; }
  `,
  industrial: `
    .page { background:#fff; }
    .modelo-industrial .cab-topo { border-bottom:4px double #374151; }
    .modelo-industrial .nome { color:#374151; font-size:26px; font-weight:800; text-transform:uppercase; }
    .modelo-industrial h2 { color:#374151; background:#f3f4f6; padding:4px 10px; border-left:4px solid #9ca3af; display:inline-block; }
  `,
  logistica: `
    .page { background:#fff; }
    .modelo-logistica .cab-topo { display:flex; justify-content:space-between; align-items:center; background:#0c4a6e; color:#fff; margin:-26px -26px 10px; padding:22px 26px; }
    .modelo-logistica .nome { color:#fff; font-size:26px; font-weight:800; }
    .modelo-logistica .contato { color:#bae6fd; }
    .modelo-logistica .contato .sep { color:#38bdf8; }
    .modelo-logistica h2 { color:#0c4a6e; border-bottom:2px solid #38bdf8; }
  `,
  marketing: `
    .page { display:flex; padding:0; background:#fff; }
    .modelo-marketing .lateral { width:32%; background:#9d174d; color:#fff; padding:28px 20px; }
    .modelo-marketing .lateral .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,.4); }
    .modelo-marketing .lateral .lat-lista, .modelo-marketing .lateral .contato { color:#fce7f3; }
    .modelo-marketing .main { flex:1; padding:30px 26px; }
    .modelo-marketing .nome { color:#9d174d; font-size:27px; font-weight:800; }
    .modelo-marketing h2 { color:#9d174d; border-bottom:2px solid #f472b6; }
  `,
  financeiro: `
    .page { background:#fff; }
    .modelo-financeiro .cab-topo { border-bottom:3px solid #065f46; }
    .modelo-financeiro .nome { color:#065f46; font-size:26px; font-weight:700; }
    .modelo-financeiro h2 { color:#065f46; letter-spacing:1px; border-bottom:1px solid #6ee7b7; }
    .modelo-financeiro .exp-head { border-bottom:1px solid #d1fae5; }
  `,
  rh: `
    .page { background:#fff; }
    .modelo-rh .cab-topo { text-align:center; padding:16px 0; background:#f5f3ff; margin:-26px -26px 10px; padding:26px; }
    .modelo-rh .nome { text-align:center; color:#7c3aed; font-size:27px; font-weight:800; }
    .modelo-rh .contato { text-align:center; }
    .modelo-rh h2 { color:#7c3aed; }
    .modelo-rh .sec-titulo { border-bottom:1px dashed #c4b5fd; display:block; padding-bottom:4px; }
  `,
  ti: `
    .page { background:#fff; }
    .modelo-ti .cab-topo { border-bottom:3px solid #1d4ed8; }
    .modelo-ti .nome { color:#1d4ed8; font-size:27px; font-weight:800; font-family:'Courier New',monospace; letter-spacing:0; }
    .modelo-ti h2 { color:#1d4ed8; font-family:'Courier New',monospace; text-transform:uppercase; letter-spacing:1px; }
    .modelo-ti .sec-titulo::before { content:"// "; color:#60a5fa; }
  `,
  juridico: `
    .page { background:#fff; }
    .modelo-juridico { font-family:Georgia, 'Times New Roman', serif; }
    .modelo-juridico .cab-topo { text-align:center; border-top:3px double #292524; border-bottom:3px double #292524; padding:14px 0; }
    .modelo-juridico .nome { text-align:center; color:#292524; font-size:25px; font-weight:700; }
    .modelo-juridico .contato { text-align:center; }
    .modelo-juridico h2 { color:#292524; text-transform:uppercase; letter-spacing:2px; font-size:12px; }
  `,
  educador: `
    .page { background:#fff; }
    .modelo-educador .cab-topo { border-bottom:3px solid #166534; }
    .modelo-educador .nome { color:#166534; font-size:26px; font-weight:700; }
    .modelo-educador h2 { color:#166534; background:#f0fdf4; padding:4px 10px; border-radius:6px; display:inline-block; }
  `,
  design: `
    .page { display:flex; padding:0; background:#fff; }
    .modelo-design .lateral { width:34%; background:#c2410c; color:#fff; padding:28px 20px; }
    .modelo-design .lateral .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,.4); }
    .modelo-design .lateral .lat-lista, .modelo-design .lateral .contato { color:#ffedd5; }
    .modelo-design .main { flex:1; padding:30px 26px; }
    .modelo-design .nome { color:#c2410c; font-size:29px; font-weight:900; }
    .modelo-design h2 { color:#c2410c; border-bottom:2px dashed #fb923c; }
  `,
  estudante: `
    .page { background:#fff; }
    .modelo-estudante .cab-topo { background:#0369a1; color:#fff; margin:-26px -26px 10px; padding:24px 26px; border-radius:0 0 18px 0; }
    .modelo-estudante .nome { color:#fff; font-size:26px; font-weight:800; }
    .modelo-estudante .contato { color:#e0f2fe; }
    .modelo-estudante .contato .sep { color:#7dd3fc; }
    .modelo-estudante h2 { color:#0369a1; border-bottom:2px solid #7dd3fc; }
  `,
  transicao: `
    .page { background:#fff; }
    .modelo-transicao .cab-topo { border-left:10px solid #5b21b6; padding-left:16px; }
    .modelo-transicao .nome { color:#5b21b6; font-size:27px; font-weight:800; }
    .modelo-transicao h2 { color:#5b21b6; }
    .modelo-transicao .sec-titulo { background:#faf5ff; border-left:4px solid #d8b4fe; padding:4px 10px; display:inline-block; }
  `,
  "executivo-internacional": `
    .page { background:#fff; }
    .modelo-executivo-internacional .cab-topo { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #0f172a; padding-bottom:10px; }
    .modelo-executivo-internacional .nome { color:#0f172a; font-size:26px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
    .modelo-executivo-internacional .contato { text-align:right; font-size:11px; }
    .modelo-executivo-internacional h2 { color:#0f172a; text-transform:uppercase; letter-spacing:2px; font-size:12px; border-bottom:1px solid #cbd5e1; }
  `,
};

// ---------------------------------------------------------------------------
// CSS base compartilhado
// ---------------------------------------------------------------------------
const CSS_BASE = `
  @page { size:A4; margin:0; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { margin:0; padding:0; }
  body {
    font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;
    color:#222; font-size:12px; line-height:1.5;
    width:210mm; min-height:297mm;
  }
  .page { position:relative; padding:40px 48px; min-height:1123px; width:794px; }
  .nome { font-size:26px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:#00324a; margin:18px 0 8px; }
  .sec { margin-bottom:4px; }
  .par { white-space:pre-wrap; }
  .lista { margin:0 0 0 18px; }
  .lista li { margin-bottom:3px; }
  .contato { margin:6px 0 4px; }
  .contato .sep { margin:0 6px; color:#bbb; }
  .exp-head { display:flex; justify-content:space-between; align-items:baseline; }
  .exp-empresa { font-weight:bold; color:#111; }
  .exp-periodo { color:#666; font-size:11px; white-space:nowrap; }
  .exp-cargo { font-style:italic; color:#444; }
  .exp-ativ { color:#333; margin-top:2px; }
  .exp-item { margin-bottom:10px; }
  .tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .tag { display:inline-block; background:#eef2ff; color:#1e3a8a; border-radius:12px; padding:3px 12px; font-size:11px; }
  .lat-titulo { font-size:12px; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin:18px 0 8px; }
  .lat-lista li { margin-bottom:4px; }
`;


function cabCentrado(dados, cls) {
  return `<div class="cab-topo">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${blocoContato(dados)}
  </div>`;
}
function cabFlex(dados) {
  const cont = [];
  if (dados.email) cont.push(esc(dados.email));
  if (dados.telefones.length) cont.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) cont.push(esc(dados.endereco));
  return `<div class="cab-topo">
    <div><h1 class="nome">${esc(dados.nome || "Currículo")}</h1></div>
    <div class="contato">${cont.join(' <span class="sep">•</span> ')}</div>
  </div>`;
}
function corpoPadrao(dados, clsExp) {
  return `${secaoObjetivo(dados)}
  ${secaoExperiencia(dados, clsExp || "exp-item")}
  ${secaoFormacao(dados)}
  ${secaoCursos(dados)}
  ${secaoHabilidades(dados)}
  ${secaoHobbies(dados)}
  ${secaoInfo(dados)}`;
}

// ---- 20 montadores novos ----
function montarHarvard(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarImpacto(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarExecutivoEscuro(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarDiplomatico(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarAcademico(dados) {
  return cabCentrado(dados) + secaoFormacao(dados) + secaoExperiencia(dados, "exp-item") + secaoCursos(dados) + secaoHabilidades(dados) + secaoInfo(dados);
}
function montarConsultor(dados) { return cabFlex(dados) + corpoPadrao(dados); }
function montarVendas(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarSaude(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarIndustrial(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarLogistica(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarMarketing(dados) {
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  const lateralContato = contato.length ? `<div class="lat-contato">${contato.join("<br/>")}</div>` : "";
  const hab = listaHabilidades(dados).map((t) => `<li>${esc(t)}</li>`).join("");
  return `<div class="lateral">
    <div class="lat-titulo">Contato</div>
    ${lateralContato}
    ${dados.habilidades ? `<div class="lat-titulo">Habilidades</div><ul class="lat-lista">${hab}</ul>` : ""}
    ${dados.hobbies ? `<div class="lat-titulo">Interesses</div><ul class="lat-lista">${listaHabilidades({ habilidades: dados.hobbies }).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  </div>
  <div class="main">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoInfo(dados)}
  </div>`;
}
function montarFinanceiro(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarRh(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarTi(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarJuridico(dados) {
  return cabCentrado(dados) + secaoObjetivo(dados) + secaoExperiencia(dados, "exp-item") + secaoFormacao(dados) + secaoHabilidades(dados) + secaoCursos(dados) + secaoInfo(dados);
}
function montarEducador(dados) { return cabCentrado(dados) + corpoPadrao(dados); }
function montarDesign(dados) { return montarMarketing(dados); }
function montarEstudante(dados) { return cabCentrado(dados) + secaoFormacao(dados) + secaoCursos(dados) + secaoHabilidades(dados) + secaoExperiencia(dados, "exp-item") + secaoHobbies(dados) + secaoInfo(dados); }
function montarTransicao(dados) { return cabCentrado(dados) + secaoHabilidades(dados) + secaoObjetivo(dados) + secaoExperiencia(dados, "exp-item") + secaoFormacao(dados) + secaoCursos(dados) + secaoInfo(dados); }
function montarExecutivoInternacional(dados) { return cabFlex(dados) + corpoPadrao(dados); }

function gerarHTML(modeloId, dadosBrutos, opts) {
  const dados = norm(dadosBrutos);
  const montadores = {
    classico: montarClassico, moderno: montarModerno, minimal: montarMinimal,
    profissional: montarProfissional, executivo: montarExecutivo, cronologico: montarCronologico,
    funcional: montarFuncional, compacto: montarCompacto, soberio: montarSoberio, tecnico: montarTecnico,
    elegante: montarElegante, criativo: montarCriativo, limpo: montarLimpo,
    tradicional: montarTradicional, contemporaneo: montarContemporaneo,
    harvard: montarHarvard, impacto: montarImpacto,
    "executivo-escuro": montarExecutivoEscuro, diplomatico: montarDiplomatico,
    academico: montarAcademico, consultor: montarConsultor,
    vendas: montarVendas, saude: montarSaude,
    industrial: montarIndustrial, logistica: montarLogistica,
    marketing: montarMarketing, financeiro: montarFinanceiro,
    rh: montarRh, ti: montarTi,
    juridico: montarJuridico, educador: montarEducador,
    design: montarDesign, estudante: montarEstudante,
    transicao: montarTransicao, "executivo-internacional": montarExecutivoInternacional,
  };
  const montar = montadores[modeloId] || montarClassico;
  const cssModelo = CSS[modeloId] || CSS.classico;
  const conteudo = montar(dados);

  // Marca d'água discreta (rodapé fixo da folha): site à esquerda, mini logo à
  // direita. Presente no preview, no PNG e no PDF — a assinatura premium remove.
  const comMarca = !opts || opts.marca !== false;
  const marcaHTML = comMarca
    ? `<div class="oe-marca" aria-hidden="true">
         <span class="oe-marca-site">www.officeexpress.com.br</span>
         <img class="oe-marca-logo" src="https://res.cloudinary.com/dzwkr47ib/image/upload/v1757000000/officeexpress/marca-logo.png" alt="" onerror="this.style.display='none'" />
       </div>`
    : "";
  const marcaCSS = comMarca
    ? `
  .oe-marca {
    position:absolute; left:0; right:0; bottom:14px;
    display:flex; align-items:center; justify-content:space-between;
    padding:0 26px; pointer-events:none;
  }
  .oe-marca-site {
    font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size:8.5px; letter-spacing:0.6px; color:#9aa5b1;
  }
  .oe-marca-logo { height:14px; opacity:0.38; object-fit:contain; }
`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
${CSS_BASE}
${cssModelo}${marcaCSS}
</style>
</head>
<body class="modelo-${esc(modeloId)}">
  <div class="page">
    ${conteudo}
    ${marcaHTML}
  </div>
</body>
</html>`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { gerarHTML, norm };
}
if (typeof window !== "undefined") {
  window.renderCurriculo = { gerarHTML, norm };
}
