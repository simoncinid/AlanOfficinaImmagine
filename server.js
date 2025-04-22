/******************************************************************
 *  server.js  –  backend Threads + Analyze                       *
 *  - ES Modules (import/export)                                  *
 *  - Variabili prese da process.env                              *
 ******************************************************************/

/* ---------- opzionale: carica .env solo in locale ---------- */
import { fileURLToPath } from 'url';
import { dirname } from 'path';
if (process.env.NODE_ENV !== 'production') {
  // import dinamico per evitare "require" in ESM
  const { config } = await import('dotenv');
  config({ path: `${dirname(fileURLToPath(import.meta.url))}/.env` });
}

/* ---------- import librerie ---------- */
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';

/* ---------- variabili ambiente ---------- */
const OPENAI_KEY   = (process.env.OPENAI_KEY   || '').trim();
const ASSISTANT_ID = (process.env.ASSISTANT_ID || '').trim();

if (!OPENAI_KEY || !ASSISTANT_ID) {
  console.error('❌  OPENAI_KEY o ASSISTANT_ID mancanti nelle env di Render');
  process.exit(1);
}

/* ---------- inizializza OpenAI ---------- */
const openai = new OpenAI({ apiKey: OPENAI_KEY });

/* ---------- Express app ---------- */
const app = express();
app.use(express.json());
app.use(cors());                 // CORS aperto; limita con { origin: "<dominio>" } se serve

/* ==================================================================== *
 *  POST /api/conversation                                              *
 *  - Se threadId è null, crea thread e salva l'id                      *
 *  - Aggiunge il messaggio utente                                      *
 *  - Avvia run e attende completamento                                 *
 *  - Ritorna: { threadId, messages }                                   *
 * ==================================================================== */
app.post('/api/conversation', async (req, res) => {
  const { threadId, message } = req.body;
  let id = threadId;

  try {
    if (!id) {
      const th = await openai.beta.threads.create({
        messages: [{ role: 'user', content: message }]
      });
      id = th.id;
    } else {
      await openai.beta.threads.messages.create(id, {
        role: 'user',
        content: message
      });
    }

    let run = await openai.beta.threads.runs.create(id, { assistant_id: ASSISTANT_ID });

    while (run.status !== 'completed') {
      await new Promise(r => setTimeout(r, 600));
      run = await openai.beta.threads.runs.retrieve(id, run.id);
    }

    const msgs = await openai.beta.threads.messages.list(id);
    res.json({ threadId: id, messages: msgs.data });
  } catch (err) {
    console.error('❌ /api/conversation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ==================================================================== *
 *  POST /api/analyze                                                   *
 *  - Manda l'intera conversazione a GPT‑4o                              *
 *  - Estrae { fullName, emailAddress, phoneNumber, description, userType }
 * ==================================================================== */
app.post('/api/analyze', async (req, res) => {
  const { messages } = req.body;
  const prompt = `
You are a JSON extractor. From the conversation below, return ONLY a JSON with:
fullName, emailAddress, phoneNumber, description, userType.
If a field is missing, use an empty string.

Conversation:
${JSON.stringify(messages)}
`.trim();

  try {
    const comp = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: 'Extract customer info to JSON.' },
        { role: 'user',   content: prompt }
      ]
    });

    let raw = comp.choices[0].message.content.trim();
    if (raw.startsWith('```'))
      raw = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('❌ /api/analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- avvio server ---------- */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀  backend in ascolto sulla porta ${PORT}`)); 