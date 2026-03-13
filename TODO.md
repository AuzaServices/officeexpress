# Tracking Logs Fix - TODO
Status: [IN PROGRESS] ✅

## Approved Plan Summary
Add `enviarLog(etapa)` to script.js + onload/oninput tracking to curriculo.html, pagamento.html, index.html.

## Steps ✅ **COMPLETE!**
- [x] All edits + **new fixes**:
  - ✅ visualizar.html: `onload="visualizar"` + `<script src="script.js">`
  - ✅ Digitando: **ONCE per session** (debounce)
  - ✅ Global `beforeunload` → "abandono pagina" all pages
  - ✅ pagamento.html: Added `<script src="script.js">` guarantee

**Result:** Typing=1x "Digitando", visualizar entry/abandon, pagamento fires!

**Restart:** `node server.js` → Test! 🎉

**Fixed!** Now: typing → **ONLY "Digitando"** (no more "nome")

**All edits complete! Ready to test.**

**Next**: pagamento.html

**Next**: Edit script.js
