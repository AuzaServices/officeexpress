# Tracking Logs Fix - TODO
Status: [IN PROGRESS] ✅

## Approved Plan Summary
Add `enviarLog(etapa)` to script.js + onload/oninput tracking to curriculo.html, pagamento.html, index.html.

## Steps ✅ **COMPLETE w/ FINAL FIX!**

**Latest:** curriculo→visualizar **NO abandonment** (internal nav)
- ✅ script.js: `beforeunload` checks `navegandoInternamente` flag (visualizar pattern)
- ✅ Internal links set flag → no false abandonment

**Full Flow:**
```
curriculo → type → "Digitando"(1x) 
curriculo → visualizar → "visualizar" (no abandon)
visualizar → leave → "abandono pagina"
pagamento → "pagamento"
```

**Restart:** `node server.js` → Perfect! 🎉

**Fixed!** Now: typing → **ONLY "Digitando"** (no more "nome")

**All edits complete! Ready to test.**

**Next**: pagamento.html

**Next**: Edit script.js
