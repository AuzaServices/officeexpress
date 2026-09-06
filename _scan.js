const s = require('fs').readFileSync('c:/Users/andri/OneDrive/Desktop/Sites/OfficeExpress/public/companies.html', 'utf8');
let i = s.indexOf('id="viewForm"');
console.log(s.slice(i, i + 3200));
