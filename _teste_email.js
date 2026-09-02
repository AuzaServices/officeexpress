require("dotenv").config();
const { enviarConviteParceiro, enviarCodigoConvite } = require("./lib/email");

(async () => {
  const destino = process.argv[2];
  if (!destino) { console.log("USO: node _teste_email.js seu@email.com"); process.exit(1); }
  console.log("Enviando e-mail de convite para:", destino);
  const r1 = await enviarConviteParceiro(destino, "Teste Convite", "Office Express", "https://www.officeexpress.com.br/convite?token=TESTE123");
  console.log("Resultado convite:", JSON.stringify(r1));
  const r2 = await enviarCodigoConvite(destino, "Teste Codigo", "1234");
  console.log("Resultado código:", JSON.stringify(r2));
  process.exit(0);
})();
