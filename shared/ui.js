// Utilidades de interfaz compartidas por /app y /coach.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fecha(iso, opts = { day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-GT', opts);
}

export function hace(iso) {
  if (!iso) return 'sin actividad';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
}

let avisoT;
export function aviso(texto, tipo = 'ok') {
  let el = $('#aviso');
  if (!el) { el = document.createElement('div'); el.id = 'aviso'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.className = 'aviso ' + tipo; el.textContent = texto; el.hidden = false;
  clearTimeout(avisoT); avisoT = setTimeout(() => { el.hidden = true; }, 3200);
}

export function cargando(contenedor, texto = 'Cargando…') {
  contenedor.innerHTML = `<div class="cargando"><span class="punto-carga"></span>${esc(texto)}</div>`;
}

export function vacio(titulo, texto = '') {
  return `<div class="vacio"><p class="vacio-t">${esc(titulo)}</p>${texto ? `<p>${esc(texto)}</p>` : ''}</div>`;
}

export function datosForm(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}

export function dialogo(html, alAbrir) {
  const d = document.createElement('dialog');
  d.className = 'dialogo';
  d.innerHTML = `<button class="dialogo-x" aria-label="Cerrar" type="button">×</button>${html}`;
  document.body.append(d);
  d.querySelector('.dialogo-x').onclick = () => d.close();
  d.addEventListener('close', () => d.remove());
  d.showModal();
  alAbrir?.(d);
  return d;
}

export function barraProgreso(valor, total) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<i class="${i < valor ? 'on' : ''}"></i>`;
  return `<div class="segmentos" role="img" aria-label="${valor} de ${total}">${s}</div>`;
}

// Gráfica de línea simple en SVG (sin dependencias)
export function lineaSVG(puntos, { alto = 140, sufijo = '' } = {}) {
  if (puntos.length < 2) return vacio('Aún no hay suficientes datos', 'La gráfica aparece con dos registros o más.');
  const ancho = 600, pad = 28;
  const ys = puntos.map(p => p.y); const min = Math.min(...ys), max = Math.max(...ys); const rango = max - min || 1;
  const X = i => pad + i * (ancho - pad * 2) / (puntos.length - 1);
  const Y = v => alto - pad - (v - min) / rango * (alto - pad * 2);
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  const marcas = puntos.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="4" class="pt"/><text x="${X(i)}" y="${Y(p.y) - 10}" class="et">${esc(p.y)}${sufijo}</text><text x="${X(i)}" y="${alto - 6}" class="ex">${esc(p.x)}</text>`).join('');
  return `<svg class="grafica" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Gráfica"><path d="${d}" class="ln"/>${marcas}</svg>`;
}

export function registrarSW() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
}
