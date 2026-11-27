// Promoción temporal (Black Friday). Todo sale de VSL_CONFIG.promo y se apaga solo al vencer o al agotarse los lugares.
(function () {
  var cfg = window.VSL_CONFIG || {}, P = cfg.promo;
  if (!P || !P.id) return;
  var fin = new Date(P.termina).getTime();
  if (!(fin > Date.now())) return;

  var fmt = function (n) { return 'Q' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var conDesc = function (n) { return n * (100 - P.descuento) / 100; };
  var minimo = Math.min.apply(null, Object.keys(P.precios).map(function (k) { return conDesc(P.precios[k]); }));
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function restante() {
    var s = Math.max(0, Math.floor((fin - Date.now()) / 1000));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    var p2 = function (n) { return String(n).padStart(2, '0'); };
    return (d ? d + 'd ' : '') + p2(h) + 'h ' + p2(m) + 'm ' + p2(x) + 's';
  }

  function montar(lugares) {
    if (lugares <= 0) return;
    var txtLugares = lugares === 1 ? 'Queda 1 lugar' : (lugares < P.lugaresTotales ? 'Quedan ' + lugares + ' de ' + P.lugaresTotales : 'Solo ' + lugares + ' lugares');
    document.body.classList.add('con-promo');

    // 1. Franja superior con cuenta regresiva
    var barra = document.createElement('a');
    barra.className = 'promo-barra'; barra.href = '#planes';
    barra.innerHTML = '<span class="pb-fuerte">' + P.nombre + '</span><span class="pb-sep">·</span><span>Coach + app desde ' + fmt(minimo) + '</span>' +
      '<span class="pb-sep">·</span><span class="pb-lugares">' + txtLugares + '</span><span class="pb-sep pb-ocultar">·</span>' +
      '<span class="pb-reloj pb-ocultar">Termina en <b data-cuenta>' + restante() + '</b></span>';
    document.body.prepend(barra);

    // 2. Sello en la portada
    var hero = $('.hero');
    if (hero) {
      var sello = document.createElement('a');
      sello.className = 'promo-sello'; sello.href = '#planes';
      sello.setAttribute('aria-label', P.nombre + ': desde ' + fmt(minimo) + ', antes ' + fmt(P.precios.Base));
      sello.innerHTML = '<span class="ps-t">' + P.nombre + '</span><span class="ps-desde">desde</span><span class="ps-precio">' + fmt(minimo) +
        '</span><span class="ps-antes">antes <s>' + fmt(P.precios.Base) + '</s></span><span class="ps-pill">' + txtLugares + '</span>';
      var heroIn = $('.hero-in');
      if (window.matchMedia('(max-width: 900px)').matches && heroIn) heroIn.insertBefore(sello, heroIn.firstChild); else hero.appendChild(sello);
      var kicker = $('.hero .eyebrow, .hero .kicker');
      if (kicker) kicker.innerHTML = '<span class="punto"></span>' + P.nombre + ' · −' + P.descuento + '% para los primeros ' + P.lugaresTotales;
      var cta = $('.hero-ctas .btn');
      if (cta) cta.textContent = 'Aprovechar −' + P.descuento + '%';
    }

    // 3. Aviso sobre los planes
    var planes = $('#planes .planes') || $('.planes');
    if (planes) {
      var aviso = document.createElement('div');
      aviso.className = 'promo-aviso';
      aviso.innerHTML = '<div><p class="pa-t">' + P.nombre + ' · −' + P.descuento + '% en cualquier plan</p><p class="pa-s">Coach, plan personalizado y app por menos de Q8 al día. Solo para los primeros ' + P.lugaresTotales + ' en aplicar.</p></div>' +
        '<div class="pa-der"><span class="pa-lugares">' + txtLugares + '</span><span class="pa-reloj">Termina en <b data-cuenta>' + restante() + '</b></span></div>';
      planes.parentNode.insertBefore(aviso, planes);
    }

    // 4. Precios tachados en cada plan y en el formulario
    document.querySelectorAll('.plan').forEach(function (art) {
      var btn = art.querySelector('[data-plan]'), precio = art.querySelector('.precio');
      if (!btn || !precio || !P.precios[btn.dataset.plan]) return;
      var base = P.precios[btn.dataset.plan];
      var nuevo = conDesc(base), entero = Math.floor(nuevo), cent = Math.round((nuevo - entero) * 100);
      precio.innerHTML = '<s class="precio-antes">' + fmt(base) + '</s>Q' + entero.toLocaleString('en-US') + (cent ? '<sup class="precio-cent">.' + String(cent).padStart(2, '0') + '</sup>' : '') + '<span>/ mes</span>';
      var tag = document.createElement('p'); tag.className = 'promo-tag'; tag.textContent = '−' + P.descuento + '% ' + P.nombre;
      precio.parentNode.insertBefore(tag, precio);
      art.classList.add('con-oferta');
    });
    document.querySelectorAll('input[name="plan"]').forEach(function (r) {
      var base = P.precios[r.value]; if (!base) return;
      var s = r.parentNode.querySelector('span'); if (s) s.innerHTML = r.value + ' · ' + fmt(conDesc(base)) + ' <s>' + fmt(base) + '</s>';
    });
    var form = document.getElementById('form');
    if (form && !form.querySelector('[name="oferta"]')) {
      var h = document.createElement('input'); h.type = 'hidden'; h.name = 'oferta'; h.value = P.id; form.appendChild(h);
      var nota = document.createElement('p'); nota.className = 'promo-form';
      nota.innerHTML = '<b>' + P.nombre + ' aplicado:</b> −' + P.descuento + '% si quedas entre los primeros ' + P.lugaresTotales + '.';
      var btnEnviar = form.querySelector('[type=submit]'); if (btnEnviar) btnEnviar.parentNode.insertBefore(nota, btnEnviar);
    }

    // 5. Reloj: actualiza cada segundo y apaga todo al terminar
    var reloj = setInterval(function () {
      if (Date.now() >= fin) { clearInterval(reloj); location.reload(); return; }
      document.querySelectorAll('[data-cuenta]').forEach(function (el) { el.textContent = restante(); });
    }, 1000);
  }

  // Lugares restantes: los controla el coach desde su panel
  if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/ajustes?clave=eq.promo_bf_lugares&select=valor', {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (f) { montar(f.length ? Number(f[0].valor) : P.lugaresTotales); })
      .catch(function () { montar(P.lugaresTotales); });
  } else montar(P.lugaresTotales);
})();
