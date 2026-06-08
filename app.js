/* ══════════════════════════════════════════════════
   Sensepot Service — app.js
   ══════════════════════════════════════════════════ */

/* ── SCROLL UTIL ─────────────────────────────────── */
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── 3-STEP FORM ─────────────────────────────────── */
var currentStep = 1;

function updateProgress(step) {
  document.querySelectorAll('.progress-step').forEach(function(el) {
    const n = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (n === step) el.classList.add('active');
    if (n < step)  el.classList.add('done');
  });
}

function showStep(step) {
  document.querySelectorAll('.form-step').forEach(function(el) {
    el.classList.add('hidden');
  });
  const target = document.getElementById('step' + step) || document.getElementById('stepSuccess');
  if (target) target.classList.remove('hidden');
  currentStep = step;
  updateProgress(step);
}

function nextStep(from) {
  if (from === 1) {
    const selected = document.querySelector('input[name="servicio"]:checked');
    if (!selected) { flashError('Elige un tipo de servicio para continuar.'); return; }
  }
  if (from === 2) {
    const fecha   = document.getElementById('fecha').value;
    const horario = document.querySelector('input[name="horario"]:checked');
    if (!fecha)   { flashError('Selecciona una fecha.'); return; }
    if (!horario) { flashError('Elige un horario.'); return; }
    const chosen = new Date(fecha + 'T12:00:00');
    const today  = new Date(); today.setHours(0,0,0,0);
    if (chosen < today) { flashError('La fecha no puede ser en el pasado.'); return; }
  }
  showStep(from + 1);
  scrollTo('agendar');
}

function prevStep(from) {
  showStep(from - 1);
  scrollTo('agendar');
}

function flashError(msg) {
  let el = document.getElementById('formError');
  if (!el) {
    el = document.createElement('p');
    el.id = 'formError';
    el.style.cssText = 'color:#e05555;font-size:13px;margin-top:12px;';
  }
  const step = document.getElementById('step' + currentStep);
  step.appendChild(el);
  el.textContent = msg;
  setTimeout(function() { el.textContent = ''; }, 3500);
}

function resetForm() {
  document.getElementById('scheduleForm').reset();
  showStep(1);
  scrollTo('agendar');
}

/* Form submit */
document.getElementById('scheduleForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const email  = document.getElementById('email').value.trim();
  const tel    = document.getElementById('telefono').value.trim();
  const dir    = document.getElementById('direccion').value.trim();
  if (!nombre || !email || !tel || !dir) {
    flashError('Completa todos los campos obligatorios.'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    flashError('El correo no parece válido.'); return;
  }

  const btn = this.querySelector('.btn-submit');
  btn.textContent = 'Enviando…';
  btn.disabled = true;

  const data = new FormData(this);

  /* — Si aún no tienes Formspree, muestra éxito de inmediato — */
  const action = this.action;
  if (action.includes('REPLACE_ME')) {
    simulateSuccess(email);
    return;
  }

  fetch(action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
    .then(function(r) {
      if (r.ok) { simulateSuccess(email); }
      else { btn.textContent = 'Confirmar cita'; btn.disabled = false; flashError('Hubo un error al enviar. Intenta de nuevo.'); }
    })
    .catch(function() { btn.textContent = 'Confirmar cita'; btn.disabled = false; flashError('Sin conexión. Intenta de nuevo.'); });
});

function simulateSuccess(email) {
  const folio = 'SP-' + Date.now().toString(36).toUpperCase().slice(-6);
  document.getElementById('successFolio').textContent = 'Folio: ' + folio;
  showStep(99); /* triggers stepSuccess */
  document.querySelectorAll('.form-step').forEach(function(el) { el.classList.add('hidden'); });
  document.getElementById('stepSuccess').classList.remove('hidden');
  document.getElementById('stepSuccess').style.animation = 'fadeUp 0.35s ease';
}

/* ── TRACKING ────────────────────────────────────── */
function trackTicket() {
  const val = document.getElementById('trackingInput').value.trim();
  const res = document.getElementById('trackingResult');
  res.classList.remove('hidden');
  if (!val) {
    res.innerHTML = '<span style="color:#e05555">Ingresa tu correo o número de folio.</span>';
    return;
  }
  /* Demo — sin backend real por ahora */
  res.innerHTML =
    '<p style="color:#888;font-size:13px;line-height:1.7">' +
    'No encontramos un registro activo para <strong style="color:#f0f0f0">' + escHtml(val) + '</strong>.<br/>' +
    'Si acabas de agendar, puede tomar unos minutos en registrarse.<br/>' +
    'Escríbenos a <a href="mailto:hola@sensepot.net" style="color:#00c6c6">hola@sensepot.net</a> si necesitas ayuda.</p>';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── FAQ ─────────────────────────────────────────── */
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  /* close all */
  document.querySelectorAll('.faq-q.open').forEach(function(b) {
    b.classList.remove('open');
    b.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

var activeFaqCat = 'all';

function setFaqCat(btn, cat) {
  document.querySelectorAll('.faq-cat').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  activeFaqCat = cat;
  applyFaqFilters();
}

function filterFaq(query) { applyFaqFilters(query); }

function applyFaqFilters(query) {
  if (query === undefined) query = document.getElementById('faqSearch').value;
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll('.faq-item');
  let visible = 0;
  items.forEach(function(item) {
    const catMatch = activeFaqCat === 'all' || item.dataset.cat === activeFaqCat;
    const textMatch = !q || item.textContent.toLowerCase().includes(q);
    if (catMatch && textMatch) { item.classList.remove('hidden'); visible++; }
    else item.classList.add('hidden');
  });
  const noRes = document.getElementById('faqNoResults');
  if (visible === 0) noRes.classList.remove('hidden');
  else noRes.classList.add('hidden');
}

/* ── CHATBOT ─────────────────────────────────────── */
var chatOpen = false;
var chatStarted = false;

function toggleChat() {
  chatOpen ? closeChat() : openChat();
}

function openChat() {
  chatOpen = true;
  document.getElementById('chatWindow').classList.remove('hidden');
  document.getElementById('fabIcon').textContent = '✕';
  if (!chatStarted) { chatStarted = true; startChat(); }
}

function closeChat() {
  chatOpen = false;
  document.getElementById('chatWindow').classList.add('hidden');
  document.getElementById('fabIcon').textContent = '💬';
}

function startChat() {
  botMsg('¡Hola! Soy el Asistente Sensepot. 👋');
  setTimeout(function() {
    botMsg('¿Con qué puedo ayudarte hoy?');
    showOptions([
      { label: '📱 Problema con la app',         fn: function() { userSay('Problema con la app'); flowApp(); } },
      { label: '🔌 Un dispositivo no funciona',  fn: function() { userSay('Dispositivo no funciona'); flowDevice(); } },
      { label: '📅 Agendar una cita',            fn: function() { userSay('Quiero agendar una cita'); flowSchedule(); } },
      { label: '❓ Otra pregunta',               fn: function() { userSay('Otra pregunta'); flowOther(); } },
    ]);
  }, 600);
}

function flowApp() {
  botMsg('Entendido. ¿Cuál es el problema con la app?');
  showOptions([
    { label: 'No abre o se cierra sola',    fn: function() { userSay('No abre'); botMsg('Intenta: cerrar la app, limpiar caché (Ajustes → Apps → Sensepot → Almacenamiento) y volver a abrir. Si persiste, reinstala desde tu tienda de apps.'); offerMore(); }},
    { label: 'No detecta mis dispositivos', fn: function() { userSay('No detecta dispositivos'); botMsg('Verifica que tu teléfono y los dispositivos estén en la misma red WiFi (2.4 GHz). Desactiva VPN si la tienes activa y reinicia el router.'); offerMore(); }},
    { label: 'No puedo iniciar sesión',     fn: function() { userSay('No inicio sesión'); botMsg('Usa "¿Olvidaste tu contraseña?" en la pantalla de login. Recibirás un correo en minutos. Revisa también tu carpeta de spam.'); offerMore(); }},
    { label: 'Otro problema',               fn: function() { userSay('Otro problema'); flowEscalate(); }},
  ]);
}

function flowDevice() {
  botMsg('Entendido. ¿Qué problema tiene el dispositivo?');
  showOptions([
    { label: 'No responde desde la app',    fn: function() { userSay('No responde'); botMsg('Desconéctalo de la corriente 10 segundos, vuelve a conectarlo y espera 30 seg. Si no aparece, elimínalo de la app y agrégalo de nuevo en Ajustes → Agregar dispositivo.'); offerMore(); }},
    { label: 'Se desconecta seguido',       fn: function() { userSay('Se desconecta'); botMsg('El problema suele ser la señal WiFi. Acerca el router o agrega un repetidor. También revisa que el firmware del dispositivo esté actualizado desde la app.'); offerMore(); }},
    { label: 'Tiene una luz de error',      fn: function() { userSay('Luz de error'); botMsg('Rojo fijo = sin conexión. Rojo parpadeando = error de emparejamiento. Amarillo = actualización en curso. ¿Cuál ves?'); offerMore(); }},
    { label: 'Está físicamente dañado',     fn: function() { userSay('Dañado físicamente'); flowEscalate(); }},
  ]);
}

function flowSchedule() {
  botMsg('¡Perfecto! Puedo llevarte directo al formulario de agendamiento.');
  showOptions([
    { label: '📅 Ir al formulario',         fn: function() { userSay('Ir al formulario'); closeChat(); scrollTo('agendar'); }},
    { label: 'Volver al inicio',            fn: function() { userSay('Volver'); resetChatFlow(); }},
  ]);
}

function flowOther() {
  botMsg('Cuéntame más. ¿Sobre qué tema es tu pregunta?');
  showOptions([
    { label: 'Garantía o reembolso',        fn: function() { userSay('Garantía'); botMsg('Los productos Sensepot tienen 1 año de garantía. Para iniciar un proceso escríbenos a hola@sensepot.net con tu número de serie y descripción del problema.'); offerMore(); }},
    { label: 'Compatibilidad de productos', fn: function() { userSay('Compatibilidad'); botMsg('Los dispositivos Sensepot son compatibles con redes WiFi 2.4 GHz y 5 GHz (para algunos modelos). Son compatibles con Google Home y Amazon Alexa. Próximamente con Apple HomeKit.'); offerMore(); }},
    { label: 'Precios y planes',            fn: function() { userSay('Precios'); botMsg('Para cotizaciones personalizadas agenda una consulta gratuita o escríbenos a hola@sensepot.net. Un asesor te contactará en menos de 24 horas.'); offerMore(); }},
    { label: 'Hablar con soporte humano',   fn: function() { userSay('Soporte humano'); flowEscalate(); }},
  ]);
}

function flowEscalate() {
  botMsg('Entendido. Para este caso lo mejor es hablar con nuestro equipo. 🙌');
  setTimeout(function() {
    botMsg('Puedes agendar una visita técnica o escribirnos por correo a hola@sensepot.net y te respondemos en menos de 24 h.');
    showOptions([
      { label: '📅 Agendar visita técnica', fn: function() { userSay('Agendar visita'); closeChat(); scrollTo('agendar'); }},
      { label: '✉️ Enviar correo',          fn: function() { userSay('Enviar correo'); window.location.href = 'mailto:hola@sensepot.net'; }},
      { label: 'Volver al inicio',          fn: function() { userSay('Volver'); resetChatFlow(); }},
    ]);
  }, 400);
}

function offerMore() {
  setTimeout(function() {
    showOptions([
      { label: '✅ Eso resolvió mi problema', fn: function() { userSay('Resuelto'); botMsg('¡Me alegra mucho! Si tienes otra duda, aquí estaré. 😊'); showOptions([]); }},
      { label: '❌ Sigue sin funcionar',      fn: function() { userSay('Sigue sin funcionar'); flowEscalate(); }},
      { label: '← Volver al inicio',          fn: function() { userSay('Volver'); resetChatFlow(); }},
    ]);
  }, 300);
}

function resetChatFlow() {
  setTimeout(function() {
    botMsg('¿En qué más puedo ayudarte?');
    showOptions([
      { label: '📱 Problema con la app',         fn: function() { userSay('Problema con la app'); flowApp(); } },
      { label: '🔌 Un dispositivo no funciona',  fn: function() { userSay('Dispositivo no funciona'); flowDevice(); } },
      { label: '📅 Agendar una cita',            fn: function() { userSay('Quiero agendar'); flowSchedule(); } },
      { label: '❓ Otra pregunta',               fn: function() { userSay('Otra pregunta'); flowOther(); } },
    ]);
  }, 200);
}

function botMsg(text) {
  const msgs = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'chat-msg chat-msg--bot';
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function userSay(text) {
  const msgs = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'chat-msg chat-msg--user';
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  showOptions([]);
}

function showOptions(opts) {
  const container = document.getElementById('chatOptions');
  container.innerHTML = '';
  opts.forEach(function(opt) {
    const btn = document.createElement('button');
    btn.className = 'chat-opt-btn';
    btn.textContent = opt.label;
    btn.onclick = opt.fn;
    container.appendChild(btn);
  });
}

/* ── INIT ────────────────────────────────────────── */
(function() {
  /* Set min date for date picker to today */
  var today = new Date().toISOString().split('T')[0];
  var fechaInput = document.getElementById('fecha');
  if (fechaInput) fechaInput.min = today;
})();
