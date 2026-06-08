const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { appointment_id, rating, comentario } = req.body;
  if (!appointment_id || !rating) return res.status(400).json({ error: 'Datos incompletos' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating inválido' });

  const { error } = await supabase
    .from('ratings')
    .insert([{ appointment_id, rating, comentario: comentario || null }]);

  if (error) return res.status(500).json({ error: 'Error al guardar calificación' });
  return res.status(200).json({ ok: true });
};
