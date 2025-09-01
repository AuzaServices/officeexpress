const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

mercadopago.configure({
  access_token: 'APP_USR-4a680e3f-7155-4f06-ace7-dfcad4fa7d5a'
});

app.post('/criar-preferencia', async (req, res) => {
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

  try {
    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro ao criar preferência' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});