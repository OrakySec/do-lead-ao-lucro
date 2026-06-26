const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const PIXEL_ID = process.env.PIXEL_ID || '1497102612432380';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const META_API_VERSION = 'v19.0';

// ─────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: [
    'https://wandersonbuarque.com.br',
    'http://localhost:8000',
    'http://localhost',
  ],
  methods: ['POST', 'GET'],
}));

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Hash SHA-256 (obrigatório pela Meta para email e telefone) */
function hashSHA256(value) {
  if (!value) return undefined;
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

/** Remove tudo que não for dígito do telefone */
function normalizePhone(phone) {
  if (!phone) return undefined;
  return phone.replace(/\D/g, '');
}

/** Pega o IP real do cliente passando por proxies/Traefik */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress
  );
}

// ─────────────────────────────────────────────
// Endpoint principal de conversão
// ─────────────────────────────────────────────
app.post('/api/conversion', async (req, res) => {
  if (!ACCESS_TOKEN) {
    console.error('[CAPI] ACCESS_TOKEN não configurado!');
    return res.status(500).json({ success: false, error: 'Token não configurado no servidor.' });
  }

  try {
    const {
      email,
      phone,
      fbc,
      fbp,
      eventName = 'Contact',
      eventSourceUrl = 'https://wandersonbuarque.com.br/',
    } = req.body;

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Monta o user_data com os dados hasheados
    const userData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };

    if (email)  userData.em  = [hashSHA256(email)];
    if (phone)  userData.ph  = [hashSHA256(normalizePhone(phone))];
    if (fbc)    userData.fbc = fbc;
    if (fbp)    userData.fbp = fbp;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: eventSourceUrl,
          action_source: 'website',
          user_data: userData,
        },
      ],
      access_token: ACCESS_TOKEN,
    };

    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[CAPI] Erro retornado pela Meta:', JSON.stringify(result));
      return res.status(502).json({ success: false, error: result });
    }

    console.log(`[CAPI] Evento "${eventName}" enviado com sucesso. Recebidos pela Meta: ${result.events_received}`);
    return res.json({ success: true, events_received: result.events_received });

  } catch (error) {
    console.error('[CAPI] Erro interno:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pixel: PIXEL_ID });
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[CAPI Service] Rodando na porta ${PORT}`);
  console.log(`[CAPI Service] Pixel ID: ${PIXEL_ID}`);
  if (!ACCESS_TOKEN) {
    console.warn('[CAPI Service] ⚠️  ATENÇÃO: ACCESS_TOKEN não definido! Configure a variável de ambiente.');
  }
});
