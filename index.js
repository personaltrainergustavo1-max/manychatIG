// index.js
// Webhook semplice per ManyChat + chiamata API ManyChat per inviare messaggio di risposta.
// Usa Node 16/18+.

const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// Configurazioni da .env (vedi .env.local)
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY || '';
const MANYCHAT_API_BASE = process.env.MANYCHAT_API_BASE || 'https://api.manychat.com/v2'; // controlla versione nella tua dashboard
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'changeme';

// --- funzione per inviare messaggio via ManyChat API (semplice)
async function sendManyChatMessage(subscriberId, text) {
  const url = `${MANYCHAT_API_BASE}/messages/send`;
  const body = {
    subscriber_id: subscriberId,
    message: {
      type: "text",
      text: text
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return json;
}

// --- endpoint che ManyChat chiamerà
app.post('/webhook/manychat', async (req, res) => {
  try {
    // verifica header segreto (opzionale ma consigliato)
    const secret = req.headers['x-webhook-secret'] || req.query.secret;
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      console.log('Webhook: secret non valido', secret);
      return res.status(401).json({ ok: false, error: 'invalid secret' });
    }

    const payload = req.body || {};
    console.log('Webhook ricevuto:', JSON.stringify(payload).slice(0, 1000));

    // estrai informazioni utili (ManyChat invierà le variabili che hai mappato)
    const subscriberId = payload.subscriber_id || (payload.data && payload.data.subscriber_id) || payload.from;
    const firstName = payload.first_name || (payload.data && payload.data.first_name) || 'atleta';
    const userMessage = payload.user_message || (payload.data && payload.data.user_message) || '';

    // Se non trovi subscriberId rispondi OK ma logga
    if (!subscriberId) {
      console.log('Attenzione: subscriberId non fornito nel payload.');
      return res.status(200).json({ ok: true, note: 'no subscriber id' });
    }

    // Costruisci una risposta semplice e personalizzata
    const replyText = `Ciao ${firstName}! Grazie per il messaggio. Ti mando un suggerimento pratico tra poco.`;

    // Invia messaggio tramite ManyChat API
    const sendResult = await sendManyChatMessage(subscriberId, replyText);
    console.log('ManyChat send result:', sendResult);

    // rispondi a ManyChat che hai ricevuto l'evento
    return res.status(200).json({ ok: true, sent: sendResult });
  } catch (err) {
    console.error('Errore nel webhook:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint di salute (per test rapido)
app.get('/', (req, res) => res.send('Webhook manychat attivo'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
