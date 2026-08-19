const fs = require('fs');
const s = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/curriculo.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (/preview-miniatura|dados\.foto|localStorage|DOMContentLoaded|salvarDados|adicionarCurso|adicionarExperiencia|adicionarTelefone/.test(l)) {
    console.log((i + 1) + ': ' + l.trim().slice(0, 100));
  }
});
