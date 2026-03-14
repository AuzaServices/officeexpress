// CURRICULO - Abandono consistente
(function() {
  'use strict';

  let curriculoAtivo = true;
  let logEnviadoCurriculo = false;

  // Função única de abandono
  function enviarAbandonoCurriculo(evento) {
    if (logEnviadoCurriculo || !curriculoAtivo) return;
    logEnviadoCurriculo = true;
    enviarLog("Abandonou Currículo (" + evento.type + ")");
  }

  // Eventos principais
  window.addEventListener("pagehide", enviarAbandonoCurriculo);
  window.addEventListener("beforeunload", enviarAbandonoCurriculo);

  // Navegação legítima → desativa abandono
  document.addEventListener("click", (e) => {
    const avancarBtn = e.target.closest('#avancar');
    if (avancarBtn && avancarBtn.textContent.includes('Finalizar')) {
      curriculoAtivo = false;
      localStorage.setItem('navegandoInternamente', 'true');
    }

    const linkInterno = e.target.closest("a[href]");
    if (linkInterno && linkInterno.href.includes(window.location.origin)) {
      curriculoAtivo = false;
      localStorage.setItem("navegandoInternamente", "true");
    }
  });

  // Função exposta para o botão Finalizar
  window.finalizarCurriculo = function() {
    curriculoAtivo = false;
    localStorage.setItem("entradaViaSplash", "true");
    localStorage.setItem("navegandoInternamente", "true");
    setTimeout(() => { window.location.href = "/visualizar"; }, 50);
  };
})();
