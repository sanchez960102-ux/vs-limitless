(function () {
  var cfg = window.VSL_CONFIG || {};
  var form = document.getElementById('form');
  var msg = document.getElementById('msg');
  var btn = document.getElementById('enviar');
  var rango = document.getElementById('rango');
  var rangoV = document.getElementById('rango-v');
  document.getElementById('anio').textContent = new Date().getFullYear();

  var top = document.querySelector('.top');
  function barra() { top.classList.toggle('solida', window.scrollY > 40); }
  window.addEventListener('scroll', barra, { passive: true });
  barra();

  rango.addEventListener('input', function () { rangoV.textContent = rango.value; });

  (cfg.listaEspera || []).forEach(function (plan) {
    document.querySelectorAll('[data-plan="' + plan + '"]').forEach(function (b) {
      b.textContent = 'Unirme a la lista de espera';
      var tag = b.closest('.plan').querySelector('.plan-tag');
      if (tag) tag.innerHTML = '<span class="punto"></span>Sin lugares · lista de espera';
    });
    var r = form.querySelector('input[name="plan"][value="' + plan + '"]');
    if (r) r.nextElementSibling.textContent += ' · lista de espera';
  });

  document.querySelectorAll('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = form.querySelector('input[name="plan"][value="' + a.dataset.plan + '"]');
      if (r) r.checked = true;
    });
  });

  function datos() {
    var fd = new FormData(form);
    return {
      nombre: fd.get('nombre').trim(),
      correo: fd.get('correo').trim(),
      whatsapp: fd.get('whatsapp').trim(),
      ciudad: fd.get('ciudad').trim(),
      edad: parseInt(fd.get('edad'), 10) || null,
      objetivo: fd.get('objetivo'),
      meta: fd.get('meta').trim(),
      nivel: fd.get('nivel'),
      dias: parseInt(fd.get('dias'), 10) || null,
      lugar: fd.getAll('lugar').join(', '),
      lesiones: fd.get('lesiones').trim(),
      por_que_ahora: fd.get('por_que_ahora').trim(),
      ultima_vez: fd.get('ultima_vez').trim(),
      semana_mala: fd.get('semana_mala').trim(),
      compromiso: parseInt(fd.get('compromiso'), 10),
      plan: fd.get('plan'),
      acepta_compromiso: fd.get('acepta') === 'on'
    };
  }

  function validar() {
    var ok = true, primero = null;
    form.querySelectorAll('.err').forEach(function (e) { e.classList.remove('err'); });
    form.querySelectorAll('[required]').forEach(function (el) {
      if (el.type === 'radio') return;
      if (!el.checkValidity()) {
        ok = false;
        el.classList.add('err');
        if (!primero) primero = el;
      }
    });
    if (!form.querySelector('input[name="plan"]:checked')) ok = false;
    if (primero) primero.focus();
    return ok;
  }

  function enviarSupabase(d) {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return Promise.resolve('omitido');
    return fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/aplicaciones', {
      method: 'POST',
      headers: {
        'apikey': cfg.supabaseAnonKey,
        'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(d)
    }).then(function (r) { if (!r.ok) throw new Error('supabase ' + r.status); return 'ok'; });
  }

  function enviarCorreo(d) {
    if (!cfg.correoAvisos) return Promise.resolve('omitido');
    var cuerpo = Object.assign({
      _subject: 'Nueva aplicación ' + d.plan + ': ' + d.nombre + ' (compromiso ' + d.compromiso + '/10)',
      _template: 'table',
      _captcha: 'false',
      _replyto: d.correo
    }, d);
    return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(cfg.correoAvisos), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(cuerpo)
    }).then(function (r) { if (!r.ok) throw new Error('correo ' + r.status); return 'ok'; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '';
    if (!validar()) {
      msg.textContent = 'Revisa los campos marcados. Las respuestas sobre tu compromiso necesitan al menos un par de líneas.';
      return;
    }
    var d = datos();
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    Promise.allSettled([enviarSupabase(d), enviarCorreo(d)]).then(function (res) {
      var algunoOk = res.some(function (r) { return r.status === 'fulfilled'; });
      if (!algunoOk) throw new Error('sin envío');
      form.hidden = true;
      var g = document.getElementById('gracias');
      g.hidden = false;
      g.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Enviar mi aplicación';
      msg.textContent = 'No se pudo enviar. Intenta de nuevo o escríbeme por Instagram a @vs_limitless.';
    });
  });
})();
