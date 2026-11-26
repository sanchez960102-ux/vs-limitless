// Calculadora de zonas de la landing: usa el mismo cálculo que la app (shared/tests.js).
import { seg, reloj, zonasRitmo, zonasFC, ZONAS } from '/shared/tests.js';

const cfg = window.VSL_CONFIG || {};
const form = document.getElementById('f-calc');
const campos = document.getElementById('calc-campos');
const res = document.getElementById('calc-res');
const USOS = { Z1: 'Recuperación y calentamiento', Z2: 'Rodajes y fondos: la base de todo', Z3: 'Ritmo sostenido de media distancia', Z4: 'Tempos y bloques de umbral', Z5: 'Intervalos cortos e intensos' };
let ultimo = null;
const desbloqueado = () => { try { return localStorage.getItem('vsl-zonas') === '1'; } catch { return false; } };

function pintarCampos() {
  const p = form.prueba.value;
  campos.innerHTML = p === '30min'
    ? `<label>Distancia que recorriste en 30 min (metros)<input name="dist" inputmode="numeric" placeholder="Ej. 6200" required></label>
       <label>FC promedio de los últimos 20 min (opcional)<input name="fc" inputmode="numeric" placeholder="Ej. 168"></label>`
    : `<label>Tu tiempo (mm:ss o h:mm:ss)<input name="tiempo" placeholder="${p === '5000' ? 'Ej. 27:30' : p === '3000' ? 'Ej. 15:40' : 'Ej. 4:45'}" required autocomplete="off"></label>`;
}
form.querySelectorAll('[name=prueba]').forEach(r => r.addEventListener('change', pintarCampos));
pintarCampos();

function calcular() {
  const p = form.prueba.value;
  if (p === '30min') {
    const dist = Number(String(form.dist.value).replace(/\D/g, ''));
    const fc = Number(String(form.fc?.value || '').replace(/\D/g, ''));
    if (!(dist >= 2500 && dist <= 11000)) throw new Error('Escribe la distancia en metros, entre 2500 y 11000.');
    if (fc && !(fc >= 100 && fc <= 215)) throw new Error('La FC promedio debe estar entre 100 y 215.');
    return { pu: 1800 / dist * 1000, fc: fc || null, prueba: `Test de 30 min · ${dist.toLocaleString('es-GT')} m${fc ? ` · ${fc} lpm` : ''}` };
  }
  const d = Number(p), t = seg(form.tiempo.value);
  const ritmo = t ? t / d * 1000 : 0;
  if (!t || ritmo < 150 || ritmo > 600) throw new Error('Revisa el tiempo: escríbelo como mm:ss, por ejemplo 27:30.');
  return { pu: t * Math.pow(5000 / d, 1.06) / 5 * 1.07, fc: null, prueba: `${d / 1000} km en ${reloj(t)}` };
}

function pintarResultado() {
  const { pu, fc, prueba } = ultimo;
  const zr = zonasRitmo(pu), zf = fc ? zonasFC(fc) : null, abierto = desbloqueado();
  const visible = z => abierto || z === 'Z2' || z === 'Z4';
  res.innerHTML = `
    <p class="calc-prueba">${prueba}</p>
    <p class="calc-umbral">Ritmo de umbral <b>${reloj(pu)} /km</b></p>
    <ol class="calc-zonas">${ZONAS.map(z => `<li class="${visible(z.id) ? '' : 'oculta'}">
      <span class="z-id">${z.id}</span><div><b>${z.nombre}</b><small>${visible(z.id) ? USOS[z.id] : 'Desbloquea para verla'}</small></div>
      <span class="z-val">${visible(z.id) ? `${zr[z.id]}${zf ? `<br>${zf[z.id]}` : ''}` : '•:•• – •:•• /km'}</span></li>`).join('')}</ol>
    ${abierto ? `<div class="calc-fin"><p>Estas zonas son el punto de partida. En el Equipo Limitless se recalculan solas con cada test y aparecen en cada sesión de tu plan.</p>
        <a href="#aplicar" class="btn">Aplicar al equipo</a></div>`
      : `<form class="calc-gate" id="f-gate" novalidate><p><b>Desbloquea tus 5 zonas</b> y te escribo por WhatsApp para explicarte cómo usarlas en tu semana.</p>
        <div class="calc-gate-campos"><label>Nombre<input name="nombre" required autocomplete="given-name" maxlength="80"></label>
          <label>WhatsApp<input name="whatsapp" required inputmode="tel" autocomplete="tel" placeholder="+502 5555 5555" maxlength="20"></label></div>
        <button class="btn btn-full" type="submit">Ver mis 5 zonas</button><p class="calc-msg" id="calc-msg" role="alert"></p></form>`}`;
  const gate = document.getElementById('f-gate');
  if (gate) gate.addEventListener('submit', enviarContacto);
}

async function enviarContacto(e) {
  e.preventDefault();
  const g = e.target, msg = document.getElementById('calc-msg');
  const nombre = g.nombre.value.trim(), whatsapp = g.whatsapp.value.trim();
  if (nombre.length < 2) { msg.textContent = 'Escribe tu nombre.'; return; }
  if (whatsapp.replace(/\D/g, '').length < 8) { msg.textContent = 'Escribe tu WhatsApp con al menos 8 dígitos.'; return; }
  const btn = g.querySelector('button'); btn.disabled = true; btn.textContent = 'Guardando…';
  const zr = zonasRitmo(ultimo.pu);
  const datos = { prueba: ultimo.prueba, umbral: reloj(ultimo.pu) + ' /km', z2: zr.Z2, z4: zr.Z4, fc_umbral: ultimo.fc };
  const intentos = [];
  if (cfg.supabaseUrl && cfg.supabaseAnonKey) intentos.push(fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/contactos', {
    method: 'POST', headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ nombre, whatsapp, fuente: 'calculadora_zonas', datos })
  }).then(r => { if (!r.ok) throw new Error('supabase ' + r.status); }));
  if (cfg.correoAvisos) intentos.push(fetch('https://formsubmit.co/ajax/' + encodeURIComponent(cfg.correoAvisos), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ _subject: `Nuevo contacto de la calculadora: ${nombre}`, _template: 'table', _captcha: 'false', nombre, whatsapp, ...datos })
  }).then(r => { if (!r.ok) throw new Error('correo ' + r.status); }));
  const r = await Promise.allSettled(intentos);
  if (intentos.length && r.every(x => x.status === 'rejected')) { btn.disabled = false; btn.textContent = 'Ver mis 5 zonas'; msg.textContent = 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.'; return; }
  try { localStorage.setItem('vsl-zonas', '1'); } catch {}
  pintarResultado();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  try { ultimo = calcular(); pintarResultado(); res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  catch (err) { res.innerHTML = `<p class="calc-error" role="alert">${err.message}</p>`; }
});
