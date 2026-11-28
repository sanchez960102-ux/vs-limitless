import { crearDatos, DIAS, semanaActual, diaSemanaHoy, diasDesde, estadoPago, hoyISO } from '/shared/data.js';
import { permisos, puede, planMinimo, NOMBRES } from '/shared/permisos.js';
import { $, $$, esc, fecha, aviso, cargando, vacio, datosForm, dialogo, registrarSW } from '/shared/ui.js';
import { formAcceso, pideCrearClave, pantallaCrearClave } from '/shared/acceso.js';
import { PASOS, htmlPaso, leerPaso, alertas, requiereRevisionMedica } from '/shared/anamnesis.js';
import { htmlCaptura, leerCaptura, formatear, cambio, CATEGORIAS, zonasMiembro, zonaDe, ZONAS } from '/shared/tests.js';
import { montarMapa } from '/shared/composicion.js';
import { tarjetaMiembro, activarTarjeta, imagenSemana, compartirImagen, numeroTxt, esFundador } from '/shared/membresia.js';
import { esDeCarga, claveEjercicio, htmlSeries, leerSeries, sugerencia, texto as textoSeries, resumen as resumenSeries, porEjercicio } from '/shared/cargas.js';

const raiz = $('#raiz');
let db, yo, bloque, cobro, pago;

const FOTOS = { fuerza: '/img/app/fuerza.jpg', carrera: '/img/app/carrera.jpg', bici: '/img/app/bici.jpg', movilidad: '/img/app/movilidad.jpg', mixta: '/img/app/movilidad.jpg' };
const TIPO_TXT = { fuerza: 'Fuerza', carrera: 'Carrera', bici: 'Bici', movilidad: 'Movilidad', mixta: 'Mixta' };
const ICONOS = {
  membresia: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 14h4M15 10.5h2"/></svg>',
  hoy: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>',
  checkin: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  tecnica: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
  progreso: '<svg viewBox="0 0 24 24"><path d="M5 19V11M12 19V5M19 19v-6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
  nutricion: '<svg viewBox="0 0 24 24"><path d="M12 21c-4.5 0-7-3.2-7-7.2C5 9.6 8 7 12 8c4-1 7 1.6 7 5.8 0 4-2.5 7.2-7 7.2z"/><path d="M12 8c0-2 1-3.5 3-4.5"/></svg>',
  candado: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>',
  llamada: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/><circle cx="9.5" cy="12" r="2"/></svg>'
};

/* ------------------------------------------------- Permisos y candados */
function linkMejorar(plan) {
  if (!cobro?.whatsapp) return '/#planes';
  return `https://wa.me/${cobro.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola Vic, soy ${yo.nombre || yo.correo}. Quiero pasar al plan ${plan}.`)}`;
}
const textoCandado = f => `Disponible en ${planMinimo(f)} · <a href="${linkMejorar(planMinimo(f))}" target="_blank" rel="noopener">Mejorar plan</a>`;
function candado(f, detalle = '') {
  return `<div class="candado"><span class="candado-ico">${ICONOS.candado}</span><div><b>${NOMBRES[f] || ''}</b>
    ${detalle ? `<p>${detalle}</p>` : ''}<span>${textoCandado(f)}</span></div></div>`;
}
function linkVideollamada() {
  if (!cobro?.whatsapp) return null;
  return `https://wa.me/${cobro.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola Vic, soy ${yo.nombre || yo.correo}. Quiero agendar nuestra videollamada de seguimiento.`)}`;
}

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
  if (pideCrearClave()) return pantallaCrearClave(raiz, db, () => arrancar());
  yo = await db.yo();
  if (!yo) return pantallaAcceso();
  if (yo.rol === 'coach') { location.href = '/coach/' + location.search; return; }
  if (yo.rol === 'pendiente') return pantallaPendiente();
  if (yo.estado && yo.estado !== 'activo') return pantallaInactivo();
  cobro = await db.ajustesCobro().catch(() => ({ instrucciones: '', whatsapp: '', gracia: 5 }));
  pago = estadoPago(yo, cobro.gracia);
  if (pago.tipo === 'bloqueado') return pantallaPago();
  const an = await db.anamnesis(yo.id).catch(() => null);
  if (!an?.completada) return pantallaAnamnesis(an);
  bloque = await db.bloqueActivo(yo.id);
  pintarMarco();
  window.onhashchange = enrutar;
  enrutar();
  if (pago.tipo === 'gracia') ventanaPago();
}

/* -------------------------------------------------------------- Pagos */
const fechaLarga = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'long' }) : '';
function linkWhatsApp() {
  if (!cobro?.whatsapp) return '';
  const txt = `Hola Vic, soy ${yo.nombre || yo.correo}. Te envío el comprobante de mi mensualidad del plan ${yo.plan || ''}.`;
  return `https://wa.me/${cobro.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`;
}
function bloqueComoPagar() {
  const wa = linkWhatsApp();
  const monto = yo.tarifa === null || yo.tarifa === undefined ? null : (!yo.pagado_hasta && yo.primer_mes !== null && yo.primer_mes !== undefined ? yo.primer_mes : yo.tarifa);
  return `${monto !== null ? `<div class="burbuja"><small>Tu mensualidad</small>Q${Number(monto).toLocaleString('es-GT', { maximumFractionDigits: 2 })}</div>` : ''}${cobro?.instrucciones ? `<div class="nota-vic"><span class="nota-vic-firma" aria-hidden="true">VS</span><div><small>Cómo pagar</small><p>${esc(cobro.instrucciones)}</p></div></div>` : ''}
    ${wa ? `<a class="btn btn-full btn-pill btn-rojo" href="${wa}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>` : ''}`;
}
function ventanaPago() {
  try { if (sessionStorage.getItem('vsl-aviso-pago') === yo.pagado_hasta) return; sessionStorage.setItem('vsl-aviso-pago', yo.pagado_hasta); } catch {}
  dialogo(`<div class="menu-hoja aviso-pago">
      <p class="eyebrow"><span class="punto"></span>Mensualidad pendiente</p>
      <h2 class="h2">Tu mensualidad venció ${pago.vencido === 1 ? 'ayer' : `hace ${pago.vencido} días`}</h2>
      <p class="suave" style="margin:0">Tu plan sigue abierto hasta el <b>${fechaLarga(pago.limite)}</b>. Si para entonces no está registrado tu pago, tu acceso se pausa hasta que te pongas al día.</p>
      ${bloqueComoPagar()}
      <button class="btn btn-linea btn-full btn-pill" type="button" id="luego">Recordármelo después</button>
    </div>`, d => { $('#luego', d).onclick = () => d.close(); });
}
function bandaPago() {
  if (pago?.tipo === 'por_vencer') return `<a class="banda-pago" href="#/cuenta" id="banda-pago"><b>${pago.dias === 0 ? 'Tu mensualidad vence hoy' : `Tu mensualidad vence en ${pago.dias} día${pago.dias > 1 ? 's' : ''}`}</b><span>Ver cómo pagar →</span></a>`;
  if (pago?.tipo === 'gracia') return `<a class="banda-pago urgente" href="#/cuenta" id="banda-pago"><b>Mensualidad vencida · tu acceso se pausa el ${fechaLarga(pago.limite)}</b><span>Ver cómo pagar →</span></a>`;
  return '';
}
/* ---------------------------------------------------------- Anamnesis */
function pantallaAnamnesis(an) {
  const d = { ...(an?.datos || {}) };
  if (!d.objetivo && yo.objetivo) d.objetivo = yo.objetivo;
  let i = Math.min(an?.paso || 0, PASOS.length - 1);
  const nuevo = !an;
  const pintar = () => {
    const p = PASOS[i], ultimo = i === PASOS.length - 1;
    raiz.innerHTML = `<main class="anamnesis"><div class="an-in">
      <header class="an-cab"><img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="150" height="45"><span>Paso ${i + 1} de ${PASOS.length}</span></header>
      <div class="an-barra" aria-hidden="true"><i style="width:${(i + 1) / PASOS.length * 100}%"></i></div>
      ${i === 0 ? `<div class="card an-bienvenida"><p class="card-t" style="margin-bottom:8px">${nuevo ? 'Hola' : 'Hola de nuevo'}, ${esc((yo.nombre || '').split(' ')[0] || 'atleta')}</p>
        <p class="suave" style="margin:0">Antes de ver tu plan necesito conocerte bien: salud, lesiones, hábitos y objetivo. Son ${PASOS.length} pasos cortos, unos 8 minutos. Cada paso se guarda solo, así que puedes terminar después.</p></div>` : ''}
      <div><p class="eyebrow"><span class="punto"></span>Anamnesis inicial</p><h1 class="h2" style="margin:6px 0">${esc(p.titulo)}</h1><p class="suave" style="margin:0">${esc(p.intro)}</p></div>
      <form id="f-an" class="form an-form" novalidate>
        <div id="an-campos" class="an-campos">${htmlPaso(p, d)}</div>
        <div class="an-nav">${i > 0 ? '<button type="button" class="btn btn-linea btn-pill" id="atras">Atrás</button>' : ''}
          <button class="btn btn-pill ${ultimo ? 'btn-rojo' : ''}" type="submit">${ultimo ? 'Enviar a Vic' : 'Continuar'}</button></div>
      </form>
      <button class="link" id="salir" style="align-self:center">Cerrar sesión</button>
    </div></main>`;
    window.scrollTo(0, 0);
    const f = $('#f-an');
    f.addEventListener('change', e => {
      if (!['radio', 'checkbox'].includes(e.target.type)) return;
      leerPaso(f, p, d); $('#an-campos').innerHTML = htmlPaso(p, d);
    });
    $('#salir').onclick = async () => { await db.salir(); arrancar(); };
    const atras = $('#atras'); if (atras) atras.onclick = () => { leerPaso(f, p, d); i--; pintar(); };
    f.onsubmit = async e => {
      e.preventDefault();
      const faltan = leerPaso(f, p, d);
      $$('.an-falta', f).forEach(x => x.classList.remove('an-falta'));
      if (faltan.length) {
        faltan.forEach(k => f.querySelector(`[data-k="${k}"]`)?.classList.add('an-falta'));
        f.querySelector('.an-falta')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return aviso('Completa lo que está marcado en rojo.', 'error');
      }
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      try {
        if (ultimo) {
          await db.guardarAnamnesis(yo.id, { datos: d, paso: PASOS.length, completada: true, alerta_salud: alertas(d).length > 0, completada_at: new Date().toISOString() });
          return pantallaAnamnesisLista(requiereRevisionMedica(d));
        }
        await db.guardarAnamnesis(yo.id, { datos: d, paso: i + 1, completada: false });
        i++; pintar();
      } catch (err) { btn.disabled = false; aviso('No se pudo guardar. Revisa tu conexión e intenta de nuevo.', 'error'); }
    };
  };
  pintar();
}

function pantallaAnamnesisLista(revisionMedica) {
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow"><span class="punto"></span>Anamnesis enviada</p><h1 class="h1">Gracias.<br><span class="tenue">Ya te conozco mejor.</span></h1></div>
    <p class="suave">Voy a revisar tus respuestas para ajustar tu plan a ti. Si cambia algo de tu salud, avísame.</p>
    ${revisionMedica ? `<div class="nota-vic"><span class="nota-vic-firma" aria-hidden="true">VS</span><div><small>Antes de empezar</small><p>Por algunas de tus respuestas, es probable que te pida una autorización médica antes de subir la intensidad. Te escribo para coordinarlo.</p></div></div>` : ''}
    <button class="btn btn-full btn-pill" id="seguir">Ir a mi plan</button>
  </div></main>`;
  $('#seguir').onclick = () => arrancar();
}

function pantallaInactivo() {
  const baja = yo.estado === 'baja';
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow"><span class="punto"></span>${baja ? 'Acceso cerrado' : 'Plan en pausa'}</p>
      <h1 class="h1">${baja ? 'Tu plan<br><span class="tenue">terminó.</span>' : 'Tu plan está<br><span class="tenue">en pausa.</span>'}</h1></div>
    <p class="suave">${baja ? 'Gracias por entrenar con el Equipo Limitless. Si quieres volver, escríbele a Vic y retomamos desde donde lo dejaste.' : 'Vic pausó tu plan por ahora. Tu progreso sigue guardado. Escríbele si tienes dudas o quieres retomarlo.'}</p>
    <button class="btn btn-linea btn-full btn-pill" id="revisar">Revisar de nuevo</button>
    <button class="link" id="salir" style="align-self:center">Cerrar sesión</button>
  </div></main>`;
  $('#revisar').onclick = () => arrancar();
  $('#salir').onclick = async () => { await db.salir(); arrancar(); };
}

function pantallaPago() {
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow"><span class="punto"></span>Acceso en pausa</p><h1 class="h1">Tu plan está<br><span class="tenue">en pausa.</span></h1></div>
    <p class="suave">Tu mensualidad venció el ${fechaLarga(yo.pagado_hasta)}. Tu progreso y tus registros siguen guardados: en cuanto Vic registre tu pago, todo vuelve a estar como lo dejaste.</p>
    ${bloqueComoPagar()}
    <button class="btn btn-linea btn-full btn-pill" id="revisar">Ya pagué, revisar de nuevo</button>
    <button class="link" id="salir" style="align-self:center">Cerrar sesión</button>
  </div></main>`;
  $('#revisar').onclick = () => arrancar();
  $('#salir').onclick = async () => { await db.salir(); arrancar(); };
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
      <div id="acceso-form"></div>
      <p class="acceso-pie">Usa el mismo correo con el que aplicaste al equipo.</p>
    `}
  </div></main>`;
  if (db.demo) { $('#demo-miembro').onclick = async () => { await db.entrarDemo('miembro'); arrancar(); }; return; }
  formAcceso($('#acceso-form'), db, '/app/');
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
      ${yo.pagado_hasta ? `<div class="burbuja"><small>Mensualidad</small>${pago.tipo === 'gracia' ? 'Vencida el ' : 'Pagada hasta el '}${fechaLarga(yo.pagado_hasta)}</div>` : ''}
      ${['gracia', 'por_vencer'].includes(pago.tipo) ? bloqueComoPagar() : ''}
      ${yo.objetivo ? `<div class="burbuja"><small>Mi objetivo</small>${esc(yo.objetivo)}</div>` : ''}
      <div class="incluye"><small>Tu plan incluye</small>
        <p>✓ Check-in ${permisos(yo.plan).checkin.nombre} · ✓ Progresión de cargas · ✓ Mapa corporal · ✓ Tests</p>
        ${['tecnicaVideo', 'videollamada'].map(f => puede(yo.plan, f) ? `<p>✓ ${NOMBRES[f]}</p>` : `<p class="falta">${ICONOS.candado} ${NOMBRES[f]} · ${textoCandado(f)}</p>`).join('')}</div>
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
  const vistas = { membresia: vistaMembresia, hoy: vistaHoy, plan: vistaPlan, sesion: vistaSesion, checkin: vistaCheckin, tecnica: vistaTecnica, progreso: vistaProgreso, nutricion: vistaNutricion };
  if (ruta === 'cuenta') { history.replaceState(null, '', '#/hoy'); $('#perfil').click(); return enrutar(); }
  (vistas[ruta] || vistaHoy)(v, param).then(() => { if (!ruta || ruta === 'hoy') v.insertAdjacentHTML('afterbegin', bandaPago()); }).catch(err => { console.error(err); v.innerHTML = vacio('Algo salió mal', 'Recarga la página o intenta en un momento.'); });
}

/* ---------------------------------------------------------- Piezas UI */
const ICONO_NOTA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
function notaVic(titulo, texto) {
  return `<div class="nota-vic"><span class="nota-vic-firma" aria-hidden="true">VS</span>
    <div><small>${titulo}</small><p>${esc(texto)}</p></div></div>`;
}
function rpeTexto(n) {
  if (n <= 3) return n + ' · Fácil, podías hacer mucho más.';
  if (n <= 5) return n + ' · Cómodo, con buena reserva.';
  if (n <= 7) return n + ' · Exigente, te quedaban 2 o 3 repeticiones.';
  if (n <= 9) return n + ' · Muy duro, casi al límite.';
  return n + ' · Máximo, no podías hacer ni una más.';
}
function anillo(pct, centro, sub) {
  const r = 50, c = 2 * Math.PI * r, off = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return `<div class="anillo"><svg viewBox="0 0 120 120"><circle class="pista" cx="60" cy="60" r="${r}"/>
    <circle class="valor" cx="60" cy="60" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
    <div class="anillo-c"><b>${centro}</b><span>${sub}</span></div></div>`;
}

function tarjetaEntreno(s, { grande = false, etiqueta } = {}) {
  const hecha = s.registros?.[0]?.completada;
  const series = s.items.reduce((a, i) => a + (parseInt(i.series, 10) || 0), 0);
  const notas = s.items.filter(i => i.nota).length + (s.notas ? 1 : 0);
  return `<a class="entreno ${grande ? 'grande' : ''} ${hecha ? 'hecha' : ''}" href="#/sesion/${s.id}">
    <span class="entreno-foto" style="background-image:url('${FOTOS[s.tipo] || FOTOS.fuerza}')"></span>
    ${hecha ? '<span class="entreno-hecha">Completada</span>' : ''}
    <span class="entreno-in">
      <span class="tag">${esc(etiqueta || DIAS[s.dia - 1])}</span>
      <h3>${esc(s.titulo)}</h3>
      <span class="meta">${s.items.length} ejercicios${series ? ' · ' + series + ' series' : ''} · ${TIPO_TXT[s.tipo] || s.tipo}</span>
      ${notas ? `<span class="con-nota">${ICONO_NOTA}${notas === 1 ? '1 comentario de Vic' : notas + ' comentarios de Vic'}</span>` : ''}
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
  const cadaCheckin = permisos(yo.plan).checkin.cadaDias;
  const tocaCheckin = !ultimoCheckin || diasCheck >= cadaCheckin || (cadaCheckin === 7 && hoyDia === 7 && diasCheck >= 1);
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
      ${puede(yo.plan, 'tecnicaVideo')
        ? `<a class="rapido" href="#/tecnica"><span class="ico hueso">${ICONOS.tecnica}</span><span>Subir técnica<small>Video para revisar</small></span></a>`
        : `<a class="rapido bloqueado" href="#/tecnica"><span class="ico">${ICONOS.candado}</span><span>Subir técnica<small>Disponible en ${planMinimo('tecnicaVideo')} · Mejorar plan</small></span></a>`}
      <a class="rapido" href="#/progreso"><span class="ico hueso">${ICONOS.progreso}</span><span>Mi progreso<small>${regs.filter(r => r.completada).length} sesiones</small></span></a>
    </div>
    <a class="rapido ancho" href="#/membresia"><span class="ico ${hoyDia === 7 ? 'rojo' : 'hueso'}">${ICONOS.membresia}</span><span>Miembro ${numeroTxt(yo.numero)}${esFundador(yo) ? ' · Fundador' : ''}<small>${hoyDia === 7 ? 'Tu semana está lista para compartir' : 'Tu tarjeta y tu semana en números'}</small></span></a>
    <a class="rapido ancho" href="#/nutricion"><span class="ico hueso">${ICONOS.nutricion}</span><span>Guía de nutrición<small>Porciones, hidratación y qué comer alrededor del entreno</small></span></a>
    ${puede(yo.plan, 'videollamada')
      ? (linkVideollamada() ? `<a class="rapido ancho" href="${linkVideollamada()}" target="_blank" rel="noopener"><span class="ico rojo">${ICONOS.llamada}</span><span>Videollamada con Vic<small>Cada ${permisos(yo.plan).videollamada.cadaDias} días · toca para agendar</small></span></a>` : '')
      : `<div class="rapido ancho bloqueado"><span class="ico">${ICONOS.candado}</span><span>Videollamada con Vic<small>${textoCandado('videollamada')}</small></span></div>`}`;
}

function rachaSemanas(regs) {
  // Semanas consecutivas (hasta la actual) con al menos una sesión registrada
  const semanas = new Set(regs.filter(r => r.completada).map(r => { const d = new Date(r.created_at); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); }));
  let n = 0; const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  for (let i = 0; i < 52; i++) { if (semanas.has(d.toISOString().slice(0, 10))) n++; else if (i > 0) break; d.setDate(d.getDate() - 7); }
  return n;
}

/* --------------------------------------------------------- Membresía */
async function vistaMembresia(v) {
  const semana = bloque ? semanaActual(bloque) : null;
  const [sesiones, regs, cargas] = await Promise.all([bloque ? db.sesionesSemana(bloque.id, semana) : [], db.registros(yo.id), db.cargas(yo.id).catch(() => [])]);
  const lunes = new Date(); lunes.setHours(0, 0, 0, 0); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  const iniISO = lunes.toISOString().slice(0, 10);
  const hechas = sesiones.filter(s => s.registros?.[0]?.completada);
  const rpes = hechas.map(s => s.registros[0].rpe).filter(Boolean);
  const deSemana = cargas.filter(c => String(c.fecha) >= iniISO);
  const volumen = deSemana.reduce((a, c) => a + Number(c.volumen || 0), 0);
  const mejor = deSemana.reduce((m, c) => Number(c.top_kg || 0) > Number(m?.top_kg || 0) ? c : m, null);
  const mesCorto = d => d.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
  const rango = lunes.getMonth() === domingo.getMonth() ? `${lunes.getDate()}–${domingo.getDate()} ${mesCorto(domingo)}` : `${lunes.getDate()} ${mesCorto(lunes)} – ${domingo.getDate()} ${mesCorto(domingo)}`;
  const datos = [];
  if (rpes.length) datos.push({ t: 'Esfuerzo prom.', v: (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1), s: 'escala del 1 al 10' });
  datos.push({ t: 'Racha', v: rachaSemanas(regs) + ' sem', s: 'semanas seguidas entrenando' });
  if (volumen) datos.push({ t: 'Volumen', v: Math.round(volumen).toLocaleString('es-GT') + ' kg', s: 'levantados esta semana' });
  if (mejor) datos.push({ t: 'Mejor carga', v: Number(mejor.top_kg).toLocaleString('es-GT') + ' kg', s: mejor.ejercicio });
  if (datos.length < 4 && bloque) datos.push({ t: 'Bloque', v: `${semana}/${bloque.semanas}`, s: 'semanas del bloque' });
  if (datos.length < 4) datos.push({ t: 'Plan', v: yo.plan || '—', s: 'Equipo Limitless' });
  const info = { rango, hechas: hechas.length, total: sesiones.length, datos,
    subtitulo: bloque ? `Semana ${semana} de ${bloque.semanas} · ${bloque.nombre.split('·').pop().trim()}` : 'Equipo Limitless',
    nombre: yo.nombre || '', miembro: `Miembro ${numeroTxt(yo.numero)}${esFundador(yo) ? ' · Fundador' : ''} · Plan ${yo.plan || ''}` };

  v.innerHTML = `
    <p class="sec-t">Tu membresía</p>
    ${tarjetaMiembro(yo)}
    <p class="mb-texto">Tu número es tuyo desde el día que entraste al equipo y no se repite. ${esFundador(yo) ? 'Como fundador, tu precio se queda contigo mientras sigas activo.' : ''}</p>
    <p class="sec-t">Tu semana en números <small style="font-weight:400;color:var(--tinta-tenue)">${rango}</small></p>
    <div class="card semana-share">
      <div class="semana-prev"><span class="cargando-img">Armando tu imagen…</span></div>
      <button class="btn btn-full btn-pill btn-rojo" id="compartir" disabled>Compartir en mis historias</button>
      <p class="tenue" style="font-size:13px;margin:10px 0 0;text-align:center">Se genera con tus datos reales de esta semana. Etiqueta a @vs_limitless.</p>
    </div>`;
  activarTarjeta($('.membresia', v));
  let blob;
  try {
    blob = await imagenSemana(info);
    const url = URL.createObjectURL(blob);
    $('.semana-prev', v).innerHTML = `<img src="${url}" alt="Imagen de tu semana: ${info.hechas} de ${info.total} sesiones completadas">`;
    $('#compartir', v).disabled = false;
  } catch (e) { console.error(e); $('.semana-prev', v).innerHTML = '<span class="cargando-img">No se pudo generar la imagen.</span>'; }
  $('#compartir', v).onclick = async () => {
    const r = await compartirImagen(blob, `mi-semana-vs-limitless-${iniISO}.png`);
    if (r === 'descargada') aviso('Imagen guardada. Súbela a tus historias.');
  };
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
    ${bloque.notas && semana === actual ? notaVic(`Nota de Vic · ${esc(bloque.nombre)}`, bloque.notas) : ''}
    ${visibles.map(s => tarjetaEntreno(s)).join('') || `<div class="card">${vacio('Sin sesiones aquí')}</div>`}`;
  $$('[data-s]', v).forEach(b => b.onclick = () => { location.hash = '#/plan/' + b.dataset.s; });
  $$('[data-t]', v).forEach(b => b.onclick = () => { filtroTipo = b.dataset.t; vistaPlan(v, semana); });
}

/* ------------------------------------------------------------ Sesión */
async function vistaSesion(v, id) {
  const [s, tests, misRes, misCargas] = await Promise.all([db.sesion(id), db.tests().catch(() => []), db.resultadosTest(yo.id).catch(() => []), db.cargas(yo.id).catch(() => [])]);
  const deCarga = it => esDeCarga(it, s.tipo);
  const cargaActual = it => misCargas.find(c => c.item_id === it.id);
  const cargaPrevia = it => misCargas.filter(c => c.clave === claveEjercicio(it.ejercicio) && c.item_id !== it.id).at(-1);
  const zonas = zonasMiembro(tests, misRes);
  const tuZona = it => {
    const z = zonaDe(it.ritmo) || zonaDe(it.reps) || zonaDe(it.carga); if (!z) return '';
    const partes = [zonas.fc?.[z], zonas.ritmo?.[z]].filter(Boolean);
    const nombre = ZONAS.find(x => x.id === z).nombre;
    return `<div class="tu-zona"><b>Tu ${z} · ${nombre}</b><span>${partes.length ? partes.join(' · ') : 'Aún no tienes un test de carrera para calcular tus pulsaciones y ritmo en esta zona.'}</span></div>`;
  };
  const T = it => it.test_id && tests.find(t => t.id === it.test_id);
  const reg = s.registros?.[0];
  const res = reg?.resultados || {};
  const cardio = ['carrera', 'bici'].includes(s.tipo);
  const series = s.items.reduce((a, i) => a + (parseInt(i.series, 10) || 0), 0);
  const datos = it => [
    it.series && !(cardio && it.series === '1') && ['Series', it.series],
    it.reps && [cardio || /min|s$/.test(it.reps) ? 'Duración' : 'Reps', it.reps],
    it.carga && ['Carga', it.carga],
    it.ritmo && ['Ritmo', it.ritmo],
    it.descanso && ['Descanso', it.descanso]
  ].filter(Boolean);
  const guiaVista = (() => { try { return localStorage.getItem('vsl-guia-sesion') === '1'; } catch { return false; } })();
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
    ${guiaVista ? '' : `<div class="card guia" id="guia">
      <p class="card-t" style="margin-bottom:12px">Cómo usar tu sesión <button class="link" type="button" id="guia-ok">Entendido</button></p>
      <ol class="pasos">
        <li><b>Lee los comentarios de Vic.</b> Son los recuadros con su firma. Ahí va lo importante de cada ejercicio.</li>
        <li><b>Haz el ejercicio y anota lo que hiciste.</b> Peso y repeticiones, o tu tiempo. No tiene que ser exacto.</li>
        <li><b>Al final, marca qué tan dura fue</b> y toca el botón para guardar.</li>
      </ol></div>`}
    ${s.notas ? notaVic('Indicaciones para hoy', s.notas) : ''}
    <p class="sec-t">Ejercicios <span class="avance" id="avance"></span></p>
    <form id="f-sesion" class="form" style="gap:12px">
      ${s.items.map((it, k) => `
        <div class="ej ${res[it.id] ? 'ok' : ''} ${T(it) ? 'ej-test' : ''}" data-ej>
          <div class="ej-cab"><span class="ej-num">${k + 1}</span>
            <div>${T(it) ? `<span class="tag-test">Test · ${CATEGORIAS[T(it).categoria]}</span>` : ''}<h3>${esc(it.ejercicio)}</h3></div>
            ${it.video_url ? `<a class="ej-video" href="${esc(it.video_url)}" target="_blank" rel="noopener">Ver técnica</a>` : ''}</div>
          ${datos(it).length ? `<dl class="ej-datos">${datos(it).map(([e, x]) => `<div><dt>${e}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>` : ''}
          ${tuZona(it)}
          ${it.nota ? notaVic('Comentario de Vic', it.nota) : ''}
          ${T(it) ? `<details class="protocolo"><summary>Cómo hacer el test</summary><p>${esc(T(it).protocolo)}</p></details>
            <div class="ej-real">${htmlCaptura(T(it), 'r_' + it.id, res[it.id] || '')}</div>`
          : deCarga(it) ? htmlSeries(it, cargaActual(it), cargaPrevia(it), sugerencia(it, cargaPrevia(it)))
          : `<label class="ej-real">Lo que hiciste
            <input name="r_${it.id}" value="${esc(res[it.id] || '')}" placeholder="${cardio || it.ritmo ? 'Ej. 34 min a 6:50 /km' : 'Ej. 22 kg × 8, 8, 7'}">
          </label>`}
        </div>`).join('')}
      <div class="card" style="padding:18px">
        <p class="card-t" style="margin-bottom:6px">¿Qué tan dura fue la sesión?</p>
        <p class="tenue" style="font-size:13px;margin:0 0 14px">Elige un número. 1 es muy fácil, 10 es tu máximo esfuerzo.</p>
        <div class="escala redonda">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<label><input type="radio" name="rpe" value="${n}" ${reg?.rpe === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        <p class="rpe-guia" id="rpe-guia">${reg?.rpe ? rpeTexto(reg.rpe) : ''}</p>
        <label>Mensaje para Vic (opcional)<textarea name="nota" rows="2" placeholder="Cómo te sentiste, molestias, dudas…">${esc(reg?.nota || '')}</textarea></label>
      </div>
      <div class="cta">
        <button class="btn btn-full btn-pill ${reg?.completada ? '' : 'btn-rojo'}" type="submit">${reg?.completada ? 'Guardar cambios' : 'Terminé, guardar sesión'}</button>
        ${reg ? '<button class="link" type="button" id="desmarcar" style="align-self:center">Desmarcar sesión</button>' : ''}
      </div>
    </form>`;
  const guiaOk = $('#guia-ok');
  if (guiaOk) guiaOk.onclick = () => { try { localStorage.setItem('vsl-guia-sesion', '1'); } catch {} $('#guia').remove(); };
  const avance = () => {
    const ejs = $$('[data-ej]'); const n = ejs.filter(e => { const ok = [...e.querySelectorAll('input')].some(i => i.value.trim() !== ''); e.classList.toggle('ok', ok); return ok; }).length;
    $('#avance').textContent = ejs.length ? `${n} de ${ejs.length} anotados` : '';
  };
  $$('[data-ej] input').forEach(i => i.addEventListener('input', avance)); avance();
  $$('#f-sesion [name=rpe]').forEach(r => r.addEventListener('change', () => { $('#rpe-guia').textContent = rpeTexto(Number(r.value)); }));
  $('#f-sesion').onsubmit = async e => {
    e.preventDefault();
    const d = datosForm(e.target); const resultados = {}; const deTests = []; const deCargas = []; const sinCarga = [];
    try {
      s.items.forEach(it => {
        const t = T(it);
        if (!t && deCarga(it)) {
          const series = leerSeries(e.target, it);
          if (series.length) { resultados[it.id] = textoSeries(series); deCargas.push({ miembro_id: yo.id, item_id: it.id, ejercicio: it.ejercicio, clave: claveEjercicio(it.ejercicio), fecha: hoyISO(), series, ...resumenSeries(series) }); }
          else if (cargaActual(it)) sinCarga.push(it.id);
          return;
        }
        if (!t) { if (d['r_' + it.id]) resultados[it.id] = d['r_' + it.id]; return; }
        const r = leerCaptura(t, e.target, 'r_' + it.id);
        if (r) { resultados[it.id] = r.texto; deTests.push({ miembro_id: yo.id, test_id: t.id, item_id: it.id, valor: r.valor, detalle: r.detalle }); }
      });
    } catch (err) { return aviso(err.message, 'error'); }
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await db.guardarRegistro(s, { completada: true, rpe: d.rpe ? Number(d.rpe) : null, nota: d.nota || null, resultados });
      for (const r of deTests) await db.guardarResultadoTest(r);
      for (const c of deCargas) await db.guardarCarga(c);
      await db.borrarCargasDeItems(sinCarga);
      aviso(reg ? 'Cambios guardados' : 'Sesión completada. Así se construye.');
      location.hash = '#/hoy';
    } catch (err) { btn.disabled = false; aviso('No se pudo guardar. Revisa tu conexión.', 'error'); }
  };
  const des = $('#desmarcar');
  if (des) des.onclick = async () => { await db.borrarRegistro(s.id); await db.borrarCargasDeItems(s.items.map(i => i.id)); aviso('Sesión desmarcada'); enrutar(); };
}

/* ----------------------------------------------------------- Check-in */
async function vistaCheckin(v) {
  const checkins = await db.checkins(yo.id);
  let cumplidas = '';
  if (bloque) { const ss = await db.sesionesSemana(bloque.id, semanaActual(bloque)); cumplidas = ss.filter(s => s.registros?.[0]?.completada).length; }
  const escala = nombre => `<div class="escala redonda">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="${nombre}" value="${i}" required><span>${i}</span></label>`).join('')}</div>`;
  v.innerHTML = `
    <div class="top-bar"><h1>Check-in ${permisos(yo.plan).checkin.nombre}</h1></div>
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
        ${c.respuesta ? notaVic('Respuesta de Vic', c.respuesta) : '<p class="tenue" style="font-size:13px;margin:0">Vic lo revisará pronto.</p>'}
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

/* ---------------------------------------------------------- Nutrición */
async function vistaNutricion(v) {
  const [an, meds] = await Promise.all([db.anamnesis(yo.id).catch(() => null), db.composicion(yo.id).catch(() => [])]);
  const d = an?.datos || {};
  const peso = Number(meds.at(-1)?.peso || d.peso) || null;
  const cuidado = (d.condiciones || []).some(c => c !== 'Ninguna') || ['Embarazada', 'Posparto'].includes(d.embarazo) || (d.medicamentos && !/^ningun/i.test(d.medicamentos.trim()));
  const r5 = x => Math.round(x / 5) * 5;
  const sec = (titulo, cuerpo, abierta = false) => `<details class="card guia-sec" ${abierta ? 'open' : ''}><summary>${titulo}</summary><div class="guia-cuerpo">${cuerpo}</div></details>`;
  v.innerHTML = `
    <div class="top-bar"><button class="btn-redondo" type="button" onclick="history.back()" aria-label="Volver">←</button><h1>Guía de nutrición</h1></div>
    ${notaVic('De Vic', 'Esta guía no es una dieta ni un plan de alimentación. Son los principios que uso para que comas en función de tu entrenamiento sin pesar comida ni prohibirte nada. Empieza por uno y suma el siguiente cuando ya te salga solo.')}
    ${cuidado ? `<div class="desbalance"><b>Antes de aplicar esta guía</b><span>Por lo que indicaste en tu anamnesis, confirma estas pautas con tu médico o con un nutricionista.</span></div>` : ''}
    ${peso ? `<div class="stats nutri">
      <div class="stat"><small>Proteína al día</small><b>${r5(peso * 1.6)}–${r5(peso * 2.2)} g</b></div>
      <div class="stat"><small>Agua base</small><b>${(peso * 0.035).toFixed(1)} L</b></div>
      <div class="stat"><small>Según</small><b>${peso} kg</b></div></div>
      <p class="tenue" style="font-size:12px;margin:-4px 0 0">Referencias orientativas calculadas con tu último peso registrado.</p>` : ''}
    ${sec('1 · Arma tu plato con la mano', `
      <p>En cada comida principal, usa tu mano como medida. Va contigo a todos lados y se ajusta a tu tamaño.</p>
      <ul class="mano">
        <li><b>Proteína · 1 a 2 palmas</b><span>Pollo, huevo, carne magra, pescado, atún, queso fresco, yogur griego, frijol con arroz.</span></li>
        <li><b>Verduras · 1 a 2 puños</b><span>Las que te gusten, cocidas o crudas. Entre más color, mejor.</span></li>
        <li><b>Carbohidratos · 1 a 2 manos ahuecadas</b><span>Tortilla, arroz, papa, plátano, avena, pan, fruta. Más en días de carrera larga o doble sesión.</span></li>
        <li><b>Grasas · 1 a 2 pulgares</b><span>Aguacate, aceite de oliva, manías, crema de maní, semillas.</span></li>
      </ul>
      <p class="tenue">Como punto de partida, una porción de cada una si eres mujer y dos si eres hombre. Ajusta según tu hambre, tu energía y tu progreso.</p>`, true)}
    ${sec('2 · Proteína en cada comida', `
      <p>Es lo que más te ayuda a recuperarte y a conservar o ganar músculo. La referencia para personas que entrenan es de 1.6 a 2.2 g por kilo de peso al día, repartida en 3 o 4 comidas.</p>
      <p>Si se te complica, empieza por algo simple: que ninguna comida principal quede sin su palma de proteína.</p>`)}
    ${sec('3 · Hidratación', `
      <p>Una referencia base es unos 35 ml por kilo de peso al día, más medio litro a 750 ml por cada hora de entrenamiento.</p>
      <p>La mejor señal es tu orina: clara o amarillo pálido. Con calor o sesiones de más de una hora, agrega una pizca de sal o una bebida con electrolitos.</p>`)}
    ${sec('4 · Antes y después de entrenar', `
      <p><b>De 1 a 3 horas antes:</b> carbohidrato con algo de proteína y poca grasa o fibra para no sentirte pesado. Por ejemplo: avena con banano, pan con crema de maní, tortilla con huevo.</p>
      <p><b>Si entrenas temprano en ayunas:</b> un banano o un pan 20 a 30 minutos antes suele ser suficiente.</p>
      <p><b>Después:</b> una comida con su palma de proteína y su porción de carbohidrato en las siguientes horas. No hace falta correr a tomar un batido en 30 minutos.</p>`)}
    ${sec('5 · Carreras y salidas largas', `
      <p>En sesiones de más de 75 a 90 minutos, tu cuerpo necesita combustible durante el esfuerzo: entre 30 y 60 g de carbohidratos por hora, con geles, bebida deportiva, banano o dulces.</p>
      <p>Prueba en los entrenamientos lo que vas a usar en tu carrera. Nada nuevo el día del evento.</p>`)}
    ${sec('6 · Hábitos que más suman', `
      <ul class="lista-simple">
        <li>Regla 80/20: come bien la mayor parte del tiempo y disfruta el resto sin culpa.</li>
        <li>No hay alimentos prohibidos; hay cantidades y frecuencias.</li>
        <li>El alcohol frena la recuperación y el sueño. Si tomas, que no sea la noche antes de una sesión clave.</li>
        <li>Dormir 7 a 9 horas pesa tanto como lo que comes.</li>
        <li>Los suplementos son la última capa: primero comida, sueño y constancia.</li>
      </ul>`)}
    <p class="tenue" style="font-size:12px;margin:0">Guía educativa general. No sustituye la consulta con un médico o nutricionista.</p>`;
}

/* ------------------------------------------------------------ Técnica */
async function vistaTecnica(v) {
  if (!puede(yo.plan, 'tecnicaVideo')) {
    v.innerHTML = `<div class="top-bar"><h1>Revisión de técnica</h1></div>
      <div class="portada" style="background-image:url('${FOTOS.fuerza}');height:200px"><div class="portada-in"><div><span class="tag">${ICONOS.candado} ${planMinimo('tecnicaVideo')}</span><h2>Graba. Corrijo. Mejoras.</h2></div></div></div>
      ${candado('tecnicaVideo', 'Subes un video corto de tus series clave y Vic te devuelve correcciones concretas, ejercicio por ejercicio.')}`;
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
        ${vd.comentario ? `<div style="margin-top:12px">${notaVic('Corrección de Vic', vd.comentario)}</div>` : ''}
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
  const [regs, checkins, videos] = await Promise.all([db.registros(yo.id), db.checkins(yo.id), puede(yo.plan, 'tecnicaVideo') ? db.videos(yo.id) : []]);
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
    { nombre: puede(yo.plan, 'tecnicaVideo') ? 'Técnica' : 'Constancia', valor: puede(yo.plan, 'tecnicaVideo') ? `${vidsSem} video${vidsSem === 1 ? '' : 's'}` : prom + '%', pct: puede(yo.plan, 'tecnicaVideo') ? Math.min(vidsSem * 100, 100) : prom, color: '#8F8C88' }
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
  const meds = puede(yo.plan, 'composicion') ? await db.composicion(yo.id).catch(() => []) : [];
  if (meds.length) {
    v.insertAdjacentHTML('beforeend', `<div class="card mapa-card"><p class="card-t">Mapa corporal <small>${meds.length} medici${meds.length === 1 ? 'ón' : 'ones'} InBody</small></p><div id="mapa"></div></div>`);
    montarMapa($('#mapa', v), meds);
  }
  const [tests, resTest] = await Promise.all([db.tests().catch(() => []), db.resultadosTest(yo.id).catch(() => [])]);
  const porTest = tests.map(t => ({ t, rs: resTest.filter(r => r.test_id === t.id) })).filter(x => x.rs.length);
  const grupos = porEjercicio(await db.cargas(yo.id).catch(() => [])).filter(g => g.registros.some(r => r.top_kg));
  if (grupos.length) v.insertAdjacentHTML('beforeend', `<div class="card"><p class="card-t">Tus cargas <small>${grupos.length} ejercicio${grupos.length === 1 ? '' : 's'}</small></p>
    <div class="tests-lista">${grupos.slice(0, 10).map(g => {
      const cr = g.registros.filter(r => r.top_kg), ult = cr.at(-1), pri = cr[0], dif = Math.round((ult.top_kg - pri.top_kg) * 10) / 10;
      return `<div class="test-fila"><div><p class="test-n">${esc(g.nombre)}</p><p class="test-s">${fecha(ult.fecha)} · ${esc(textoSeries(ult.series))}</p>
        ${cr.length > 1 ? `<p class="test-d ${dif > 0 ? 'sube' : dif < 0 ? 'baja' : ''}">${dif > 0 ? '▲ +' + dif + ' kg' : dif < 0 ? '▼ ' + dif + ' kg' : 'Mismo peso'} desde ${fecha(pri.fecha)}</p>` : ''}</div>
        <b class="test-v">${ult.top_kg} kg</b></div>`;
    }).join('')}</div></div>`);
  const zs = zonasMiembro(tests, resTest);
  if (zs.fc || zs.ritmo) v.insertAdjacentHTML('beforeend', `<div class="card"><p class="card-t">Tus zonas de carrera <small>Según tu último test</small></p>
    <div class="tests-lista">${ZONAS.map(z => `<div class="test-fila"><div><p class="test-n">${z.id} · ${z.nombre}</p><p class="test-s">${[zs.fc?.[z.id], zs.ritmo?.[z.id]].filter(Boolean).join(' · ')}</p></div></div>`).join('')}</div></div>`);
  if (porTest.length) v.insertAdjacentHTML('beforeend', `<div class="card"><p class="card-t">Tus tests <small>${porTest.length} evaluado${porTest.length === 1 ? '' : 's'}</small></p>
    <div class="tests-lista">${porTest.map(({ t, rs }) => {
      const ult = rs[rs.length - 1], prev = rs[rs.length - 2], c = cambio(t, ult.valor, prev?.valor);
      return `<div class="test-fila"><div><p class="test-n">${esc(t.nombre)}</p><p class="test-s">${fecha(ult.fecha)}${ult.detalle ? ' · ' + esc(ult.detalle) : ''}</p>
        ${c ? `<p class="test-d ${c.mejora > 0 ? 'sube' : c.mejora < 0 ? 'baja' : ''}">${esc(c.texto)}</p>` : '<p class="test-s">Primera medición</p>'}</div>
        <b class="test-v">${esc(formatear(t, ult.valor))}</b></div>`;
    }).join('')}</div></div>`);
}
