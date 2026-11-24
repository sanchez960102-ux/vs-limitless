// Progresión de cargas: registro por serie, historial por ejercicio y sugerencia de peso (doble progresión).
import { esc } from '/shared/ui.js';

export const claveEjercicio = n => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// ¿Se registra por series con peso? Excluye cardio, tests y ejercicios por tiempo o distancia
export function esDeCarga(it, tipoSesion) {
  if (it.test_id || ['carrera', 'bici'].includes(tipoSesion)) return false;
  const r = String(it.reps || '').toLowerCase();
  if (!/\d/.test(r)) return false;
  return !/(min|km|seg|\d\s*s\b|\d\s*m\b|"|')/.test(r);
}
export function objetivo(it) {
  const n = String(it.reps || '').match(/(\d+)\s*(?:[-–a]\s*(\d+))?/);
  return n ? { min: Number(n[1]), max: Number(n[2] || n[1]) } : null;
}
export const numSeries = it => Math.min(Math.max(parseInt(it.series, 10) || 3, 1), 10);

export function resumen(series) {
  const v = series.filter(s => s.reps > 0);
  const conKg = v.filter(s => s.kg > 0);
  return {
    top_kg: conKg.length ? Math.max(...conKg.map(s => s.kg)) : null,
    e1rm: conKg.length ? Math.max(...conKg.map(s => s.reps <= 1 ? s.kg : Math.round(s.kg * (1 + Math.min(s.reps, 12) / 30) * 2) / 2)) : null,
    volumen: conKg.reduce((a, s) => a + s.kg * s.reps, 0) || null
  };
}
export function texto(series) {
  const v = series.filter(s => s.reps > 0); if (!v.length) return '';
  const kgs = [...new Set(v.map(s => s.kg || 0))];
  if (kgs.length === 1) return kgs[0] ? `${kgs[0]} kg × ${v.map(s => s.reps).join(', ')}` : `${v.map(s => s.reps).join(', ')} reps`;
  return v.map(s => s.kg ? `${s.kg}×${s.reps}` : `${s.reps}`).join(', ') + ' (kg×reps)';
}

const paso = (nombre, kg) => /mancuerna|kettlebell|pesa rusa|goblet/i.test(nombre) ? 2 : kg >= 60 ? 5 : 2.5;
// Doble progresión: si cumpliste el tope de repeticiones en todas las series, sube; si no, mantén
export function sugerencia(it, previa) {
  const obj = objetivo(it);
  if (!previa || !obj || !previa.top_kg) return null;
  const v = (previa.series || []).filter(s => s.reps > 0 && s.kg === previa.top_kg);
  if (!v.length) return null;
  const kg = Number(previa.top_kg);
  if (v.every(s => s.reps >= obj.max) && v.length >= Math.min(numSeries(it), (previa.series || []).length)) {
    const nuevo = Math.round((kg + paso(it.ejercicio, kg)) * 2) / 2;
    return { kg: nuevo, sube: true, texto: `Sube a ${nuevo} kg: la vez pasada completaste ${obj.max} reps en todas las series.` };
  }
  return { kg, sube: false, texto: `Quédate en ${kg} kg hasta completar ${obj.max} reps en todas las series.` };
}

export function htmlSeries(it, actual, previa, sug) {
  const n = Math.max(numSeries(it), actual?.series?.length || 0);
  const ph = sug?.kg ?? previa?.top_kg ?? '';
  const obj = objetivo(it);
  return `<div class="series" data-series="${it.id}">
    ${previa ? `<p class="serie-previa">La vez pasada: <b>${esc(texto(previa.series))}</b></p>` : ''}
    ${sug ? `<p class="serie-sug ${sug.sube ? 'sube' : ''}">${esc(sug.texto)}</p>` : ''}
    <div class="serie-cab"><span>Serie</span><span>kg</span><span>Reps</span></div>
    ${Array.from({ length: n }, (_, k) => { const s = actual?.series?.[k] || {}; return `<div class="serie-fila"><span class="serie-n">${k + 1}</span>
      <input name="kg_${it.id}_${k}" inputmode="decimal" value="${s.kg ?? ''}" placeholder="${ph}" aria-label="Kilos serie ${k + 1}">
      <input name="rp_${it.id}_${k}" inputmode="numeric" value="${s.reps ?? ''}" placeholder="${obj ? obj.max : ''}" aria-label="Repeticiones serie ${k + 1}"></div>`; }).join('')}
    <p class="serie-ayuda">Si es peso corporal, deja el kg vacío. Con mancuernas, anota el peso de una.</p>
  </div>`;
}
export function leerSeries(form, it) {
  const out = [];
  for (let k = 0; k < 10; k++) {
    const kgEl = form.querySelector(`[name="kg_${it.id}_${k}"]`); if (!kgEl) break;
    const kg = Number(String(kgEl.value).replace(',', '.')) || 0;
    const reps = parseInt(form.querySelector(`[name="rp_${it.id}_${k}"]`).value, 10) || 0;
    if (reps > 0) out.push({ kg, reps });
    else if (kg > 0) throw new Error(`${it.ejercicio}: te faltan las repeticiones de la serie ${k + 1}.`);
  }
  return out;
}

// Historial agrupado por ejercicio
export function porEjercicio(cargas) {
  const m = new Map();
  [...cargas].sort((a, b) => (a.fecha + a.created_at).localeCompare(b.fecha + b.created_at)).forEach(c => {
    if (!m.has(c.clave)) m.set(c.clave, { nombre: c.ejercicio, registros: [] });
    const g = m.get(c.clave); g.nombre = c.ejercicio; g.registros.push(c);
  });
  return [...m.values()].sort((a, b) => b.registros.at(-1).fecha.localeCompare(a.registros.at(-1).fecha));
}
