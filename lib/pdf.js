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
  if (!puppeteer) {
    console.error("⚠️ Puppeteer não está instalado — PDF será gerado sem o modelo (fallback).");
    return null;
  }
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
        "--disable-extensions",
      ],
    }).catch((err) => {
      browserPromise = null;
      console.error("❌ Falha ao iniciar o Chromium (PDF sem modelo):", err && err.message);
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
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.emulateMediaType("print");
    await page.evaluate(() => document.fonts.ready).catch(() => {});
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

// Captura o HTML do currículo como uma IMAGEM (PNG) em alta resolução.
// Renderiza o mesmo HTML da pré-visualização em um canvas equivalente ao
// html2canvas, garantindo que o arquivo gerado seja IDÊNTICO ao preview.
// deviceScaleFactor alto (3x) mantém o texto nítido mesmo após o zoom.
async function htmlParaImagem(html) {
  const browser = await getBrowser();
  if (!browser) return null;
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    // A4 em px (794x1123) com escala de dispositivo 3x para nitidez.
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 3 });
    await page.emulateMediaType("screen");
    // Espera as fontes do documento carregarem antes de capturar.
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    const el = await page.$(".page");
    if (!el) return null;
    const buffer = await el.screenshot({ type: "png" });
    return Buffer.from(buffer);
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { htmlParaPDF, htmlParaImagem, getBrowser };
