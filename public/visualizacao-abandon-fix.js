
// ONE-TIME + EXIT ONLY - visualizar.html (exact curriculo-abandon-fix.js pattern)  
(function() {
  let abandonoVisualizado = false;
  let paginaVisivel = document.visibilityState === 'visible';
  let goingToLoading = false;
  

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[onclick*="voltarParaCurriculo"]');
    const pdfBtn = e.target.closest('[onclick*="redirecionarParaLoading"]');
    if (editBtn || pdfBtn) {
      goingToLoading = true;
    }
  });
  
  // Track visibility changes
  document.addEventListener('visibilitychange', function() {
    paginaVisivel = document.visibilityState === 'visible';
  });
  
  // REAL abandonment ONLY (F5/close/minimize)
  window.addEventListener('beforeunload', function(e) {
    if (!abandonoVisualizado && paginaVisivel && !goingToLoading) {
      abandonoVisualizado = true;
      enviarLog('Abandonou na Visualização');
    }
  });
})();

