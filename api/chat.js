const SYSTEM_PROMPT = `Eres el asistente virtual de Sensepot, una empresa mexicana de automatización del hogar (Smart Home). Ayudas a los clientes con:
- Problemas con la app Sensepot (conexión, dispositivos, cuenta)
- Dispositivos inteligentes (luces, cámaras, cerraduras, sensores)
- Instalaciones, mantenimiento y servicio técnico
- Precios, garantías y disponibilidad
- Agendamiento de citas

Reglas:
- Responde siempre en español, tono amigable y profesional
- Respuestas cortas y directas (máx 3 párrafos)
- Si no puedes resolver el problema, sugiere agendar una cita técnica en service.sensepot.net
- No inventes precios ni fechas específicas
- Si preguntan por algo fuera de tu alcance, deriva a contact@sensepot.net`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mensajes requeridos' });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'REPLACE_ME') {
    return res.status(200).json({ reply: '⚙️ El asistente de IA estará disponible muy pronto. Por ahora usa el menú de opciones o escríbenos a contact@sensepot.net.' });
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-10)
    });

    return res.status(200).json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Anthropic error:', err.message);
    return res.status(500).json({ error: 'Error al conectar con el asistente' });
  }
};
