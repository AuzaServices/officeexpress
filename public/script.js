

  function aplicarMascaraTelefone(input) {
    input.addEventListener("input", function () {
      let valor = input.value.replace(/\D/g, "");
      if (valor.length > 11) valor = valor.slice(0, 11);
      const formatado = valor.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");
      input.value = formatado;
    });
  }

  function adicionarTelefone() {
    const container = document.getElementById("telefones");
    const input = document.createElement("input");
    input.type = "text";
    input.name = "telefone[]";
    input.style.marginTop = "10px";
    container.appendChild(input);
    aplicarMascaraTelefone(input);
  }

  document.querySelectorAll('[name="telefone[]"]').forEach(aplicarMascaraTelefone);

  document.getElementById("formulario").addEventListener("submit", function(e) {
    e.preventDefault();
    const form = document.getElementById("formulario");

    const valores = nome => Array.from(form.querySelectorAll(`[name="${nome}[]"]`)).map(el => el.value.trim());

const dados = {
  nome: form.nome?.value.trim() || "",
  idade: form.idade?.value.trim() || "", // ✅ Adiciona a idade aqui
  email: form.email?.value.trim() || "",
  telefone: valores("telefone").filter(t => t).join(" "),
  endereco: form.endereco?.value.trim() || "",
  numero: form.numero?.value.trim() || "",
  complemento: form.complemento?.value.trim() || "",
  bairro: form.bairro?.value.trim() || "",
  cidade: form.cidade?.value.trim() || "",
  cep: form.cep?.value.trim() || "",
  infoAdicional: form.querySelector('[name="infoAdicional"]')?.value.trim() || "",
  objetivo: form.objetivo?.value.trim() || "",
  formacao: form.formacao?.value.trim() || "",
  habilidades: form.habilidades?.value.trim() || "",
  hobbies: form.hobbies?.value.trim() || "",
  empresa: valores("empresa"),
  cargo: valores("cargo"),
  periodo_inicio: valores("periodo_inicio"),
  periodo_fim: valores("periodo_fim"),
  atividades: valores("atividades"),
  curso: valores("curso"),
  instituicao: valores("instituicao"),
  carga: valores("carga"),
  foto: null
};

    const foto = document.getElementById("foto");
    if (foto.files.length > 0) {
      const reader = new FileReader();
      reader.onload = function(event) {
        dados.foto = event.target.result;
        salvar(dados);
      };
      reader.readAsDataURL(foto.files[0]);
    } else {
      salvar(dados);
    }
  });

function salvar(dados) {
  localStorage.setItem("curriculo", JSON.stringify(dados));
  localStorage.setItem("entradaViaSplash", "true");
  localStorage.setItem("navegandoInternamente", "false"); // ← Corrigido

  // Se quiser desativar rastreio da página atual, só faça se ele já estiver definido
  if (typeof enviarLogAbandono === "function") {
    window.removeEventListener("unload", enviarLogAbandono);
  }
  if (typeof handleVisibilityChange === "function") {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  setTimeout(() => {
    window.location.href = "visualizar.html";
  }, 300);
}

  const dropArea = document.getElementById("drop-area");
  const uploadBox = document.getElementById("upload-box");
  const inputFoto = document.getElementById("foto");
  const preview = document.getElementById("preview-miniatura");

  uploadBox.addEventListener("click", () => {
  uploadEmAndamento = true;
  inputFoto.click();
});

  ["dragenter", "dragover"].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
      e.preventDefault();
      uploadBox.style.borderColor = "#00324a";
      uploadBox.style.backgroundColor = "#f0f8ff";
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
      e.preventDefault();
      uploadBox.style.borderColor = "#ccc";
      uploadBox.style.backgroundColor = "#fff";
    });
  });

  dropArea.addEventListener("drop", e => {
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
    };
    reader.readAsDataURL(file);
  }

function adicionarCurso() {
  const container = document.getElementById("cursos");
  const novo = document.createElement("div");
  novo.className = "curso";
  novo.innerHTML = `
    <input type="text" name="curso[]" placeholder="Nome do curso" />
    <input type="text" name="instituicao[]" placeholder="Instituição (opcional)" />
    <input type="text" name="carga[]" placeholder="Carga horária (ex: 40h)" />
  `;
  container.appendChild(novo);
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
        outModes: { default: "bounce" }
      }
    },
    background: {
      color: { value: "#f4f7fa" }
    }
  });
function adicionarExperiencia() {
  const container = document.getElementById("experiencias");
  const nova = document.createElement("div");
  nova.className = "experiencia";

  const empresa = document.createElement("input");
  empresa.type = "text";
  empresa.name = "empresa[]";
  empresa.placeholder = "Empresa";

  const cargo = document.createElement("input");
  cargo.type = "text";
  cargo.name = "cargo[]";
  cargo.placeholder = "Cargo";

  const atividades = document.createElement("textarea");
  atividades.name = "atividades[]";
  atividades.placeholder = "Atividades desenvolvidas...";

  const inicioLabel = document.createElement("label");
  inicioLabel.textContent = "Início:";

  const inicio = document.createElement("input");
  inicio.type = "text";
  inicio.name = "periodo_inicio[]";
  inicio.className = "mesAno";
  inicio.placeholder = "Selecione mês e ano";

  const fimLabel = document.createElement("label");
  fimLabel.textContent = "Fim:";

  const fim = document.createElement("input");
  fim.type = "text";
  fim.name = "periodo_fim[]";
  fim.className = "mesAno";
  fim.placeholder = "Selecione mês e ano";

  nova.appendChild(empresa);
  nova.appendChild(cargo);
  nova.appendChild(atividades);
  nova.appendChild(inicioLabel);
  nova.appendChild(inicio);
  nova.appendChild(fimLabel);
  nova.appendChild(fim);

  container.appendChild(nova);

  [inicio, fim].forEach(input => {
    if (!input._flatpickr) {
      flatpickr(input, {
        locale: flatpickr.l10ns.pt,
        dateFormat: "m/Y",
        disableMobile: true
      });
    }
  });
}

  document.querySelectorAll('.carga-input').forEach(input => {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, ''); // Remove tudo que não for número
  });
});

const etapas = document.querySelectorAll('.etapa');
const progresso = document.getElementById('progresso');
const btnAvancar = document.getElementById('avancar');
const btnVoltar = document.getElementById('voltar');
let etapaAtual = 0;

function mostrarEtapa(index) {
  etapas.forEach((etapa, i) => {
    etapa.classList.toggle('ativa', i === index);
  });

  progresso.style.width = ((index + 1) / etapas.length) * 100 + '%';
  btnVoltar.style.display = index === 0 ? 'none' : 'inline-block';

  // Apenas muda o texto, sem mexer em classe
  btnAvancar.textContent = index === etapas.length - 1 ? 'Finalizar' : 'Avançar';

if (index === etapas.length - 1) {
  btnAvancar.classList.add("finalizar");
  btnAvancar.textContent = "Finalizar";
} else {
  btnAvancar.classList.remove("finalizar");
  btnAvancar.textContent = "Avançar";
}
}

btnAvancar.addEventListener('click', () => {
  if (etapaAtual < etapas.length - 1) {
    etapaAtual++;
    mostrarEtapa(etapaAtual);
  } else {
    // Simula o submit manualmente
    document.getElementById("formulario").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
});

btnVoltar.addEventListener('click', () => {
  if (etapaAtual > 0) {
    etapaAtual--;
    mostrarEtapa(etapaAtual);
  }
});

mostrarEtapa(etapaAtual);

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mesAno").forEach(input => {
    if (!input._flatpickr) {
      flatpickr(input, {
        locale: flatpickr.l10ns.pt,
        dateFormat: "m/Y",
        disableMobile: true
      });
    }
  });
});