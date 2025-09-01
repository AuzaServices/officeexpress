// server.js
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Configura o Mercado Pago com sua Access Token
mercadopago.configure({
  access_token: 'APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' // substitui pela tua token real
});

// Middlewares
app.use(cors());
app.use(express.json());

// Rota para criar preferência de pagamento
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
          unit_price: parseFloat(valor) || 2.00
        }
      ],
      back_urls: {
        success: 'https://seusite.com/sucesso',
        failure: 'https://seusite.com/erro',
        pending: 'https://seusite.com/pendente'
      },
      auto_return: 'approved'
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (err) {
    console.error('Erro ao criar preferência:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao criar preferência: resposta inválida da API' });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('Servidor Mercado Pago rodando 🔥');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});