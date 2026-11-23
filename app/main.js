import { crearDatos, DIAS, semanaActual, diaSemanaHoy, diasDesde, puedeVideos, checkinCada } from '/shared/data.js';
import { $, $$, esc, fecha, hace, aviso, cargando, vacio, datosForm, barraProgreso, lineaSVG, registrarSW } from '/shared/ui.js';

const raiz = $('#raiz');
let db, yo, bloque;

const ICONOS = {
  hoy: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 9h16M9 3v4M15 3v4"/></svg>',
  checkin: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>',
  tecnica: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="1"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
  progreso: '<svg viewBox="0 0 24 24"><path d="M4 19l5-6 4 3 7-9"/></svg>'
};

init();

async function init() {
  registrarSW();
  db = await crearDatos();
  db.alCambiarSesion(() => arrancar());
  arrancar();
}

async function arrancar() {
  const s = await db.sesionActiva();
  if (!s) return pantallaAcceso();
  yo = await db.yo();
  if (!yo) return pantallaAcceso();
  if (yo.rol === 'coach') { location.href = '/coach/' + location.search; return; }
  if (yo.rol === 'pendiente') return pantallaPendiente();
  bloque = await db.bloqueActivo(yo.id);
  pintarMarco();
  window.onhashchange = enrutar;
  enrutar();
}

/* ------------------------------------------------------------- Acceso */
function pantallaAcceso() {
  raiz.innerHTML = `
  <main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow"><span class="punto"></span>Equipo Limitless</p><h1 class="h1">Tu plan,<br><span class="tenue">tu progreso.</span></h1></div>
    ${db.demo ? `
      <p class="suave">Estás viendo la app en <b>modo demostración</b>, con datos de ejemplo.</p>
      <button class="btn btn-full" id="demo-miembro">Entrar como miembro</button>
      <a class="btn btn-linea btn-full" href="/coach/?demo">Ver panel del coach</a>
    ` : `
      <form class="form" id="f-acceso">
        <label>Tu correo<input type="email" name="correo" required autocomplete="email" placeholder="tu@correo.com"></label>
        <button class="btn btn-full" type="submit">Enviarme el enlace de acceso</button>
      </form>
      <p class="acceso-pie">Te enviamos un enlace a tu correo. Sin contraseñas. Usa el mismo correo con el que aplicaste.</p>
    `}
  </div></main>`;
  if (db.demo) { $('#demo-miembro').onclick = async () => { await db.entrarDemo('miembro'); arrancar(); }; return; }
  $('#f-acceso').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await db.enviarEnlace(datosForm(e.target).correo, '/app/');
      e.target.outerHTML = `<div class="tarjeta"><p class="h3">Revisa tu correo</p><p class="suave" style="margin:8px 0 0">Te enviamos un enlace para entrar. Ábrelo desde este mismo dispositivo.</p></div>`;
    } catch (err) { btn.disabled = false; btn.textContent = 'Enviarme el enlace de acceso'; aviso('No se pudo enviar. Revisa el correo e intenta de nuevo.', 'error'); }
  };
}

function pantallaPendiente() {
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow">Acceso en revisión</p><h1 class="h1">Aún no tienes<br><span class="tenue">un plan activo.</span></h1></div>
    <p class="suave">Tu correo todavía no está en el Equipo Limitless. Si ya hablaste con Vic, en cuanto te active podrás entrar. Si aún no aplicas, hazlo aquí.</p>
    <a class="btn btn-full" href="/#aplicar">Aplicar al equipo</a>
    <button class="link" id="salir">Usar otro correo</button>
  </div></main>`;
  $('#salir').onclick = async () => { await db.salir(); arrancar(); };
}

/* -------------------------------------------------------------- Marco */
function pintarMarco() {
  raiz.innerHTML = `
  ${db.demo ? '<div class="demo-banda"><b>Modo demostración</b> · los datos son de ejemplo y no se guardan</div>' : ''}
  <div class="app">
    <header class="cabecera">
      <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
      <button class="link" id="salir">Salir</button>
    </header>
    <main id="vista" class="vista" tabindex="-1"></main>
  </div>
  <nav class="nav" aria-label="Secciones">
    ${[['hoy', 'Hoy'], ['plan', 'Plan'], ['checkin', 'Check-in'], ['tecnica', 'Técnica'], ['progreso', 'Progreso']]
      .map(([k, t]) => `<a href="#/${k}" data-r="${k}">${ICONOS[k]}<span>${t}</span></a>`).join('')}
  </nav>`;
  $('#salir').onclick = async () => { await db.salir(); location.hash = ''; arrancar(); };
}

function enrutar() {
  const [ruta, param] = (location.hash.replace(/^#\/?/, '') || 'hoy').split('/');
  $$('.nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.r === (ruta === 'sesion' ? 'plan' : ruta)));
  $$('.nav a[aria-current]').forEach(a => a.setAttribute('aria-current', 'page'));
  const v = $('#vista'); cargando(v); window.scrollTo(0, 0);
  const vistas = { hoy: vistaHoy, plan: vistaPlan, sesion: vistaSesion, checkin: vistaCheckin, tecnica: vistaTecnica, progreso: vistaProgreso };
  (vistas[ruta] || vistaHoy)(v, param).catch(err => { console.error(err); v.innerHTML = vacio('Algo salió mal', 'Recarga la página o intenta en un momento.'); });
}

/* --------------------------------------------------------------- Hoy */
async function vistaHoy(v) {
  const nombre = (yo.nombre || '').split(' ')[0];
  if (!bloque) {
    v.innerHTML = `<section class="saludo"><p class="eyebrow">Plan ${esc(yo.plan || '')}</p><h1 class="h1">Hola${nombre ? ', ' + esc(nombre) : ''}.</h1></section>
      ${vacio('Tu plan se está preparando', 'Vic está armando tu primer bloque. Lo verás aquí en menos de 48 horas.')}`;
    return;
  }
  const semana = semanaActual(bloque);
  const [sesiones, checkins] = await Promise.all([db.sesionesSemana(bloque.id, semana), db.checkins(yo.id)]);
  const hechas = sesiones.filter(s => s.registros?.[0]?.completada).length;
  const hoyDia = diaSemanaHoy();
  const deHoy = sesiones.find(s => s.dia === hoyDia);
  const siguiente = deHoy || sesiones.find(s => s.dia > hoyDia && !s.registros?.length) || sesiones.find(s => !s.registros?.length);
  const ultimoCheckin = checkins[0]?.created_at;
  const tocaCheckin = !ultimoCheckin || diasDesde(ultimoCheckin) >= checkinCada(yo.plan) || (yo.plan !== 'Base' && hoyDia === 7 && diasDesde(ultimoCheckin) >= 1);

  v.innerHTML = `
    <section class="saludo"><p class="eyebrow">Plan ${esc(yo.plan)}</p><h1 class="h1">Hola, ${esc(nombre || 'equipo')}.</h1></section>
    <section class="bloque-info">
      <p class="h3">${esc(bloque.nombre)}</p>
      ${barraProgreso(semana, bloque.semanas)}
      <div class="bloque-meta"><span>Semana ${semana} de ${bloque.semanas}</span><span>${hechas} de ${sesiones.length} sesiones esta semana</span></div>
    </section>
    ${siguiente ? tarjetaHoy(siguiente, siguiente === deHoy) : vacio('Semana completa', 'Cumpliste todas tus sesiones. Descansa y prepárate para la siguiente.')}
    ${tocaCheckin ? `<div class="banda-checkin"><p><b>Te toca tu check-in.</b><br><span class="tenue">Toma 3 minutos y con eso ajusto tu plan.</span></p><a class="btn btn-sm" href="#/checkin">Hacerlo</a></div>` : ''}
    <section>
      <p class="eyebrow">Esta semana</p>
      <div class="lista">${sesiones.map(filaSesion).join('') || vacio('Sin sesiones esta semana')}</div>
    </section>`;
}

function tarjetaHoy(s, esHoy) {
  const hecha = s.registros?.[0]?.completada;
  return `<a class="hoy ${hecha ? 'hecha' : ''}" href="#/sesion/${s.id}">
    <p class="eyebrow">${hecha ? 'Completada' : esHoy ? 'Hoy' : 'Siguiente · ' + DIAS[s.dia - 1]}</p>
    <h2 class="h2">${esc(s.titulo)}</h2>
    <div class="hoy-pie"><span>${s.items.length} ejercicios · ${esc(s.tipo)}</span><span class="flecha">→</span></div>
  </a>`;
}

function filaSesion(s) {
  const hecha = s.registros?.[0]?.completada; const esHoy = s.dia === diaSemanaHoy();
  return `<a class="fila" href="#/sesion/${s.id}">
    <span class="estado ${hecha ? 'hecho' : esHoy ? 'hoy' : ''}" aria-label="${hecha ? 'Completada' : 'Pendiente'}"></span>
    <span class="fila-cuerpo"><p class="fila-t">${esc(s.titulo)}</p><p class="fila-s">${DIAS[s.dia - 1]} · ${esc(s.tipo)} · ${s.items.length} ejercicios</p></span>
    <span class="fila-fin">→</span></a>`;
}

/* -------------------------------------------------------------- Plan */
async function vistaPlan(v, sem) {
  if (!bloque) { v.innerHTML = vacio('Tu plan se está preparando', 'Lo verás aquí muy pronto.'); return; }
  const actual = semanaActual(bloque); const semana = Number(sem) || actual;
  const sesiones = await db.sesionesSemana(bloque.id, semana);
  v.innerHTML = `
    <section><p class="eyebrow">${esc(bloque.nombre)}</p><h1 class="h1">Semana ${semana}</h1></section>
    <div class="semanas" role="group" aria-label="Semanas">${Array.from({ length: bloque.semanas }, (_, i) => i + 1)
      .map(n => `<button type="button" data-s="${n}" aria-pressed="${n === semana}">Sem ${n}${n === actual ? ' ·' : ''}</button>`).join('')}</div>
    ${bloque.notas ? `<div class="burbuja burbuja-coach"><small>Nota de Vic</small>${esc(bloque.notas)}</div>` : ''}
    <div class="lista">${sesiones.map(filaSesion).join('') || vacio('Sin sesiones en esta semana')}</div>`;
  $$('.semanas button', v).forEach(b => b.onclick = () => { location.hash = '#/plan/' + b.dataset.s; });
}

/* ------------------------------------------------------------ Sesión */
async function vistaSesion(v, id) {
  const s = await db.sesion(id);
  const reg = s.registros?.[0];
  const res = reg?.resultados || {};
  const esCarrera = t => ['carrera', 'bici'].includes(t);
  v.innerHTML = `
    <button class="volver" type="button" onclick="history.back()">← Volver</button>
    <section><p class="eyebrow">${DIAS[s.dia - 1]} · Semana ${s.semana} · ${esc(s.tipo)}</p><h1 class="h1">${esc(s.titulo)}</h1>
      ${s.notas ? `<p class="suave" style="margin:12px 0 0">${esc(s.notas)}</p>` : ''}</section>
    <form id="f-sesion" class="form">
      <div>${s.items.map(it => `
        <div class="ejercicio">
          <div class="ejercicio-t"><h3>${esc(it.ejercicio)}</h3>${it.video_url ? `<a class="link" href="${esc(it.video_url)}" target="_blank" rel="noopener">Ver técnica</a>` : ''}</div>
          <p class="prescripcion">
            ${it.series ? `<span><b>${esc(it.series)}</b> series</span>` : ''}${it.reps ? `<span><b>${esc(it.reps)}</b></span>` : ''}
            ${it.carga ? `<span>Carga <b>${esc(it.carga)}</b></span>` : ''}${it.ritmo ? `<span>Ritmo <b>${esc(it.ritmo)}</b></span>` : ''}
            ${it.descanso ? `<span>Descanso <b>${esc(it.descanso)}</b></span>` : ''}</p>
          ${it.nota ? `<p class="tenue" style="font-size:13px;margin:6px 0 0">${esc(it.nota)}</p>` : ''}
          <label class="real"><span class="tenue" style="font-size:12px">${esCarrera(s.tipo) || it.ritmo ? 'Tu tiempo o ritmo real' : 'Tu carga y reps reales'}</span>
            <input name="r_${it.id}" value="${esc(res[it.id] || '')}" placeholder="${esCarrera(s.tipo) || it.ritmo ? 'Ej. 35 min a 6:45 /km' : 'Ej. 22 kg × 8, 8, 7, 7'}"></label>
        </div>`).join('')}</div>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">
        <legend class="eyebrow" style="padding:0">¿Qué tan dura fue? (RPE 1–10)</legend>
        <div class="escala">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<label><input type="radio" name="rpe" value="${n}" ${reg?.rpe === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        <p class="tenue" style="font-size:12px;margin:0">1 = muy fácil · 10 = esfuerzo máximo</p>
      </fieldset>
      <label>Nota para Vic (opcional)<textarea name="nota" rows="2" placeholder="Cómo te sentiste, molestias, dudas…">${esc(reg?.nota || '')}</textarea></label>
      <div class="registro-pie">
        <button class="btn btn-full ${reg?.completada ? '' : 'btn-rojo'}" type="submit">${reg?.completada ? 'Guardar cambios' : 'Marcar como completada'}</button>
        ${reg ? '<button class="link" type="button" id="desmarcar">Desmarcar sesión</button>' : ''}
      </div>
    </form>`;
  $('#f-sesion').onsubmit = async e => {
    e.preventDefault();
    const d = datosForm(e.target); const resultados = {};
    s.items.forEach(it => { if (d['r_' + it.id]) resultados[it.id] = d['r_' + it.id]; });
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await db.guardarRegistro(s, { completada: true, rpe: d.rpe ? Number(d.rpe) : null, nota: d.nota || null, resultados });
      aviso(reg ? 'Cambios guardados' : 'Sesión completada. Así se construye.');
      location.hash = '#/hoy';
    } catch (err) { btn.disabled = false; aviso('No se pudo guardar. Revisa tu conexión.', 'error'); }
  };
  const des = $('#desmarcar');
  if (des) des.onclick = async () => { await db.borrarRegistro(s.id); aviso('Sesión desmarcada'); enrutar(); };
}

/* ----------------------------------------------------------- Check-in */
async function vistaCheckin(v) {
  const [checkins] = await Promise.all([db.checkins(yo.id)]);
  let cumplidas = '';
  if (bloque) { const ss = await db.sesionesSemana(bloque.id, semanaActual(bloque)); cumplidas = ss.filter(s => s.registros?.[0]?.completada).length; }
  const escala = (n, nombre) => `<div class="escala">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="${nombre}" value="${i}" required><span>${i}</span></label>`).join('')}</div>`;
  v.innerHTML = `
    <section><p class="eyebrow">Check-in ${yo.plan === 'Base' ? 'mensual' : 'semanal'}</p><h1 class="h1">¿Cómo vas?</h1>
      <p class="suave" style="margin:10px 0 0">Tres minutos. Con esto ajusto tu plan.</p></section>
    <form id="f-checkin" class="form">
      <div class="grid2">
        <label>Peso (kg)<input type="number" name="peso" step="0.1" min="30" max="250" inputmode="decimal" placeholder="Opcional"></label>
        <label>Sesiones cumplidas<input type="number" name="sesiones_cumplidas" min="0" max="14" value="${cumplidas}" required></label>
      </div>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px"><legend class="eyebrow" style="padding:0">Calidad de sueño (1–5)</legend>${escala(5, 'sueno')}</fieldset>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px"><legend class="eyebrow" style="padding:0">Nivel de energía (1–5)</legend>${escala(5, 'energia')}</fieldset>
      <label>¿Cómo te fue esta semana?<textarea name="comentario" rows="3" required placeholder="Qué salió bien, qué costó, molestias, cambios en tu agenda…"></textarea></label>
      <button class="btn btn-rojo btn-full" type="submit">Enviar check-in</button>
    </form>
    <section><p class="eyebrow">Historial</p>
      <div class="lista">${checkins.map(c => `
        <div class="ejercicio" style="display:flex;flex-direction:column;gap:10px">
          <div class="ejercicio-t"><span class="h3">${fecha(c.created_at, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span class="tenue" style="font-size:13px">${c.peso ? c.peso + ' kg · ' : ''}Sueño ${c.sueno}/5 · Energía ${c.energia}/5</span></div>
          <div class="burbuja"><small>Tú</small>${esc(c.comentario)}</div>
          ${c.respuesta ? `<div class="burbuja burbuja-coach"><small>Vic</small>${esc(c.respuesta)}</div>` : '<p class="tenue" style="font-size:13px;margin:0">Vic lo revisará pronto.</p>'}
        </div>`).join('') || vacio('Aún no tienes check-ins')}</div></section>`;
  $('#f-checkin').onsubmit = async e => {
    e.preventDefault(); const d = datosForm(e.target);
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      await db.crearCheckin({ peso: d.peso ? Number(d.peso) : null, sueno: Number(d.sueno), energia: Number(d.energia), sesiones_cumplidas: Number(d.sesiones_cumplidas), comentario: d.comentario });
      aviso('Check-in enviado. Vic te responde pronto.'); enrutar();
    } catch (err) { btn.disabled = false; aviso('No se pudo enviar. Intenta de nuevo.', 'error'); }
  };
}

/* ------------------------------------------------------------ Técnica */
async function vistaTecnica(v) {
  if (!puedeVideos(yo.plan)) {
    v.innerHTML = `<section><p class="eyebrow">Revisión de técnica</p><h1 class="h1">Graba. Corrijo.<br><span class="tenue">Mejoras.</span></h1></section>
      <div class="upsell"><p class="h3">Disponible en Limitless y Élite</p>
      <p class="suave" style="margin:0">Subes un video corto de tus series clave y te devuelvo correcciones concretas, ejercicio por ejercicio. Escríbele a Vic si quieres cambiar de plan.</p></div>`;
    return;
  }
  const [videos, sesiones] = await Promise.all([db.videos(yo.id), bloque ? db.sesionesSemana(bloque.id, semanaActual(bloque)) : []]);
  const ejercicios = [...new Set(sesiones.flatMap(s => s.items.map(i => i.ejercicio)))];
  v.innerHTML = `
    <section><p class="eyebrow">Revisión de técnica</p><h1 class="h1">Graba. Corrijo.<br><span class="tenue">Mejoras.</span></h1></section>
    <form id="f-video" class="form tarjeta">
      <label>Ejercicio
        <input name="ejercicio" list="lista-ej" required placeholder="Ej. Sentadilla goblet">
        <datalist id="lista-ej">${ejercicios.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
      <label>Video (máx. 50 MB, unos 30–60 segundos)<input type="file" name="video" accept="video/*" required></label>
      <label>¿Qué quieres que revise? (opcional)<input name="nota" placeholder="Ej. siento que se me van las rodillas hacia adentro"></label>
      <button class="btn btn-full" type="submit">Subir video</button>
      <p class="tenue" style="font-size:12px;margin:0">Graba de lado o en diagonal, con todo el cuerpo en cuadro y buena luz.</p>
    </form>
    <section><p class="eyebrow">Tus videos</p>
      <div class="lista">${videos.map(vd => `
        <div class="ejercicio video-fila" data-id="${vd.id}">
          <div class="ejercicio-t"><h3>${esc(vd.ejercicio)}</h3>
            <span class="chip ${vd.estado === 'revisado' ? 'chip-ok' : 'chip-ambar'}">${vd.estado === 'revisado' ? 'Revisado' : 'Pendiente'}</span></div>
          <p class="fila-s">${fecha(vd.created_at)}${vd.nota ? ' · ' + esc(vd.nota) : ''}</p>
          ${vd.comentario ? `<div class="burbuja burbuja-coach" style="margin-top:12px"><small>Vic</small>${esc(vd.comentario)}</div>` : ''}
          ${vd.ruta ? `<button class="link" type="button" data-ver="${esc(vd.ruta)}" style="margin-top:10px">Ver video</button>` : ''}
        </div>`).join('') || vacio('Aún no subes videos')}</div></section>`;
  $$('[data-ver]', v).forEach(b => b.onclick = async () => {
    const url = await db.urlVideo(b.dataset.ver);
    b.outerHTML = `<video src="${esc(url)}" controls playsinline preload="metadata"></video>`;
  });
  $('#f-video').onsubmit = async e => {
    e.preventDefault(); const f = e.target; const archivo = f.video.files[0];
    if (!archivo) return;
    if (archivo.size > 50 * 1024 * 1024) { aviso('El video pesa más de 50 MB. Recórtalo o grábalo más corto.', 'error'); return; }
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Subiendo…';
    try { await db.subirVideo(archivo, f.ejercicio.value.trim(), f.nota.value.trim() || null); aviso('Video enviado. Vic lo revisa pronto.'); enrutar(); }
    catch (err) { btn.disabled = false; btn.textContent = 'Subir video'; aviso('No se pudo subir el video. Intenta de nuevo.', 'error'); }
  };
}

/* ----------------------------------------------------------- Progreso */
async function vistaProgreso(v) {
  const [regs, checkins] = await Promise.all([db.registros(yo.id), db.checkins(yo.id)]);
  const completadas = regs.filter(r => r.completada).length;
  let adherencias = [];
  if (bloque) {
    const actual = semanaActual(bloque);
    for (let s = 1; s <= actual; s++) {
      const ss = await db.sesionesSemana(bloque.id, s);
      if (ss.length) adherencias.push({ x: 'S' + s, y: Math.round(ss.filter(x => x.registros?.[0]?.completada).length / ss.length * 100) });
    }
  }
  const pesos = [...checkins].reverse().filter(c => c.peso).map(c => ({ x: fecha(c.created_at), y: Number(c.peso) }));
  const rpes = regs.filter(r => r.rpe).slice(0, 12).reverse().map((r, i) => ({ x: String(i + 1), y: r.rpe }));
  const promAdh = adherencias.length ? Math.round(adherencias.reduce((a, b) => a + b.y, 0) / adherencias.length) : 0;
  v.innerHTML = `
    <section><p class="eyebrow">Progreso</p><h1 class="h1">Lo que no se mide,<br><span class="tenue">no mejora.</span></h1></section>
    <div class="cifras">
      <div class="cifra"><span class="num">${completadas}</span><small>Sesiones</small></div>
      <div class="cifra"><span class="num">${promAdh}%</span><small>Constancia</small></div>
      <div class="cifra"><span class="num">${checkins.length}</span><small>Check-ins</small></div>
    </div>
    <section><p class="eyebrow">Constancia por semana</p>${lineaSVG(adherencias, { sufijo: '%' })}
      <p class="tenue" style="font-size:12px;margin:8px 0 0">La meta es 80% o más. Constancia le gana a perfección.</p></section>
    <section><p class="eyebrow">Peso corporal</p>${lineaSVG(pesos, { sufijo: '' })}</section>
    <section><p class="eyebrow">Esfuerzo percibido (últimas sesiones)</p>${lineaSVG(rpes)}</section>`;
}
