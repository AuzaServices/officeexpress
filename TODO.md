# Análise do Fluxo de Eventos - Office Express

## 📋 Status Atual dos Eventos (Após Análise dos Arquivos)

### ✅ **EVENTOS IMPLEMENTADOS CORRETAMENTE**

1. **index.html - Modal e "Digitando..."**
   - ✅ Modal abre ao clicar "Criar Currículo" (`onclick="abrirModalNome()"`)
   - ❌ `enviarLog('Digitando')` dispara no `oninput` (ERRADO)
   - ❌ **DEVE disparar no clique "Criar meu Currículo"** (`onclick="iniciarCurriculo()"`)
   - ❌ **PARCIAL - CORRIGIR LOCAL DO EVENTO**

2. **curriculo.html - "Visualizou"**
   - ✅ `enviarLog('Vizualizado')` no `onload` da página visualizar.html
   - ✅ Redirecionamento para visualizar.html no botão "Finalizar"
   - ✅ ✅ **TOTALMENTE IMPLEMENTADO**

3. **visualizar.html - "Loading"**
   - ✅ `redirecionarParaLoading()` chama endpoint e redireciona para `/loading`
   - ✅ ✅ **TOTALMENTE IMPLEMENTADO**

4. **script.js - Função `enviarLog()`**
   - ✅ Função global disponível em todas as páginas
   - ✅ ✅ **TOTALMENTE IMPLEMENTADO**

5. **server.js - `/api/logs`**
   - ✅ Recebe e salva todos os logs corretamente
   - ✅ ✅ **TOTALMENTE IMPLEMENTADO**

---

### ⚠️ **EVENTOS PARCIALMENTE IMPLEMENTADOS**

**visualizar.html - Navegação interna detectada:**
- ✅ Detecta cliques em links internos (`navegandoInternamente = true`)
- ✅ Cancela abandono em navegações internas

---

### ❌ **EVENTOS FALTANDO (PRIORIDADE ALTA)**

1. **index.html - "Abandonou Digitando"**
   ```js
   ❌ NÃO EXISTE: Detectar fechamento/abandono do modal enquanto digitando
   ```

2. **visualizar.html - "Abandonou na Visualização"**
   ```js
   ❌ IMPLEMENTAÇÃO ATUAL TEM PROBLEMA:
   - Detecta `beforeunload` e `visibilitychange`
   - MAS envia `'Abandonou a Visualização apos ${tempo}s'` ❌ NOME ERRADO
   - DEVE ser `'Abandonou na Visualização'`
   ```

3. **loading.html - "Abandonou Loading"**
   ```js
   ❌ NÃO EXISTE: Detecção de abandono na página loading.html
   ```

4. **loading.html - Redirecionamento automático**
   ```js
   ❌ NÃO EXISTE: Auto-redirect para pagamento.html após X segundos
   ```

5. **pagamento.html - "Pagamento"**
   ```js
   ❌ NÃO EXISTE: `enviarLog('Pagamento')` no clique "Copiar Pix"
   - ATUAL: só tem `onload="enviarLog('pagamento')"` (minúsculo)
   ```

---

## 🚀 **PLANILHA DE IMPLEMENTAÇÃO**

| Evento | Página | Status | Ação Necessária |
|--------|--------|--------|-----------------|
| `Digitando...` | index.html | ✅ OK | - |
| `Abandonou Digitando` | index.html | ❌ | **[ADICIONAR] Detecção fechamento modal** |
| `Visualizou` | visualizar.html | ✅ OK | - |
| `Abandonou na Visualização` | visualizar.html | ⚠️ | **[CORRIGIR] Nome do log** |
| `Loading` | visualizar.html/loading.html | ✅ OK | - |
| `Abandonou Loading` | loading.html | ❌ | **[ADICIONAR] Detecção abandono** |
| **Auto-redirect pagamento** | loading.html | ❌ | **[ADICIONAR] setTimeout redirect** |
| `Pagamento` | pagamento.html | ❌ | **[ADICIONAR] onclick="enviarLog('Pagamento')`** |

---

## 📝 **PRÓXIMOS PASSOS (Ordem de Prioridade)**

### **PASSO 1: Correções Rápidas (5 min)**
```
1. visualizar.html: Corrigir nome do log de abandono
2. pagamento.html: Adicionar enviarLog('Pagamento') no botão Copiar Pix
```

### **PASSO 2: Implementações Faltantes (15 min)**
```
3. loading.html: Auto-redirect + abandono detection
4. index.html: Abandonou Digitando (beforeunload no modal)
```

### **PASSO 3: Testar Fluxo Completo**
```
1. Criar → Digitando → Abandonou Digitando (X)
2. Criar → Finalizar → Visualizou ✓
3. Visualizar → Abandonou Visualização (X)
4. Visualizar → Loading ✓
5. Loading → Abandonou Loading (X)
6. Loading → Pagamento (auto)
7. Pagamento → Copiar Pix → Pagamento ✓
```

**Tempo estimado total: 25 minutos**

---

## 🔍 **COMANDOS PARA TESTAR DEPOIS**

```bash
# 1. Ver logs no servidor
curl http://localhost:3000/api/logs

# 2. Teste completo do fluxo
# (abra devtools → Network → rode o fluxo completo)
```

**Status geral: 60% implementado ✅ | 40% pendente 🚧**

