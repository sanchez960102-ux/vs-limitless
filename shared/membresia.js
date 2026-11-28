// Tarjeta de miembro numerada y la imagen "Mi semana" para historias de Instagram.
import { esc } from '/shared/ui.js';

export const numeroTxt = n => 'N.º ' + String(n || 0).padStart(3, '0');
export const esFundador = m => /fundador/i.test(m?.tarifa_etiqueta || '');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const desde = iso => { const d = new Date(iso || Date.now()); return MESES[d.getMonth()] + ' ' + d.getFullYear(); };

export function tarjetaMiembro(m) {
  const fundador = esFundador(m);
  return `<div class="membresia ${fundador ? 'fundador' : ''}" role="img" aria-label="Tarjeta de miembro ${numeroTxt(m.numero)} de ${esc(m.nombre || '')}">
    <span class="mb-brillo" aria-hidden="true"></span>
    <div class="mb-top"><img src="/img/vs-limitless-horizontal-claro.svg" alt="" width="120" height="36"><span class="mb-tipo">Equipo Limitless</span></div>
    <div class="mb-num"><small>Miembro</small><b><span class="mb-no">N.º</span>${String(m.numero || 0).padStart(3, '0')}</b></div>
    <div class="mb-pie">
      <div><small>Nombre</small><span>${esc(m.nombre || m.correo || '')}</span></div>
      <div><small>Plan</small><span>${esc(m.plan || '')}</span></div>
      <div><small>Desde</small><span>${desde(m.created_at)}</span></div>
    </div>
    ${fundador ? '<span class="mb-sello">Fundador</span>' : ''}
  </div>`;
}

// Inclina la tarjeta con el dedo o el mouse y mueve el reflejo
export function activarTarjeta(el) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const mover = (x, y) => {
    const r = el.getBoundingClientRect();
    const px = Math.min(Math.max((x - r.left) / r.width, 0), 1), py = Math.min(Math.max((y - r.top) / r.height, 0), 1);
    el.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
    el.style.setProperty('--bx', (px * 100).toFixed(1) + '%');
  };
  el.addEventListener('pointermove', e => mover(e.clientX, e.clientY));
  el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--bx', '30%'); });
}

/* ------------------------------------------------ Imagen "Mi semana" */
const W = 1080, H = 1920;
const cargarImg = src => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });

export async function imagenSemana(d) {
  await Promise.all(['400 100px Anton', '400 40px Inter', '500 40px Inter'].map(f => document.fonts.load(f).catch(() => null)));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  // Fondo: negro con luz roja
  x.fillStyle = '#0B0B0B'; x.fillRect(0, 0, W, H);
  let g = x.createRadialGradient(180, 260, 0, 180, 260, 900); g.addColorStop(0, 'rgba(225,6,0,.55)'); g.addColorStop(1, 'rgba(225,6,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(980, 1500, 0, 980, 1500, 800); g.addColorStop(0, 'rgba(242,239,234,.10)'); g.addColorStop(1, 'rgba(242,239,234,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Grano fino
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }

  const M = 88, hueso = '#F2EFEA', tenue = 'rgba(242,239,234,.55)', linea = 'rgba(242,239,234,.16)';
  try { const logo = await cargarImg('/img/vs-limitless-horizontal-claro.svg'); x.drawImage(logo, M, 120, 268, 80); } catch {}
  x.textBaseline = 'alphabetic';
  x.fillStyle = tenue; x.font = '500 30px Inter'; x.textAlign = 'right';
  x.fillText(d.rango.toUpperCase(), W - M, 172);
  x.textAlign = 'left';

  // Titular
  x.fillStyle = hueso; x.font = '400 190px Anton';
  x.fillText('MI SEMANA', M, 470);
  x.fillStyle = '#E10600'; x.fillRect(M, 520, 120, 8);
  x.fillStyle = tenue; x.font = '400 34px Inter';
  x.fillText(d.subtitulo, M, 590);

  // Cifra principal
  x.fillStyle = hueso; x.font = '400 380px Anton';
  const principal = `${d.hechas}/${d.total}`;
  x.fillText(principal, M - 8, 1000);
  x.fillStyle = tenue; x.font = '500 32px Inter';
  x.fillText('SESIONES COMPLETADAS', M, 1060);

  // Cuadrícula de datos
  const celdas = d.datos.slice(0, 4);
  const cw = (W - M * 2) / 2, top = 1140, ch = 230;
  x.strokeStyle = linea; x.lineWidth = 2;
  celdas.forEach((k, i) => {
    const cx = M + (i % 2) * cw, cy = top + Math.floor(i / 2) * ch;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + cw - (i % 2 ? 0 : 24), cy); x.stroke();
    x.fillStyle = tenue; x.font = '500 26px Inter'; x.fillText(k.t.toUpperCase(), cx, cy + 56);
    x.fillStyle = hueso; x.font = '400 104px Anton';
    let v = String(k.v); while (x.measureText(v).width > cw - 40 && v.length > 4) v = v.slice(0, -2) + '…';
    x.fillText(v, cx, cy + 172);
    if (k.s) { x.fillStyle = tenue; x.font = '400 26px Inter'; x.fillText(k.s, cx, cy + 212); }
  });

  // Pie
  x.beginPath(); x.moveTo(M, 1650); x.lineTo(W - M, 1650); x.stroke();
  x.fillStyle = hueso; x.font = '500 34px Inter'; x.fillText(d.nombre, M, 1716);
  x.fillStyle = tenue; x.font = '400 28px Inter'; x.fillText(d.miembro, M, 1760);
  x.fillText('Coaching híbrido · fuerza y resistencia', M, 1800);
  x.textAlign = 'right'; x.fillStyle = hueso; x.font = '500 30px Inter'; x.fillText('@vs_limitless', W - M, 1716);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}

export async function compartirImagen(blob, nombre) {
  const archivo = new File([blob], nombre, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Mi semana · VS Limitless' }); return 'compartida'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelada'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'descargada';
}
