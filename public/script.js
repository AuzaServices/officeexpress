function aplicarMascaraTelefone(input) {
  input.addEventListener("input", function () {
    let valor = input.value.replace(/\D/g, "");
    if (valor.length > 11) valor = valor.slice(0, 11);
    const formatado = valor.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");
    input.value = formatado;
    salvarDados(); // atualiza localStorage a cada mudança
  });
}

function getDadosFromForm() {
  const form = document.getElementById("formulario");
  if (!form) {
    console.warn("❌ Formulário não encontrado!");
    return {};
  }

  const getValue = (selector) => {
    const el = form.querySelector(selector);
    return el ? String(el.value).trim() : "";
  };

  const getArray = (name) =>
    Array.from(form.querySelectorAll(`[name="${name}"]`)).map((el) =>
      String(el.value).trim(),
    );

  const dados = {
    nome: getValue("#nome"),
    idade: getValue("#idade"),
    email: getValue("#email"),
    telefone: getArray("telefone[]"),
    endereco: getValue("#endereco"),
    numero: getValue("#numero"),
    complemento: getValue("#complemento"),
    bairro: getValue("#bairro"),
    cidade: getValue("#cidade"),
    estado: getValue("#estado"),
    cep: getValue("#cep"),
    objetivo: getValue("#objetivo"),
    formacao: getValue("#formacao"),
    habilidades: getValue("#habilidades"),
    hobbies: getValue("#hobbies"),
    infoAdicional: getValue("#infoAdicional"),
    empresa: getArray("empresa[]"),
    cargo: getArray("cargo[]"),
    periodo_inicio: getArray("periodo_inicio[]"),
    periodo_fim: getArray("periodo_fim[]"),
    atividades: getArray("atividades[]"),
    curso: getArray("curso[]"),
    instituicao: getArray("instituicao[]"),
    carga: getArray("carga[]"),
  };

  // Foto (só salva base64)
  const preview = document.getElementById("preview-miniatura");
  if (preview && preview.src && preview.src.startsWith("data:image/")) {
    dados.foto = preview.src;
  }

  console.log("📝 getDadosFromForm() resultado:", dados); // DEBUG
  return dados;
}

function salvarDados() {
  const dados = getDadosFromForm();
  const atual = JSON.parse(localStorage.getItem("curriculo") || "{}");

  // Mescla dados existentes com o que está no formulário.
  // Não sobrescreve arrays vazias (evita apagar dados ao navegar).
  const merged = { ...atual };
  for (const [key, value] of Object.entries(dados)) {
    if (Array.isArray(value)) {
      if (value.length > 0) merged[key] = value;
      else if (!(key in merged)) merged[key] = value;
    } else {
      merged[key] = value;
    }
  }

  try {
    localStorage.setItem("curriculo", JSON.stringify(merged));
    console.log("✅ Dados salvos em localStorage.curriculo:", merged); // DEBUG
  } catch (err) {
    console.error("❌ Falha ao salvar dados no localStorage:", err);
  }
}

function adicionarTelefone() {
  console.log("📞 adicionarTelefone() chamada");
  const container = document.getElementById("telefones");

  const bloco = document.createElement("div");
  bloco.className = "telefone-bloco";
  bloco.style.marginBottom = "10px";

  const input = document.createElement("input");
  input.type = "text";
  input.name = "telefone[]";
  input.className = "telefone-input";
  input.placeholder = "(DDD) 9XXXX-XXXX";
  input.style.marginTop = "10px";

  const erro = document.createElement("span");
  erro.className = "erro-telefone";
  erro.textContent = "Número inválido";
  erro.style.color = "red";
  erro.style.fontSize = "13px";
  erro.style.display = "none";

  bloco.appendChild(input);
  bloco.appendChild(erro);
  container.appendChild(bloco);

  aplicarMascaraTelefone(input);

  // Validação visual igual ao primeiro campo
  input.addEventListener("input", function () {
    const valor = input.value.replace(/\D/g, "");
    const valido = /^(\d{2})(9\d{8})$/.test(valor);
    erro.style.display = valor.length > 0 && !valido ? "inline" : "none";
    salvarDados(); // salva sempre que o usuário digita
  });

  // Salva imediatamente após criar o campo (para manter consistência)
  console.log("📞 Novo telefone adicionado ao DOM, salvando...");
  salvarDados();
}

document
  .querySelectorAll('[name="telefone[]"]')
  .forEach(aplicarMascaraTelefone);

// ✅ Event listeners para salvar dados em tempo real
const formElement = document.getElementById("formulario");
if (formElement) {
  formElement.addEventListener("input", (e) => {
    console.log("🎯 Evento input capturado! Campo:", e.target.name, "Valor:", e.target.value);
    salvarDados();
  });
  formElement.addEventListener("change", (e) => {
    console.log("🎯 Evento change capturado! Campo:", e.target.name, "Valor:", e.target.value);
    salvarDados();
  });
}

const dropArea = document.getElementById("drop-area");
const uploadBox = document.getElementById("upload-box");
const inputFoto = document.getElementById("foto");
const preview = document.getElementById("preview-miniatura");

uploadBox.addEventListener("click", () => {
  uploadEmAndamento = true;
  inputFoto.click();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#00324a";
    uploadBox.style.backgroundColor = "#f0f8ff";
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#ccc";
    uploadBox.style.backgroundColor = "#fff";
  });
});

dropArea.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    inputFoto.files = e.dataTransfer.files;
    mostrarPreview(file);
  }
});

inputFoto.addEventListener("change", () => {
  uploadEmAndamento = false;
  const file = inputFoto.files[0];
  if (file) mostrarPreview(file);
});

function mostrarPreview(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result;
    preview.style.display = "block";
    salvarDados(); // salva também a foto (base64) sempre que atualiza preview
  };
  reader.readAsDataURL(file);
}

function adicionarCurso(curso = "", instituicao = "", carga = "") {
  console.log("🎓 adicionarCurso() chamada");
  const container = document.getElementById("cursos");
  const novo = document.createElement("div");
  novo.className = "curso";
  novo.innerHTML = `
    <input type="text" name="curso[]" placeholder="Nome do curso" value="${curso}" />
    <input type="text" name="instituicao[]" placeholder="Instituição (opcional)" value="${instituicao}" />
    <input type="text" name="carga[]" placeholder="Carga horária (ex: 40h)" value="${carga}" />
  `;
  container.appendChild(novo);

  // Salvar ao digitar
  novo.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", salvarCursos);
  });
  console.log("🎓 Novo curso adicionado ao DOM, salvando...");
  salvarCursos();
  salvarDados();
}

function salvarCursos() {
  // NÃO MAIS SALVA EM cursosSalvos - tudo vai via salvarDados()
  salvarDados();
}

// Dispara o log assim que o site é acessado
tsParticles.load("particles-js", {
  fullScreen: { enable: false },
  particles: {
    number: { value: 60 },
    color: { value: "#e09d00" },
    shape: { type: "circle" },
    opacity: { value: 0.3 },
    size: { value: 4 },
    move: {
      enable: true,
      speed: 1.5,
      direction: "none",
      outModes: { default: "bounce" },
    },
  },
  background: {
    color: { value: "#f4f7fa" },
  },
});
function adicionarExperiencia(
  empresaVal = "",
  cargoVal = "",
  atividadesVal = "",
  inicioVal = "",
  fimVal = "",
) {
  console.log("💼 adicionarExperiencia() chamada");
  const container = document.getElementById("experiencias");
  const nova = document.createElement("div");
  nova.className = "experiencia";

  const empresa = document.createElement("input");
  empresa.type = "text";
  empresa.name = "empresa[]";
  empresa.placeholder = "Empresa";
  empresa.value = empresaVal;

  const cargo = document.createElement("input");
  cargo.type = "text";
  cargo.name = "cargo[]";
  cargo.placeholder = "Cargo";
  cargo.value = cargoVal;

  const atividades = document.createElement("textarea");
  atividades.name = "atividades[]";
  atividades.placeholder = "Atividades desenvolvidas...";
  atividades.value = atividadesVal;

  const inicioLabel = document.createElement("label");
  inicioLabel.textContent = "Início:";

  const inicio = document.createElement("input");
  inicio.type = "text";
  inicio.name = "periodo_inicio[]";
  inicio.className = "mesAno";
  inicio.placeholder = "Selecione mês e ano";
  inicio.value = inicioVal;

  const fimLabel = document.createElement("label");
  fimLabel.textContent = "Fim:";

  const fim = document.createElement("input");
  fim.type = "text";
  fim.name = "periodo_fim[]";
  fim.className = "mesAno";
  fim.placeholder = "Selecione mês e ano";
  fim.value = fimVal;

  nova.appendChild(empresa);
  nova.appendChild(cargo);
  nova.appendChild(atividades);
  nova.appendChild(inicioLabel);
  nova.appendChild(inicio);
  nova.appendChild(fimLabel);
  nova.appendChild(fim);

  container.appendChild(nova);

  [empresa, cargo, atividades, inicio, fim].forEach((el) => {
    el.addEventListener("input", salvarExperiencias);
  });

  [inicio, fim].forEach((input) => {
    flatpickr(input, {
      locale: flatpickr.l10ns.pt,
      dateFormat: "m/Y",
      disableMobile: true,
    });
  });

  console.log("💼 Nova experiência adicionada ao DOM, salvando...");
  salvarExperiencias();
  salvarDados();
}

function salvarExperiencias() {
  // NÃO MAIS SALVA EM experienciasSalvas - tudo vai via salvarDados()
  salvarDados();
}

document.querySelectorAll(".carga-input").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, ""); // Remove tudo que não for número
  });
});

const etapas = document.querySelectorAll(".etapa");
const progresso = document.getElementById("progresso");
const btnAvancar = document.getElementById("avancar");
const btnVoltar = document.getElementById("voltar");
let etapaAtual = 0;

function mostrarEtapa(index) {
  etapas.forEach((etapa, i) => {
    etapa.classList.toggle("ativa", i === index);
  });

  progresso.style.width = ((index + 1) / etapas.length) * 100 + "%";
  btnVoltar.style.display = index === 0 ? "none" : "inline-block";

  // Apenas muda o texto, sem mexer em classe
  btnAvancar.textContent =
    index === etapas.length - 1 ? "Finalizar" : "Avançar";

  if (index === etapas.length - 1) {
    btnAvancar.classList.add("finalizar");
    btnAvancar.textContent = "Finalizar";
  } else {
    btnAvancar.classList.remove("finalizar");
    btnAvancar.textContent = "Avançar";
  }
}

btnAvancar.addEventListener("click", () => {
  // validação apenas na terceira etapa (índice 2)
  const indiceEtapaCidadeEstado = 2;

  if (etapaAtual === indiceEtapaCidadeEstado) {
    const campoEstado = document.getElementById("estado");
    if (campoEstado && !campoEstado.value) {
      alert("Selecione seu Estado antes de Avançar.");
      return; // impede avanço
    }
  }

  if (etapaAtual < etapas.length - 1) {
    etapaAtual++;
    mostrarEtapa(etapaAtual);
  } else {
    // ✅ FINALIZAR: Salva dados e redireciona (SEM disparar submit!)
    console.log("✅ FINALIZANDO - Salvando dados antes de ir para visualizar...");
    salvarDados(); // Garante que tudo está salvo com getDadosFromForm()
    
    localStorage.setItem("entradaViaSplash", "true");
    localStorage.setItem("navegandoInternamente", "false");
    
    setTimeout(() => {
      window.location.href = "/visualizar";
    }, 300);
  }
});

btnVoltar.addEventListener("click", () => {
  if (etapaAtual > 0) {
    etapaAtual--;
    mostrarEtapa(etapaAtual);
  }
});

mostrarEtapa(etapaAtual);
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mesAno").forEach((input) => {
    if (!input._flatpickr) {
      flatpickr(input, {
        locale: flatpickr.l10ns.pt,
        dateFormat: "m/Y",
        disableMobile: true,
      });
    }
  });
});

// Restauração agora é feita em curriculo.html via DOMContentLoaded
