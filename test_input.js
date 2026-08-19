const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/curriculo.html', 'utf8');
const scriptJs = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/script.js', 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/curriculo',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.eval(scriptJs); } catch (e) { console.log('ERRO script.js:', e.message); }
  },
});

const { window } = dom;

setTimeout(() => {
  const d = window.document;
  const nome = d.getElementById('nome');

  // Simula digitacao real no campo nome (dispara evento input que borbulha ate o form)
  nome.value = 'Carlos Pereira';
  nome.dispatchEvent(new window.Event('input', { bubbles: true }));

  // Verifica se o listener salvou
  const ls = JSON.parse(window.localStorage.getItem('curriculo') || '{}');
  console.log('Apos digitar nome, localStorage.nome =', JSON.stringify(ls.nome));

  // Simula digitar email
  const email = d.getElementById('email');
  email.value = 'carlos@email.com';
  email.dispatchEvent(new window.Event('input', { bubbles: true }));

  const ls2 = JSON.parse(window.localStorage.getItem('curriculo') || '{}');
  console.log('Apos digitar email, localStorage.email =', JSON.stringify(ls2.email));

  // Simula o clique em "Adicionar Curso" (botao que chama adicionarCurso() via onclick)
  if (typeof window.adicionarCurso === 'function') {
    window.adicionarCurso('Excel', 'SENAC', '40h');
  }

  const ls3 = JSON.parse(window.localStorage.getItem('curriculo') || '{}');
  console.log('Apos adicionarCurso, localStorage.curso =', JSON.stringify(ls3.curso));

  window.close();
}, 300);
