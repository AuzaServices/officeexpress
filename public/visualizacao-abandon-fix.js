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
      // 6 métodos de detecção
      const onclickAttr = targetBtn.getAttribute('onclick') || '';
      const onclickFn = targetBtn.onclick ? targetBtn.onclick.toString() : '';
      const btnId = targetBtn.id;
      const btnClass = targetBtn.className;
      const btnText = targetBtn.textContent.trim().toLowerCase();
      const parentClass = targetBtn.parentElement ? targetBtn.parentElement.className : '';

      const isLegitNav = onclickAttr.includes('voltarParaCurriculo') ||
                        onclickFn.includes('voltarParaCurriculo') ||
                        onclickAttr.includes('redirecionar') ||
                        onclickFn.includes('redirecionar') ||
                        onclickAttr.includes('loading') ||
                        btnId === 'btnGerarPdf' ||
                        btnText.includes('editar') ||
                        btnText.includes('pdf') ||
                        btnText.includes('gerar') ||
                        btnClass.includes('btn-pdf') ||
                        parentClass.includes('botoes-flutuantes') ||
                        parentClass.includes('linha-botoes');
      
      if (isLegitNav) {
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
    
    if (safeNavigationActive || localSafe) {
      return; // Bloqueia APENAS navegação legítima Editar/PDF
    }
    
    // FECHAR PÁGINA (X button/F5/tab close) SEMPRE loga se página visível
    if (paginaVisivel && !abandonoVisualizado) {
      abandonoVisualizado = true;
      enviarLog('Abandonou na Visualização - Fechou página');
    }
  });

  // Sync state on load
  if (localStorage.getItem('OFFICEEXPRESS_SAFE_VISUALIZACAO') === 'ACTIVE') {
    activateSafeMode();
  }
})();

