(function() {
  'use strict';

  let logEnviadoVisualizar = false;
  let visualizarAtivo = true;
  let entradaViaSplash = localStorage.getItem("entradaViaSplash") === "true";

  // Função única de abandono
  function enviarAbandonoVisualizar() {
    if (logEnviadoVisualizar || !entradaViaSplash || !visualizarAtivo) return;
    logEnviadoVisualizar = true;
    enviarLog("Abandonou na Visualização");
  }

  // Listeners
  window.addEventListener("beforeunload", enviarAbandonoVisualizar);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") enviarAbandonoVisualizar();
  });

  // Botão Editar → marca navegação interna e desativa abandono
  window.voltarParaCurriculo = function() {
    localStorage.setItem("navegandoInternamente", "true");
    visualizarAtivo = false;
    setTimeout(() => { window.location.href = "/curriculo"; }, 50);
  };

  // Botão Gerar PDF → mesma lógica
  window.redirecionarParaLoading = async function() {
    if (temErros) { alert("Preencha os campos obrigatórios primeiro!"); return; }
    visualizarAtivo = false;
    localStorage.setItem("navegandoInternamente", "true");
    setTimeout(() => { window.location.href = "/loading"; }, 50);
  };

  // Links internos → desativa abandono
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (link?.href && link.href.includes(window.location.origin)) {
      visualizarAtivo = false;
    }
  });
})();
