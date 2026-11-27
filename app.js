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

  // Contador de caracteres para las respuestas escritas
  form.querySelectorAll('textarea[minlength]').forEach(function (ta) {
    var min = parseInt(ta.getAttribute('minlength'), 10);
    var c = document.createElement('span');
    c.className = 'contador';
    c.setAttribute('aria-live', 'polite');
    ta.insertAdjacentElement('afterend', c);
    function pintar() {
      var n = ta.value.trim().length;
      var ok = n >= min;
      c.classList.toggle('ok', ok);
      c.textContent = ok ? 'Listo · ' + n + ' caracteres' : 'Mínimo ' + min + ' caracteres · llevas ' + n;
    }
    ta.addEventListener('input', pintar);
    pintar();
  });

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

  function nombreOferta(id) { var p = (cfg.promos || []).filter(function (x) { return x.id === id; })[0]; return p ? p.nombre : id; }

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
      acepta_compromiso: fd.get('acepta') === 'on',
      oferta: fd.get('oferta') || null,
      detalle_oferta: (fd.get('detalle_oferta') || '').trim() || null
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
      _subject: (d.oferta ? '[' + nombreOferta(d.oferta).toUpperCase() + '] ' : '') + 'Nueva aplicación ' + d.plan + ': ' + d.nombre + ' (compromiso ' + d.compromiso + '/10)',
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
      msg.textContent = 'Revisa los campos marcados. Cada respuesta sobre tu compromiso necesita al menos 20 caracteres, más o menos una oración.';
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

// Barra fija de Aplicar en el celular: aparece al pasar la portada y se esconde sobre el formulario
(function () {
  var barra = document.getElementById('barra-fija'), hero = document.querySelector('.hero'), form = document.getElementById('aplicar');
  if (!barra || !hero || !('IntersectionObserver' in window)) return;
  var heroVisible = true, formVisible = false;
  function pintar() { barra.hidden = heroVisible || formVisible; }
  new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; pintar(); }, { threshold: 0.05 }).observe(hero);
  if (form) new IntersectionObserver(function (e) { formVisible = e[0].isIntersecting; pintar(); }, { threshold: 0 }).observe(form);
})();
