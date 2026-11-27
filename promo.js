// Calendario de promociones. Todo sale de VSL_CONFIG.promos: cada una se enciende en "inicio",
// se apaga sola en "termina" o al agotarse los lugares, y solo puede haber una a la vez.
// ?vip en la liga adelanta la promoción que tenga "vipDesde" (acceso anticipado para tu lista).
(function () {
  var cfg = window.VSL_CONFIG || {};
  var ahora = Date.now(), vip = /[?&]vip\b/.test(location.search);
  var P = (cfg.promos || []).filter(function (p) {
    var ini = new Date(vip && p.vipDesde ? p.vipDesde : p.inicio).getTime();
    return ini <= ahora && new Date(p.termina).getTime() > ahora;
  })[0];
  if (!P) return;
  var fin = new Date(P.termina).getTime();
  var precios = P.precios || cfg.precios || { Base: 300, Limitless: 450, 'Élite': 950 };
  var esDesc = P.tipo === 'descuento';

  var fmt = function (n) { return 'Q' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var conDesc = function (n) { return n * (100 - (P.descuento || 0)) / 100; };
  var minimo = Math.min.apply(null, Object.keys(precios).map(function (k) { return conDesc(precios[k]); }));
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function restante() {
    var s = Math.max(0, Math.floor((fin - Date.now()) / 1000));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    var p2 = function (n) { return String(n).padStart(2, '0'); };
    return (d ? d + 'd ' : '') + p2(h) + 'h ' + p2(m) + 'm ' + p2(x) + 's';
  }

  // Textos de cada tipo
  var titulo = P.titulo || (esDesc ? P.nombre + ' · −' + P.descuento + '% en tu primer mes' : P.nombre);
  var texto = P.texto || (esDesc ? 'En cualquier plan: coach, plan personalizado y app desde ' + fmt(minimo) + ' tu primer mes.' : '');
  if (P.condicion) texto = (texto ? texto + ' ' : '') + P.condicion;
  var barraTxt = P.barra || (esDesc ? 'Tu primer mes desde ' + fmt(minimo) : P.nombre);
  var ctaTxt = P.cta || (esDesc ? 'Aprovechar −' + P.descuento + '%' : 'Aplicar al equipo');
  var campo = P.campo || (P.tipo === 'regalo' ? '¿Para quién es el regalo? Su nombre y si son 1 o 3 meses' : '');
  var waRegalo = P.tipo === 'regalo' && cfg.whatsappPublico
    ? 'https://wa.me/' + String(cfg.whatsappPublico).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola Vic, quiero regalar entrenamiento (' + P.nombre + '). Es para: ') : '';

  function montar(lugares) {
    if (lugares !== null && lugares <= 0) return;
    var total = P.lugares;
    var txtLugares = lugares === null ? '' : lugares === 1 ? 'Queda 1 lugar' : (lugares < total ? 'Quedan ' + lugares + ' de ' + total : 'Solo ' + lugares + ' lugares');
    var sep = '<span class="pb-sep">·</span>';
    document.body.classList.add('con-promo', 'promo-' + P.tipo);

    // 1. Franja superior con cuenta regresiva
    var barra = document.createElement('a');
    barra.className = 'promo-barra'; barra.href = waRegalo || '#planes';
    if (waRegalo) { barra.target = '_blank'; barra.rel = 'noopener'; }
    barra.innerHTML = '<span class="pb-fuerte">' + esc(P.nombre) + '</span>' + sep + '<span>' + esc(barraTxt) + '</span>' +
      (txtLugares ? sep + '<span class="pb-lugares">' + txtLugares + '</span>' : '') +
      '<span class="pb-sep pb-ocultar">·</span><span class="pb-reloj pb-ocultar">Termina en <b data-cuenta>' + restante() + '</b></span>';
    document.body.prepend(barra);

    // 2. Portada: frase superior, botón y, si es descuento, el sello
    var hero = $('.hero');
    if (hero) {
      var kicker = $('.hero .eyebrow, .hero .kicker');
      if (kicker) kicker.innerHTML = '<span class="punto"></span>' + esc(P.nombre) + ' · ' +
        (esDesc ? '−' + P.descuento + '% en tu primer mes' + (total ? ' · primeros ' + total : '') : esc(barraTxt.replace(P.nombre + ' · ', '')));
      var cta = $('.hero-ctas .btn');
      if (cta) { cta.textContent = ctaTxt; if (waRegalo) { cta.href = waRegalo; cta.target = '_blank'; cta.rel = 'noopener'; } }
      if (esDesc) {
        var sello = document.createElement('a');
        sello.className = 'promo-sello'; sello.href = '#planes';
        sello.setAttribute('aria-label', P.nombre + ': primer mes desde ' + fmt(minimo) + ', antes ' + fmt(precios.Base));
        sello.innerHTML = '<span class="ps-t">' + esc(P.nombre) + '</span><span class="ps-desde">1er mes desde</span><span class="ps-precio">' + fmt(minimo) +
          '</span><span class="ps-antes">antes <s>' + fmt(precios.Base) + '</s></span>' + (txtLugares ? '<span class="ps-pill">' + txtLugares + '</span>' : '');
        var heroIn = $('.hero-in');
        if (window.matchMedia('(max-width: 900px)').matches && heroIn) heroIn.insertBefore(sello, heroIn.firstChild); else hero.appendChild(sello);
      }
    }

    // 3. Aviso sobre los planes
    var planes = $('#planes .planes') || $('.planes');
    if (planes) {
      var aviso = document.createElement('div');
      aviso.className = 'promo-aviso';
      aviso.innerHTML = '<div><p class="pa-t">' + esc(titulo) + '</p><p class="pa-s">' + esc(texto) +
        (esDesc && total ? ' Solo para los primeros ' + total + ' en aplicar.' : '') + '</p>' +
        (waRegalo ? '<a class="btn pa-btn" href="' + waRegalo + '" target="_blank" rel="noopener">' + esc(ctaTxt) + '</a>' : '') + '</div>' +
        '<div class="pa-der">' + (txtLugares ? '<span class="pa-lugares">' + txtLugares + '</span>' : '') +
        '<span class="pa-reloj">Termina en <b data-cuenta>' + restante() + '</b></span></div>';
      planes.parentNode.insertBefore(aviso, planes);
    }

    // 4. Descuento: precios tachados del primer mes en cada plan y en el formulario
    if (esDesc) {
      document.querySelectorAll('.plan').forEach(function (art) {
        var btn = art.querySelector('[data-plan]'), precio = art.querySelector('.precio');
        if (!btn || !precio || !precios[btn.dataset.plan]) return;
        var base = precios[btn.dataset.plan];
        var nuevo = conDesc(base), entero = Math.floor(nuevo), cent = Math.round((nuevo - entero) * 100);
        precio.innerHTML = '<s class="precio-antes">' + fmt(base) + '</s>Q' + entero.toLocaleString('en-US') + (cent ? '<sup class="precio-cent">.' + String(cent).padStart(2, '0') + '</sup>' : '') + '<span>1er mes</span>';
        var tag = document.createElement('p'); tag.className = 'promo-tag'; tag.textContent = '−' + P.descuento + '% tu primer mes';
        precio.parentNode.insertBefore(tag, precio);
        var nota = art.querySelector('.precio-nota');
        var txt = btn.dataset.plan === 'Limitless'
          ? 'Desde el segundo mes pagas ' + fmt(base) + ', tu precio fundador, que se queda contigo mientras sigas activo.'
          : 'Desde el segundo mes: ' + fmt(base) + ' al mes.';
        if (nota && btn.dataset.plan === 'Limitless') nota.textContent = txt;
        else { var n2 = document.createElement('p'); n2.className = 'precio-nota promo-despues'; n2.textContent = txt; precio.parentNode.insertBefore(n2, precio.nextSibling); }
        art.classList.add('con-oferta');
      });
      document.querySelectorAll('input[name="plan"]').forEach(function (r) {
        var base = precios[r.value]; if (!base) return;
        var s = r.parentNode.querySelector('span'); if (s) s.innerHTML = r.value + ' · ' + fmt(conDesc(base)) + ' 1er mes <s>' + fmt(base) + '</s>';
      });
    }

    // 5. Formulario: código de la promoción, dato extra y aviso
    var form = document.getElementById('form');
    if (form && !form.querySelector('[name="oferta"]')) {
      var h = document.createElement('input'); h.type = 'hidden'; h.name = 'oferta'; h.value = P.id; form.appendChild(h);
      var btnEnviar = form.querySelector('[type=submit]');
      if (campo && btnEnviar) {
        var lab = document.createElement('label'); lab.className = 'promo-campo';
        lab.innerHTML = esc(campo) + '<input name="detalle_oferta" maxlength="300"' + (P.id.indexOf('pareja') === 0 || P.tipo === 'regalo' ? ' required' : '') + '>';
        btnEnviar.parentNode.insertBefore(lab, btnEnviar);
      }
      var nota = document.createElement('p'); nota.className = 'promo-form';
      nota.innerHTML = '<b>' + esc(P.nombre) + ' aplicado:</b> ' + (esDesc
        ? '−' + P.descuento + '% en tu primer mes' + (total ? ' si quedas entre los primeros ' + total : '') + '. Desde el segundo mes pagas el precio normal de tu plan.'
        : P.tipo === 'regalo' ? 'si es sorpresa, llena el formulario con tus datos y escribe arriba para quién es. Yo coordino el resto contigo.'
        : esc(texto));
      if (btnEnviar) btnEnviar.parentNode.insertBefore(nota, btnEnviar);
    }

    // 6. Reloj: actualiza cada segundo y apaga todo al terminar
    var reloj = setInterval(function () {
      if (Date.now() >= fin) { clearInterval(reloj); location.reload(); return; }
      document.querySelectorAll('[data-cuenta]').forEach(function (el) { el.textContent = restante(); });
    }, 1000);
  }

  // Lugares restantes: los controla el coach desde su panel
  if (!P.lugares) return montar(null);
  var clave = P.claveLugares || 'promo_' + P.id + '_lugares';
  if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/ajustes?clave=eq.' + encodeURIComponent(clave) + '&select=valor', {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (f) { montar(f.length ? Number(f[0].valor) : P.lugares); })
      .catch(function () { montar(P.lugares); });
  } else montar(P.lugares);
})();
