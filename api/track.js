const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STATUS_STEPS = ['agendado', 'confirmado', 'en_camino', 'en_proceso', 'completado'];
const STATUS_LABELS = {
  agendado:   'Agendado',
  confirmado: 'Confirmado',
  en_camino:  'Técnico en camino',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado:  'Cancelado'
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Ingresa tu folio o correo' });

  const isEmail = q.includes('@');

  let query = supabase
    .from('appointments')
    .select('folio, nombre, servicio, fecha, horario, direccion, status, created_at')
    .order('created_at', { ascending: false });

  if (isEmail) {
    query = query.eq('email', q.toLowerCase().trim()).limit(5);
  } else {
    query = query.eq('folio', q.toUpperCase().trim()).limit(1);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return res.status(404).json({ found: false });
  }

  const appointments = data.map(a => ({
    ...a,
    status_label: STATUS_LABELS[a.status] || a.status,
    status_step:  STATUS_STEPS.indexOf(a.status),
    total_steps:  STATUS_STEPS.length
  }));

  return res.status(200).json({ found: true, appointments });
};
