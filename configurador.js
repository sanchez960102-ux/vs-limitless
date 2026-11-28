// "Arma tu plan": 3 preguntas, el plan que conviene con su precio y el formulario ya lleno.
(function () {
  var raiz = document.getElementById('arma-plan');
  var form = document.getElementById('form');
  if (!raiz) return;
  var cfg = window.VSL_CONFIG || {};
  var precios = cfg.precios || { Base: 300, Limitless: 450, 'Élite': 950 };
  var ahora = Date.now();
  var P = (cfg.promos || []).filter(function (p) { return new Date(p.inicio).getTime() <= ahora && new Date(p.termina).getTime() > ahora; })[0];
  var desc = P && P.tipo === 'descuento' ? P.descuento : 0;
  var espera = cfg.listaEspera || [];
  var fmt = function (n) { return 'Q' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

  var PREG = [
    { k: 'objetivo', t: '¿Qué buscas?', o: [
      ['Empezar a entrenar desde cero', 'Empezar desde cero'],
      ['Objetivo estético: músculo o grasa', 'Cambiar mi físico'],
      ['Running o resistencia', 'Correr más y mejor'],
      ['Preparación física para un deporte o prueba', 'Prepararme para un deporte o prueba']] },
    { k: 'fecha', t: '¿Tienes una fecha?', o: [
      ['si', 'Sí, una carrera o evento'],
      ['no', 'No, quiero mejorar sin fecha']] },
    { k: 'acomp', t: '¿Cuánto acompañamiento quieres?', o: [
      ['solo', 'Mi plan y avanzo por mi cuenta'],
      ['ajustes', 'Ajustes seguidos y que revises mi técnica'],
      ['directo', 'Contacto directo conmigo cada semana']] }
  ];
  var INCLUYE = {
    Base: ['Plan en bloques de 4 semanas', 'Tus sesiones en la app con video', 'Check-in mensual y ajuste por bloque'],
    Limitless: ['Ajustes del plan cada 2 semanas', 'Revisión de técnica por video', 'Check-in semanal y WhatsApp entre semana'],
    'Élite': ['Ajustes semanales', 'Videollamada conmigo cada 2 semanas', 'Periodización hacia tu evento']
  };
  var r = {};

  function recomendar() {
    var plan = r.acomp === 'directo' ? 'Élite' : r.acomp === 'ajustes' ? 'Limitless' : 'Base';
    var porque;
    if (plan === 'Élite') porque = r.fecha === 'si'
      ? 'Tienes fecha y quieres contacto directo: armo tu temporada semana a semana hasta el día del evento.'
      : 'Quieres a tu coach cerca: ajustes cada semana y una videollamada cada 2 semanas para no perder el rumbo.';
    else if (plan === 'Limitless') porque = r.fecha === 'si'
      ? 'Con ajustes cada 2 semanas llegas a tu fecha con el plan corregido sobre la marcha. Si tu evento es en menos de 12 semanas, Élite te da una periodización completa hacia ese día.'
      : r.objetivo === 'Objetivo estético: músculo o grasa'
        ? 'Cambiar el físico es cuestión de ajustar a tiempo: reviso tu técnica, tu progresión de cargas y corrijo cada 2 semanas.'
        : 'El equilibrio entre estructura y seguimiento: revisamos tu técnica y ajustamos cada 2 semanas.';
    else porque = r.objetivo === 'Empezar a entrenar desde cero'
      ? 'Para empezar bien necesitas estructura clara y técnica en video. Cuando quieras más seguimiento, subes de plan.'
      : 'Tienes disciplina para avanzar solo: te doy el plan en bloques y lo ajusto al cerrar cada uno.';
    if (r.fecha === 'si' && plan === 'Base') porque += ' Con fecha en el calendario, te conviene Limitless para corregir sobre la marcha.';
    return { plan: plan, porque: porque };
  }

  function pintarResultado() {
    var res = raiz.querySelector('.ap-res');
    var listo = PREG.every(function (q) { return r[q.k]; });
    if (!listo) {
      var faltan = PREG.filter(function (q) { return !r[q.k]; }).length;
      res.innerHTML = '<p class="eyebrow">Tu plan</p><p class="ap-vacio">Responde ' + (faltan === 3 ? 'las 3 preguntas' : faltan === 1 ? 'la última pregunta' : 'las ' + faltan + ' preguntas') + ' y te digo cuál te conviene y cuánto cuesta.</p>';
      res.classList.remove('ap-listo');
      return;
    }
    var x = recomendar(), base = precios[x.plan], enEspera = espera.indexOf(x.plan) >= 0;
    var precio = desc ? '<s>' + fmt(base) + '</s>' + fmt(base * (100 - desc) / 100) + '<span>tu primer mes</span>' : fmt(base) + '<span>al mes</span>';
    res.innerHTML = '<p class="eyebrow">Te recomiendo</p><h3 class="ap-plan">' + x.plan + '</h3>' +
      '<p class="ap-precio">' + precio + '</p>' +
      (desc ? '<p class="ap-nota">' + P.nombre + ' −' + desc + '%. Desde el segundo mes: ' + fmt(base) + '.</p>' : '') +
      '<p class="ap-porque">' + x.porque + '</p>' +
      '<ul class="ap-incluye">' + INCLUYE[x.plan].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      '<a href="#aplicar" class="btn btn-full ap-cta">' + (enEspera ? 'Unirme a la lista de espera' : 'Aplicar a ' + x.plan) + '</a>' +
      '<p class="ap-mini">Tus respuestas pasan solas al formulario.</p>';
    res.classList.add('ap-listo');
    res.querySelector('.ap-cta').addEventListener('click', function () { llenar(x.plan); });
  }

  function llenar(plan) {
    if (!form) return;
    var radio = form.querySelector('input[name="plan"][value="' + plan + '"]'); if (radio) radio.checked = true;
    var sel = form.querySelector('select[name="objetivo"]'); if (sel) sel.value = r.objetivo;
    var meta = form.querySelector('input[name="meta"]');
    if (meta && !meta.value && r.fecha === 'si') meta.placeholder = 'Ej. Mi primer 21K en junio: escribe tu evento y su fecha';
  }

  raiz.innerHTML = '<div class="ap-preg">' + PREG.map(function (q, i) {
    return '<fieldset class="ap-q"><legend><span>0' + (i + 1) + '</span>' + q.t + '</legend><div class="ap-ops">' +
      q.o.map(function (o) { return '<button type="button" class="ap-op" data-k="' + q.k + '" data-v="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join('') +
      '</div></fieldset>';
  }).join('') + '</div><aside class="ap-res" aria-live="polite"></aside>';

  raiz.addEventListener('click', function (e) {
    var b = e.target.closest('.ap-op'); if (!b) return;
    r[b.dataset.k] = b.dataset.v;
    raiz.querySelectorAll('.ap-op[data-k="' + b.dataset.k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    var antes = raiz.querySelector('.ap-res').classList.contains('ap-listo');
    pintarResultado();
    var res = raiz.querySelector('.ap-res');
    if (!antes && res.classList.contains('ap-listo') && window.matchMedia('(max-width: 900px)').matches) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  pintarResultado();
})();
