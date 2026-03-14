// ONE-TIME DIGITING + EXIT ONLY
(function() {
  let abandonouCurriculo = false;
  let paginaVisivel = document.visibilityState === 'visible';
  let goingToVisualizar = false;
  let digitandoLogged = sessionStorage.getItem('digitandoLogged') === 'true';
  
  // ONE-TIME DIGITING LOG
  const nomeInput = document.getElementById('nome');
  if (nomeInput && !digitandoLogged) {
    nomeInput.addEventListener('input', function() {
      if (!digitandoLogged && this.value.length > 0) {
        enviarLog('Digitando'); // FIRST CHAR ONLY
        digitandoLogged = true;
        sessionStorage.setItem('digitandoLogged', 'true');
      }
    }, { once: true });
  }

  
  // Track visibility
  document.addEventListener('visibilitychange', function() {
    paginaVisivel = document.visibilityState === 'visible';
  });
  
  // Block visualizar.html navigation
  document.addEventListener('click', (e) => {
    const avancarBtn = e.target.closest('#avancar');
    if (avancarBtn && avancarBtn.textContent.includes('Finalizar')) {
      goingToVisualizar = true;
    }
  });
  
  window.addEventListener('beforeunload', function(e) {
    if (!abandonouCurriculo && paginaVisivel && !goingToVisualizar) {
      abandonouCurriculo = true;
      enviarLog('Abandonou Digitando');
    }
  });
})();




