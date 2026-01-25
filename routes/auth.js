const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateRegistrationOptions, verifyRegistrationResponse,
        generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');

const router = express.Router();

// Exemplo de banco em memória (troque por DB real)
const users = [];

// Rota de registro (usuário + senha)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  res.json({ message: 'Usuário registrado com sucesso' });
});

// Rota de login com usuário + senha
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Senha inválida' });

  const token = jwt.sign({ username }, 'segredo_super_forte', { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true, secure: true });
  res.json({ message: 'Login realizado com sucesso' });
});

// Rotas para biometria (WebAuthn)
router.get('/webauthn/register', (req, res) => {
  const options = generateRegistrationOptions({
    rpName: 'Painel Seguro',
    userID: '123', // ID único do usuário
    userName: 'usuario',
  });
  res.json(options);
});

router.post('/webauthn/register/verify', async (req, res) => {
  const verification = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: '...', // challenge salvo no servidor
    expectedOrigin: 'http://localhost:3000',
    expectedRPID: 'localhost',
  });
  res.json(verification);
});

router.get('/webauthn/login', (req, res) => {
  const options = generateAuthenticationOptions({
    allowCredentials: [], // credenciais registradas
    userVerification: 'required',
  });
  res.json(options);
});

router.post('/webauthn/login/verify', async (req, res) => {
  const verification = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: '...',
    expectedOrigin: 'http://localhost:3000',
    expectedRPID: 'localhost',
    authenticator: {}, // dados do autenticador salvo
  });
  if (verification.verified) {
    const token = jwt.sign({ username: 'usuario' }, 'segredo_super_forte', { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.json({ message: 'Login biométrico realizado com sucesso' });
  } else {
    res.status(401).json({ error: 'Falha na biometria' });
  }
});

module.exports = router;