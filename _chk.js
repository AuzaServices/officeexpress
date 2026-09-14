const fs=require('fs');
const c=fs.readFileSync('public/cadastro.html','utf8');
const re=/getElementById\(.codigo.\)/g;
let m;
while((m=re.exec(c))) console.log('codigo ref at index', m.index);
console.log('old keydown listener present:', c.indexOf('codigo").addEventListener("keydown')>-1);
console.log('otpValor defined:', c.indexOf('function otpValor')>-1);
console.log('otpAutoEnviar defined:', c.indexOf('function otpAutoEnviar')>-1);
