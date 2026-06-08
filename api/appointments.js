const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateFolio() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'SP-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, email, telefono, servicio, fecha, horario, direccion, notas, user_id } = req.body;

  if (!nombre || !email || !telefono || !servicio || !fecha || !horario || !direccion) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Correo inválido' });

  const folio = generateFolio();

  const { data, error } = await supabase
    .from('appointments')
    .insert([{ folio, nombre, email: email.toLowerCase(), telefono, servicio, fecha, horario, direccion, notas: notas || null, user_id: user_id || null, status: 'agendado' }])
    .select('folio, id')
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al guardar la cita' });
  }

  /* — Email de confirmación (cuando Resend esté activo) —
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'REPLACE_ME') {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Sensepot Service <service@sensepot.net>',
      to: email,
      subject: `Cita confirmada — Folio ${folio}`,
      html: `<p>Hola ${nombre},</p><p>Tu cita ha sido agendada. Folio: <strong>${folio}</strong></p><p>Servicio: ${servicio} · ${fecha} · ${horario}</p>`
    });
  }
  */

  return res.status(200).json({ folio: data.folio, id: data.id });
};
