// 🖨️ Renderização de PDF a partir do HTML do currículo (Opção C).
//
// O PDF é gerado a partir do mesmo HTML da pré-visualização
// (lib/renderHTML.js), tornando a visualização a FONTE ÚNICA DE VERDADE.
//
// O Chromium (Puppeteer) é inicializado de forma LAZY (só quando há um
// download) e reutilizado entre chamadas. Se o Puppeteer não estiver
// disponível ou falhar, os chamadores devem usar o fallback (pdfkit).
//
// Em ambientes com pouca memória (ex.: plano free do Render), o Chromium
// pode não estar disponível — por isso o carregamento é tolerante.

let browserPromise = null;

function loadPuppeteer() {
  try {
    // eslint-disable-next-line global-require
    return require("puppeteer");
  } catch (e) {
    return null;
  }
}

// Obtém (ou inicializa) o browser de forma compartilhada.
async function getBrowser() {
  const puppeteer = loadPuppeteer();
  if (!puppeteer) return null;
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    }).catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

// Converte um HTML completo em PDF (Buffer). Retorna null em caso de falha.
async function htmlParaPDF(html) {
  const browser = await getBrowser();
  if (!browser) return null;
  const page = await browser.newPage();
  try {
    // O HTML do currículo é estático (sem recursos externos de rede).
    // "load" é suficiente e muito mais rápido/confiável que "networkidle0",
    // evitando timeouts ao gerar o PDF a partir do mesmo HTML do preview.
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.emulateMediaType("print");
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(buffer);
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { htmlParaPDF, getBrowser };
