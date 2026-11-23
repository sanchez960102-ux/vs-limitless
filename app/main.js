import { crearDatos, DIAS, semanaActual, diaSemanaHoy, diasDesde, puedeVideos, checkinCada } from '/shared/data.js';
import { $, $$, esc, fecha, aviso, cargando, vacio, datosForm, dialogo, registrarSW } from '/shared/ui.js';

const raiz = $('#raiz');
let db, yo, bloque;

const FOTOS = { fuerza: '/img/app/fuerza.jpg', carrera: '/img/app/carrera.jpg', bici: '/img/app/bici.jpg', movilidad: '/img/app/movilidad.jpg', mixta: '/img/app/movilidad.jpg' };
const TIPO_TXT = { fuerza: 'Fuerza', carrera: 'Carrera', bici: 'Bici', movilidad: 'Movilidad', mixta: 'Mixta' };
const ICONOS = {
  hoy: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>',
  checkin: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  tecnica: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
  progreso: '<svg viewBox="0 0 24 24"><path d="M5 19V11M12 19V5M19 19v-6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>'
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
      <button class="btn btn-full btn-pill" id="demo-miembro">Entrar como miembro</button>
      <a class="btn btn-linea btn-full btn-pill" href="/coach/?demo">Ver panel del coach</a>
    ` : `
      <form class="form" id="f-acceso">
        <label>Tu correo<input type="email" name="correo" required autocomplete="email" placeholder="tu@correo.com"></label>
        <button class="btn btn-full btn-pill" type="submit">Enviarme el enlace de acceso</button>
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
    <a class="btn btn-full btn-pill" href="/#aplicar">Aplicar al equipo</a>
    <button class="link" id="salir">Usar otro correo</button>
  </div></main>`;
  $('#salir').onclick = async () => { await db.salir(); arrancar(); };
}

/* -------------------------------------------------------------- Marco */
function pintarMarco() {
  const nombre = (yo.nombre || '').split(' ')[0] || 'equipo';
  const iniciales = (yo.nombre || yo.correo).split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  raiz.innerHTML = `
  ${db.demo ? '<div class="demo-banda"><b>Modo demostración</b> · los datos son de ejemplo y no se guardan</div>' : ''}
  <div class="app">
    <header class="cabecera">
      <div class="saludo-c">
        <button class="avatar" id="perfil" aria-label="Mi cuenta">${esc(iniciales)}</button>
        <div><p class="saludo-t">Hola, ${esc(nombre)}</p><p class="saludo-s">${saludoSub()}</p></div>
      </div>
      <img class="logo-mini" src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    </header>
    <main id="vista" class="vista" tabindex="-1"></main>
  </div>
  <nav class="nav" aria-label="Secciones">
    ${[['hoy', 'Inicio'], ['plan', 'Entrenos'], ['checkin', 'Check-in'], ['tecnica', 'Técnica'], ['progreso', 'Progreso']]
      .map(([k, t]) => `<a href="#/${k}" data-r="${k}">${ICONOS[k]}<span>${t}</span></a>`).join('')}
  </nav>`;
  $('#perfil').onclick = () => dialogo(`<div class="menu-hoja">
      <p class="eyebrow">Mi cuenta</p><h2 class="h2">${esc(yo.nombre || '')}</h2>
      <p class="suave" style="margin:0">${esc(yo.correo)} · Plan ${esc(yo.plan || '')}</p>
      ${yo.objetivo ? `<div class="burbuja"><small>Mi objetivo</small>${esc(yo.objetivo)}</div>` : ''}
      <button class="btn btn-linea btn-full btn-pill" id="salir">Cerrar sesión</button></div>`, d => {
    $('#salir', d).onclick = async () => { d.close(); await db.salir(); location.hash = ''; arrancar(); };
  });
}

function saludoSub() {
  const h = new Date().getHours();
  if (h < 12) return '¿Listo para construir hoy?';
  if (h < 19) return 'Un día más cerca de tu meta.';
  return 'Recupera bien, mañana se entrena.';
}

function enrutar() {
  const [ruta, param] = (location.hash.replace(/^#\/?/, '') || 'hoy').split('/');
  const activa = ruta === 'sesion' ? 'plan' : ruta;
  $$('.nav a').forEach(a => a.dataset.r === activa ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const v = $('#vista'); cargando(v); window.scrollTo(0, 0);
  const vistas = { hoy: vistaHoy, plan: vistaPlan, sesion: vistaSesion, checkin: vistaCheckin, tecnica: vistaTecnica, progreso: vistaProgreso };
  (vistas[ruta] || vistaHoy)(v, param).catch(err => { console.error(err); v.innerHTML = vacio('Algo salió mal', 'Recarga la página o intenta en un momento.'); });
}

/* ---------------------------------------------------------- Piezas UI */
function anillo(pct, centro, sub) {
  const r = 50, c = 2 * Math.PI * r, off = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return `<div class="anillo"><svg viewBox="0 0 120 120"><circle class="pista" cx="60" cy="60" r="${r}"/>
    <circle class="valor" cx="60" cy="60" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
    <div class="anillo-c"><b>${centro}</b><span>${sub}</span></div></div>`;
}

function tarjetaEntreno(s, { grande = false, etiqueta } = {}) {
  const hecha = s.registros?.[0]?.completada;
  const series = s.items.reduce((a, i) => a + (parseInt(i.series, 10) || 0), 0);
  return `<a class="entreno ${grande ? 'grande' : ''} ${hecha ? 'hecha' : ''}" href="#/sesion/${s.id}">
    <span class="entreno-foto" style="background-image:url('${FOTOS[s.tipo] || FOTOS.fuerza}')"></span>
    ${hecha ? '<span class="entreno-hecha">Completada</span>' : ''}
    <span class="entreno-in">
      <span class="tag">${esc(etiqueta || DIAS[s.dia - 1])}</span>
      <h3>${esc(s.titulo)}</h3>
      <span class="meta">${s.items.length} ejercicios${series ? ' · ' + series + ' series' : ''} · ${TIPO_TXT[s.tipo] || s.tipo}</span>
      <span class="entreno-flecha" aria-hidden="true">→</span>
    </span></a>`;
}

/* --------------------------------------------------------------- Hoy */
async function vistaHoy(v) {
  if (!bloque) {
    v.innerHTML = `<div class="card">${vacio('Tu plan se está preparando', 'Vic está armando tu primer bloque. Lo verás aquí en menos de 48 horas.')}</div>`;
    return;
  }
  const semana = semanaActual(bloque);
  const [sesiones, checkins, regs] = await Promise.all([db.sesionesSemana(bloque.id, semana), db.checkins(yo.id), db.registros(yo.id)]);
  const hechas = sesiones.filter(s => s.registros?.[0]?.completada);
  const pct = sesiones.length ? Math.round(hechas.length / sesiones.length * 100) : 0;
  const hoyDia = diaSemanaHoy();
  const deHoy = sesiones.find(s => s.dia === hoyDia);
  const siguiente = deHoy || sesiones.find(s => s.dia > hoyDia && !s.registros?.length) || sesiones.find(s => !s.registros?.length);
  const ultimoCheckin = checkins[0]?.created_at;
  const diasCheck = diasDesde(ultimoCheckin);
  const tocaCheckin = !ultimoCheckin || diasCheck >= checkinCada(yo.plan) || (yo.plan !== 'Base' && hoyDia === 7 && diasCheck >= 1);
  const rpes = hechas.map(s => s.registros[0].rpe).filter(Boolean);
  const rpeProm = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '–';
  const racha = rachaSemanas(regs);

  const barras = DIAS.map((d, i) => {
    const dia = i + 1; const ss = sesiones.filter(s => s.dia === dia);
    const hecho = ss.some(s => s.registros?.[0]?.completada);
    const alto = hecho ? 88 : ss.length ? 46 : 14;
    return `<div class="barra ${hecho ? 'hecha' : ss.length ? 'prog' : ''} ${dia === hoyDia ? 'hoy' : ''}"><i style="height:${alto}px"></i><span>${d[0]}</span></div>`;
  }).join('');

  v.innerHTML = `
    <section class="card">
      <p class="card-t">Tu semana <small>Semana ${semana} de ${bloque.semanas}</small></p>
      <div class="progreso">
        ${anillo(pct, pct + '%', 'completado')}
        <ul class="datos-l">
          <li><i style="background:var(--rojo)"></i>Sesiones<b>${hechas.length}/${sesiones.length}</b></li>
          <li><i style="background:var(--hueso)"></i>Esfuerzo prom.<b>${rpeProm}</b></li>
          <li><i style="background:#5C5A57"></i>Racha<b>${racha} sem</b></li>
          <li><i style="background:#3a3a3a"></i>Check-in<b>${ultimoCheckin ? (diasCheck === 0 ? 'hoy' : 'hace ' + diasCheck + 'd') : 'pendiente'}</b></li>
        </ul>
      </div>
    </section>

    <section class="card">
      <p class="card-t">Actividad semanal <small>${hechas.length} de ${sesiones.length} sesiones</small></p>
      <div class="barras" role="img" aria-label="${hechas.length} de ${sesiones.length} sesiones completadas esta semana">${barras}</div>
    </section>

    ${siguiente ? `<p class="sec-t">${siguiente === deHoy ? 'Tu sesión de hoy' : 'Tu siguiente sesión'}<a href="#/plan">Ver semana</a></p>
      ${tarjetaEntreno(siguiente, { grande: true, etiqueta: siguiente === deHoy ? 'Hoy' : 'Siguiente · ' + DIAS[siguiente.dia - 1] })}`
      : `<div class="card">${vacio('Semana completa', 'Cumpliste todas tus sesiones. Descansa y prepárate para la siguiente.')}</div>`}

    <p class="sec-t">Accesos rápidos</p>
    <div class="rapidos">
      <a class="rapido" href="${siguiente ? '#/sesion/' + siguiente.id : '#/plan'}"><span class="ico rojo">${ICONOS.play}</span><span>Empezar sesión<small>${siguiente ? esc(siguiente.titulo) : 'Ver plan'}</small></span></a>
      <a class="rapido" href="#/checkin"><span class="ico ${tocaCheckin ? 'rojo' : 'hueso'}">${ICONOS.checkin}</span><span>Check-in<small>${tocaCheckin ? 'Te toca hoy' : 'Al día'}</small></span></a>
      <a class="rapido" href="#/tecnica"><span class="ico hueso">${ICONOS.tecnica}</span><span>Subir técnica<small>${puedeVideos(yo.plan) ? 'Video para revisar' : 'Limitless y Élite'}</small></span></a>
      <a class="rapido" href="#/progreso"><span class="ico hueso">${ICONOS.progreso}</span><span>Mi progreso<small>${regs.filter(r => r.completada).length} sesiones</small></span></a>
    </div>`;
}

function rachaSemanas(regs) {
  // Semanas consecutivas (hasta la actual) con al menos una sesión registrada
  const semanas = new Set(regs.filter(r => r.completada).map(r => { const d = new Date(r.created_at); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); }));
  let n = 0; const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  for (let i = 0; i < 52; i++) { if (semanas.has(d.toISOString().slice(0, 10))) n++; else if (i > 0) break; d.setDate(d.getDate() - 7); }
  return n;
}

/* -------------------------------------------------------------- Plan */
let filtroTipo = 'todos';
async function vistaPlan(v, sem) {
  if (!bloque) { v.innerHTML = `<div class="card">${vacio('Tu plan se está preparando', 'Lo verás aquí muy pronto.')}</div>`; return; }
  const actual = semanaActual(bloque); const semana = Number(sem) || actual;
  const sesiones = await db.sesionesSemana(bloque.id, semana);
  const tipos = ['todos', ...new Set(sesiones.map(s => s.tipo))];
  if (!tipos.includes(filtroTipo)) filtroTipo = 'todos';
  const visibles = sesiones.filter(s => filtroTipo === 'todos' || s.tipo === filtroTipo);
  v.innerHTML = `
    <div class="top-bar"><h1>Entrenamientos</h1><span class="chip">${esc(yo.plan)}</span></div>
    <div class="pildoras" role="group" aria-label="Semana">${Array.from({ length: bloque.semanas }, (_, i) => i + 1)
      .map(n => `<button type="button" data-s="${n}" aria-pressed="${n === semana}">Semana ${n}${n === actual ? ' ·' : ''}</button>`).join('')}</div>
    ${tipos.length > 2 ? `<div class="pildoras" role="group" aria-label="Tipo">${tipos.map(t => `<button type="button" data-t="${t}" aria-pressed="${t === filtroTipo}">${t === 'todos' ? 'Todos' : TIPO_TXT[t] || t}</button>`).join('')}</div>` : ''}
    ${bloque.notas && semana === actual ? `<div class="burbuja burbuja-coach"><small>Nota de Vic · ${esc(bloque.nombre)}</small>${esc(bloque.notas)}</div>` : ''}
    ${visibles.map(s => tarjetaEntreno(s)).join('') || `<div class="card">${vacio('Sin sesiones aquí')}</div>`}`;
  $$('[data-s]', v).forEach(b => b.onclick = () => { location.hash = '#/plan/' + b.dataset.s; });
  $$('[data-t]', v).forEach(b => b.onclick = () => { filtroTipo = b.dataset.t; vistaPlan(v, semana); });
}

/* ------------------------------------------------------------ Sesión */
async function vistaSesion(v, id) {
  const s = await db.sesion(id);
  const reg = s.registros?.[0];
  const res = reg?.resultados || {};
  const cardio = ['carrera', 'bici'].includes(s.tipo);
  const series = s.items.reduce((a, i) => a + (parseInt(i.series, 10) || 0), 0);
  const pres = it => [it.series && it.series + ' × ' + (it.reps || ''), !it.series && it.reps, it.carga, it.ritmo, it.descanso && 'desc. ' + it.descanso].filter(Boolean).join(' · ');
  v.innerHTML = `
    <div class="top-bar"><button class="btn-redondo" type="button" onclick="history.back()" aria-label="Volver">←</button><h1>${esc(s.titulo)}</h1></div>
    <div class="portada" style="background-image:url('${FOTOS[s.tipo] || FOTOS.fuerza}')">
      <div class="portada-in"><div><span class="tag">${DIAS[s.dia - 1]} · Semana ${s.semana}</span><h2>${esc(s.titulo)}</h2></div>
        ${reg?.completada ? '<span class="entreno-hecha" style="position:static">Completada</span>' : ''}</div>
    </div>
    <div class="stats">
      <div class="stat"><small>Ejercicios</small><b>${s.items.length}</b></div>
      <div class="stat"><small>${cardio ? 'Bloques' : 'Series'}</small><b>${series || '–'}</b></div>
      <div class="stat"><small>Tipo</small><b>${TIPO_TXT[s.tipo] || esc(s.tipo)}</b></div>
    </div>
    ${s.notas ? `<div class="burbuja burbuja-coach"><small>Indicaciones de Vic</small>${esc(s.notas)}</div>` : ''}
    <p class="sec-t">Ejercicios</p>
    <form id="f-sesion" class="form" style="gap:12px">
      ${s.items.map((it, k) => `
        <div class="ej ${res[it.id] ? 'ok' : ''}">
          <div class="ej-cab"><span class="ej-num">${k + 1}</span>
            <div><h3>${esc(it.ejercicio)}</h3><p>${esc(pres(it))}</p></div>
            ${it.video_url ? `<a href="${esc(it.video_url)}" target="_blank" rel="noopener">Técnica</a>` : ''}</div>
          ${it.nota ? `<p class="nota-ej">${esc(it.nota)}</p>` : ''}
          <input name="r_${it.id}" value="${esc(res[it.id] || '')}" aria-label="Resultado real de ${esc(it.ejercicio)}" placeholder="${cardio || it.ritmo ? 'Tu tiempo o ritmo real' : 'Tu carga y reps reales · ej. 22 kg × 8, 8, 7'}">
        </div>`).join('')}
      <div class="card" style="padding:18px">
        <p class="card-t" style="margin-bottom:12px">¿Qué tan dura fue? <small>RPE 1–10</small></p>
        <div class="escala redonda">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<label><input type="radio" name="rpe" value="${n}" ${reg?.rpe === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        <p class="tenue" style="font-size:12px;margin:10px 0 16px">1 = muy fácil · 10 = esfuerzo máximo</p>
        <label>Nota para Vic (opcional)<textarea name="nota" rows="2" placeholder="Cómo te sentiste, molestias, dudas…">${esc(reg?.nota || '')}</textarea></label>
      </div>
      <div class="cta">
        <button class="btn btn-full btn-pill ${reg?.completada ? '' : 'btn-rojo'}" type="submit">${reg?.completada ? 'Guardar cambios' : 'Marcar como completada'}</button>
        ${reg ? '<button class="link" type="button" id="desmarcar" style="align-self:center">Desmarcar sesión</button>' : ''}
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
  const checkins = await db.checkins(yo.id);
  let cumplidas = '';
  if (bloque) { const ss = await db.sesionesSemana(bloque.id, semanaActual(bloque)); cumplidas = ss.filter(s => s.registros?.[0]?.completada).length; }
  const escala = nombre => `<div class="escala redonda">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="${nombre}" value="${i}" required><span>${i}</span></label>`).join('')}</div>`;
  v.innerHTML = `
    <div class="top-bar"><h1>Check-in ${yo.plan === 'Base' ? 'mensual' : 'semanal'}</h1></div>
    <form id="f-checkin" class="card form">
      <p class="suave" style="margin:0">Tres minutos. Con esto ajusto tu plan.</p>
      <div class="grid2">
        <label>Peso (kg)<input type="number" name="peso" step="0.1" min="30" max="250" inputmode="decimal" placeholder="Opcional"></label>
        <label>Sesiones cumplidas<input type="number" name="sesiones_cumplidas" min="0" max="14" value="${cumplidas}" required></label>
      </div>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px"><legend class="h3" style="padding:0;margin-bottom:10px">Calidad de sueño <span class="tenue" style="font-weight:400">1–5</span></legend>${escala('sueno')}</fieldset>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px"><legend class="h3" style="padding:0;margin-bottom:10px">Nivel de energía <span class="tenue" style="font-weight:400">1–5</span></legend>${escala('energia')}</fieldset>
      <label>¿Cómo te fue?<textarea name="comentario" rows="3" required placeholder="Qué salió bien, qué costó, molestias, cambios en tu agenda…"></textarea></label>
      <button class="btn btn-rojo btn-full btn-pill" type="submit">Enviar check-in</button>
    </form>
    <p class="sec-t">Historial</p>
    <div class="historial">${checkins.map(c => `
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <p class="card-t" style="margin:0">${fecha(c.created_at, { weekday: 'short', day: 'numeric', month: 'short' })}<small>${c.peso ? c.peso + ' kg · ' : ''}Sueño ${c.sueno}/5 · Energía ${c.energia}/5</small></p>
        <div class="burbuja"><small>Tú</small>${esc(c.comentario)}</div>
        ${c.respuesta ? `<div class="burbuja burbuja-coach"><small>Vic</small>${esc(c.respuesta)}</div>` : '<p class="tenue" style="font-size:13px;margin:0">Vic lo revisará pronto.</p>'}
      </div>`).join('') || `<div class="card">${vacio('Aún no tienes check-ins')}</div>`}</div>`;
  $('#f-checkin').onsubmit = async e => {
    e.preventDefault(); const d = datosForm(e.target);
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await db.crearCheckin({ peso: d.peso ? Number(d.peso) : null, sueno: Number(d.sueno), energia: Number(d.energia), sesiones_cumplidas: Number(d.sesiones_cumplidas), comentario: d.comentario });
      aviso('Check-in enviado. Vic te responde pronto.'); enrutar();
    } catch (err) { btn.disabled = false; aviso('No se pudo enviar. Intenta de nuevo.', 'error'); }
  };
}

/* ------------------------------------------------------------ Técnica */
async function vistaTecnica(v) {
  if (!puedeVideos(yo.plan)) {
    v.innerHTML = `<div class="top-bar"><h1>Revisión de técnica</h1></div>
      <div class="portada" style="background-image:url('${FOTOS.fuerza}');height:200px"><div class="portada-in"><div><span class="tag">Limitless y Élite</span><h2>Graba. Corrijo. Mejoras.</h2></div></div></div>
      <div class="upsell"><p class="h3">Disponible en Limitless y Élite</p>
      <p class="suave" style="margin:0">Subes un video corto de tus series clave y te devuelvo correcciones concretas, ejercicio por ejercicio. Escríbele a Vic si quieres cambiar de plan.</p></div>`;
    return;
  }
  const [videos, sesiones] = await Promise.all([db.videos(yo.id), bloque ? db.sesionesSemana(bloque.id, semanaActual(bloque)) : []]);
  const ejercicios = [...new Set(sesiones.flatMap(s => s.items.map(i => i.ejercicio)))];
  v.innerHTML = `
    <div class="top-bar"><h1>Revisión de técnica</h1></div>
    <form id="f-video" class="card form">
      <p class="card-t" style="margin:0">Subir video <small>máx. 50 MB</small></p>
      <label>Ejercicio
        <input name="ejercicio" list="lista-ej" required placeholder="Ej. Sentadilla goblet">
        <datalist id="lista-ej">${ejercicios.map(e => `<option value="${esc(e)}">`).join('')}</datalist></label>
      <label>Video (30–60 segundos)<input type="file" name="video" accept="video/*" required></label>
      <label>¿Qué quieres que revise? (opcional)<input name="nota" placeholder="Ej. siento que se me van las rodillas hacia adentro"></label>
      <button class="btn btn-full btn-pill" type="submit">Subir video</button>
      <p class="tenue" style="font-size:12px;margin:0">Graba de lado o en diagonal, con todo el cuerpo en cuadro y buena luz.</p>
    </form>
    <p class="sec-t">Tus videos</p>
    <div class="historial">${videos.map(vd => `
      <div class="card video-fila">
        <div class="ej-cab"><span class="ico ${vd.estado === 'revisado' ? 'hueso' : 'rojo'}">${ICONOS.tecnica}</span>
          <div><h3>${esc(vd.ejercicio)}</h3><p>${fecha(vd.created_at)}${vd.nota ? ' · ' + esc(vd.nota) : ''}</p></div>
          <span class="chip ${vd.estado === 'revisado' ? 'chip-ok' : 'chip-ambar'}">${vd.estado === 'revisado' ? 'Revisado' : 'Pendiente'}</span></div>
        ${vd.comentario ? `<div class="burbuja burbuja-coach" style="margin-top:12px"><small>Vic</small>${esc(vd.comentario)}</div>` : ''}
        ${vd.ruta ? `<button class="link" type="button" data-ver="${esc(vd.ruta)}" style="margin-top:12px">Ver video</button>` : ''}
      </div>`).join('') || `<div class="card">${vacio('Aún no subes videos')}</div>`}</div>`;
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
function area(puntos, sufijo = '') {
  if (puntos.length < 2) return vacio('Aún no hay suficientes datos', 'La gráfica aparece con dos registros o más.');
  const W = 600, H = 190, px = 24, top = 30, bot = 30;
  const ys = puntos.map(p => p.y); const min = Math.min(...ys, 0), max = Math.max(...ys) || 1;
  const X = i => px + i * (W - px * 2) / (puntos.length - 1);
  const Y = v => top + (1 - (v - min) / (max - min || 1)) * (H - top - bot);
  // Curva suave
  let d = `M${X(0)} ${Y(ys[0])}`;
  for (let i = 1; i < puntos.length; i++) { const x0 = X(i - 1), x1 = X(i), cx = (x0 + x1) / 2; d += ` C${cx} ${Y(ys[i - 1])} ${cx} ${Y(ys[i])} ${x1} ${Y(ys[i])}`; }
  const rel = `${d} L${X(puntos.length - 1)} ${H - bot} L${X(0)} ${H - bot} Z`;
  const ult = puntos.length - 1;
  return `<svg class="area" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica">
    <defs><linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E10600" stop-opacity=".35"/><stop offset="1" stop-color="#E10600" stop-opacity="0"/></linearGradient></defs>
    ${[0, .5, 1].map(f => `<line class="guia" x1="${px}" x2="${W - px}" y1="${top + f * (H - top - bot)}" y2="${top + f * (H - top - bot)}"/>`).join('')}
    <path class="rel" d="${rel}"/><path class="ln" d="${d}"/>
    <circle class="pt" cx="${X(ult)}" cy="${Y(ys[ult])}" r="5"/>
    <rect x="${X(ult) - 24}" y="${Y(ys[ult]) - 30}" width="48" height="20" rx="10" fill="#F2EFEA"/>
    <text x="${X(ult)}" y="${Y(ys[ult]) - 16}" class="et" style="fill:#0B0B0B">${esc(ys[ult])}${sufijo}</text>
    ${puntos.map((p, i) => `<text x="${X(i)}" y="${H - 8}" class="ex">${esc(p.x)}</text>`).join('')}
  </svg>`;
}

function anillos(datos) {
  const radios = [56, 43, 30];
  return `<svg viewBox="0 0 130 130">${datos.map((d, i) => {
    const r = radios[i], c = 2 * Math.PI * r, off = c * (1 - Math.min(d.pct, 100) / 100);
    return `<circle class="pista" cx="65" cy="65" r="${r}"/><circle class="v" cx="65" cy="65" r="${r}" stroke="${d.color}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>`;
  }).join('')}</svg>`;
}

async function vistaProgreso(v) {
  const [regs, checkins, videos] = await Promise.all([db.registros(yo.id), db.checkins(yo.id), puedeVideos(yo.plan) ? db.videos(yo.id) : []]);
  const completadas = regs.filter(r => r.completada).length;
  const adh = [];
  let semanaSes = [];
  if (bloque) {
    const actual = semanaActual(bloque);
    for (let s = 1; s <= actual; s++) {
      const ss = await db.sesionesSemana(bloque.id, s);
      if (s === actual) semanaSes = ss;
      if (ss.length) adh.push({ x: 'S' + s, y: Math.round(ss.filter(x => x.registros?.[0]?.completada).length / ss.length * 100) });
    }
  }
  const prom = adh.length ? Math.round(adh.reduce((a, b) => a + b.y, 0) / adh.length) : 0;
  const delta = adh.length >= 2 ? adh[adh.length - 1].y - adh[adh.length - 2].y : null;
  const pesos = [...checkins].reverse().filter(c => c.peso);
  const rpes = regs.filter(r => r.rpe).slice(0, 10).reverse();

  const hechasSem = semanaSes.filter(s => s.registros?.[0]?.completada).length;
  const pctSes = semanaSes.length ? hechasSem / semanaSes.length * 100 : 0;
  const checkSem = checkins.some(c => diasDesde(c.created_at) < 7) ? 100 : 0;
  const vidsSem = videos.filter(x => diasDesde(x.created_at) < 7).length;
  const rings = [
    { nombre: 'Sesiones', valor: `${hechasSem}/${semanaSes.length}`, pct: pctSes, color: '#E10600' },
    { nombre: 'Check-in', valor: checkSem ? 'Hecho' : 'Pendiente', pct: checkSem, color: '#F2EFEA' },
    { nombre: puedeVideos(yo.plan) ? 'Técnica' : 'Constancia', valor: puedeVideos(yo.plan) ? `${vidsSem} video${vidsSem === 1 ? '' : 's'}` : prom + '%', pct: puedeVideos(yo.plan) ? Math.min(vidsSem * 100, 100) : prom, color: '#8F8C88' }
  ];

  v.innerHTML = `
    <div class="top-bar"><h1>Progreso</h1></div>
    <section class="card">
      <p class="card-t">Constancia por semana <small>Meta 80%</small></p>
      <div class="cifra-g"><b>${prom}%</b><span>promedio del bloque</span></div>
      ${delta !== null ? `<p class="delta ${delta < 0 ? 'baja' : ''}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} pts vs. semana anterior${semanaSes.length && hechasSem < semanaSes.length ? ' · semana en curso' : ''}</p>` : '<p class="delta" style="color:var(--tinta-tenue)">La meta es 80% o más</p>'}
      ${area(adh, '%')}
    </section>
    <section class="card">
      <p class="card-t">Anillos de la semana</p>
      <div class="anillos">${anillos(rings)}
        <ul class="datos-l">${rings.map(r => `<li><i style="background:${r.color}"></i>${r.nombre}<b>${r.valor}</b></li>`).join('')}</ul>
      </div>
    </section>
    <div class="rapidos">
      <section class="card"><p class="card-t" style="margin-bottom:8px">Sesiones</p><div class="cifra-g"><b>${completadas}</b><span>totales</span></div></section>
      <section class="card"><p class="card-t" style="margin-bottom:8px">Peso</p><div class="cifra-g"><b>${pesos.length ? pesos[pesos.length - 1].peso : '–'}</b><span>kg</span></div>
        ${pesos.length >= 2 ? `<p class="delta ${pesos[pesos.length - 1].peso > pesos[0].peso ? '' : ''}" style="margin:6px 0 0;color:var(--tinta-suave)">${(pesos[pesos.length - 1].peso - pesos[0].peso).toFixed(1)} kg desde el inicio</p>` : ''}</section>
    </div>
    <section class="card">
      <p class="card-t">Esfuerzo percibido <small>últimas ${rpes.length} sesiones</small></p>
      ${rpes.length ? `<div class="mini-barras">${rpes.map(r => `<i class="${r.rpe >= 8 ? 'on' : ''}" style="height:${Math.round(8 + (r.rpe - 1) * 5.3)}px" title="RPE ${r.rpe}"></i>`).join('')}</div>
        <p class="tenue" style="font-size:12px;margin:12px 0 0">En hueso, las sesiones de RPE 8 o más. Si se juntan muchas, toca semana de descarga.</p>` : vacio('Sin registros de esfuerzo aún')}
    </section>`;
}
