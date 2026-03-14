(function() {
  let abandonouCurriculo = false;
  let paginaVisivel = document.visibilityState === 'visible';
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

  // Marcar navegação interna legítima
  document.addEventListener('click', (e) => {
    const avancarBtn = e.target.closest('#avancar');
    if (avancarBtn && avancarBtn.textContent.includes('Finalizar')) {
      localStorage.setItem('navegandoInternamente', 'true');
    }

    const editarBtn = e.target.closest('button');
    if (editarBtn && editarBtn.textContent.toLowerCase().includes('editar')) {
      localStorage.setItem('navegandoInternamente', 'true');
    }

    const linkInterno = e.target.closest('a[href]');
    if (linkInterno && linkInterno.href.includes(window.location.origin)) {
      localStorage.setItem('navegandoInternamente', 'true');
    }
  });

  // BEFOREUNLOAD
window.addEventListener('beforeunload', function(e) {
  const navegandoInternamente = localStorage.getItem('navegandoInternamente') === 'true';
  if (!abandonouCurriculo && paginaVisivel && !navegandoInternamente) {
    abandonouCurriculo = true;
    enviarLog('Abandonou Digitando');
  }
});

})();
