# ✅ Integração Mercado Pago PIX - Office Express

## Progresso

### 1. Backend (`server.js`)
- [x] Instalar SDK `mercadopago` (v3.3.0)
- [x] Configurar `MercadoPagoConfig` com `MP_ACCESS_TOKEN`
- [x] Rotas PIX:
  - [x] `POST /api/pix/criar` → cria cobrança PIX
  - [x] `GET /api/pix/status/:id` → consulta status
  - [x] `POST /api/webhook/pix` → webhook de notificação
- [x] **Corrigir ordem das rotas PIX** (movidas para antes da rota `/:page`)
- [x] **Proteger rota `/:page`** para ignorar caminhos `/api/`
- [x] **Mover handler 404 para o final** (último handler)
- [x] Verificar sintaxe (`node --check`)

### 2. Configuração (`render.yaml` / `.env`)
- [x] Adicionar variáveis de ambiente Mercado Pago ao `render.yaml`
- [ ] **USUÁRIO:** Configurar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET` no dashboard do Render

### 3. Frontend - Currículo
- [x] `loading.html` → gera PDF, salva em `localStorage.curriculoPdf`, redireciona para `/pagamento`
- [x] `pagamento.html` → QR Code Mercado Pago + polling + botão baixar currículo

### 4. Frontend - Outras páginas de pagamento
- [x] `pagamentototal.html` (R$12,50) → QR Code + download
- [x] `pagamentoanalise.html` (R$5,99) → QR Code + download
- [x] `pagamentototalanalise.html` (R$12,50) → QR Code + download

### 5. Página 404
- [x] Criar `public/404.html`
- [x] Handler 404 robusto (com fallback)
- [x] Mover para o final do `server.js`

## 🚀 Deploy necessário
Após essas mudanças, é necessário **fazer o deploy no Render** para que as rotas PIX fiquem ativas em produção.
