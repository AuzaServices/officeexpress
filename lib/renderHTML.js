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
  const c = ESTILOS.executivo.cor;
  const contato = [];
  if (dados.email) contato.push(esc(dados.email));
  if (dados.telefones.length) contato.push(esc(dados.telefones.join(" / ")));
  if (dados.endereco) contato.push(esc(dados.endereco));
  return `
  <div class="sidebar">
    <div class="lat-titulo">Contato</div>
    <div class="lat-contato">${contato.join("<br/>") || ""}</div>
    ${dados.habilidades ? `<div class="lat-titulo">Habilidades</div><ul class="lat-lista">${listaHabilidades(dados).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
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
  <div class="sidebar">
    <div class="lat-titulo">Contato</div>
    <div class="lat-contato">${contato.join("<br/>") || ""}</div>
    ${dados.habilidades ? `<div class="lat-titulo">Competências</div><ul class="lat-lista">${habilidades}</ul>` : ""}
  </div>
  <div class="main">
    <h1 class="nome">${esc(dados.nome || "Currículo")}</h1>
    ${secaoObjetivo(dados)}
    ${secaoExperiencia(dados, "exp-item")}
    ${secaoFormacao(dados)}
    ${secaoCursos(dados)}
    ${secaoHobbies(dados)}
    ${secaoInfo(dados)}
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
    .page { display:flex; padding:0; background:#fff; }
    .modelo-executivo .sidebar { width:30%; background:#0f172a; color:#fff; padding:32px 22px; }
    .modelo-executivo .sidebar .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,0.3); }
    .modelo-executivo .sidebar .lat-lista, .modelo-executivo .sidebar .lat-contato { color:#cbd5e1; }
    .modelo-executivo .sidebar .lat-lista { list-style:none; padding:0; margin:0; }
    .modelo-executivo .main { flex:1; padding:32px 30px; }
    .modelo-executivo .nome { color:#0f172a; font-size:26px; font-weight:800; letter-spacing:-0.5px; }
    .modelo-executivo h2 { color:#0f172a; }
    .modelo-executivo .sec { border-top:1px solid #e5e7eb; }
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
    .modelo-funcional .sidebar { width:32%; background:#4d7c0f; color:#fff; padding:30px 22px; }
    .modelo-funcional .sidebar .lat-titulo { color:#fff; border-bottom:1px solid rgba(255,255,255,0.4); }
    .modelo-funcional .sidebar .lat-contato, .modelo-funcional .sidebar .lat-lista { color:#f1f5f9; }
    .modelo-funcional .sidebar .lat-lista { list-style:none; padding:0; margin:0; }
    .modelo-funcional .main { flex:1; padding:30px 28px; }
    .modelo-funcional .nome { color:#4d7c0f; font-size:28px; font-weight:700; }
    .modelo-funcional h2 { color:#4d7c0f; }
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

function gerarHTML(modeloId, dadosBrutos) {
  const dados = norm(dadosBrutos);
  const montadores = {
    classico: montarClassico, moderno: montarModerno, minimal: montarMinimal,
    profissional: montarProfissional, executivo: montarExecutivo, cronologico: montarCronologico,
    funcional: montarFuncional, compacto: montarCompacto, soberio: montarSoberio, tecnico: montarTecnico,
  };
  const montar = montadores[modeloId] || montarClassico;
  const cssModelo = CSS[modeloId] || CSS.classico;
  const conteudo = montar(dados);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
${CSS_BASE}
${cssModelo}
</style>
</head>
<body class="modelo-${esc(modeloId)}">
  <div class="page">
    ${conteudo}
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
