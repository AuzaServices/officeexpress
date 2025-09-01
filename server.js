// server.js
const express = require('express');
const cors = require('cors');
const MercadoPago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Cria instância do MercadoPago com a Access Token
const client = new MercadoPago.MercadoPagoConfig({
  accessToken: 'APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
});

app.use(cors());
app.use(express.json());

app.post('/criar-preferencia', async (req, res) => {
  try {
    const { valor } = req.body;

    const preference = {
      items: [
        {
          title: 'Currículo PDF',
          quantity: 1,
          unit_price: parseFloat(valor) || 2.00,
          currency_id: 'BRL'
        }
      ],
      back_urls: {
        success: 'https://seusite.com/sucesso',
        failure: 'https://seusite.com/erro',
        pending: 'https://seusite.com/pendente'
      },
      auto_return: 'approved'
    };

    const response = await client.preference.create({ body: preference });
    res.json({ init_point: response.init_point });
  } catch (err) {
    console.error('Erro ao criar preferência:', err.message);
    res.status(500).json({ error: 'Erro ao criar preferência: resposta inválida da API' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});