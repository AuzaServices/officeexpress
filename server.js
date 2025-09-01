// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Instancia o Mercado Pago com a Access Token
const mercadopago = new MercadoPagoConfig({
  accessToken: 'APP_USR-7234319205572495-090113-51bcd26585f2b286e57738e30f58bf12-2659262227' // substitui pela tua token real
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para criar preferência de pagamento via Pix
app.post('/criar-preferencia', async (req, res) => {
  try {
    const { valor } = req.body;

    const preference = {
      items: [
        {
          title: 'Currículo PDF',
          description: 'Download do currículo em PDF',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(valor) || 5.00
        }
      ],
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'ticket' }
        ],
        default_payment_method_id: 'pix'
      },
      back_urls: {
        success: 'https://teusite.com/sucesso',
        failure: 'https://teusite.com/erro',
        pending: 'https://teusite.com/pendente'
      },
      auto_return: 'approved'
    };

    const response = await mercadopago.preference.create({ body: preference });
    res.json({ init_point: response.init_point });
  } catch (err) {
    console.error('Erro ao criar preferência:', JSON.stringify(err.response?.data || err.message, null, 2));
    res.status(500).json({ error: 'Erro ao criar preferência: resposta inválida da API' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});