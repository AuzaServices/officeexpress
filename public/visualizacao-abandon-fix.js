(function() {
  'use strict';

  let logEnviadoVisualizar = false;
  let entradaViaSplash = localStorage.getItem("entradaViaSplash") === "true";
  let saidaSegura = false;

  function enviarAbandonoVisualizar() {
    const navegandoInternamente = localStorage.getItem("navegandoInternamente") === "true";
    if (logEnviadoVisualizar || !entradaViaSplash || navegandoInternamente || saidaSegura) return;
    logEnviadoVisualizar = true;
    enviarLog("Abandonou na Visualização");
  }

  // Usar apenas visibilitychange
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") enviarAbandonoVisualizar();
  });

  // Botão Editar
  window.voltarParaCurriculo = function() {
    saidaSegura = true;
    localStorage.setItem("navegandoInternamente", "true");
    setTimeout(() => { window.location.replace("/curriculo"); }, 50);
  };

  // Botão PDF
  window.redirecionarParaLoading = async function() {
    if (temErros) { alert("Preencha os campos obrigatórios primeiro!"); return; }
    saidaSegura = true;
    localStorage.setItem("navegandoInternamente", "true");
    setTimeout(() => { window.location.replace("/loading"); }, 50);
  };

  // Links internos
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (link?.href && link.href.includes(window.location.origin)) {
      saidaSegura = true;
      localStorage.setItem("navegandoInternamente", "true");
    }
  });
})();
