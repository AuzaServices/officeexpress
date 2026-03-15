(function() {
  'use strict';

  let curriculoAtivo = true;
  let logEnviadoCurriculo = false;

  // Ao entrar no currículo, assume ativo
  localStorage.removeItem("navegandoInternamente");

  function enviarAbandonoCurriculo(evento) {
    if (logEnviadoCurriculo || !curriculoAtivo) return;
    logEnviadoCurriculo = true;
    enviarLog("Abandonou Digitando");
  }

  // Saiu da aba ou página
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      enviarAbandonoCurriculo({type:"visibilitychange"});
    }
    if (document.visibilityState === "visible") {
      // Se já tinha abandonado, agora voltou
      if (logEnviadoCurriculo) {
        enviarLog("Digitando");
        logEnviadoCurriculo = false; // reset
        curriculoAtivo = true;
      }
    }
  });

  window.addEventListener("pagehide", enviarAbandonoCurriculo);

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

  window.finalizarCurriculo = function() {
    curriculoAtivo = false;
    localStorage.setItem("entradaViaSplash", "true");
    localStorage.setItem("navegandoInternamente", "true");
    setTimeout(() => { window.location.href = "/visualizar"; }, 50);
  };
})();
