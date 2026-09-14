const fs = require('fs');
const p = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/painel.html', 'utf8');
// onde está o botão "limparPedidos" e a rota DELETE
let x = -1;
while ((x = p.indexOf('limparPedidos', x + 1)) !== -1) console.log('@' + x, JSON.stringify(p.slice(x - 80, x + 60).split('\n').pop()));
const s = fs.readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/server.js', 'utf8');
const j = s.indexOf('app.delete("/api/admin/pedidos"');
console.log('---DELETE /api/admin/pedidos---');
console.log(s.slice(j, j + 300));
// há DELETE por id?
const k = s.indexOf('app.delete("/api/admin/pedidos/:id"');
console.log('DELETE por id:', k > -1 ? s.slice(k, k + 400) : 'NÃO EXISTE');
