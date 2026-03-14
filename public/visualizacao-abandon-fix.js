// ULTIMATE ROBUSTO - NUNCA falha em bloquear Editar, SEMPRE pega real abandono
(function() {
  'use strict';
  
  let abandonoVisualizado = false;
  let paginaVisivel = document.visibilityState === 'visible';
  let safeNavigationActive = false;
  let safeTimer = null;
  
  const activateSafeMode = () => {
    safeNavigationActive = true;
    localStorage.setItem('OFFICEEXPRESS_SAFE_VISUALIZACAO', 'ACTIVE');
    if (safeTimer) clearTimeout(safeTimer);
    safeTimer = setTimeout(() => {
      safeNavigationActive = false;
      localStorage.removeItem('OFFICEEXPRESS_SAFE_VISUALIZACAO');
    }, 15000); // 15s generoso
  };

  // CLICK LISTENER MEGA-ROBUSTO - capture phase
document.addEventListener('click', function(e) {
  const targetBtn = e.target.closest('button');
  if (targetBtn) {
    const btnText = targetBtn.textContent.trim().toLowerCase();
    if (btnText.includes('editar') || btnText.includes('pdf') || btnText.includes('gerar')) {
      localStorage.setItem('navegandoInternamente', 'true');
      activateSafeMode();
    }
  }
}, true);


  document.addEventListener('visibilitychange', () => {
    paginaVisivel = document.visibilityState === 'visible';
  });

  // BEFOREUNLOAD NUCLEAR - FECHA PÁGINA SEMPRE loga (exceto navegação legítima)
window.addEventListener('beforeunload', function(e) {
  const localSafe = localStorage.getItem('OFFICEEXPRESS_SAFE_VISUALIZACAO') === 'ACTIVE';
  const navegandoInternamente = localStorage.getItem('navegandoInternamente') === 'true';

  if (safeNavigationActive || localSafe || navegandoInternamente) {
    return; // não dispara log em navegação interna
  }

  if (paginaVisivel && !abandonoVisualizado) {
    abandonoVisualizado = true;
    enviarLog('Abandonou na Visualização - Fechou página');
  }
});

window.addEventListener("pagehide", function(e) {
  const navegandoInternamente = localStorage.getItem("navegandoInternamente") === "true";
  if (!navegandoInternamente) {
    enviarLog("Abandonou na Visualização - Fechou página");
  }
});



  // Sync state on load
  if (localStorage.getItem('OFFICEEXPRESS_SAFE_VISUALIZACAO') === 'ACTIVE') {
    activateSafeMode();
  }
})();

