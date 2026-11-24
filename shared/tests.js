// Tests de evaluación: formato de resultados y valores derivados para prescribir.
import { esc } from '/shared/ui.js';

export const CATEGORIAS = { carrera: 'Carrera', fuerza: 'Fuerza', funcional: 'Funcional', movilidad: 'Movilidad' };
export const UNIDADES = { tiempo: 'Tiempo', kg_reps: 'Peso × repeticiones (RM estimado)', reps: 'Repeticiones', cm: 'Centímetros', m: 'Metros', bpm: 'Pulsaciones (lpm)' };

export function seg(txt) {
  const p = String(txt || '').trim().replace(',', '.').split(':').map(Number);
  if (!p.length || p.some(n => isNaN(n))) return null;
  const s = p.reduce((a, n) => a * 60 + n, 0);
  return s > 0 ? s : null;
}
export function reloj(s) {
  s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}
export const rmEstimado = (kg, reps) => reps <= 1 ? kg : Math.round(kg * (1 + reps / 30) * 2) / 2;

export function formatear(t, valor) {
  if (valor === null || valor === undefined) return '—';
  const v = Number(valor);
  return { tiempo: reloj(v), kg_reps: v + ' kg', reps: v + ' reps', cm: v + ' cm', m: v.toLocaleString('es-GT') + ' m', bpm: v + ' lpm' }[t.unidad] ?? String(v);
}

// Campos de captura según la unidad
export function htmlCaptura(t, nombre, previo = '') {
  if (t.unidad === 'kg_reps') {
    const [kg, reps] = (previo.match(/([\d.]+)\s*kg\s*×\s*(\d+)/) || []).slice(1);
    return `<div class="grid2 cap-test"><label>Peso (kg)<input name="${nombre}_kg" inputmode="decimal" value="${esc(kg || '')}" placeholder="80"></label>
      <label>Repeticiones<input name="${nombre}_reps" inputmode="numeric" value="${esc(reps || '')}" placeholder="5"></label></div>`;
  }
  const ph = { tiempo: t.distancia ? 'mm:ss · ej. 28:45' : 'mm:ss · ej. 1:30', reps: 'Repeticiones', cm: 'Centímetros', m: 'Metros · ej. 2450', bpm: 'Pulsaciones · ej. 58' }[t.unidad];
  return `<label class="cap-test">Tu resultado del test<input name="${nombre}" ${t.unidad === 'tiempo' ? '' : 'inputmode="decimal"'} value="${esc(previo.replace(/\s*(reps|cm|m|lpm)$/, ''))}" placeholder="${ph}"></label>`;
}
// Devuelve { valor, detalle, texto } o null si está vacío; lanza Error si es inválido
export function leerCaptura(t, form, nombre) {
  if (t.unidad === 'kg_reps') {
    const kg = Number(String(form.querySelector(`[name="${nombre}_kg"]`)?.value || '').replace(',', '.'));
    const reps = Number(form.querySelector(`[name="${nombre}_reps"]`)?.value || 0);
    if (!kg && !reps) return null;
    if (!(kg > 0) || !(reps >= 1 && reps <= 15)) throw new Error(`${t.nombre}: escribe el peso y entre 1 y 15 repeticiones.`);
    const detalle = `${kg} kg × ${reps}`;
    return { valor: rmEstimado(kg, reps), detalle, texto: detalle };
  }
  const txt = String(form.querySelector(`[name="${nombre}"]`)?.value || '').trim();
  if (!txt) return null;
  const valor = t.unidad === 'tiempo' ? seg(txt) : Number(txt.replace(',', '.'));
  if (valor === null || isNaN(valor)) throw new Error(`${t.nombre}: ${t.unidad === 'tiempo' ? 'escribe el tiempo como mm:ss' : 'escribe solo el número'}.`);
  return { valor, detalle: null, texto: formatear(t, valor) };
}

// Valores para prescribir a partir de un resultado
export function derivados(t, valor) {
  const v = Number(valor);
  if (t.calculo === '1rm') {
    const filas = [[95, '1–2'], [90, '3–4'], [85, '5–6'], [80, '7–8'], [75, '9–10'], [70, '11–12'], [65, '13–15'], [60, '16–20']];
    return { titulo: `RM estimado ${v} kg`, filas: filas.map(([p, r]) => [`${p}%`, `${Math.round(v * p / 100 * 2) / 2} kg`, `${r} reps`]), cols: ['% RM', 'Carga', 'Reps aprox.'] };
  }
  if (t.calculo === 'ritmo' && t.distancia) {
    const p5 = v * Math.pow(5000 / t.distancia, 1.06) / 5;
    const r = f => reloj(p5 * f) + ' /km';
    return { titulo: `Ritmo del test ${reloj(v / t.distancia * 1000)} /km · 5K equivalente ${reloj(p5 * 5)}`, cols: ['Zona', 'Ritmo', 'Uso'], filas: [
      ['Suave · Z2', `${r(1.27)} – ${r(1.36)}`, 'Rodajes y fondos'],
      ['Maratón', r(1.15), 'Bloques largos sostenidos'],
      ['Umbral', r(1.07), 'Tempos de 20–40 min'],
      ['Intervalos', r(1.0), '3–5 min con recuperación'],
      ['Repeticiones', r(0.94), '200–400 m rápidos']] };
  }
  if (t.calculo === 'cooper') {
    const vo2 = Math.max(0, (v - 504.9) / 44.73);
    const vam = v / 12 / 1000 * 60;
    return { titulo: `VO2máx estimado ${vo2.toFixed(1)} ml/kg/min`, cols: ['Referencia', 'Valor', ''], filas: [
      ['Velocidad media del test', `${vam.toFixed(1)} km/h`, `${reloj(720 / (v / 1000))} /km`],
      ['Intervalos al 90–95%', `${(vam * 0.9).toFixed(1)}–${(vam * 0.95).toFixed(1)} km/h`, `${reloj(3600 / (vam * 0.95))}–${reloj(3600 / (vam * 0.9))} /km`],
      ['Suave · Z2 (65–75%)', `${(vam * 0.65).toFixed(1)}–${(vam * 0.75).toFixed(1)} km/h`, `${reloj(3600 / (vam * 0.75))}–${reloj(3600 / (vam * 0.65))} /km`]] };
  }
  return null;
}

// Cambio respecto al resultado anterior; positivo = mejora
export function cambio(t, actual, previo) {
  if (previo === undefined || previo === null) return null;
  const d = Number(actual) - Number(previo);
  if (!d) return { mejora: 0, texto: 'Igual que la vez anterior' };
  const mejora = t.mejor === 'menor' ? d < 0 : d > 0;
  const abs = Math.abs(d);
  const txt = t.unidad === 'tiempo' ? reloj(abs) : t.unidad === 'kg_reps' ? abs + ' kg' : formatear(t, abs);
  return { mejora: mejora ? 1 : -1, texto: `${mejora ? '▲' : '▼'} ${txt} ${mejora ? 'mejor' : 'menos'} que la vez anterior` };
}

export function htmlDerivados(t, valor) {
  const d = derivados(t, valor); if (!d) return '';
  return `<div class="derivados"><p class="eyebrow">Para prescribir · ${esc(d.titulo)}</p>
    <table class="tabla-mini"><thead><tr>${d.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${d.filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
