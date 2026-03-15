(function() {
  'use strict';

  let curriculoAtivo = true;
  let logEnviadoCurriculo = false;

  // Reset ao entrar
  localStorage.removeItem("navegandoInternamente");

  function enviarAbandonoCurriculo(evento) {
    console.log("DEBUG abandono:", evento.type, curriculoAtivo, logEnviadoCurriculo);
    if (logEnviadoCurriculo || !curriculoAtivo) return;
    logEnviadoCurriculo = true;
    enviarLog("Abandonou Digitando");
  }

  window.addEventListener("pagehide", enviarAbandonoCurriculo);
  window.addEventListener("beforeunload", enviarAbandonoCurriculo);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") enviarAbandonoCurriculo({type:"visibilitychange"});
  });

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
