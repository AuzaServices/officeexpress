/**
 * Office Express - Components Loader
 * Carrega o cabeçalho e rodapé padrão em todas as páginas
 */

document.addEventListener('DOMContentLoaded', function() {
  // Executa em todas as páginas exceto as exceções
  const currentPage = window.location.pathname;
  const exceptions = ['/painel.html', '/loading.html', '/parceiros.html', '/login-parceiro.html', '/login.html', '/index.html', '/'];
  
  // Verifica se a página atual não está na lista de exceções
  const isException = exceptions.some(exc => currentPage === exc || currentPage.endsWith(exc));
  
  if (!isException) {
    // Adiciona padding ao body para evitar que o conteúdo fique atrás do header fixo
    document.body.style.paddingTop = '66px';
    
    loadHeader();
    loadFooter();
    setupMobileMenu();
  }
});

/**
 * Carrega o cabeçalho padrão
 */
function loadHeader() {
  const headerHTML = `
  <header class="cabecalho">
    <div class="container">
      <div class="wrap">
        <a href="/" class="logo-link" aria-label="Voltar para o início">
          <img src="https://i.imgur.com/HjzGCoA.png" alt="Office Express" class="logo" />
        </a>
        <nav class="menu">
          <a href="/contato">Contato</a>
          <a href="/sobre">Sobre nós</a>
        </nav>
        <button class="hamburguer" id="btnMenu" aria-label="Abrir menu" aria-expanded="false">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Mobile Menu -->
  <div id="mobileMenu">
    <div>
      <a href="/contato">Contato</a>
      <a href="/sobre">Sobre nós</a>
    </div>
  </div>
  `;

  // Insere o header no início do body
  document.body.insertAdjacentHTML('afterbegin', headerHTML);
}

/**
 * Carrega o rodapé padrão
 */
function loadFooter() {
  const footerHTML = `
  <!-- Footer -->
  <footer class="footer">
    <div class="footer-grid">
      <!-- Brand Column -->
      <div class="footer-brand">
        <img src="https://i.imgur.com/HjzGCoA.png" alt="Office Express" class="logo" />
        <p>A Office Express é uma plataforma digital que usa inteligência artificial para criar currículos profissionais, ajudando pessoas a se destacar no mercado de trabalho.</p>
        <div class="social-links">
          <a href="https://wa.me/5585991340658" target="_blank" aria-label="WhatsApp" rel="noopener">
            <i class="fab fa-whatsapp"></i>
          </a>
          <a href="https://www.instagram.com/office.express/" target="_blank" aria-label="Instagram" rel="noopener">
            <i class="fab fa-instagram"></i>
          </a>
          <a href="https://twitter.com/instrutorpro" target="_blank" aria-label="X/Twitter" rel="noopener">
            <i class="fab fa-x-twitter"></i>
          </a>
          <a href="https://www.facebook.com/profile.php?id=61580236144303" target="_blank" aria-label="Facebook" rel="noopener">
            <i class="fab fa-facebook-f"></i>
          </a>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="footer-column">
        <h4>Menu Rápido</h4>
        <ul>
          <li><a href="/">Início</a></li>
          <li><a href="/curriculo">Criar Currículo</a></li>
          <li><a href="/analise">Analisar Currículo</a></li>
          <li><a href="/contato">Contato</a></li>
          <li><a href="/sobre">Sobre Nós</a></li>
        </ul>
      </div>

      <!-- Services -->
      <div class="footer-column">
        <h4>Serviços</h4>
        <ul>
          <li><a href="/curriculo">Currículo Profissional</a></li>
          <li><a href="/analise">Análise de Currículo</a></li>
          <li><a href="/indicacao">Indique e Ganhe</a></li>
          <li><a href="/faq">FAQ</a></li>
        </ul>
      </div>

      <!-- Legal -->
      <div class="footer-column">
        <h4>Institucional</h4>
        <ul>
          <li><a href="/politica" target="_blank">Política de Privacidade</a></li>
          <li><a href="/termos" target="_blank">Termos de Uso</a></li>
          <li><a href="/login">Área do Parceiro</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container">
        <p>© 2026 <a href="/">Office Express</a>. Todos os direitos reservados. Feito com <i class="fas fa-heart" style="color: var(--brand);"></i> no Brasil</p>
      </div>
    </div>
  </footer>
  `;

  // Insere o footer antes do fechamento do body
  document.body.insertAdjacentHTML('beforeend', footerHTML);
}

/**
 * Configura o menu mobile
 */
function setupMobileMenu() {
  const btnMenu = document.getElementById('btnMenu');
  const mobileMenu = document.getElementById('mobileMenu');

  if (btnMenu && mobileMenu) {
    btnMenu.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = mobileMenu.classList.toggle('open');
      btnMenu.setAttribute('aria-expanded', isOpen);
      btnMenu.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });

    // Fecha ao rolar
    let lastScroll = 0;
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > lastScroll && currentScroll > 150) {
        mobileMenu.classList.remove('open');
        btnMenu.setAttribute('aria-expanded', 'false');
        btnMenu.innerHTML = '<i class="fas fa-bars"></i>';
      }
      lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });
  }
}

