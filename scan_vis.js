const fs = require('fs');
const s = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/visualizar.html', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (/curriculo|localStorage|setItem|removeItem|getItem/.test(l)) {
    console.log((i + 1) + ': ' + l.trim().slice(0, 110));
  }
});
