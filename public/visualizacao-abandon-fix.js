
// ONE-TIME + EXIT ONLY - visualizar.html (exact curriculo-abandon-fix.js pattern)  
(function() {
  let abandonoVisualizado = false;
  let paginaVisivel = document.visibilityState === 'visible';
  let goingToLoading = false;
  

  document.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button && (button.onclick.toString().includes('voltarParaCurriculo') || button.onclick.toString().includes('redirecionarParaLoading') || button.id === 'btnGerarPdf')) {
      goingToLoading = true;
      localStorage.setItem("navegandoInternamente", "true");
      setTimeout(() => { goingToLoading = false; localStorage.removeItem("navegandoInternamente"); }, 5000);
    }
  });
  
  // Track visibility changes
  document.addEventListener('visibilitychange', function() {
    paginaVisivel = document.visibilityState === 'visible';
  });
  
  // REAL abandonment ONLY (F5/close/minimize) - ROBUSTO
  window.addEventListener('beforeunload', function(e) {
    // Verificação ROBUSTA: localStorage primeiro
    if (localStorage.getItem("navegandoInternamente") === "true" || goingToLoading) {
      return; // Bloqueia 100% navegações legítimas
    }
    if (!abandonoVisualizado && paginaVisivel) {
      abandonoVisualizado = true;
      enviarLog('Abandonou na Visualização');
    }
  });
})();

