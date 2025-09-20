function adicionarExperiencia() {
  const container = document.getElementById("experiencias");
  const nova = document.createElement("div");
  nova.className = "experiencia";
  nova.innerHTML = `
    <input type="text" name="empresa[]" placeholder="Empresa" />
    <input type="text" name="cargo[]" placeholder="Cargo" />
    <textarea name="atividades[]" placeholder="Atividades desenvolvidas..."></textarea>
    <label>Início:</label>
    <input type="text" class="mesAno" name="periodo_inicio[]" placeholder="Selecione mês e ano" />
    <label>Fim:</label>
    <input type="text" class="mesAno" name="periodo_fim[]" placeholder="Selecione mês e ano" />
  `;
  container.appendChild(nova);

  // Aplica Flatpickr corretamente com idioma português
  setTimeout(() => {
    nova.querySelectorAll(".mesAno").forEach(input => {
      flatpickr(input, {
        locale: flatpickr.l10ns.pt,
        plugins: [
          new monthSelectPlugin({
            shorthand: false,
            dateFormat: "m/Y",
            altFormat: "F Y"
          })
        ]
      });
    });
  }, 0);
}

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
  email: form.email?.value.trim() || "",
  telefone: valores("telefone").filter(t => t).join(" "),
  endereco: form.endereco?.value.trim() || "",
  numero: form.numero?.value.trim() || "",
  complemento: form.complemento?.value.trim() || "",
  bairro: form.bairro?.value.trim() || "",
  cidade: form.cidade?.value.trim() || "",
  cep: form.cep?.value.trim() || "",
infoAdicional: form.querySelector('[name="infoAdicional"]')?.value.trim() || "", // ← ESSENCIAL
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
  nova.innerHTML = `
    <input type="text" name="empresa[]" placeholder="Empresa" />
    <input type="text" name="cargo[]" placeholder="Cargo" />
    <textarea name="atividades[]" placeholder="Atividades desenvolvidas..."></textarea>
    <label>Início:</label>
    <input type="text" class="mesAno" name="periodo_inicio[]" placeholder="Selecione mês e ano" />
    <label>Fim:</label>
    <input type="text" class="mesAno" name="periodo_fim[]" placeholder="Selecione mês e ano" />
  `;
  container.appendChild(nova);

  // Reaplica o Flatpickr nos novos campos
  flatpickr(nova.querySelectorAll(".mesAno"), {
    plugins: [
      new monthSelectPlugin({
        shorthand: false,
        dateFormat: "m/Y",
        altFormat: "F Y"
      })
    ],
    locale: "pt"
  });
}
  // Aplica Flatpickr nos campos já existentes ao carregar a página
  flatpickr(document.querySelectorAll(".mesAno"), {
    plugins: [
      new monthSelectPlugin({
        shorthand: false,
        dateFormat: "m/Y",
        altFormat: "F Y"
      })
    ],
    locale: "pt"
  });

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

const frasesObjetivo = {
  emprego: [
    "Estou em busca de uma oportunidade profissional que me permita aplicar minhas habilidades técnicas e interpessoais, crescer com a empresa e contribuir de forma estratégica para os resultados.",
    "Desejo integrar uma equipe comprometida e inovadora, onde eu possa desenvolver minha carreira com propósito, agregando valor através da minha experiência e dedicação.",
    "Procuro uma vaga que me desafie intelectualmente e me permita evoluir profissionalmente, colaborando com soluções práticas, criatividade e visão de futuro.",
    "Tenho como objetivo atuar em uma empresa que valorize o crescimento contínuo, a colaboração entre equipes e o desenvolvimento de talentos internos.",
    "Quero contribuir com minha experiência, aprender com novos desafios e participar ativamente da construção de projetos que impactem positivamente o negócio.",
    "Busco uma posição que me permita aplicar meus conhecimentos técnicos, desenvolver novas competências e crescer em um ambiente que valorize inovação e excelência."
  ],
  estagio: [
    "Procuro uma oportunidade de estágio para aplicar os conhecimentos adquiridos na formação acadêmica, adquirir experiência prática e contribuir com entusiasmo e responsabilidade.",
    "Desejo iniciar minha trajetória profissional em um ambiente que estimule o aprendizado contínuo, a troca de experiências e o desenvolvimento de habilidades reais.",
    "Busco um estágio que me permita crescer pessoal e profissionalmente, colaborando com dedicação, curiosidade e vontade de aprender com os desafios do dia a dia.",
    "Quero fazer parte de uma equipe que valorize jovens talentos, ofereça espaço para evolução e incentive a construção de uma base sólida para minha carreira.",
    "Estou em busca de uma oportunidade para iniciar minha carreira com responsabilidade, comprometimento e abertura para absorver novos conhecimentos.",
    "Meu objetivo é adquirir vivência profissional, desenvolver habilidades práticas e contribuir com ideias e energia em projetos reais e relevantes."
  ],
  promocao: [
    "Tenho como meta assumir novos desafios dentro da empresa, contribuindo com soluções estratégicas, liderança proativa e foco em resultados sustentáveis.",
    "Desejo crescer profissionalmente e ocupar posições que me permitam ampliar meu impacto, responsabilidade e capacidade de tomada de decisão.",
    "Busco reconhecimento pelo meu desempenho e dedicação, visando alcançar cargos de maior relevância e contribuir com visão de longo prazo.",
    "Quero evoluir dentro da organização, assumindo funções que valorizem minha experiência, comprometimento e capacidade de gerar resultados.",
    "Meu objetivo é conquistar uma promoção por mérito, demonstrando resultados consistentes, postura colaborativa e espírito de liderança.",
    "Pretendo ampliar minha atuação na empresa, contribuindo com visão estratégica, inovação e engajamento em projetos de alto impacto."
  ],
  freelance: [
    "Estou em busca de projetos freelance que me permitam aplicar minha criatividade, entregar soluções sob medida e colaborar com clientes de forma personalizada.",
    "Desejo atuar de forma independente, oferecendo serviços com qualidade, agilidade e foco em resultados que realmente façam diferença.",
    "Procuro oportunidades como freelancer para colaborar com empresas e clientes em projetos pontuais, desafiadores e com alto potencial de impacto.",
    "Quero expandir minha atuação profissional através de trabalhos autônomos que valorizem minha expertise, flexibilidade e comprometimento.",
    "Busco liberdade para criar e inovar, atendendo demandas específicas com excelência, empatia e foco em entregar valor real.",
    "Meu objetivo é construir parcerias duradouras como freelancer, entregando soluções criativas, eficientes e alinhadas às necessidades de cada projeto."
  ],
  transicao: [
    "Estou em busca de uma transição de carreira que me permita explorar novas áreas, aplicar minha versatilidade e crescer em um ambiente diferente e estimulante.",
    "Desejo mudar de segmento e encontrar oportunidades que estejam alinhadas com meus novos interesses, valores e habilidades em desenvolvimento.",
    "Procuro uma nova trajetória profissional que traga desafios diferentes, estimule meu crescimento pessoal e me permita reinventar minha atuação.",
    "Quero redirecionar minha carreira para uma área que me motive, me desafie e me permita contribuir com uma nova perspectiva e energia renovada.",
    "Meu objetivo é iniciar uma nova fase profissional, aproveitando minha experiência anterior e aprendendo com novos contextos e demandas.",
    "Pretendo migrar para um campo que valorize minha capacidade de adaptação, minha vontade de evoluir e meu desejo de construir algo significativo."
  ]
};

document.getElementById("gerarFrase").addEventListener("click", () => {
  const intuito = document.getElementById("intuito").value;
  const frases = frasesObjetivo[intuito];
  if (!frases) {
    document.getElementById("fraseGerada").textContent = "Escolha um foco para gerar seu objetivo 😉";
    return;
  }
  const aleatoria = frases[Math.floor(Math.random() * frases.length)];
  document.getElementById("fraseGerada").textContent = aleatoria;
});

document.getElementById("adicionarObjetivo").addEventListener("click", () => {
  const frase = document.getElementById("fraseGerada").textContent;
  const campoObjetivo = document.querySelector('[name="objetivo"]');
  if (frase && campoObjetivo) {
    campoObjetivo.value = frase;
  }
});

document.querySelectorAll(".mesAno").forEach(input => {
  flatpickr(input, {
    locale: flatpickr.l10ns.pt,
    plugins: [
      new monthSelectPlugin({
        shorthand: false,
        dateFormat: "m/Y",
        altFormat: "F Y"
      })
    ]
  });
});