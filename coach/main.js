import { crearDatos, DIAS, PLANES, TIPOS, semanaActual, diaSemanaHoy, lunesDe, puedeVideos, estadoPago, PRECIOS, hoyISO } from '/shared/data.js';
import { $, $$, esc, fecha, hace, aviso, cargando, vacio, datosForm, dialogo, barraProgreso, lineaSVG, registrarSW } from '/shared/ui.js';
import { formAcceso, pideCrearClave, pantallaCrearClave } from '/shared/acceso.js';
import { PASOS, alertas, requiereRevisionMedica, htmlResumen, edad } from '/shared/anamnesis.js';
import { CATEGORIAS, UNIDADES, htmlCaptura, leerCaptura, formatear, cambio, htmlDerivados, zonasMiembro, ZONAS } from '/shared/tests.js';

const raiz = $('#raiz');
const URL_APP = location.origin + '/app/';
let db, yo;
const cuentas = { aplicaciones: 0, videos: 0 };

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
  if (!yo || yo.rol !== 'coach') return pantallaNoCoach();
  pintarMarco();
  window.onhashchange = enrutar;
  enrutar();
}

function pantallaAcceso() {
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in">
    <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
    <div><p class="eyebrow"><span class="punto"></span>Panel del coach</p><h1 class="h1">Tu equipo,<br><span class="tenue">en un vistazo.</span></h1></div>
    ${db.demo ? `<p class="suave">Estás viendo el panel en <b>modo demostración</b>, con miembros y aplicaciones de ejemplo.</p>
      <button class="btn btn-full" id="demo">Entrar al panel</button><a class="btn btn-linea btn-full" href="/app/?demo">Ver app del miembro</a>`
      : `<div id="acceso-form"></div>`}
  </div></main>`;
  if (db.demo) { $('#demo').onclick = async () => { await db.entrarDemo('coach'); arrancar(); }; return; }
  formAcceso($('#acceso-form'), db, '/coach/', { etiqueta: 'Tu correo de coach' });
}

function pantallaNoCoach() {
  raiz.innerHTML = `<main class="acceso"><div class="acceso-in"><h1 class="h1">Solo para el coach</h1>
    <p class="suave">Esta sección es el panel de Vic. Si eres miembro del equipo, tu plan está en la app.</p>
    <a class="btn btn-full" href="/app/">Ir a mi plan</a><button class="link" id="salir">Salir</button></div></main>`;
  $('#salir').onclick = async () => { await db.salir(); arrancar(); };
}

function pintarMarco() {
  const enlaces = [['miembros', 'Miembros'], ['aplicaciones', 'Aplicaciones'], ['videos', 'Videos'], ['tests', 'Tests']];
  raiz.innerHTML = `
  ${db.demo ? '<div class="demo-banda"><b>Modo demostración</b> · datos de ejemplo, nada se guarda</div>' : ''}
  <div class="marco">
    <aside class="lateral">
      <img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
      <nav class="menu" aria-label="Panel">${enlaces.map(([k, t]) => `<a href="#/${k}" data-r="${k}">${t}<span class="cuenta" data-c="${k}" hidden></span></a>`).join('')}</nav>
      <div class="lateral-pie"><span>${esc(yo.correo)}</span><a class="link" href="/" target="_blank">Ver landing</a><button class="link" id="salir" style="text-align:left">Salir</button></div>
    </aside>
    <div>
      <nav class="movil-nav" aria-label="Panel"><img src="/img/vs-limitless-horizontal-claro.svg" alt="VS Limitless" width="214" height="64">
        ${enlaces.map(([k, t]) => `<a href="#/${k}" data-r="${k}">${t}</a>`).join('')}</nav>
      <main class="contenido"><div id="vista" class="vista"></div></main>
    </div>
  </div>`;
  $('#salir').onclick = async () => { await db.salir(); location.hash = ''; arrancar(); };
  actualizarCuentas();
}

async function actualizarCuentas() {
  try {
    const [apps, vids] = await Promise.all([db.aplicaciones(), db.videosPendientes()]);
    cuentas.aplicaciones = apps.filter(a => (a.estado || 'nueva') === 'nueva').length;
    cuentas.videos = vids.length;
    Object.entries(cuentas).forEach(([k, n]) => { const el = $(`[data-c="${k}"]`); if (el) { el.textContent = n; el.hidden = !n; } });
  } catch (e) { console.error(e); }
}

function enrutar() {
  const [ruta, id, tab] = (location.hash.replace(/^#\/?/, '') || 'miembros').split('/');
  const menu = ruta === 'miembro' ? 'miembros' : ruta;
  $$('[data-r]').forEach(a => a.dataset.r === menu ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const v = $('#vista'); cargando(v); window.scrollTo(0, 0);
  const vistas = { miembros: vistaMiembros, aplicaciones: vistaAplicaciones, videos: vistaVideos, miembro: vistaMiembro, tests: vistaTests };
  (vistas[ruta] || vistaMiembros)(v, id, tab).catch(err => { console.error(err); v.innerHTML = vacio('Algo salió mal', err.message || 'Recarga la página.'); });
}

/* ------------------------------------------------------------ Miembros */
async function vistaMiembros(v) {
  const [miembros, cobro, anams] = await Promise.all([db.miembros(), db.ajustesCobro(), db.anamnesisTodas()]);
  const anDe = id => anams.find(a => a.miembro_id === id);
  const res = await Promise.all(miembros.map(m => db.resumenMiembro(m)));
  const filas = miembros.map((m, i) => ({ m, r: res[i] }));
  const activos = miembros.filter(m => m.estado === 'activo').length;
  const sinResp = res.reduce((a, r) => a + r.sinRespuesta, 0);
  const vids = res.reduce((a, r) => a + r.pendientes, 0);
  const alertas = filas.filter(({ m, r }) => m.estado === 'activo' && (r.alerta || r.sinPlan)).length;
  filas.sort((a, b) => (b.r.alerta + b.r.sinPlan + (b.r.sinRespuesta > 0)) - (a.r.alerta + a.r.sinPlan + (a.r.sinRespuesta > 0)));

  v.innerHTML = `
    <div class="titulo"><div><p class="eyebrow">Equipo Limitless</p><h1 class="h1">Miembros</h1></div>
      <div class="ficha-ctl"><button class="btn btn-linea" id="cobro">Datos de cobro</button><button class="btn" id="invitar">Invitar miembro</button></div></div>
    <div class="cifras-4">
      <div class="cifra"><span class="num">${activos}</span><small>Activos</small></div>
      <div class="cifra"><span class="num">${alertas}</span><small>Necesitan atención</small></div>
      <div class="cifra"><span class="num">${sinResp}</span><small>Check-ins por responder</small></div>
      <div class="cifra"><span class="num">${vids}</span><small>Videos por revisar</small></div>
    </div>
    ${filas.length ? `<table class="tabla"><thead><tr><th>Miembro</th><th>Plan</th><th>Esta semana</th><th>Última actividad</th><th>Atención</th></tr></thead><tbody>
      ${filas.map(({ m, r }) => `<tr class="clic" data-id="${m.id}">
        <td><div class="nombre">${esc(m.nombre || m.correo)}</div><div class="sub">${esc(m.objetivo || m.correo)}</div></td>
        <td><span class="chip ${m.plan === 'Élite' ? 'chip-claro' : ''}">${esc(m.plan)}</span></td>
        <td class="col-oculta">${r.adherencia === null ? '<span class="tenue">—</span>' : `<div class="adh"><div class="adh-barra ${r.adherencia < 50 ? 'baja' : ''}"><i style="width:${r.adherencia}%"></i></div><span>${r.hechas}/${r.programadas}</span></div>`}</td>
        <td class="col-oculta tenue">${hace(r.ultima)}</td>
        <td><div class="chips">
          ${m.estado === 'activo' ? chipPago(estadoPago(m, cobro.gracia)) : ''}
          ${chipAnamnesis(anDe(m.id))}
          ${m.estado !== 'activo' ? `<span class="chip">${esc(m.estado)}</span>` : ''}
          ${r.sinPlan ? '<span class="chip chip-alerta">Sin plan</span>' : ''}
          ${r.alerta && !r.sinPlan ? `<span class="chip chip-alerta">${r.inactivo} días inactivo</span>` : ''}
          ${r.sinRespuesta ? `<span class="chip chip-ambar">Check-in</span>` : ''}
          ${r.pendientes ? `<span class="chip chip-ambar">${r.pendientes} video${r.pendientes > 1 ? 's' : ''}</span>` : ''}
          ${!r.sinPlan && !r.alerta && !r.sinRespuesta && !r.pendientes && m.estado === 'activo' ? '<span class="chip chip-ok">Al día</span>' : ''}
        </div></td></tr>`).join('')}
    </tbody></table>` : vacio('Aún no tienes miembros', 'Acepta una aplicación o invita a alguien directamente.')}`;
  $$('tr[data-id]', v).forEach(tr => tr.onclick = () => { location.hash = '#/miembro/' + tr.dataset.id; });
  $('#invitar').onclick = () => dialogoInvitar({});
  $('#cobro').onclick = () => dialogoCobro(cobro);
}

function chipAnamnesis(a) {
  if (!a?.completada) return '<span class="chip chip-ambar">Anamnesis pendiente</span>';
  if (a.alerta_salud && !a.revisada_at) return '<span class="chip chip-alerta">Revisar salud</span>';
  return '';
}

function chipPago(e) {
  if (e.tipo === 'sin') return '<span class="chip">Sin pago registrado</span>';
  if (e.tipo === 'por_vencer') return `<span class="chip chip-ambar">${e.dias === 0 ? 'Vence hoy' : `Vence en ${e.dias} d`}</span>`;
  if (e.tipo === 'gracia') return `<span class="chip chip-alerta">Pago vencido ${e.vencido} d</span>`;
  if (e.tipo === 'bloqueado') return `<span class="chip chip-alerta">Acceso pausado</span>`;
  return '';
}

function dialogoCobro(cobro) {
  dialogo(`<form class="form" id="f-cobro">
      <div><p class="eyebrow">Cobros</p><h2 class="h2">Datos de cobro</h2></div>
      <p class="suave" style="margin:0">Esto es lo que ven tus miembros cuando su mensualidad está por vencer o vencida.</p>
      <label>Cómo pagarte<textarea name="instrucciones" rows="4" placeholder="Transferencia a Banco Industrial · Cuenta monetaria 000-000000-0 a nombre de Víctor Sánchez. Envíame el comprobante por WhatsApp.">${esc(cobro.instrucciones)}</textarea></label>
      <div class="grid2"><label>Tu WhatsApp para comprobantes<input name="whatsapp" inputmode="tel" value="${esc(cobro.whatsapp)}" placeholder="502 5555 5555"></label>
      <label>Días de gracia<input name="gracia" type="number" min="0" max="30" value="${cobro.gracia}"></label></div>
      <p class="tenue" style="font-size:13px;margin:0">Durante los días de gracia el miembro ve una ventana de aviso pero sigue entrenando. Al terminar, su plan se pausa hasta que registres el pago.</p>
      <button class="btn btn-rojo" type="submit">Guardar</button></form>`, d => {
    $('#f-cobro', d).onsubmit = async e => {
      e.preventDefault(); const x = datosForm(e.target);
      try { await db.guardarAjustesCobro({ instrucciones: x.instrucciones.trim(), whatsapp: x.whatsapp.replace(/\D/g, ''), gracia: Number(x.gracia || 5) }); d.close(); aviso('Datos de cobro guardados'); enrutar(); }
      catch { aviso('No se pudo guardar.', 'error'); }
    };
  });
}

function dialogoInvitar(pre, alInvitar) {
  dialogo(`<form class="form" id="f-inv">
      <div><p class="eyebrow">Nuevo miembro</p><h2 class="h2">Invitar al equipo</h2></div>
      <div class="grid2"><label>Nombre<input name="nombre" required value="${esc(pre.nombre || '')}"></label>
      <label>Correo<input type="email" name="correo" required value="${esc(pre.correo || '')}"></label></div>
      <label>Plan<select name="plan" required>${PLANES.map(p => `<option ${p === (pre.plan === 'No sé' ? 'Limitless' : pre.plan || 'Limitless') ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      <label>Objetivo<input name="objetivo" value="${esc(pre.meta || pre.objetivo || '')}"></label>
      <button class="btn btn-rojo btn-full" type="submit">Invitar</button>
    </form>`, d => {
    $('#f-inv', d).onsubmit = async e => {
      e.preventDefault(); const datos = datosForm(e.target);
      try {
        await db.invitar({ ...datos, aplicacion_id: pre.id || null });
        await alInvitar?.();
        const nombre = datos.nombre.split(' ')[0];
        const msg = `¡Hola ${nombre}! Te doy la bienvenida al Equipo Limitless. Entra a ${URL_APP} con tu correo ${datos.correo}, toca «¿Primera vez?» y crea tu contraseña. Después agrega la app a tu pantalla de inicio y entra siempre con tu correo y contraseña.`;
        const wa = pre.whatsapp ? 'https://wa.me/' + pre.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg) : 'https://wa.me/?text=' + encodeURIComponent(msg);
        d.querySelector('form').outerHTML = `<div class="form"><div><p class="eyebrow"><span class="punto"></span>Invitación creada</p><h2 class="h2">${esc(datos.nombre)} ya puede entrar</h2></div>
          <p class="suave" style="margin:0">Envíale este mensaje para que entre a su app:</p>
          <div class="burbuja">${esc(msg)}</div>
          <a class="btn btn-full" href="${wa}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
          <button class="btn btn-linea btn-full" type="button" id="copiar">Copiar mensaje</button></div>`;
        $('#copiar', d).onclick = () => { navigator.clipboard.writeText(msg); aviso('Mensaje copiado'); };
        d.addEventListener('close', () => enrutar());
      } catch (err) { aviso(err.message?.includes('duplicate') ? 'Ese correo ya tiene una invitación.' : 'No se pudo invitar.', 'error'); }
    };
  });
}

/* --------------------------------------------------------- Aplicaciones */
async function vistaAplicaciones(v) {
  const apps = await db.aplicaciones();
  const nuevas = apps.filter(a => (a.estado || 'nueva') === 'nueva');
  const resto = apps.filter(a => (a.estado || 'nueva') !== 'nueva');
  const tarjeta = a => `<div class="app-card" data-id="${a.id}">
    <div><p class="fila-t">${esc(a.nombre)} <span class="chip" style="margin-left:6px">${esc(a.plan)}</span>${a.estado && a.estado !== 'nueva' ? ` <span class="chip ${a.estado === 'aceptada' ? 'chip-ok' : ''}">${esc(a.estado)}</span>` : ''}</p>
      <p class="suave" style="margin:6px 0 0">${esc(a.meta || a.objetivo)}</p>
      <div class="meta"><span>${hace(a.created_at)}</span><span>${esc(a.ciudad || '')}</span><span>${esc(a.nivel || '')}</span><span>${esc(a.dias || '?')} días/sem</span></div></div>
    <div style="display:flex;align-items:center;gap:16px"><div style="text-align:right"><span class="compromiso" style="color:${a.compromiso >= 8 ? 'var(--tinta)' : a.compromiso >= 6 ? '#e3b341' : 'var(--rojo-texto)'}">${a.compromiso}/10</span><div class="fila-s">compromiso</div></div>
      <button class="btn btn-sm btn-linea" data-ver="${a.id}">Ver</button></div></div>`;
  v.innerHTML = `
    <div class="titulo"><div><p class="eyebrow">Desde tu landing</p><h1 class="h1">Aplicaciones</h1></div></div>
    <section><p class="eyebrow">Nuevas · ${nuevas.length}</p>${nuevas.map(tarjeta).join('') || vacio('Sin aplicaciones nuevas', 'Cuando alguien aplique en tu landing aparecerá aquí y te llegará por correo.')}</section>
    ${resto.length ? `<section><p class="eyebrow">Revisadas</p>${resto.map(tarjeta).join('')}</section>` : ''}`;
  $$('[data-ver]', v).forEach(b => b.onclick = () => detalleAplicacion(apps.find(a => a.id === b.dataset.ver)));
}

function detalleAplicacion(a) {
  const filas = [['Objetivo', a.objetivo], ['Meta', a.meta], ['Nivel actual', a.nivel], ['Días disponibles', a.dias], ['Dónde entrena', a.lugar], ['Lesiones', a.lesiones],
    ['¿Por qué ahora?', a.por_que_ahora], ['La última vez que dejó de entrenar', a.ultima_vez], ['Si la semana 3 se complica', a.semana_mala]];
  dialogo(`<div class="form">
    <div><p class="eyebrow">${fecha(a.created_at, { day: 'numeric', month: 'long' })} · ${esc(a.ciudad || '')} · ${esc(a.edad || '')} años</p><h2 class="h2">${esc(a.nombre)}</h2>
      <p class="suave" style="margin:8px 0 0">${esc(a.correo)} · ${esc(a.whatsapp || '')}</p></div>
    <div class="cifras"><div class="cifra"><span class="num">${a.compromiso}/10</span><small>Compromiso</small></div><div class="cifra"><span class="num" style="font-size:28px">${esc(a.plan)}</span><small>Plan de interés</small></div><div class="cifra"><span class="num">${esc(a.dias || '?')}</span><small>Días/semana</small></div></div>
    <dl class="respuestas">${filas.map(([t, val]) => `<div><dt>${t}</dt><dd>${esc(val || '—')}</dd></div>`).join('')}</dl>
    ${(a.estado || 'nueva') === 'nueva' ? `<div class="grid2"><button class="btn btn-rojo" id="aceptar">Aceptar e invitar</button><button class="btn btn-linea" id="descartar">Descartar</button></div>` : ''}
    ${a.whatsapp ? `<a class="link" href="https://wa.me/${esc(a.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">Escribirle por WhatsApp para agendar la llamada</a>` : ''}
  </div>`, d => {
    const acep = $('#aceptar', d), desc = $('#descartar', d);
    if (acep) acep.onclick = () => { d.close(); dialogoInvitar(a, async () => { await db.marcarAplicacion(a.id, 'aceptada'); actualizarCuentas(); }); };
    if (desc) desc.onclick = async () => { await db.marcarAplicacion(a.id, 'descartada'); d.close(); aviso('Aplicación descartada'); actualizarCuentas(); enrutar(); };
  });
}

/* --------------------------------------------------------------- Videos */
async function vistaVideos(v) {
  const vids = await db.videosPendientes();
  v.innerHTML = `<div class="titulo"><div><p class="eyebrow">Revisión de técnica</p><h1 class="h1">Videos</h1></div></div>
    <div class="lista">${vids.map(vd => tarjetaVideo(vd, true)).join('') || vacio('Nada pendiente', 'Estás al día con la técnica de tu equipo.')}</div>`;
  activarVideos(v);
}

function tarjetaVideo(vd, conNombre) {
  return `<div class="ejercicio" data-video="${vd.id}">
    <div class="ejercicio-t"><h3>${conNombre ? esc(vd.perfiles?.nombre || '') + ' · ' : ''}${esc(vd.ejercicio)}</h3>
      <span class="chip ${vd.estado === 'revisado' ? 'chip-ok' : 'chip-ambar'}">${vd.estado === 'revisado' ? 'Revisado' : 'Pendiente'}</span></div>
    <p class="fila-s">${hace(vd.created_at)}${vd.nota ? ' · «' + esc(vd.nota) + '»' : ''}</p>
    ${vd.ruta ? `<button class="link" data-ver="${esc(vd.ruta)}" style="margin-top:10px">Ver video</button>` : '<p class="tenue" style="font-size:12px;margin:8px 0 0">Video de ejemplo sin archivo.</p>'}
    ${vd.estado === 'revisado' ? `<div class="burbuja burbuja-coach" style="margin-top:12px"><small>Tu corrección</small>${esc(vd.comentario)}</div>`
      : `<form class="form" data-rev="${vd.id}" style="margin-top:14px"><textarea name="comentario" rows="3" required placeholder="Corrección concreta: qué ves, qué cambiar y una señal para sentirlo bien."></textarea>
      <button class="btn btn-sm" type="submit" style="align-self:flex-start">Enviar corrección</button></form>`}
  </div>`;
}

function activarVideos(v) {
  $$('[data-ver]', v).forEach(b => b.onclick = async () => {
    const url = await db.urlVideo(b.dataset.ver);
    b.outerHTML = `<video src="${esc(url)}" controls playsinline preload="metadata" style="width:100%;max-width:420px;border-radius:6px;margin-top:12px;background:#000"></video>`;
  });
  $$('form[data-rev]', v).forEach(f => f.onsubmit = async e => {
    e.preventDefault(); await db.revisarVideo(f.dataset.rev, datosForm(f).comentario); aviso('Corrección enviada'); actualizarCuentas(); enrutar();
  });
}

/* -------------------------------------------------------------- Miembro */
async function vistaMiembro(v, id, tab = 'plan') {
  const m = await db.miembro(id);
  const tabs = [['plan', 'Plan'], ['anamnesis', 'Anamnesis'], ['tests', 'Tests'], ['checkins', 'Check-ins'], ['videos', 'Videos'], ['registros', 'Registros'], ['progreso', 'Progreso'], ['pagos', 'Pagos']]
    .filter(([k]) => k !== 'videos' || puedeVideos(m.plan));
  v.innerHTML = `
    <a class="link" href="#/miembros">← Miembros</a>
    <div class="ficha">
      <div class="ficha-datos"><p class="eyebrow">Miembro desde ${fecha(m.created_at, { month: 'long', year: 'numeric' })}</p><h1 class="h1">${esc(m.nombre || m.correo)}</h1>
        <p class="suave" style="margin:0">${esc(m.objetivo || 'Sin objetivo registrado')} · ${esc(m.correo)}</p></div>
      <div class="ficha-ctl">
        <select id="plan" aria-label="Plan">${PLANES.map(p => `<option ${p === m.plan ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <select id="estado" aria-label="Estado">${['activo', 'pausado', 'baja'].map(e => `<option ${e === m.estado ? 'selected' : ''}>${e}</option>`).join('')}</select>
        <button class="link link-peligro" id="eliminar" type="button">Eliminar</button>
      </div>
    </div>
    <nav class="tabs">${tabs.map(([k, t]) => `<a href="#/miembro/${id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <div id="panel" class="vista"></div>`;
  $('#plan').onchange = async e => { await db.actualizarMiembro(id, { plan: e.target.value }); aviso('Plan actualizado'); };
  $('#estado').onchange = async e => {
    const v = e.target.value;
    await db.actualizarMiembro(id, { estado: v });
    aviso(v === 'activo' ? 'Miembro activo: vuelve a ver su plan' : v === 'pausado' ? 'Plan pausado: ya no puede verlo hasta que lo reactives' : 'Dado de baja: su acceso se cerró. Su historial queda guardado.');
  };
  $('#eliminar').onclick = () => dialogo(`<div class="menu-hoja">
      <p class="eyebrow">Eliminar miembro</p><h2 class="h2">¿Eliminar a ${esc(m.nombre || m.correo)}?</h2>
      <p class="suave" style="margin:0">Se borra su cuenta y todo su historial: plan, registros, check-ins, videos y pagos. <b>No se puede deshacer.</b></p>
      <p class="tenue" style="font-size:13px;margin:0">Si solo quieres cortarle el acceso y conservar su historial, cambia su estado a «baja».</p>
      <label>Escribe ELIMINAR para confirmar<input id="conf" autocomplete="off"></label>
      <button class="btn btn-rojo btn-full" id="si" disabled>Eliminar definitivamente</button></div>`, d => {
    $('#conf', d).oninput = ev => { $('#si', d).disabled = ev.target.value.trim().toUpperCase() !== 'ELIMINAR'; };
    $('#si', d).onclick = async () => {
      try { await db.eliminarMiembro(id); d.close(); aviso('Miembro eliminado'); location.hash = '#/miembros'; }
      catch { aviso('No se pudo eliminar.', 'error'); }
    };
  });
  const p = $('#panel'); cargando(p);
  const paneles = { plan: panelPlan, checkins: panelCheckins, videos: panelVideos, registros: panelRegistros, progreso: panelProgreso, pagos: panelPagos, anamnesis: panelAnamnesis, tests: panelTests };
  await (paneles[tab] || panelPlan)(p, m);
}

/* --------------------------------------------------------------- Tests */
async function vistaTests(v) {
  const tests = await db.tests();
  v.innerHTML = `
    <div class="titulo"><div><p class="eyebrow">Evaluación</p><h1 class="h1">Tests</h1></div><button class="btn" id="nuevo-test">Nuevo test</button></div>
    <p class="suave" style="margin:0;max-width:720px">Agrega cualquier test a una sesión desde el editor de ejercicios. El miembro ve el protocolo y registra su resultado; tú ves su historial y los valores para prescribir en su pestaña Tests.</p>
    ${Object.entries(CATEGORIAS).map(([k, n]) => {
      const ts = tests.filter(t => t.categoria === k);
      return ts.length ? `<section class="vista" style="gap:12px"><p class="eyebrow">${n}</p><div class="lista">${ts.map(t => `
        <button class="fila" data-t="${t.id}" type="button"><div class="fila-cuerpo"><p class="fila-t">${esc(t.nombre)}</p>
          <p class="fila-s">${UNIDADES[t.unidad]} · ${t.mejor === 'menor' ? 'menos es mejor' : 'más es mejor'}${t.calculo ? ' · calcula valores para prescribir' : ''}</p></div><span class="link">Editar</span></button>`).join('')}</div></section>` : '';
    }).join('')}`;
  $('#nuevo-test').onclick = () => editarTest({}, () => vistaTests(v));
  $$('[data-t]', v).forEach(b => b.onclick = () => editarTest(tests.find(t => t.id === b.dataset.t), () => vistaTests(v)));
}

function editarTest(t, alGuardar) {
  dialogo(`<form class="form" id="f-test"><div><p class="eyebrow">Biblioteca</p><h2 class="h2">${t.id ? 'Editar test' : 'Nuevo test'}</h2></div>
    <label>Nombre<input name="nombre" required value="${esc(t.nombre || '')}" placeholder="Test de Rockport 1.6 km"></label>
    <div class="grid2"><label>Categoría<select name="categoria">${Object.entries(CATEGORIAS).map(([k, n]) => `<option value="${k}" ${k === t.categoria ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Se mide en<select name="unidad">${Object.entries(UNIDADES).map(([k, n]) => `<option value="${k}" ${k === t.unidad ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="grid2"><label>Mejor resultado<select name="mejor"><option value="mayor" ${t.mejor !== 'menor' ? 'selected' : ''}>Más es mejor</option><option value="menor" ${t.mejor === 'menor' ? 'selected' : ''}>Menos es mejor</option></select></label>
      <label>Distancia en metros (solo carreras por tiempo)<input name="distancia" type="number" min="100" value="${t.distancia || ''}" placeholder="5000"></label></div>
    <label>Protocolo para el miembro<textarea name="protocolo" rows="4" required placeholder="Calentamiento, cómo se ejecuta y qué anotar.">${esc(t.protocolo || '')}</textarea></label>
    <div class="grid2"><button class="btn btn-rojo" type="submit">Guardar</button>${t.id ? '<button class="btn btn-linea" type="button" id="archivar">Quitar de la biblioteca</button>' : ''}</div></form>`, d => {
    const f = $('#f-test', d);
    f.onsubmit = async e => {
      e.preventDefault(); const x = datosForm(e.target);
      const dist = x.distancia ? Number(x.distancia) : null;
      const calculo = x.unidad === 'kg_reps' ? '1rm' : x.unidad === 'tiempo' && dist ? 'ritmo' : (t.calculo === 'cooper' ? 'cooper' : null);
      try { await db.guardarTest({ ...(t.id ? { id: t.id } : {}), nombre: x.nombre.trim(), categoria: x.categoria, unidad: x.unidad, mejor: x.mejor, distancia: dist, calculo, protocolo: x.protocolo.trim() }); d.close(); aviso('Test guardado'); alGuardar(); }
      catch { aviso('No se pudo guardar el test.', 'error'); }
    };
    const arch = $('#archivar', d);
    if (arch) arch.onclick = async () => { await db.guardarTest({ id: t.id, activo: false }); d.close(); aviso('Test quitado de la biblioteca. Los resultados guardados se conservan.'); alGuardar(); };
  });
}

async function panelTests(p, m) {
  const [tests, rs] = await Promise.all([db.tests(), db.resultadosTest(m.id)]);
  const f = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  const grupos = tests.map(t => ({ t, rs: rs.filter(r => r.test_id === t.id) })).filter(g => g.rs.length);
  const zs = zonasMiembro(tests, rs);
  const tablaZonas = (zs.fc || zs.ritmo) ? `<div class="tarjeta test-card"><div class="test-cab"><div><p class="eyebrow">Se aplican solas en el plan</p><p class="h3" style="margin:4px 0 0">Zonas de carrera actuales</p></div></div>
    <p class="fila-s" style="margin:0">Escribe Z1 a Z5 en «Ritmo / zona» de cualquier ejercicio y el miembro verá estos valores. FC: ${zs.fuenteFC || 'sin test de 30 min'} · Ritmo: ${zs.fuenteRitmo || 'sin test de carrera'}.</p>
    <table class="tabla-mini"><thead><tr><th>Zona</th><th>Pulsaciones</th><th>Ritmo</th></tr></thead><tbody>${ZONAS.map(z => `<tr><td>${z.id} · ${z.nombre}</td><td>${zs.fc?.[z.id] || '—'}</td><td>${zs.ritmo?.[z.id] || '—'}</td></tr>`).join('')}</tbody></table></div>` : '';
  p.innerHTML = `
    <div class="titulo" style="align-items:center"><p class="suave" style="margin:0">${grupos.length ? `${grupos.length} test${grupos.length === 1 ? '' : 's'} con resultados.` : 'Aún no hay resultados.'} Los que el miembro registra en sus sesiones aparecen aquí solos.</p>
      <button class="btn btn-linea" id="registrar">Registrar resultado</button></div>
    ${tablaZonas}
    ${grupos.map(({ t, rs }) => {
      const ult = rs[rs.length - 1], c = cambio(t, ult.valor, rs[rs.length - 2]?.valor);
      const mejor = rs.reduce((a, r) => (t.mejor === 'menor' ? Number(r.valor) < Number(a.valor) : Number(r.valor) > Number(a.valor)) ? r : a, rs[0]);
      return `<div class="tarjeta test-card">
        <div class="test-cab"><div><p class="eyebrow">${CATEGORIAS[t.categoria]}</p><p class="h3" style="margin:4px 0 0">${esc(t.nombre)}</p></div>
          <div style="text-align:right"><p class="compromiso" style="margin:0">${esc(formatear(t, ult.valor))}</p><p class="fila-s" style="margin:4px 0 0">${f(ult.fecha)}${ult.detalle ? ' · ' + esc(ult.detalle) : ''}</p></div></div>
        ${c ? `<p class="test-d ${c.mejora > 0 ? 'sube' : c.mejora < 0 ? 'baja' : ''}">${esc(c.texto)}</p>` : ''}
        ${rs.length > 1 ? `<p class="fila-s">Mejor marca: ${esc(formatear(t, mejor.valor))} (${f(mejor.fecha)}) · ${rs.length} mediciones</p>` : ''}
        ${htmlDerivados(t, ult.valor, ult.detalle)}
        ${rs.length > 1 ? `<details><summary class="link" style="cursor:pointer">Historial</summary><div class="lista" style="margin-top:10px">${[...rs].reverse().map(r => `<div class="fila"><div class="fila-cuerpo"><p class="fila-t">${esc(formatear(t, r.valor))}</p><p class="fila-s">${f(r.fecha)}${r.detalle ? ' · ' + esc(r.detalle) : ''}</p></div><button class="link link-peligro" data-borrar="${r.id}" type="button">Borrar</button></div>`).join('')}</div></details>` : `<button class="link link-peligro" data-borrar="${ult.id}" type="button" style="align-self:flex-start">Borrar este resultado</button>`}
      </div>`;
    }).join('')}`;
  $$('[data-borrar]', p).forEach(b => b.onclick = async () => { await db.borrarResultadoTest(b.dataset.borrar); aviso('Resultado borrado'); panelTests(p, m); });
  $('#registrar', p).onclick = () => {
    let t = tests[0];
    dialogo(`<form class="form" id="f-res"><div><p class="eyebrow">Test presencial</p><h2 class="h2">Registrar resultado</h2></div>
      <label>Test<select name="test">${Object.entries(CATEGORIAS).map(([k, n]) => `<optgroup label="${n}">${tests.filter(x => x.categoria === k).map(x => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div id="cap"></div>
      <div class="grid2"><label>Fecha<input type="date" name="fecha" value="${new Date().toLocaleDateString('en-CA')}"></label><label>Nota (opcional)<input name="nota"></label></div>
      <button class="btn btn-rojo" type="submit">Guardar</button></form>`, d => {
      const fr = $('#f-res', d);
      const pintar = () => { t = tests.find(x => x.id === fr.test.value); $('#cap', d).innerHTML = htmlCaptura(t, 'valor'); };
      fr.test.onchange = pintar; pintar();
      fr.onsubmit = async e => {
        e.preventDefault();
        try {
          const r = leerCaptura(t, fr, 'valor'); if (!r) return aviso('Escribe el resultado.', 'error');
          await db.guardarResultadoTest({ miembro_id: m.id, test_id: t.id, valor: r.valor, detalle: r.detalle, fecha: fr.fecha.value, nota: fr.nota.value || null });
          d.close(); aviso('Resultado guardado'); panelTests(p, m);
        } catch (err) { aviso(err.message || 'No se pudo guardar.', 'error'); }
      };
    });
  };
}

async function panelAnamnesis(p, m) {
  const a = await db.anamnesis(m.id);
  const f = iso => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!a?.completada) {
    p.innerHTML = `<div class="tarjeta" style="max-width:640px;display:flex;flex-direction:column;gap:10px">
      <p class="eyebrow">Anamnesis pendiente</p>
      <p class="h3" style="margin:0">${a ? `Va en el paso ${Math.min(a.paso + 1, PASOS.length)} de ${PASOS.length}.` : 'Aún no la empieza.'}</p>
      <p class="suave" style="margin:0">La app se la pide sola la próxima vez que entre, antes de mostrarle su plan. No necesitas hacer nada.</p></div>`;
    return;
  }
  const d = a.datos || {}, al = alertas(d), medica = requiereRevisionMedica(d);
  const imc = d.peso && d.estatura ? (Number(d.peso) / (Number(d.estatura) / 100) ** 2).toFixed(1) : null;
  p.innerHTML = `
    <div class="tarjeta" style="display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start">
        <div><p class="eyebrow">Completada el ${f(a.completada_at || a.updated_at)}</p>
          <p class="h3" style="margin:6px 0 0">${[edad(d.nacimiento) !== null && edad(d.nacimiento) + ' años', d.sexo, d.estatura && d.estatura + ' cm', d.peso && d.peso + ' kg', imc && 'IMC ' + imc].filter(Boolean).join(' · ')}</p></div>
        <div class="chips">${a.revisada_at ? `<span class="chip chip-ok">Revisada el ${f(a.revisada_at)}</span>` : '<span class="chip chip-ambar">Sin revisar</span>'}</div>
      </div>
      ${al.length ? `<div class="an-alertas"><p class="eyebrow" style="color:#ff8a80">A tener en cuenta</p><ul>${al.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${medica ? '<p class="an-medica">Por sus respuestas, pide autorización médica antes de subir la intensidad.</p>' : ''}</div>` : '<p class="suave" style="margin:0">Sin alertas de salud.</p>'}
      <div class="ficha-ctl">${a.revisada_at ? '' : '<button class="btn btn-rojo" id="revisada">Marcar como revisada</button>'}
        <button class="btn btn-linea" id="actualizar">Pedir que la actualice</button></div>
    </div>
    <div class="an-resumen">${htmlResumen(d)}</div>`;
  const rev = $('#revisada', p);
  if (rev) rev.onclick = async () => { await db.actualizarAnamnesis(m.id, { revisada_at: new Date().toISOString() }); aviso('Anamnesis revisada'); panelAnamnesis(p, m); };
  $('#actualizar', p).onclick = () => dialogo(`<div class="menu-hoja"><p class="eyebrow">Anamnesis</p><h2 class="h2">¿Pedir que la actualice?</h2>
      <p class="suave" style="margin:0">La próxima vez que ${esc((m.nombre || '').split(' ')[0] || 'el miembro')} entre a la app, tendrá que revisar y volver a enviar su anamnesis antes de ver su plan. Sus respuestas actuales aparecerán ya llenas.</p>
      <button class="btn btn-rojo btn-full" id="si">Pedir actualización</button></div>`, dlg => {
    $('#si', dlg).onclick = async () => { await db.actualizarAnamnesis(m.id, { completada: false, paso: 0, revisada_at: null }); dlg.close(); aviso('Listo. Se la pedirá al entrar.'); panelAnamnesis(p, m); };
  });
}

async function panelPagos(p, m) {
  const [pagos, cobro] = await Promise.all([db.pagos(m.id), db.ajustesCobro()]);
  const e = estadoPago(m, cobro.gracia);
  const f = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const precios = PRECIOS[m.plan] || { 1: '' };
  const texto = { sin: 'Aún no registras pagos. Sin fecha de vencimiento, la app no le muestra avisos.', al_dia: `Al día. Le quedan ${e.dias} días.`,
    por_vencer: e.dias === 0 ? 'Vence hoy. Ya ve un aviso en su inicio.' : `Vence en ${e.dias} días. Ya ve un aviso en su inicio.`,
    gracia: `Vencido hace ${e.vencido} día${e.vencido === 1 ? '' : 's'}. Ve la ventana de pago al abrir la app. Su acceso se pausa en ${e.quedan} día${e.quedan === 1 ? '' : 's'}.`,
    bloqueado: `Vencido hace ${e.vencido} días. Su acceso está en pausa: ve la pantalla de pago y no puede abrir su plan.` }[e.tipo];
  p.innerHTML = `
    <div class="tarjeta" style="max-width:640px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div><p class="eyebrow">Pagado hasta</p><p class="h2" style="margin:4px 0 0">${f(m.pagado_hasta)}</p></div>
        <div class="chips">${chipPago(e) || '<span class="chip chip-ok">Al día</span>'}</div></div>
      <p class="suave" style="margin:0">${texto}</p>
    </div>
    <form class="tarjeta form" id="f-pago" style="max-width:640px">
      <div><p class="eyebrow">Plan ${esc(m.plan || '')}</p><h2 class="h2">Registrar pago</h2></div>
      <div class="grid3">
        <label>Meses que cubre<select name="meses">${[1, 3, 6].map(n => `<option value="${n}">${n} ${n === 1 ? 'mes' : 'meses'}</option>`).join('')}</select></label>
        <label>Monto (Q)<input name="monto" type="number" min="0" step="0.01" value="${precios[1] ?? ''}"></label>
        <label>Método<select name="metodo">${['Transferencia', 'Depósito', 'Efectivo', 'Tarjeta', 'Otro'].map(x => `<option>${x}</option>`).join('')}</select></label>
      </div>
      <label>Nota (opcional)<input name="nota" placeholder="Número de comprobante, banco…"></label>
      <p class="tenue" style="font-size:13px;margin:0" id="cubre"></p>
      <button class="btn btn-rojo" type="submit">Registrar pago</button>
    </form>
    <details class="tarjeta" style="max-width:640px"><summary class="link" style="cursor:pointer">Corregir la fecha manualmente</summary>
      <form class="form" id="f-fecha" style="margin-top:14px"><label>Pagado hasta<input type="date" name="pagado_hasta" value="${m.pagado_hasta || ''}"></label>
      <div class="grid2"><button class="btn btn-linea" type="submit">Guardar fecha</button><button class="btn btn-linea" type="button" id="sin-control">Quitar control de pago</button></div></form></details>
    <div><p class="eyebrow" style="margin-bottom:10px">Historial</p>
      ${pagos.length ? `<div class="lista">${pagos.map(x => `<div class="fila"><div class="fila-cuerpo"><p class="fila-t">Q${Number(x.monto || 0).toLocaleString('es-GT')} · ${x.meses} ${x.meses === 1 ? 'mes' : 'meses'}</p>
        <p class="fila-s">${f(x.fecha)} · ${esc(x.metodo || '')}${x.nota ? ' · ' + esc(x.nota) : ''} · cubre hasta ${f(x.cubre_hasta)}</p></div></div>`).join('')}</div>` : '<p class="tenue">Sin pagos registrados.</p>'}
    </div>`;
  const fp = $('#f-pago', p);
  const calc = () => {
    const meses = Number(fp.meses.value); if (precios[meses] !== undefined) fp.monto.value = precios[meses]; else if (precios[1]) fp.monto.value = precios[1] * meses;
    const hoy = hoyISO(); const base = new Date(((m.pagado_hasta && m.pagado_hasta > hoy) ? m.pagado_hasta : hoy) + 'T12:00:00');
    base.setMonth(base.getMonth() + meses); $('#cubre', p).textContent = 'Quedará pagado hasta el ' + base.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
  };
  fp.meses.onchange = calc; calc();
  fp.onsubmit = async ev => {
    ev.preventDefault(); const x = datosForm(ev.target); const btn = ev.target.querySelector('[type=submit]'); btn.disabled = true;
    try { const hasta = await db.registrarPago(m.id, { meses: Number(x.meses), monto: x.monto ? Number(x.monto) : null, metodo: x.metodo, nota: x.nota }); m.pagado_hasta = hasta; aviso('Pago registrado'); panelPagos(p, m); }
    catch { btn.disabled = false; aviso('No se pudo registrar el pago.', 'error'); }
  };
  $('#f-fecha', p).onsubmit = async ev => { ev.preventDefault(); const v = datosForm(ev.target).pagado_hasta || null; await db.actualizarMiembro(m.id, { pagado_hasta: v }); m.pagado_hasta = v; aviso('Fecha actualizada'); panelPagos(p, m); };
  $('#sin-control', p).onclick = async () => { await db.actualizarMiembro(m.id, { pagado_hasta: null }); m.pagado_hasta = null; aviso('Control de pago desactivado para este miembro'); panelPagos(p, m); };
}

async function panelPlan(p, m, semSel) {
  const bloque = await db.bloqueActivo(m.id);
  if (!bloque) {
    const lunes = lunesDe(); if (new Date().getDay() !== 1) lunes.setDate(lunes.getDate() + 7);
    p.innerHTML = `<div class="tarjeta form" style="max-width:520px"><div><p class="eyebrow">Sin plan activo</p><h2 class="h2">Crear primer bloque</h2></div>
      <form class="form" id="f-bloque">
        <label>Nombre del bloque<input name="nombre" required value="Bloque 1 · Base"></label>
        <div class="grid2"><label>Inicia (lunes)<input type="date" name="fecha_inicio" required value="${lunes.toISOString().slice(0, 10)}"></label>
        <label>Semanas<input type="number" name="semanas" min="1" max="24" value="4" required></label></div>
        <label>Nota para el miembro (opcional)<textarea name="notas" rows="2" placeholder="El objetivo de este bloque es…"></textarea></label>
        <button class="btn btn-rojo" type="submit">Crear bloque</button></form></div>`;
    $('#f-bloque').onsubmit = async e => {
      e.preventDefault(); const d = datosForm(e.target);
      await db.crearBloque({ miembro_id: m.id, nombre: d.nombre, fecha_inicio: d.fecha_inicio, semanas: Number(d.semanas), notas: d.notas || null });
      aviso('Bloque creado. Ahora agrega sesiones.'); panelPlan(p, m);
    };
    return;
  }
  const actual = semanaActual(bloque); const semana = semSel || actual;
  const sesiones = await db.sesionesSemana(bloque.id, semana);
  const hoyDia = diaSemanaHoy();
  p.innerHTML = `
    <div class="semana-bar">
      <div><p class="eyebrow">${esc(bloque.nombre)} · inicia ${fecha(bloque.fecha_inicio)}</p>${barraProgreso(actual, bloque.semanas)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select id="sem" aria-label="Semana" style="width:auto">${Array.from({ length: bloque.semanas }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === semana ? 'selected' : ''}>Semana ${n}${n === actual ? ' (actual)' : ''}</option>`).join('')}</select>
        ${semana < bloque.semanas ? `<button class="btn btn-sm btn-linea" id="copiar">Copiar a semana ${semana + 1}</button>` : ''}
        <button class="btn btn-sm btn-linea" id="nuevo-bloque">Nuevo bloque</button>
      </div>
    </div>
    <div class="dias">${DIAS.map((nombre, i) => {
      const dia = i + 1; const ses = sesiones.filter(s => s.dia === dia);
      return `<div class="dia ${semana === actual && dia === hoyDia ? 'hoy' : ''}"><div class="dia-t"><span>${nombre.slice(0, 3)}</span></div>
        ${ses.map(s => `<button class="ses ${s.registros?.[0]?.completada ? 'hecha' : ''}" data-s="${s.id}">
          <span class="ses-t">${esc(s.titulo)}</span><span class="ses-s">${esc(s.tipo)} · ${s.items.length} ej.${s.registros?.[0]?.completada ? ' · ✓ RPE ' + (s.registros[0].rpe ?? '–') : ''}</span></button>`).join('')}
        <button class="agregar" data-dia="${dia}">+ Sesión</button></div>`;
    }).join('')}</div>`;
  $('#sem').onchange = e => panelPlan(p, m, Number(e.target.value));
  const cp = $('#copiar');
  if (cp) cp.onclick = async () => {
    const destino = await db.sesionesSemana(bloque.id, semana + 1);
    if (destino.length && !confirm(`La semana ${semana + 1} ya tiene ${destino.length} sesiones. ¿Agregar las de la semana ${semana} de todos modos?`)) return;
    await db.copiarSemana(bloque, semana, semana + 1); aviso(`Semana ${semana} copiada a la ${semana + 1}`); panelPlan(p, m, semana + 1);
  };
  $('#nuevo-bloque').onclick = () => dialogo(`<form class="form" id="f-nb"><div><p class="eyebrow">Siguiente fase</p><h2 class="h2">Nuevo bloque</h2></div>
      <p class="suave" style="margin:0">El bloque actual queda archivado y el miembro verá el nuevo desde su fecha de inicio.</p>
      <label>Nombre<input name="nombre" required value="Bloque ${Number((bloque.nombre.match(/\d+/) || [1])[0]) + 1}"></label>
      <div class="grid2"><label>Inicia<input type="date" name="fecha_inicio" required></label><label>Semanas<input type="number" name="semanas" value="4" min="1" max="24" required></label></div>
      <label>Nota (opcional)<textarea name="notas" rows="2"></textarea></label><button class="btn btn-rojo" type="submit">Crear bloque</button></form>`, d => {
    $('#f-nb', d).onsubmit = async e => { e.preventDefault(); const x = datosForm(e.target); await db.crearBloque({ miembro_id: m.id, nombre: x.nombre, fecha_inicio: x.fecha_inicio, semanas: Number(x.semanas), notas: x.notas || null }); d.close(); aviso('Nuevo bloque creado'); panelPlan(p, m); };
  });
  $$('.agregar', p).forEach(b => b.onclick = () => editarSesion({ bloque_id: bloque.id, miembro_id: m.id, semana, dia: Number(b.dataset.dia), titulo: '', tipo: 'fuerza', notas: '', orden: 0, items: [] }, () => panelPlan(p, m, semana)));
  $$('.ses', p).forEach(b => b.onclick = async () => editarSesion(await db.sesion(b.dataset.s), () => panelPlan(p, m, semana)));
}

function editarSesion(s, alCerrar) {
  const nueva = !s.id; const reg = s.registros?.[0];
  dialogo(`<div class="form">
    <div><p class="eyebrow">${DIAS[s.dia - 1]} · Semana ${s.semana}</p><h2 class="h2">${nueva ? 'Nueva sesión' : esc(s.titulo)}</h2></div>
    ${reg?.completada ? `<div class="burbuja"><small>Registro del miembro · RPE ${reg.rpe ?? '–'}</small>${esc(reg.nota || 'Sin nota')}</div>` : ''}
    <form class="form" id="f-ses">
      <div class="grid2"><label>Título<input name="titulo" required value="${esc(s.titulo)}" placeholder="Fuerza tren inferior"></label>
      <label>Tipo<select name="tipo">${TIPOS.map(t => `<option ${t === s.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label>Indicaciones (opcional)<textarea name="notas" rows="2" placeholder="Calentamiento, enfoque del día…">${esc(s.notas || '')}</textarea></label>
      <button class="btn ${nueva ? 'btn-rojo' : 'btn-linea'}" type="submit">${nueva ? 'Crear y agregar ejercicios' : 'Guardar sesión'}</button>
    </form>
    ${nueva ? '' : `<div><p class="eyebrow">Ejercicios</p><div class="items-ed" id="items">${s.items.map(it => filaItem(it, reg?.resultados?.[it.id])).join('') || '<p class="tenue" style="padding:12px 0;margin:0">Sin ejercicios aún.</p>'}</div>
      <button class="agregar btn-full" id="add-item" style="margin-top:12px;width:100%">+ Agregar ejercicio</button></div>
      <button class="link link-peligro" id="borrar-ses" style="align-self:flex-start">Eliminar sesión</button>`}
  </div>`, d => {
    let cambio = false;
    d.addEventListener('close', () => { if (cambio) alCerrar(); });
    $('#f-ses', d).onsubmit = async e => {
      e.preventDefault(); const x = datosForm(e.target);
      const guardada = await db.guardarSesion({ ...s, ...x }); cambio = true;
      if (nueva) { d.close(); alCerrar(); editarSesion(await db.sesion(guardada.id), alCerrar); } else aviso('Sesión guardada');
    };
    if (nueva) return;
    $('#add-item', d).onclick = () => editarItem({ sesion_id: s.id, orden: s.items.length }, async () => { cambio = true; d.close(); editarSesion(await db.sesion(s.id), alCerrar); });
    $$('[data-edit]', d).forEach(b => b.onclick = () => editarItem(s.items.find(i => i.id === b.dataset.edit), async () => { cambio = true; d.close(); editarSesion(await db.sesion(s.id), alCerrar); }));
    $$('[data-del]', d).forEach(b => b.onclick = async () => { await db.borrarItem(b.dataset.del); cambio = true; d.close(); editarSesion(await db.sesion(s.id), alCerrar); });
    $('#borrar-ses', d).onclick = async () => { if (!confirm('¿Eliminar esta sesión y sus ejercicios?')) return; await db.borrarSesion(s.id); cambio = true; d.close(); aviso('Sesión eliminada'); };
  });
}

function filaItem(it, real) {
  const pres = [it.series && it.series + ' series', it.reps, it.carga, it.ritmo, it.descanso && 'desc. ' + it.descanso].filter(Boolean).join(' · ');
  return `<div class="item-ed"><div class="fila-cuerpo"><p class="fila-t">${it.test_id ? '<span class="chip chip-alerta" style="margin-right:6px">Test</span>' : ''}${esc(it.ejercicio)}</p><p class="fila-s">${esc(pres)}</p>${it.nota ? `<p class="fila-s">Tu comentario: «${esc(it.nota)}»</p>` : ''}${real ? `<p class="fila-s" style="color:#7ee787">Real: ${esc(real)}</p>` : ''}</div>
    <div class="acciones"><button class="link" data-edit="${it.id}">Editar</button><button class="link link-peligro" data-del="${it.id}">Quitar</button></div></div>`;
}

async function editarItem(it, alGuardar) {
  const tests = await db.tests().catch(() => []);
  dialogo(`<form class="form" id="f-item"><div><p class="eyebrow">Ejercicio</p><h2 class="h2">${it.id ? 'Editar' : 'Agregar'}</h2></div>
    <label>¿Es un test? (opcional)<select name="test_id"><option value="">No, es un ejercicio normal</option>
      ${Object.entries(CATEGORIAS).map(([k, n]) => `<optgroup label="${n}">${tests.filter(t => t.categoria === k).map(t => `<option value="${t.id}" ${t.id === it.test_id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</optgroup>`).join('')}
    </select></label>
    <label>Ejercicio<input name="ejercicio" required value="${esc(it.ejercicio || '')}" placeholder="Sentadilla goblet"></label>
    <div class="grid3"><label>Series<input name="series" value="${esc(it.series || '')}" placeholder="4"></label>
    <label>Reps / duración<input name="reps" value="${esc(it.reps || '')}" placeholder="8 · 35 min"></label>
    <label>Descanso<input name="descanso" value="${esc(it.descanso || '')}" placeholder="90 s"></label></div>
    <div class="grid2"><label>Carga<input name="carga" value="${esc(it.carga || '')}" placeholder="20 kg · RPE 7"></label>
    <label>Ritmo / zona<input name="ritmo" value="${esc(it.ritmo || '')}" placeholder="Z2 o 6:40 /km"></label></div>
    <p class="tenue" style="font-size:12px;margin:-6px 0 0">Si escribes Z1 a Z5, el miembro ve sus pulsaciones y ritmo personales de esa zona, calculados con su último test.</p>
    <label>Comentario para el miembro (opcional)<textarea name="nota" rows="3" placeholder="Baja en 3 segundos y aprieta glúteo arriba. Si molesta la rodilla, reduce el rango.">${esc(it.nota || '')}</textarea></label>
    <label>Video de referencia (opcional)<input type="url" name="video_url" value="${esc(it.video_url || '')}" placeholder="https://instagram.com/…"></label>
    <button class="btn btn-rojo" type="submit">Guardar ejercicio</button></form>`, d => {
    const f = $('#f-item', d);
    f.test_id.onchange = () => { const t = tests.find(x => x.id === f.test_id.value); if (t && !f.ejercicio.value.trim()) f.ejercicio.value = t.nombre; if (t && !f.series.value) f.series.value = '1'; };
    f.onsubmit = async e => { e.preventDefault(); const x = datosForm(e.target); x.test_id = x.test_id || null; await db.guardarItem({ ...it, ...x }); d.close(); aviso('Ejercicio guardado'); alGuardar(); };
  });
}

async function panelCheckins(p, m) {
  const chks = await db.checkins(m.id);
  p.innerHTML = `<div class="lista">${chks.map(c => `<div class="ejercicio" style="display:flex;flex-direction:column;gap:12px">
      <div class="ejercicio-t"><span class="h3">${fecha(c.created_at, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        <span class="chips">${c.peso ? `<span class="chip">${c.peso} kg</span>` : ''}<span class="chip">Sueño ${c.sueno}/5</span><span class="chip">Energía ${c.energia}/5</span><span class="chip">${c.sesiones_cumplidas ?? '–'} sesiones</span></span></div>
      <div class="burbuja"><small>${esc((m.nombre || '').split(' ')[0])}</small>${esc(c.comentario)}</div>
      ${c.respuesta ? `<div class="burbuja burbuja-coach"><small>Tu respuesta</small>${esc(c.respuesta)}</div>`
        : `<form class="form" data-c="${c.id}"><textarea name="respuesta" rows="3" required placeholder="Qué ajustas y por qué. Corto y concreto."></textarea><button class="btn btn-sm btn-rojo" style="align-self:flex-start">Responder</button></form>`}
    </div>`).join('') || vacio('Sin check-ins todavía')}</div>`;
  $$('form[data-c]', p).forEach(f => f.onsubmit = async e => { e.preventDefault(); await db.responderCheckin(f.dataset.c, datosForm(f).respuesta); aviso('Respuesta enviada'); panelCheckins(p, m); });
}

async function panelVideos(p, m) {
  const vids = await db.videos(m.id);
  p.innerHTML = `<div class="lista">${vids.map(vd => tarjetaVideo(vd, false)).join('') || vacio('Sin videos todavía')}</div>`;
  activarVideos(p);
}

async function panelRegistros(p, m) {
  const regs = await db.registros(m.id);
  p.innerHTML = `<div class="lista">${regs.map(r => `<div class="fila" style="cursor:default">
      <span class="estado ${r.completada ? 'hecho' : ''}"></span>
      <span class="fila-cuerpo"><p class="fila-t">${esc(r.sesiones?.titulo || 'Sesión')}</p>
        <p class="fila-s">Semana ${r.sesiones?.semana ?? '–'} · ${DIAS[(r.sesiones?.dia || 1) - 1]}${r.nota ? ' · «' + esc(r.nota) + '»' : ''}</p></span>
      <span class="fila-fin">RPE ${r.rpe ?? '–'} · ${hace(r.created_at)}</span></div>`).join('') || vacio('Sin sesiones registradas')}</div>`;
}

async function panelProgreso(p, m) {
  const [chks, regs] = await Promise.all([db.checkins(m.id), db.registros(m.id)]);
  const pesos = [...chks].reverse().filter(c => c.peso).map(c => ({ x: fecha(c.created_at), y: Number(c.peso) }));
  const energia = [...chks].reverse().map(c => ({ x: fecha(c.created_at), y: c.energia }));
  const rpes = regs.filter(r => r.rpe).slice(0, 14).reverse().map((r, i) => ({ x: String(i + 1), y: r.rpe }));
  p.innerHTML = `<div class="grid2" style="gap:32px">
    <section><p class="eyebrow">Peso corporal</p>${lineaSVG(pesos)}</section>
    <section><p class="eyebrow">Energía semanal</p>${lineaSVG(energia)}</section>
    <section><p class="eyebrow">RPE de las últimas sesiones</p>${lineaSVG(rpes)}</section>
    <section><p class="eyebrow">Total</p><div class="cifras"><div class="cifra"><span class="num">${regs.filter(r => r.completada).length}</span><small>Sesiones</small></div><div class="cifra"><span class="num">${chks.length}</span><small>Check-ins</small></div><div class="cifra"><span class="num">${regs.length ? (regs.reduce((a, r) => a + (r.rpe || 0), 0) / regs.filter(r => r.rpe).length || 0).toFixed(1) : '–'}</span><small>RPE prom.</small></div></div></section>
  </div>`;
}
