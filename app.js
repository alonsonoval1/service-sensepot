/* ══════════════════════════════════════════════════
   Sensepot Service — app.js  v2
   ══════════════════════════════════════════════════ */

var SUPABASE_URL  = 'https://amwmunafmushwmpeihbs.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd211bmFmbXVzaHdtcGVpaGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDQzNjAsImV4cCI6MjA5NjUyMDM2MH0.6r-q7krn_2aWcPQwrnWX6gaEHKZo3PTvSaSjMiwFhz4';

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── SCROLL UTIL ─────────────────────────────────── */
function scrollTo(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── AUTH ────────────────────────────────────────── */
var currentUser = null;

sb.auth.onAuthStateChange(function(event, session) {
  currentUser = session ? session.user : null;
  updateNavAuth();
  if (currentUser) {
    document.getElementById('mi-cuenta').classList.remove('hidden');
    loadMiCuenta();
  } else {
    document.getElementById('mi-cuenta').classList.add('hidden');
  }
});

function updateNavAuth() {
  var label = document.getElementById('navAuthLabel');
  var menu  = document.getElementById('navUserMenu');
  if (currentUser) {
    var displayName = currentUser.user_metadata && currentUser.user_metadata.nombre
      ? currentUser.user_metadata.nombre.split(' ')[0]
      : currentUser.email.split('@')[0];
    label.textContent = displayName;
    menu.innerHTML =
      '<button onclick="showMiCuenta()">Mi cuenta</button>' +
      '<button onclick="authSignOut()">Cerrar sesión</button>';
  } else {
    label.textContent = 'Cuenta';
    menu.innerHTML = '<button onclick="openAuthModal();closeUserMenu()">Iniciar sesión</button>';
  }
}

function openAuthModal()  { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function closeAuthOnOverlay(e) { if (e.target.id === 'authModal') closeAuthModal(); }

function toggleUserMenu() {
  var menu = document.getElementById('navUserMenu');
  var btn  = document.getElementById('navAuthBtn');
  var opening = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  btn.classList.toggle('open', opening);
}
function closeUserMenu() {
  document.getElementById('navUserMenu').classList.add('hidden');
  document.getElementById('navAuthBtn').classList.remove('open');
}
document.addEventListener('click', function(e) {
  var menu = document.getElementById('navUserMenu');
  if (menu && !menu.classList.contains('hidden')) {
    if (!document.getElementById('navAuth').contains(e.target)) closeUserMenu();
  }
});

function switchTab(tab) {
  var isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('signupForm').classList.toggle('hidden', isLogin);
}

async function authLogin(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value.trim();
  var pwd   = document.getElementById('loginPwd').value;
  var err   = document.getElementById('loginError');
  var btn   = document.getElementById('loginBtn');
  err.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Iniciando…';
  var { error } = await sb.auth.signInWithPassword({ email, password: pwd });
  if (error) {
    err.textContent = error.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos.'
      : error.message;
    err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
  } else {
    closeAuthModal();
    document.getElementById('loginForm').reset();
  }
}

async function authSignup(e) {
  e.preventDefault();
  var nombre = document.getElementById('signupName').value.trim();
  var email  = document.getElementById('signupEmail').value.trim();
  var pwd    = document.getElementById('signupPwd').value;
  var err    = document.getElementById('signupError');
  var btn    = document.getElementById('signupBtn');
  err.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Creando cuenta…';
  var { error } = await sb.auth.signUp({
    email, password: pwd,
    options: { data: { nombre } }
  });
  if (error) {
    err.textContent = error.message;
    err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  } else {
    err.style.color = 'var(--accent)';
    err.textContent = '✓ Revisa tu correo para confirmar tu cuenta.';
    err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  }
}

async function authSignOut() {
  await sb.auth.signOut();
  closeUserMenu();
}

function showMiCuenta() {
  closeUserMenu();
  scrollTo('mi-cuenta');
}

/* ── MI CUENTA ───────────────────────────────────── */
var TL_STEPS = ['agendado','confirmado','en_camino','en_proceso','completado'];
var TL_LABELS = { agendado:'Agendado', confirmado:'Confirmado', en_camino:'En camino', en_proceso:'En proceso', completado:'Completado' };

async function loadMiCuenta() {
  if (!currentUser) return;
  var welcome = document.getElementById('mcWelcome');
  var nombre = currentUser.user_metadata && currentUser.user_metadata.nombre
    ? currentUser.user_metadata.nombre.split(' ')[0] : '';
  welcome.textContent = nombre ? 'Hola, ' + nombre + '. Aquí están tus citas.' : 'Aquí están tus citas.';

  document.getElementById('mcLoading').style.display = 'block';
  document.getElementById('mcList').innerHTML = '';
  document.getElementById('mcEmpty').classList.add('hidden');

  var { data, error } = await sb
    .from('appointments')
    .select('*')
    .eq('email', currentUser.email)
    .order('created_at', { ascending: false });

  document.getElementById('mcLoading').style.display = 'none';

  if (error || !data || data.length === 0) {
    document.getElementById('mcEmpty').classList.remove('hidden');
    return;
  }

  var list = document.getElementById('mcList');
  data.forEach(function(a) { list.appendChild(buildMcCard(a)); });
}

function buildMcCard(a) {
  var stepIdx = TL_STEPS.indexOf(a.status);
  var card = document.createElement('div');
  card.className = 'mc-card';
  card.id = 'mc-card-' + a.id;

  var badgeClass = 'mc-status-badge--' + a.status;
  var fecha = a.fecha ? new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : '';

  var tlHTML = '';
  TL_STEPS.forEach(function(step, i) {
    var dotClass = i < stepIdx ? 'done' : (i === stepIdx ? 'current' : '');
    var lblClass = i === stepIdx ? 'active' : '';
    if (i > 0) tlHTML += '<div class="mc-tl-line' + (i <= stepIdx ? ' done' : '') + '"></div>';
    tlHTML += '<div class="mc-tl-step"><div class="mc-tl-dot ' + dotClass + '"></div><span class="mc-tl-label ' + lblClass + '">' + TL_LABELS[step] + '</span></div>';
  });

  var rateBtn = a.status === 'completado'
    ? '<button class="mc-rate-btn" onclick="showRating(\'' + a.id + '\')">⭐ Calificar servicio</button>'
    : '';

  card.innerHTML =
    '<div class="mc-card-header">' +
      '<div><div class="mc-card-folio">' + a.folio + '</div>' +
      '<div class="mc-card-service">' + escHtml(a.servicio) + '</div>' +
      '<div class="mc-card-date">' + fecha + ' · ' + escHtml(a.horario) + '</div></div>' +
      '<span class="mc-status-badge ' + badgeClass + '">' + (TL_LABELS[a.status] || a.status) + '</span>' +
    '</div>' +
    '<div class="mc-timeline">' + tlHTML + '</div>' +
    rateBtn +
    '<div id="rate-form-' + a.id + '" class="hidden" style="margin-top:14px"></div>';

  return card;
}

function showRating(appointmentId) {
  var container = document.getElementById('rate-form-' + appointmentId);
  container.classList.remove('hidden');
  var selected = 0;
  container.innerHTML =
    '<p style="font-size:13px;color:var(--text2);margin-bottom:6px">¿Cómo calificarías el servicio?</p>' +
    '<div class="mc-stars" id="stars-' + appointmentId + '">' +
      [1,2,3,4,5].map(function(n) {
        return '<span class="mc-star" data-val="' + n + '" onclick="selectStar(\'' + appointmentId + '\',' + n + ')">★</span>';
      }).join('') +
    '</div>' +
    '<textarea class="field-input field-textarea" id="rate-comment-' + appointmentId + '" placeholder="Comentario opcional…" style="margin-top:8px;min-height:60px"></textarea>' +
    '<button class="btn-next" style="margin-top:10px;font-size:13px;padding:9px 20px" onclick="submitRating(\'' + appointmentId + '\')">Enviar calificación</button>';
}

function selectStar(appointmentId, val) {
  var stars = document.querySelectorAll('#stars-' + appointmentId + ' .mc-star');
  stars.forEach(function(s, i) { s.classList.toggle('selected', i < val); });
  document.getElementById('stars-' + appointmentId).dataset.selected = val;
}

async function submitRating(appointmentId) {
  var starsEl  = document.getElementById('stars-' + appointmentId);
  var rating   = parseInt(starsEl.dataset.selected || 0);
  var comentario = document.getElementById('rate-comment-' + appointmentId).value.trim();
  if (!rating) { alert('Selecciona una calificación'); return; }
  var res = await fetch('/api/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId, rating, comentario })
  });
  if (res.ok) {
    document.getElementById('rate-form-' + appointmentId).innerHTML =
      '<p style="font-size:13px;color:var(--accent);margin-top:8px">✓ Gracias por tu calificación.</p>';
  }
}

/* ── 3-STEP FORM ─────────────────────────────────── */
var currentStep = 1;

function updateProgress(step) {
  document.querySelectorAll('.progress-step').forEach(function(el) {
    var n = parseInt(el.dataset.step);
    el.classList.remove('active','done');
    if (n === step) el.classList.add('active');
    if (n < step)  el.classList.add('done');
  });
}

function showStep(step) {
  document.querySelectorAll('.form-step').forEach(function(el) { el.classList.add('hidden'); });
  var id = step === 99 ? 'stepSuccess' : 'step' + step;
  var target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
  currentStep = step;
  updateProgress(step);
}

function nextStep(from) {
  if (from === 1) {
    if (!document.querySelector('input[name="servicio"]:checked')) { flashError('Elige un tipo de servicio.'); return; }
  }
  if (from === 2) {
    var fecha   = document.getElementById('fecha').value;
    var horario = document.querySelector('input[name="horario"]:checked');
    if (!fecha)   { flashError('Selecciona una fecha.'); return; }
    if (!horario) { flashError('Elige un horario.'); return; }
    var chosen = new Date(fecha + 'T12:00:00'), today = new Date(); today.setHours(0,0,0,0);
    if (chosen < today) { flashError('La fecha no puede ser en el pasado.'); return; }
  }
  showStep(from + 1);
  scrollTo('agendar');
}

function prevStep(from) { showStep(from - 1); scrollTo('agendar'); }

function flashError(msg) {
  var el = document.getElementById('formError');
  if (!el) {
    el = document.createElement('p');
    el.id = 'formError';
    el.style.cssText = 'color:#e05555;font-size:13px;margin-top:12px;';
  }
  document.getElementById('step' + currentStep).appendChild(el);
  el.textContent = msg;
  setTimeout(function() { el.textContent = ''; }, 3500);
}

function resetForm() { document.getElementById('scheduleForm').reset(); showStep(1); scrollTo('agendar'); }

document.getElementById('scheduleForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var nombre   = document.getElementById('nombre').value.trim();
  var email    = document.getElementById('email').value.trim();
  var tel      = document.getElementById('telefono').value.trim();
  var dir      = document.getElementById('direccion').value.trim();
  var servicio = document.querySelector('input[name="servicio"]:checked');
  var fecha    = document.getElementById('fecha').value;
  var horario  = document.querySelector('input[name="horario"]:checked');

  if (!nombre || !email || !tel || !dir) { flashError('Completa todos los campos.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { flashError('Correo no válido.'); return; }

  var btn = this.querySelector('.btn-submit');
  btn.textContent = 'Enviando…'; btn.disabled = true;

  fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre, email, telefono: tel,
      servicio: servicio ? servicio.value : '',
      fecha, horario: horario ? horario.value : '',
      direccion: dir,
      notas: document.getElementById('notas').value.trim(),
      user_id: currentUser ? currentUser.id : null
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.folio) {
      document.getElementById('successFolio').textContent = 'Folio: ' + data.folio;
      showStep(99);
      document.querySelectorAll('.form-step').forEach(function(s) { s.classList.add('hidden'); });
      document.getElementById('stepSuccess').classList.remove('hidden');
      if (currentUser) loadMiCuenta();
    } else {
      btn.textContent = 'Confirmar cita'; btn.disabled = false;
      flashError(data.error || 'Error al enviar. Intenta de nuevo.');
    }
  })
  .catch(function() {
    btn.textContent = 'Confirmar cita'; btn.disabled = false;
    flashError('Sin conexión. Intenta de nuevo.');
  });
});

/* ── TRACKING ────────────────────────────────────── */
function trackTicket() {
  var val = document.getElementById('trackingInput').value.trim();
  var res = document.getElementById('trackingResult');
  res.classList.remove('hidden');
  if (!val) { res.innerHTML = '<span style="color:#e05555">Ingresa tu folio o correo.</span>'; return; }

  res.innerHTML = '<span style="color:var(--text2);font-size:13px">Buscando…</span>';

  fetch('/api/track?q=' + encodeURIComponent(val))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.found) {
        res.innerHTML = '<p style="color:var(--text2);font-size:13px">No encontramos un registro para <strong style="color:var(--text)">' + escHtml(val) + '</strong>.<br/>Verifica el folio o correo e intenta de nuevo.</p>';
        return;
      }
      var html = '';
      data.appointments.forEach(function(a) {
        var stepIdx = ['agendado','confirmado','en_camino','en_proceso','completado'].indexOf(a.status);
        var steps   = ['Agendado','Confirmado','En camino','En proceso','Completado'];
        var tlHTML  = '';
        steps.forEach(function(lbl, i) {
          var dotClass = i < stepIdx ? 'done' : (i === stepIdx ? 'current' : '');
          if (i > 0) tlHTML += '<div class="mc-tl-line' + (i <= stepIdx ? ' done' : '') + '"></div>';
          tlHTML += '<div class="mc-tl-step"><div class="mc-tl-dot ' + dotClass + '"></div><span class="mc-tl-label' + (i===stepIdx?' active':'') + '">' + lbl + '</span></div>';
        });
        var fecha = a.fecha ? new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday:'short', year:'numeric', month:'short', day:'numeric' }) : '';
        html += '<div class="tracking-card">' +
          '<div class="tracking-card-top"><div><div class="tracking-folio">' + a.folio + '</div>' +
          '<div class="tracking-service">' + escHtml(a.servicio) + '</div>' +
          '<div class="tracking-date">' + fecha + ' · ' + escHtml(a.horario) + '</div></div>' +
          '<span class="mc-status-badge mc-status-badge--' + a.status + '">' + a.status_label + '</span></div>' +
          '<div class="mc-timeline">' + tlHTML + '</div></div>';
      });
      res.innerHTML = html;
    })
    .catch(function() {
      res.innerHTML = '<span style="color:#e05555;font-size:13px">Error de conexión. Intenta de nuevo.</span>';
    });
}

document.getElementById('trackingInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') trackTicket();
});

/* ── FAQ ─────────────────────────────────────────── */
function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-q.open').forEach(function(b) { b.classList.remove('open'); b.nextElementSibling.classList.remove('open'); });
  if (!isOpen) { btn.classList.add('open'); answer.classList.add('open'); }
}

var activeFaqCat = 'all';
function setFaqCat(btn, cat) {
  document.querySelectorAll('.faq-cat').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active'); activeFaqCat = cat; applyFaqFilters();
}
function filterFaq(q) { applyFaqFilters(q); }
function applyFaqFilters(query) {
  if (query === undefined) query = document.getElementById('faqSearch').value;
  var q = query.toLowerCase().trim();
  var visible = 0;
  document.querySelectorAll('.faq-item').forEach(function(item) {
    var ok = (activeFaqCat === 'all' || item.dataset.cat === activeFaqCat) && (!q || item.textContent.toLowerCase().includes(q));
    item.classList.toggle('hidden', !ok);
    if (ok) visible++;
  });
  document.getElementById('faqNoResults').classList.toggle('hidden', visible > 0);
}

/* ── CONTACT FORM ────────────────────────────────── */
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var nombre  = document.getElementById('c-nombre').value.trim();
  var email   = document.getElementById('c-email').value.trim();
  var mensaje = document.getElementById('c-mensaje').value.trim();
  var errEl   = document.getElementById('contactError');
  errEl.textContent = '';
  if (!nombre || !email || !mensaje) { errEl.textContent = 'Completa todos los campos.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = 'El correo no parece válido.'; return; }
  var btn = document.getElementById('contactSubmitBtn');
  btn.textContent = 'Enviando…'; btn.disabled = true;
  var data = new FormData(this);
  fetch('https://formspree.io/f/mrevqwag', { method:'POST', body:data, headers:{ Accept:'application/json' } })
    .then(function(r) {
      if (r.ok) { showContactSuccess(); }
      else { btn.textContent = 'Enviar mensaje'; btn.disabled = false; errEl.textContent = 'Error al enviar. Intenta de nuevo.'; }
    })
    .catch(function() { btn.textContent = 'Enviar mensaje'; btn.disabled = false; errEl.textContent = 'Sin conexión.'; });
});
function showContactSuccess() {
  document.getElementById('contactForm').querySelector('.contact-form-grid').style.display = 'none';
  document.getElementById('contactSubmitBtn').style.display = 'none';
  document.getElementById('contactSuccess').classList.remove('hidden');
}

/* ── CHATBOT ─────────────────────────────────────── */
var chatOpen    = false;
var chatStarted = false;
var chatHistory = [];

function toggleChat() { chatOpen ? closeChat() : openChat(); }
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
    botMsg('Puedes elegir una opción o escribirme directamente tu pregunta.');
    showOptions([
      { label: '📱 Problema con la app',        fn: function() { userSay('Problema con la app'); flowApp(); } },
      { label: '🔌 Un dispositivo no funciona', fn: function() { userSay('Dispositivo no funciona'); flowDevice(); } },
      { label: '📅 Agendar una cita',           fn: function() { userSay('Quiero agendar una cita'); flowSchedule(); } },
      { label: '❓ Otra pregunta',              fn: function() { userSay('Otra pregunta'); flowOther(); } },
    ]);
  }, 600);
}

function sendChatMsg(e) {
  e.preventDefault();
  var input = document.getElementById('chatInput');
  var text  = input.value.trim();
  if (!text) return;
  input.value = '';
  userSay(text);
  showOptions([]);
  chatHistory.push({ role: 'user', content: text });
  var loadingId = 'chat-loading-' + Date.now();
  var msgs = document.getElementById('chatMessages');
  var loadEl = document.createElement('div');
  loadEl.id = loadingId;
  loadEl.className = 'chat-msg chat-msg--bot';
  loadEl.textContent = '…';
  msgs.appendChild(loadEl);
  msgs.scrollTop = msgs.scrollHeight;
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var reply = data.reply || 'No pude procesar eso. Intenta de nuevo.';
    document.getElementById(loadingId).remove();
    botMsg(reply);
    chatHistory.push({ role: 'assistant', content: reply });
    offerMore();
  })
  .catch(function() {
    document.getElementById(loadingId).remove();
    botMsg('Error de conexión. Intenta de nuevo o elige una opción.');
    resetChatFlow();
  });
}

function flowApp() {
  botMsg('¿Cuál es el problema con la app?');
  showOptions([
    { label: 'No abre o se cierra sola',    fn: function() { userSay('No abre'); botMsg('Cierra la app, ve a Ajustes → Apps → Sensepot → Almacenamiento → Limpiar caché. Si persiste, reinstala desde tu tienda de apps.'); offerMore(); }},
    { label: 'No detecta mis dispositivos', fn: function() { userSay('No detecta dispositivos'); botMsg('Asegúrate de estar en la misma red WiFi 2.4 GHz que los dispositivos. Desactiva VPN si la tienes activa y reinicia el router.'); offerMore(); }},
    { label: 'No puedo iniciar sesión',     fn: function() { userSay('No inicio sesión'); botMsg('Usa "¿Olvidaste tu contraseña?" en el login de la app. Recibirás un correo en minutos. Revisa tu carpeta de spam.'); offerMore(); }},
    { label: 'Otro problema',               fn: function() { userSay('Otro problema'); flowEscalate(); }},
  ]);
}

function flowDevice() {
  botMsg('¿Qué problema tiene el dispositivo?');
  showOptions([
    { label: 'No responde desde la app',    fn: function() { userSay('No responde'); botMsg('Desconéctalo 10 segundos, vuelve a conectarlo y espera 30 seg. Si no aparece, elimínalo de la app y vuelve a agregarlo en Ajustes → Agregar dispositivo.'); offerMore(); }},
    { label: 'Se desconecta seguido',       fn: function() { userSay('Se desconecta'); botMsg('Probablemente es señal WiFi débil. Acerca el router o agrega un repetidor. También verifica que el firmware esté actualizado desde la app.'); offerMore(); }},
    { label: 'Tiene una luz de error',      fn: function() { userSay('Luz de error'); botMsg('Rojo fijo = sin conexión. Rojo parpadeando = error de emparejamiento. Amarillo = actualizando. Comparte cuál ves y te ayudo mejor.'); offerMore(); }},
    { label: 'Está dañado físicamente',     fn: function() { userSay('Dañado'); flowEscalate(); }},
  ]);
}

function flowSchedule() {
  botMsg('¡Perfecto! Te llevo al formulario de agendamiento.');
  showOptions([
    { label: '📅 Ir al formulario',  fn: function() { userSay('Ir al formulario'); closeChat(); scrollTo('agendar'); }},
    { label: '← Volver al inicio',   fn: function() { userSay('Volver'); resetChatFlow(); }},
  ]);
}

function flowOther() {
  botMsg('¿Sobre qué tema es tu pregunta?');
  showOptions([
    { label: 'Garantía o reembolso',        fn: function() { userSay('Garantía'); botMsg('Los productos Sensepot tienen 1 año de garantía. Escríbenos a contact@sensepot.net con tu número de serie y descripción del problema.'); offerMore(); }},
    { label: 'Compatibilidad',              fn: function() { userSay('Compatibilidad'); botMsg('Los dispositivos Sensepot son compatibles con WiFi 2.4 GHz y 5 GHz (algunos modelos). Compatibles con Google Home y Amazon Alexa. Próximamente Apple HomeKit.'); offerMore(); }},
    { label: 'Precios y planes',            fn: function() { userSay('Precios'); botMsg('Para cotizaciones agenda una consulta gratuita o escríbenos a contact@sensepot.net. Un asesor te responde en menos de 24 horas.'); offerMore(); }},
    { label: 'Hablar con soporte humano',   fn: function() { userSay('Soporte humano'); flowEscalate(); }},
  ]);
}

function flowEscalate() {
  botMsg('Para este caso nuestro equipo puede ayudarte mejor. 🙌');
  setTimeout(function() {
    botMsg('Agenda una visita técnica o envíanos un mensaje directo.');
    showOptions([
      { label: '📅 Agendar visita técnica', fn: function() { userSay('Agendar visita'); closeChat(); scrollTo('agendar'); }},
      { label: '✉️ Enviarnos un mensaje',   fn: function() { userSay('Enviar mensaje'); closeChat(); scrollTo('contacto'); }},
      { label: '← Volver al inicio',        fn: function() { userSay('Volver'); resetChatFlow(); }},
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
      { label: '📱 Problema con la app',        fn: function() { userSay('Problema con la app'); flowApp(); } },
      { label: '🔌 Un dispositivo no funciona', fn: function() { userSay('Dispositivo no funciona'); flowDevice(); } },
      { label: '📅 Agendar una cita',           fn: function() { userSay('Quiero agendar'); flowSchedule(); } },
      { label: '❓ Otra pregunta',              fn: function() { userSay('Otra pregunta'); flowOther(); } },
    ]);
  }, 200);
}

function botMsg(text) {
  var msgs = document.getElementById('chatMessages');
  var el = document.createElement('div');
  el.className = 'chat-msg chat-msg--bot';
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}
function userSay(text) {
  var msgs = document.getElementById('chatMessages');
  var el = document.createElement('div');
  el.className = 'chat-msg chat-msg--user';
  el.textContent = text;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  showOptions([]);
}
function showOptions(opts) {
  var c = document.getElementById('chatOptions');
  c.innerHTML = '';
  opts.forEach(function(opt) {
    var btn = document.createElement('button');
    btn.className = 'chat-opt-btn';
    btn.textContent = opt.label;
    btn.onclick = opt.fn;
    c.appendChild(btn);
  });
}

/* ── UTILS ───────────────────────────────────────── */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── INIT ────────────────────────────────────────── */
(function() {
  var today = new Date().toISOString().split('T')[0];
  var fechaInput = document.getElementById('fecha');
  if (fechaInput) fechaInput.min = today;
})();
