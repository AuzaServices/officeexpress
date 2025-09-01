const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Mercado Pago com variável de ambiente
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-4a680e3f-7155-4f06-ace7-dfcad4fa7d5a'
});

// Rota de pagamento
app.post('/criar-preferencia', async (req, res) => {
  try {
    const preference = {
      items: [{
        title: 'Download do Currículo em PDF',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: 2.00
      }],
      back_urls: {
        success: 'https://officeexpress.onrender.com/sucesso.html',
        failure: 'https://officeexpress.onrender.com/erro.html',
        pending: 'https://officeexpress.onrender.com/pendente.html'
      },
      auto_return: 'approved'
    };

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create(preference);

    // Verifica se o init_point existe
    if (!response || !response.init_point) {
      throw new Error('init_point não retornado pela API do Mercado Pago');
    }

    res.json({ init_point: response.init_point });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro ao criar preferência' }); // Retorna JSON válido
  }
});

// Porta dinâmica para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});