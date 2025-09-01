const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

const client = new MercadoPagoConfig({
  accessToken: 'SEU_ACCESS_TOKEN_AQUI' // substitua pela sua chave real
});

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
        success: 'http://localhost:3000/sucesso.html',
        failure: 'http://localhost:3000/erro.html',
        pending: 'http://localhost:3000/pendente.html'
      },
      auto_return: 'approved'
    };

    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create(preference);
    res.json({ init_point: response.id ? response.init_point : null });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criar preferência');
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});