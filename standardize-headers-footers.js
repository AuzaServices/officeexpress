/**
 * Office Express - Standardize Headers & Footers
 * Script Node.js para padronizar cabeçalhos e rodapés em todos os arquivos HTML
 * 
 * Como usar: node standardize-headers-footers.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const EXCEPTIONS = ['painel.html', 'loading.html', 'parceiros.html', 'login-parceiro.html', 'login.html'];

// Arquivos que ja tem header/footer proprio no index.html
const OWN_DESIGN = ['index.html'];

// Header padrao
const HEADER = `  <!-- HEADER -->
  <header class="cabecalho">
    <div class="container">
      <div class="wrap">
        <a href="/" class="logo-link" aria-label="Voltar para o inicio">
          <img src="https://i.imgur.com/HjzGCoA.png" alt="Office Express" class="logo" />
        </a>
        <nav class="menu">
          <a href="/contato">Contato</a>
          <a href="/sobre">Sobre nos</a>
        </nav>
        <button class="hamburguer" id="btnMenu" aria-label="Abrir menu" aria-expanded="false">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- MOBILE MENU -->
  <div id="mobileMenu">
    <div>
      <a href="/contato">Contato</a>
      <a href="/sobre">Sobre nos</a>
    </div>
  </div>
`;

// Footer padrao
const FOOTER = `  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="https://i.imgur.com/HjzGCoA.png" alt="Office Express" class="logo" />
        <p>A Office Express e uma plataforma digital que usa inteligencia artificial para criar curriculos profissionais, ajudando pessoas a se destacar no mercado de trabalho.</p>
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

      <div class="footer-column">
        <h4>Menu Rapido</h4>
        <ul>
          <li><a href="/">Inicio</a></li>
          <li><a href="/curriculo">Criar Curriculo</a></li>
          <li><a href="/analise">Analisar Curriculo</a></li>
          <li><a href="/contato">Contato</a></li>
          <li><a href="/sobre">Sobre Nos</a></li>
        </ul>
      </div>

      <div class="footer-column">
        <h4>Servicos</h4>
        <ul>
          <li><a href="/curriculo">Curriculo Profissional</a></li>
          <li><a href="/analise">Analise de Curriculo</a></li>
          <li><a href="/indicacao">Indique e Ganhe</a></li>
        </ul>
      </div>

      <div class="footer-column">
        <h4>Institucional</h4>
        <ul>
          <li><a href="/politica" target="_blank">Politica de Privacidade</a></li>
          <li><a href="/termos" target="_blank">Termos de Uso</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container">
        <p>2026 <a href="/">Office Express</a>. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
`;

// Scripts JS do mobile menu
const MOBILE_MENU_SCRIPT = `
  <script>
    (function() {
      var btnMenu = document.getElementById('btnMenu');
      var mobileMenu = document.getElementById('mobileMenu');
      
      if (btnMenu && mobileMenu) {
        btnMenu.addEventListener('click', function(e) {
          e.stopPropagation();
          var isOpen = mobileMenu.classList.toggle('open');
          btnMenu.setAttribute('aria-expanded', isOpen);
          btnMenu.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });

        var lastScroll = 0;
        window.addEventListener('scroll', function() {
          var currentScroll = window.pageYOffset || document.documentElement.scrollTop;
          if (currentScroll > lastScroll && currentScroll > 150) {
            mobileMenu.classList.remove('open');
            btnMenu.setAttribute('aria-expanded', 'false');
            btnMenu.innerHTML = '<i class="fas fa-bars"></i>';
          }
          lastScroll = currentScroll <= 0 ? 0 : currentScroll;
        }, { passive: true });
      }
    })();
  </script>
`;

// Funcao para verificar se e uma pagina de excecao
function isException(filename) {
  return EXCEPTIONS.includes(filename);
}

// Funcao para verificar se ja tem design proprio
function hasOwnDesign(filename) {
  return OWN_DESIGN.includes(filename);
}

// Funcao para extrair o conteudo principal entre header e footer
function extractMainContent(content) {
  let mainContent = content;
  
  // Remove header existente
  mainContent = mainContent.replace(/<header[\s\S]*?<\/header>\s*/gi, '\n');
  
  // Remove footer existente
  mainContent = mainContent.replace(/<footer[\s\S]*?<\/footer>\s*/gi, '\n');
  
  // Remove #mobileMenu existente
  mainContent = mainContent.replace(/<div id="mobileMenu"[\s\S]*?<\/div>\s*/gi, '');
  
  // Remove institucional-section
  mainContent = mainContent.replace(/<section class="institucional-section"[\s\S]*?<\/section>\s*/gi, '');
  
  // Remove old footer.rodape
  mainContent = mainContent.replace(/<footer class="rodape"[\s\S]*?<\/footer>\s*/gi, '');
  
  // Limpa linhas vazias multiplas
  mainContent = mainContent.replace(/\n{3,}/g, '\n\n');
  
  return mainContent.trim();
}

// Funcao para processar um arquivo HTML
function processFile(filepath) {
  const filename = path.basename(filepath);
  
  // Verifica excecoes
  if (isException(filename)) {
    console.log('  Pulando (excecao): ' + filename);
    return;
  }
  
  // Verifica se tem design proprio
  if (hasOwnDesign(filename)) {
    console.log('  Pulando (design proprio): ' + filename);
    return;
  }
  
  console.log('  Processando: ' + filename);
  
  // Le o arquivo
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Extrai o conteudo principal (remove header/footer antigos)
  let mainContent = extractMainContent(content);
  
  // Encontra a posicao do <body> e </body>
  const bodyOpenMatch = mainContent.match(/<body[^>]*>/i);
  const bodyCloseMatch = mainContent.match(/<\/body>/i);
  
  if (!bodyOpenMatch || !bodyCloseMatch) {
    console.log('    Estrutura body nao encontrada, pulando...');
    return;
  }
  
  const bodyOpenPos = mainContent.indexOf(bodyOpenMatch[0]);
  const bodyClosePos = mainContent.indexOf(bodyCloseMatch[0]);
  
  // Separa o conteudo antes do body, o body e depois do body
  const beforeBody = mainContent.substring(0, bodyOpenPos + bodyOpenMatch[0].length);
  const afterBody = mainContent.substring(bodyClosePos);
  const bodyContent = mainContent.substring(bodyOpenPos + bodyOpenMatch[0].length, bodyClosePos).trim();
  
  // Adiciona padding ao body
  let newBodyOpen = bodyOpenMatch[0];
  if (!newBodyOpen.includes('padding-top')) {
    if (newBodyOpen.includes('style="')) {
      newBodyOpen = newBodyOpen.replace(/style="([^"]*)"/gi, 'style="$1 padding-top: 80px;"');
    } else {
      newBodyOpen = newBodyOpen.replace('<body', '<body style="padding-top: 80px;"');
    }
  }
  
  // Monta o novo conteudo
  let newContent = beforeBody.replace(bodyOpenMatch[0], newBodyOpen);
  newContent += '\n\n' + HEADER + '\n\n';
  newContent += bodyContent + '\n\n';
  newContent += FOOTER + '\n';
  newContent += MOBILE_MENU_SCRIPT + '\n';
  newContent += afterBody;
  
  // Remove script components.js se existir
  newContent = newContent.replace(/<script src="\/components\.js"><\/script>/gi, '');
  
  // Salva o arquivo
  fs.writeFileSync(filepath, newContent, 'utf8');
  
  console.log('    Concluido!');
}

// Funcao principal
function main() {
  console.log('\n=== Iniciando padronizacao de headers e footers ===\n');
  
  // Lista todos os arquivos HTML na pasta public
  const files = fs.readdirSync(PUBLIC_DIR).filter(file => file.endsWith('.html'));
  
  console.log('Encontrados ' + files.length + ' arquivos HTML\n');
  
  let processed = 0;
  let skipped = 0;
  
  files.forEach(file => {
    const filepath = path.join(PUBLIC_DIR, file);
    
    try {
      if (isException(file) || hasOwnDesign(file)) {
        skipped++;
        console.log('  Pulando: ' + file + ' (excecao ou design proprio)');
      } else {
        processFile(filepath);
        processed++;
      }
    } catch (error) {
      console.error('    Erro ao processar ' + file + ':', error.message);
    }
  });
  
  console.log('\n=== Padronizacao concluida! ===');
  console.log('   Arquivos processados: ' + processed);
  console.log('   Arquivos pulados: ' + skipped + '\n');
}

// Executa o script
main();

