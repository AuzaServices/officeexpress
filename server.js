const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servindo arquivos da pasta public

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-6806578338398236-090109-52cf5ad78f0a4d300d432a1ed5108fa2-2659262227'
});

// Rota para criar preferência de pagamento
app.post('/criar-preferencia', async (req, res) => {
  try {
    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({
      body: {
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
      }
    });

    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error('Erro ao criar preferência:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    });
    res.status(500).json({ error: 'Erro ao criar preferência' });
  }
});

// Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});