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

// Mutex global que serializa a inicialização do Chromium. Sem ele, quando duas
// requisições chegam juntas, ambas chamam `sparticuz.executablePath()` ao mesmo
// tempo — a lib extrai (escreve) o binário em /tmp/chromium enquanto a outra
// ainda está tentando executá-lo, gerando "spawn ETXTBSY" de forma persistente.
let launchLock = { p: Promise.resolve() };

// Mutex que serializa a CAPTURA (renderização + screenshot). Cada captura abre
// uma página no Chromium e gera uma imagem em alta resolução; se várias rodam
// ao mesmo tempo, o consumo de memória estoura em planos com pouca RAM (ex.:
// Render free) e o processo do Chromium é morto — resultando em
// "Page.captureScreenshot: Target closed / Session closed". Uma por vez evita
// o estouro e ainda reusa melhor o processo.
let captureLock = { p: Promise.resolve() };

// Enfileira `fn` atrás de um mutex representado por `lock = { p: Promise }`,
// retornando a Promise de `fn`. Atualiza `lock.p` para a próxima chamada
// esperar esta terminar (serialização FIFO).
function runLocked(lock, fn) {
  const run = lock.p.then(fn, fn);
  lock.p = run.catch(() => {});
  return run;
}

function loadPuppeteer() {
  try {
    // eslint-disable-next-line global-require
    return require("puppeteer");
  } catch (e) {
    return null;
  }
}

// Tenta carregar o @sparticuz/chromium (binário do Chrome com as bibliotecas
// de sistema embutidas). No Render free o `apt-get` é bloqueado (filesystem
// read-only), então o Chrome normal do Puppeteer não sobe por faltarem libs.
// O sparticuz resolve isso porque o binário já inclui as dependências.
function loadSparticuz() {
  try {
    // eslint-disable-next-line global-require
    return require("@sparticuz/chromium");
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

  // Se já existe um browser inicializado (ou em inicialização), reutiliza-o.
  if (browserPromise) return browserPromise;

  // Serializa a extração + launch entre chamadas concorrentes (mutex).
  return runLocked(launchLock, async () => {
    // Re-checa depois de adquirir a trava: outra chamada pode já ter iniciado.
    if (browserPromise) return browserPromise;
    try {
      const sparticuz = loadSparticuz();
      const launchOptions = {
        headless: true,
        timeout: 60000,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--font-render-hinting=none",
          "--disable-gpu",
          "--disable-extensions",
        ],
      };
      if (sparticuz) {
        launchOptions.executablePath = await sparticuz.executablePath();
        // Mescla os args recomendados pelo sparticuz (garantem as flags de
        // sandbox/GPU necessárias no ambiente serverless).
        launchOptions.args = Array.from(new Set([...sparticuz.args, ...launchOptions.args]));
        console.log("✅ Usando @sparticuz/chromium (libs embutidas) em:", launchOptions.executablePath);
      } else {
        const execPath = await puppeteer.executablePath();
        console.log("✅ Chromium (puppeteer) encontrado em:", execPath);
      }
      browserPromise = launchWithRetry(puppeteer, launchOptions).catch((err) => {
        browserPromise = null;
        console.error("❌ Falha ao iniciar o Chromium (PDF sem modelo):", err && err.message);
        throw err;
      });
      return await browserPromise;
    } catch (e) {
      browserPromise = null;
      console.error("❌ Erro ao preparar o Chromium (PDF sem modelo):", e && e.message);
      throw e;
    }
  });
}

// Inicia o Chromium com tentativas. O erro "spawn ETXTBSY" (Text file busy)
// ocorre quando o binário extraído pelo @sparticuz/chromium ainda está sendo
// escrito no disco ao ser executado — algo transitório em filesystem
// temporário (ex.: /tmp em serverless). Algumas tentativas curtas resolvem.
const LAUNCH_RETRIES = 4;
const LAUNCH_RETRY_DELAY_MS = 1500;

// Tentativas para a CAPTURA (screenshot/PDF). Erros "Target closed"/"Session
// closed"/"Protocol error" costumam ser transitórios — a página é derrubada
// por pico de memória no serverless; abrir uma página nova e tentar de novo
// costuma resolver.
const CAPTURE_RETRIES = 3;
const CAPTURE_RETRY_DELAY_MS = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchWithRetry(puppeteer, launchOptions) {
  let lastErr = null;
  for (let attempt = 1; attempt <= LAUNCH_RETRIES; attempt += 1) {
    try {
      return await puppeteer.launch(launchOptions);
    } catch (err) {
      lastErr = err;
      const msg = (err && err.message) || String(err);
      const isETXTBSY = /ETXTBSY|text file busy/i.test(msg);
      if (attempt < LAUNCH_RETRIES && (isETXTBSY || /spawn/i.test(msg))) {
        console.warn(`⚠️ Chromium falhou ao iniciar (tentativa ${attempt}/${LAUNCH_RETRIES}):`, msg);
        await sleep(LAUNCH_RETRY_DELAY_MS * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Converte um HTML completo em PDF (Buffer). Retorna null em caso de falha.
// As capturas são serializadas (mutex) para não estourar a memória do
// serverless com várias páginas do Chromium ao mesmo tempo.
async function htmlParaPDF(html) {
  const browser = await getBrowser();
  if (!browser) return null;
  return runLocked(captureLock, () => capturarPDF(browser, html));
}

async function capturarPDF(browser, html) {
  for (let attempt = 1; attempt <= CAPTURE_RETRIES; attempt += 1) {
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
    } catch (err) {
      const msg = (err && err.message) || String(err);
      if (attempt < CAPTURE_RETRIES && /closed|Target closed|Session closed|Protocol error/i.test(msg)) {
        console.warn(`⚠️ Captura PDF falhou (tentativa ${attempt}/${CAPTURE_RETRIES}):`, msg);
        await sleep(CAPTURE_RETRY_DELAY_MS);
        continue;
      }
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }
}

// Captura o HTML do currículo como uma IMAGEM (PNG) em alta resolução.
// Renderiza o mesmo HTML da pré-visualização em um canvas equivalente ao
// html2canvas, garantindo que o arquivo gerado seja IDÊNTICO ao preview.
// deviceScaleFactor 2x mantém o texto nítido e consome bem menos memória que
// 3x — importante para o Chromium não ser morto no ambiente serverless.
async function htmlParaImagem(html) {
  const browser = await getBrowser();
  if (!browser) return null;
  return runLocked(captureLock, () => capturarImagem(browser, html));
}

async function capturarImagem(browser, html) {
  for (let attempt = 1; attempt <= CAPTURE_RETRIES; attempt += 1) {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "load", timeout: 30000 });
      // A4 em px (794x1123) com escala de dispositivo 2x para nitidez.
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
      await page.emulateMediaType("screen");
      // Espera as fontes do documento carregarem antes de capturar.
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      const el = await page.$(".page");
      if (!el) return null;
      const buffer = await el.screenshot({ type: "png" });
      return Buffer.from(buffer);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      if (attempt < CAPTURE_RETRIES && /closed|Target closed|Session closed|Protocol error/i.test(msg)) {
        console.warn(`⚠️ Captura de imagem falhou (tentativa ${attempt}/${CAPTURE_RETRIES}):`, msg);
        await sleep(CAPTURE_RETRY_DELAY_MS);
        continue;
      }
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }
}

module.exports = { htmlParaPDF, htmlParaImagem, getBrowser };
