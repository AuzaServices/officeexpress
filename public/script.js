console.log('[script.js] carregado');

// 🔍 Tracking function for painel.html logs (matches server.js /api/logs)
function enviarLog(etapa) {
  try {
    const dadosCurriculo = localStorage.getItem('curriculo');
    const nome = dadosCurriculo ? JSON.parse(dadosCurriculo).nome || 'Anônimo' : 'Anônimo';
    fetch("/api/logs", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        acao: "etapa",  // 👈 required by server.js
        nome: nome,
        etapa: etapa,
        timestamp: new Date().toISOString()
      })
    }).catch(e => console.log('📊 Log enviado:', etapa));
  } catch(e) {
    console.log('📊 Log falhou:', e);
  }
}

// Funções de notificação
function mostrarNotificacao(mensagem, tipo) {
  const container = document.getElementById('notificacoes');
  if (!container) return;
  
  const notificacao = document.createElement('div');
  notificacao.className = 'notificacao';
  notificacao.innerHTML = '<span class="icone">' + (tipo === 'sucesso' ? '✓' : '!') + '</span> ' + mensagem;
  
  container.appendChild(notificacao);
  
  setTimeout(function() {
    notificacao.classList.remove('escondida');
  }, 10);
  
  setTimeout(function() {
    notificacao.classList.add('escondida');
    setTimeout(function() {
      if (notificacao.parentNode) {
        notificacao.parentNode.removeChild(notificacao);
      }
    }, 400);
  }, 3000);
}

function aplicarMascaraTelefone(input) {
  input.addEventListener("input", function () {
    let valor = input.value.replace(/\D/g, "");
    if (valor.length > 11) valor = valor.slice(0, 11);
    const formatado = valor.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");
    input.value = formatado;
    salvarDados();
  });
}

function getDadosFromForm() {
  const form = document.getElementById("formulario");
  if (!form) {
    console.warn("Formulario nao encontrado!");
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
    habilidades: getValue("#habilidades-texto"),
    hobbies: getValue("#hobbies-texto"),
    infoAdicional: getValue("#infoAdicional"),
    primeiroEmprego: document.getElementById('experiencias')?.dataset.primeiroEmprego === "true" ? "true" : "",
    empresa: getArray("empresa[]"),
    cargo: getArray("cargo[]"),
    periodo_inicio: getArray("periodo_inicio[]"),
    periodo_fim: getArray("periodo_fim[]"),
    atividades: getArray("atividades[]"),
    curso: getArray("curso[]"),
    instituicao: getArray("instituicao[]"),
    carga: getArray("carga[]"),
  };

  const preview = document.getElementById("preview-miniatura");
  if (preview && preview.src && preview.src.startsWith("data:image/")) {
    dados.foto = preview.src;
  }

  console.log("📝 getDadosFromForm() resultado:", dados);
  return dados;
}

function salvarDados() {
  const dados = getDadosFromForm();
  const atual = JSON.parse(localStorage.getItem("curriculo") || "{}");

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
    console.log("✅ Dados salvos em localStorage.curriculo:", merged);
    // Notificação de salvamento automático
    // mostrarNotificacao('Dados salvos automaticamente', 'sucesso');
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

  input.addEventListener("input", function () {
    const valor = input.value.replace(/\D/g, "");
    const valido = /^(\d{2})(9\d{8})$/.test(valor);
    erro.style.display = valor.length > 0 && !valido ? "inline" : "none";
    salvarDados();
  });

  console.log("📞 Novo telefone adicionado ao DOM, salvando...");
  salvarDados();
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

  novo.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", salvarDados);
  });
  console.log("🎓 Novo curso adicionado ao DOM, salvando...");
  salvarDados();
}

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
    el.addEventListener("input", salvarDados);
  });

  if (typeof flatpickr !== "undefined") {
    [inicio, fim].forEach((input) => {
      flatpickr(input, {
        locale: flatpickr.l10ns.pt,
        dateFormat: "m/Y",
        disableMobile: true,
      });
    });
  }

  console.log("💼 Nova experiência adicionada ao DOM, salvando...");
  salvarDados();
}

// Funções de etapas do formulário
let etapaAtual = 0;

function mostrarEtapa(index) {
  const etapas = document.querySelectorAll(".etapa");
  const progresso = document.getElementById("progresso");
  const btnAvancar = document.getElementById("avancar");
  const btnVoltar = document.getElementById("voltar");
  const navegacaoContainer = document.getElementById("navegacaoContainer");
  
  if (!etapas.length) return;
  
  etapas.forEach((etapa, i) => {
    etapa.classList.toggle("etapa-ativa", i === index);
  });

  if (progresso) {
    progresso.style.width = ((index + 1) / etapas.length) * 100 + "%";
  }
  
  // Controla a visibilidade do botão Voltar com transição suave
  if (btnVoltar) {
    if (index === 0) {
      btnVoltar.classList.add('escondido');
    } else {
      btnVoltar.classList.remove('escondido');
    }
  }

  // Alinha os botões: centralizado na primeira etapa, espaço-between nas outras
  if (navegacaoContainer) {
    if (index === 0) {
      navegacaoContainer.classList.remove('com-span');
    } else {
      navegacaoContainer.classList.add('com-span');
    }
  }

  if (btnAvancar) {
    if (index === etapas.length - 1) {
      btnAvancar.classList.add("finalizar");
      btnAvancar.textContent = "Finalizar";
    } else {
      btnAvancar.classList.remove("finalizar");
      btnAvancar.textContent = "Avançar";
    }
  }
}

function avancarEtapa() {
  const indiceEtapaCidadeEstado = 2;

  if (etapaAtual === indiceEtapaCidadeEstado) {
    const campoEstado = document.getElementById("estado");
    if (campoEstado && !campoEstado.value) {
      alert("Selecione seu Estado antes de Avançar.");
      return;
    }
  }

  const etapas = document.querySelectorAll(".etapa");
  if (etapaAtual < etapas.length - 1) {
    etapaAtual++;
    mostrarEtapa(etapaAtual);
  } else {
    console.log("✅ FINALIZANDO - Salvando dados antes de ir para visualizar...");
    salvarDados();
    
    localStorage.setItem("entradaViaSplash", "true");
    localStorage.setItem("navegandoInternamente", "false");
    
    setTimeout(() => {
      window.location.href = "/visualizar";
    }, 300);
  }
}

function voltarEtapa() {
  if (etapaAtual > 0) {
    etapaAtual--;
    mostrarEtapa(etapaAtual);
  }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM carregado, inicializando...");
  
  // Aplicar máscara aos telefones existentes
  document.querySelectorAll('[name="telefone[]"]').forEach(aplicarMascaraTelefone);

  // Event listeners do formulário
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

  // Upload de foto
  const dropArea = document.getElementById("drop-area");
  const uploadBox = document.getElementById("upload-box");
  const inputFoto = document.getElementById("foto");
  const preview = document.getElementById("preview-miniatura");

  if (uploadBox && inputFoto) {
    uploadBox.addEventListener("click", () => {
      inputFoto.click();
    });
  }

  if (dropArea) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        if (uploadBox) {
          uploadBox.style.borderColor = "#00324a";
          uploadBox.style.backgroundColor = "#f0f8ff";
        }
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        if (uploadBox) {
          uploadBox.style.borderColor = "#ccc";
          uploadBox.style.backgroundColor = "#fff";
        }
      });
    });

    dropArea.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        inputFoto.files = e.dataTransfer.files;
        mostrarPreview(file);
      }
    });
  }

  if (inputFoto) {
    inputFoto.addEventListener("change", () => {
      const file = inputFoto.files[0];
      if (file) mostrarPreview(file);
    });
  }

  function mostrarPreview(file) {
    if (!preview) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
      salvarDados();
    };
    reader.readAsDataURL(file);
  }

  // Inicializar flatpickr para campos de data
  document.querySelectorAll(".mesAno").forEach((input) => {
    if (typeof flatpickr !== "undefined" && !input._flatpickr) {
      flatpickr(input, {
        locale: flatpickr.l10ns.pt,
        dateFormat: "m/Y",
        disableMobile: true,
      });
    }
  });

  // Checkbox primeiro emprego - deixar invisível
  const checkboxPrimeiroEmprego = document.getElementById('primeiroEmpregoCheck');
  const experienciasDiv = document.getElementById('experiencias');
  const btnAdicionarExperiencia = document.getElementById('btnAdicionarExperiencia');
  
  if (checkboxPrimeiroEmprego && experienciasDiv) {
    checkboxPrimeiroEmprego.addEventListener('change', function() {
      if (this.checked) {
        // Deixar invisível - não mostrar nenhum input
        experienciasDiv.style.display = 'none';
        experienciasDiv.dataset.primeiroEmprego = "true";
        if (btnAdicionarExperiencia) {
          btnAdicionarExperiencia.disabled = true;
          btnAdicionarExperiencia.style.opacity = "0.5";
          btnAdicionarExperiencia.style.cursor = "not-allowed";
        }
      } else {
        experienciasDiv.style.display = 'block';
        experienciasDiv.innerHTML = '';
        delete experienciasDiv.dataset.primeiroEmprego;
        if (btnAdicionarExperiencia) {
          btnAdicionarExperiencia.disabled = false;
          btnAdicionarExperiencia.style.opacity = "1";
          btnAdicionarExperiencia.style.cursor = "pointer";
        }
      }
      salvarDados();
    });
    
    // Verifica se é primeiro emprego ao carregar dados salvos
    const dados = JSON.parse(localStorage.getItem('curriculo') || '{}');
    if (dados.primeiroEmprego === true || dados.primeiroEmprego === "true") {
      checkboxPrimeiroEmprego.checked = true;
      experienciasDiv.style.display = 'none';
      experienciasDiv.dataset.primeiroEmprego = "true";
      if (btnAdicionarExperiencia) {
        btnAdicionarExperiencia.disabled = true;
        btnAdicionarExperiencia.style.opacity = "0.5";
        btnAdicionarExperiencia.style.cursor = "not-allowed";
      }
      // Salva os dados para garantir que primeiroEmprego esteja no localStorage
      salvarDados();
    }
  }

  // Marcar habilidades e hobbies selecionados do localStorage
  function selecionarSugestoesSalvas(textareaId, containerId) {
    const textarea = document.getElementById(textareaId);
    const container = document.getElementById(containerId);
    if (!textarea || !container) return;
    
    const valores = textarea.value ? textarea.value.split(',').map(s => s.trim()).filter(s => s) : [];
    const botoes = container.querySelectorAll('button');
    botoes.forEach(btn => {
      if (valores.includes(btn.textContent.trim())) {
        btn.classList.add('selecionado');
      }
    });
  }
  
  // Aplicar selections salvas
  selecionarSugestoesSalvas('habilidades-texto', 'habilidades-opcoes');
  selecionarSugestoesSalvas('hobbies-texto', 'hobbies-opcoes');

  // Botões de navegação
  const btnAvancar = document.getElementById("avancar");
  const btnVoltar = document.getElementById("voltar");
  
  if (btnAvancar) {
    btnAvancar.addEventListener("click", avancarEtapa);
  }
  
  if (btnVoltar) {
    btnVoltar.addEventListener("click", voltarEtapa);
  }

  // Inicializar primeira etapa
  mostrarEtapa(etapaAtual);

  // Menu hamburguer
  const btnMenu = document.getElementById('btnMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (btnMenu && mobileMenu) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileMenu.classList.toggle('open');
      btnMenu.setAttribute('aria-expanded', isOpen);
      btnMenu.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > lastScroll && currentScroll > 150) {
        mobileMenu.classList.remove('open');
        btnMenu.setAttribute('aria-expanded', 'false');
        btnMenu.innerHTML = '<i class="fas fa-bars"></i>';
      }
      lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });
  }
  
  console.log("✅ Inicialização concluída!");
});

