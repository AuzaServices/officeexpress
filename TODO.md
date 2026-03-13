# OfficeExpress Flow Fix - TODO
Status: 🔄 In Progress (0/6 complete)

## Approved Plan Steps:

### 1. ✅ index.html - Fix "Digitando..." event  
- Copied visualizar.html pattern ✅  
- Fixed modal timing ✅
- Copy visualizar.html pattern  
- Fix modal button race condition  
- ✅ Test: Modal → "Digitando..." in painel.html

### 2. [ ] curriculo.html - Fix "Vizualizado" log
- Add `enviarLog('Vizualizado')` in final redirect  
- Set `navegandoInternamente=true` flag  
- ✅ Test: Finish → "Vizualizado" (not abandonment)

### 3. ✅ loading.html - Fix redirect abandonment  
- Added prevention flags before redirect ✅  
- No more false abandonment logs
- Set `localStorage.setItem("navegandoInternamente", "true")`  
- Disable `loadingIniciado=false` before redirect  
- ✅ Test: Loading → pagamento (no "Abandonou Loading")

### 4. ✅ pagamento.html - Fix "Pagamento" button/log  
- Fixed onload to 'Pagamento' ✅  
- Cleaned button HTML + onclick works ✅  
- Added abandonment protection ✅
- Fix `onload="enviarLog('Pagamento')"`  
- Complete button: `onclick="enviarLog('Pagamento'); copiarPix()"`  
- Add abandonment protection  
- ✅ Test: Copy Pix → "Pagamento" in painel.html

### 5. [ ] script.js - Consistent flag handling
- Ensure `navegandoInternamente` works across all pages  
- ✅ Test: Full flow prevention

### 6. [ ] Full Flow Test
- index → curriculo → visualizar → loading → pagamento  
- ✅ Verify ALL logs: Digitando → Vizualizado → Loading → Pagamento  
- ✅ No unwanted abandonments

## Completion Criteria:
- ✅ All 6 checkboxes marked  
- ✅ End-to-end flow logged correctly in painel.html  
- ✅ Execute `attempt_completion`

**Next:** Step 1 - index.html edits

