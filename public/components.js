/**
 * Office Express - Components Loader
 * Carrega o cabeçalho e rodapé padrão em todas as páginas
 */

document.addEventListener('DOMContentLoaded', function() {
  // Executa em todas as páginas exceto as exceções
  const currentPage = window.location.pathname;
  const exceptions = ['/painel.html', '/parceiros.html', '/login-parceiro.html', '/login.html', '/index.html', '/'];
  
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

  <!-- Mobile Menu (drawer lateral direito) -->
  <div id="menuOverlay"></div>
  <nav id="mobileMenu" aria-label="Menu móvel">
    <div class="mobile-menu-inner">
      <a href="/">Início</a>
      <div class="nav-dropdown mobile-nav-group">
        <a href="/modelos" class="nav-dropdown-trigger">Curriculum<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="nav-dropdown-menu mobile-nav-sub">
          <a href="/modelos">Modelos</a>
          <a href="/analise">Análise de Currículo (Gratuito)</a>
        </div>
      </div>
      <div class="nav-dropdown mobile-nav-group">
        <a href="#" class="nav-dropdown-trigger">Ferramentas<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></a>
        <div class="nav-dropdown-menu mobile-nav-sub">
          <a href="/cartas">Gerar carta de apresentação</a>
        </div>
      </div>
      <a href="/contato">Contato</a>
      <a href="/sobre">Sobre nós</a>
      <div class="menu-rodape">
        <div class="menu-social">
          <a href="https://wa.me/5585991340658" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
          <a href="https://www.instagram.com/office.express/" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="https://twitter.com/instrutorpro" target="_blank" rel="noopener" aria-label="X/Twitter"><i class="fab fa-x-twitter"></i></a>
          <a href="https://www.facebook.com/profile.php?id=61580236144303" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
        </div>
        <p class="menu-copy">© 2026 Office Express. Todos os direitos reservados.</p>
      </div>
    </div>
  </nav>
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
          <li><a href="/modelos">Criar Currículo</a></li>
          <li><a href="/analise">Analisar Currículo</a></li>
          <li><a href="/contato">Contato</a></li>
          <li><a href="/sobre">Sobre Nós</a></li>
        </ul>
      </div>

      <!-- Services -->
      <div class="footer-column">
        <h4>Serviços</h4>
        <ul>
          <li><a href="/modelos">Currículo Profissional</a></li>
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
  const overlay = document.getElementById('menuOverlay');

  if (btnMenu && mobileMenu) {
    // Converte o ícone FontAwesome em hambúrguer animado de 3 traços
    btnMenu.innerHTML = '<span></span><span></span><span></span>';
    btnMenu.classList.add('hamburguer');

    const setMenu = (abrir) => {
      mobileMenu.classList.toggle('open', abrir);
      if (overlay) overlay.classList.toggle('open', abrir);
      btnMenu.classList.toggle('aberto', abrir);
      btnMenu.setAttribute('aria-expanded', abrir);
      document.body.style.overflow = abrir ? 'hidden' : '';
    };

    btnMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!mobileMenu.classList.contains('open'));
    });
    if (overlay) overlay.addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
    });
    // Fecha ao navegar por qualquer link do menu (exceto triggers de acordeão)
    mobileMenu.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && !link.classList.contains('nav-dropdown-trigger')) setMenu(false);
    });
    // Acordeão: sublinks só abrem ao tocar no item com a seta
    mobileMenu.querySelectorAll('.mobile-nav-group > a').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        trigger.closest('.mobile-nav-group').classList.toggle('expandido');
      });
    });
  }
}