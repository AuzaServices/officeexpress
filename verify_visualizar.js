const fs = require('fs');
const s = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/visualizar.html', 'utf8');
const checks = [
  'getItem("curriculo")',
  'dados.telefone',
  'dados.curso',
  'dados.empresa',
  'redirecionarParaLoading',
  'html2canvas',
  'verificarErros',
];
for (const c of checks) {
  console.log((s.includes(c) ? 'OK  ' : 'MISS ') + c);
}
console.log('total chars:', s.length);
