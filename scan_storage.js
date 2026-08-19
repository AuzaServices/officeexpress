const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public';
for (const f of fs.readdirSync(dir)) {
  if (!/\.(html|js)$/.test(f)) continue;
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = s.split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    if (/setItem\(["']curriculo["']|removeItem\(["']curriculo["']|setItem\(["']curriculo,|salvarDados\(\)/.test(l)) {
      hits.push((i + 1) + ': ' + l.trim().slice(0, 90));
    }
  });
  if (hits.length) {
    console.log('== ' + f + ' ==');
    hits.forEach(h => console.log('  ' + h));
  }
}
