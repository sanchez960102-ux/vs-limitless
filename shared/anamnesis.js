// Anamnesis inicial: definición única que usan la app del miembro (formulario) y el panel del coach (resumen).
import { esc } from '/shared/ui.js';

const DIAS_S = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const conDolor = d => d.dolor_actual === 'Sí';

export const PARQ = [
  '¿Algún médico te ha dicho que tienes una condición del corazón o presión arterial alta?',
  '¿Sientes dolor en el pecho en reposo, en tu día a día o al hacer actividad física?',
  '¿En los últimos 12 meses has perdido el equilibrio por mareo o has perdido el conocimiento?',
  '¿Te han diagnosticado alguna otra enfermedad crónica?',
  '¿Tomas medicamentos recetados para una enfermedad crónica?',
  '¿Tienes, o tuviste en el último año, un problema de huesos, articulaciones o músculos que pueda empeorar con el ejercicio?',
  '¿Algún médico te ha dicho que solo debes hacer actividad física con supervisión médica?'
];

export const PASOS = [
  { id: 'personal', titulo: 'Datos personales', intro: 'Lo básico para conocerte y saber a quién llamar si algo pasa.', campos: [
    { k: 'nacimiento', t: 'date', l: 'Fecha de nacimiento', req: true },
    { k: 'sexo', t: 'chips', l: 'Sexo', ops: ['Mujer', 'Hombre'], req: true },
    { k: 'estatura', t: 'number', l: 'Estatura (cm)', req: true, min: 120, max: 230 },
    { k: 'peso', t: 'number', l: 'Peso actual (kg)', req: true, min: 30, max: 250, step: '0.1' },
    { k: 'ocupacion', t: 'text', l: 'Ocupación' },
    { k: 'actividad_laboral', t: 'chips', l: 'En tu trabajo pasas la mayor parte del día…', ops: ['Sentado', 'De pie', 'En movimiento o con esfuerzo físico'] },
    { k: 'emergencia_nombre', t: 'text', l: 'Contacto de emergencia', ph: 'Nombre y parentesco', req: true },
    { k: 'emergencia_tel', t: 'tel', l: 'Teléfono del contacto', req: true }
  ] },
  { id: 'salud', titulo: 'Tu salud', intro: 'Responde con total honestidad. Esto es para cuidarte y ajustar tu plan, no para descartarte.', campos: [
    { k: 'parq', t: 'sino', l: 'Cuestionario de aptitud para la actividad física', preguntas: PARQ, req: true },
    { k: 'condiciones', t: 'multi', l: '¿Tienes alguna de estas condiciones?', ops: ['Hipertensión', 'Diabetes', 'Asma', 'Enfermedad cardiaca', 'Colesterol alto', 'Tiroides', 'Osteoporosis', 'Ninguna'], req: true },
    { k: 'condiciones_otra', t: 'text', l: 'Otra condición o diagnóstico (opcional)' },
    { k: 'medicamentos', t: 'textarea', l: 'Medicamentos que tomas actualmente', ph: 'Nombre y para qué. Escribe «ninguno» si no tomas.', req: true },
    { k: 'cirugias', t: 'textarea', l: 'Cirugías u hospitalizaciones (opcional)', ph: 'Qué fue y hace cuánto.' },
    { k: 'embarazo', t: 'chips', l: '¿Estás embarazada o tuviste un parto en el último año?', ops: ['No', 'Embarazada', 'Posparto'], req: true, cuando: d => d.sexo === 'Mujer' },
    { k: 'embarazo_tiempo', t: 'text', l: 'Semanas de embarazo o meses desde el parto', req: true, cuando: d => d.sexo === 'Mujer' && ['Embarazada', 'Posparto'].includes(d.embarazo) }
  ] },
  { id: 'lesiones', titulo: 'Lesiones y dolor', intro: 'Con esto evito ejercicios que te molesten y elijo cómo progresar.', campos: [
    { k: 'dolor_actual', t: 'chips', l: '¿Tienes dolor o molestia actualmente?', ops: ['No', 'Sí'], req: true },
    { k: 'dolor_zona', t: 'multi', l: '¿Dónde?', ops: ['Cuello', 'Hombro', 'Codo o muñeca', 'Espalda alta', 'Espalda baja', 'Cadera', 'Rodilla', 'Tobillo o pie'], req: true, cuando: conDolor },
    { k: 'dolor_intensidad', t: 'escala', l: 'Intensidad del dolor (1 leve · 10 insoportable)', min: 1, max: 10, req: true, cuando: conDolor },
    { k: 'dolor_detalle', t: 'textarea', l: '¿Cuándo duele y qué lo empeora?', req: true, cuando: conDolor },
    { k: 'lesiones_previas', t: 'textarea', l: 'Lesiones anteriores (opcional)', ph: 'Esguinces, fracturas, desgarres… y si te quedó alguna secuela.' }
  ] },
  { id: 'habitos', titulo: 'Estilo de vida', intro: 'Tu recuperación pesa tanto como tu entrenamiento.', campos: [
    { k: 'sueno', t: 'chips', l: 'Horas de sueño por noche', ops: ['Menos de 5', '5 a 6', '6 a 7', '7 a 8', 'Más de 8'], req: true },
    { k: 'estres', t: 'escala', l: 'Nivel de estrés en tu día a día (1 bajo · 5 muy alto)', min: 1, max: 5, req: true },
    { k: 'alimentacion', t: 'chips', l: '¿Cómo describirías tu alimentación?', ops: ['Desordenada', 'Regular', 'Bastante ordenada', 'Sigo un plan'], req: true },
    { k: 'agua', t: 'chips', l: 'Agua al día', ops: ['Menos de 1 L', '1 a 2 L', 'Más de 2 L'] },
    { k: 'tabaco', t: 'chips', l: '¿Fumas o vapeas?', ops: ['No', 'Ocasionalmente', 'Sí'] },
    { k: 'alcohol', t: 'chips', l: 'Alcohol', ops: ['No tomo', 'Ocasional', 'Fines de semana', 'Varias veces por semana'] }
  ] },
  { id: 'deporte', titulo: 'Historial deportivo', intro: 'Para saber desde dónde arrancamos.', campos: [
    { k: 'experiencia', t: 'chips', l: 'Experiencia entrenando', ops: ['Nunca he entrenado', 'Menos de 6 meses', '6 meses a 2 años', 'Más de 2 años'], req: true },
    { k: 'actual', t: 'chips', l: '¿Entrenas actualmente?', ops: ['No', '1 a 2 días', '3 a 4 días', '5 o más días'], req: true },
    { k: 'deportes', t: 'text', l: 'Deportes que practicas o practicaste (opcional)' },
    { k: 'marcas', t: 'textarea', l: 'Marcas o referencias (opcional)', ph: 'Ej. 5K en 28 min, sentadilla 60 kg × 5, 10 dominadas.' },
    { k: 'fc_reposo', t: 'number', l: 'Pulsaciones en reposo, si las sabes (opcional)', min: 30, max: 120 }
  ] },
  { id: 'objetivo', titulo: 'Objetivo y disponibilidad', intro: 'Con esto armo un plan que sí puedas cumplir.', campos: [
    { k: 'objetivo', t: 'textarea', l: '¿Qué quieres lograr y para cuándo?', req: true },
    { k: 'motivo', t: 'textarea', l: '¿Por qué es importante para ti? (opcional)' },
    { k: 'dias', t: 'multi', l: 'Días que puedes entrenar', ops: DIAS_S, req: true },
    { k: 'minutos', t: 'chips', l: 'Tiempo por sesión', ops: ['30 min', '45 min', '60 min', '90 min o más'], req: true },
    { k: 'lugar', t: 'multi', l: '¿Dónde entrenas?', ops: ['Gimnasio', 'Casa', 'Aire libre', 'Pista o parque'], req: true },
    { k: 'equipo', t: 'multi', l: 'Equipo que tienes fuera del gimnasio (opcional)', ops: ['Mancuernas', 'Ligas', 'Kettlebell', 'Barra de dominadas', 'Bicicleta', 'Reloj con GPS o banda de pecho', 'Nada'] },
    { k: 'no_gusta', t: 'textarea', l: 'Ejercicios que no te gustan o no puedes hacer (opcional)' }
  ] },
  { id: 'confirmacion', titulo: 'Confirmación', intro: 'Último paso.', campos: [
    { k: 'veraz', t: 'check', l: 'Confirmo que la información que di es verdadera y completa.', req: true },
    { k: 'avisar', t: 'check', l: 'Me comprometo a avisarle a Vic cualquier cambio en mi salud, dolor o lesión.', req: true },
    { k: 'riesgo', t: 'check', l: 'Entiendo que el ejercicio implica esfuerzo físico y que, si algo se siente mal, debo detenerme y avisar.', req: true }
  ] }
];

const visible = (c, d) => !c.cuando || c.cuando(d);

/* ------------------------------------------------------------ Formulario */
export function htmlPaso(paso, d) {
  return paso.campos.filter(c => visible(c, d)).map(c => campo(c, d)).join('');
}
function campo(c, d) {
  const v = d[c.k];
  const lab = `<span class="an-l">${esc(c.l)}${c.req ? '' : ''}</span>`;
  if (c.t === 'chips') return `<fieldset class="an-campo" data-k="${c.k}">${lab}<div class="an-chips">${c.ops.map(o => `<label><input type="radio" name="${c.k}" value="${esc(o)}" ${v === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  if (c.t === 'multi') return `<fieldset class="an-campo" data-k="${c.k}">${lab}<div class="an-chips">${c.ops.map(o => `<label><input type="checkbox" name="${c.k}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  if (c.t === 'escala') return `<fieldset class="an-campo" data-k="${c.k}">${lab}<div class="escala redonda">${Array.from({ length: c.max - c.min + 1 }, (_, i) => i + c.min).map(n => `<label><input type="radio" name="${c.k}" value="${n}" ${Number(v) === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>`;
  if (c.t === 'sino') return `<fieldset class="an-campo an-parq" data-k="${c.k}">${lab}${c.preguntas.map((q, i) => `<div class="an-sino"><p>${esc(q)}</p><div class="an-chips">${['No', 'Sí'].map(o => `<label><input type="radio" name="${c.k}_${i}" value="${o}" ${(v || [])[i] === o ? 'checked' : ''}><span>${o}</span></label>`).join('')}</div></div>`).join('')}</fieldset>`;
  if (c.t === 'check') return `<label class="an-check" data-k="${c.k}"><input type="checkbox" name="${c.k}" ${v ? 'checked' : ''}><span>${esc(c.l)}</span></label>`;
  if (c.t === 'textarea') return `<label class="an-campo" data-k="${c.k}">${lab}<textarea name="${c.k}" rows="3" placeholder="${esc(c.ph || '')}">${esc(v || '')}</textarea></label>`;
  const extra = [c.min != null && `min="${c.min}"`, c.max != null && `max="${c.max}"`, c.step && `step="${c.step}"`, c.t === 'number' && 'inputmode="decimal"'].filter(Boolean).join(' ');
  return `<label class="an-campo" data-k="${c.k}">${lab}<input type="${c.t}" name="${c.k}" value="${esc(v ?? '')}" placeholder="${esc(c.ph || '')}" ${extra}></label>`;
}

// Lee el paso del formulario y devuelve los faltantes
export function leerPaso(form, paso, d) {
  for (const c of paso.campos) {
    if (c.t === 'multi') d[c.k] = [...form.querySelectorAll(`[name="${c.k}"]:checked`)].map(i => i.value);
    else if (c.t === 'sino') d[c.k] = c.preguntas.map((_, i) => form.querySelector(`[name="${c.k}_${i}"]:checked`)?.value || null);
    else if (c.t === 'check') { const el = form.querySelector(`[name="${c.k}"]`); if (el) d[c.k] = el.checked; }
    else if (['chips', 'escala'].includes(c.t)) { const el = form.querySelector(`[name="${c.k}"]:checked`); d[c.k] = el ? (c.t === 'escala' ? Number(el.value) : el.value) : (form.querySelector(`[name="${c.k}"]`) ? null : d[c.k]); }
    else { const el = form.querySelector(`[name="${c.k}"]`); if (el) d[c.k] = el.value.trim(); }
  }
  return paso.campos.filter(c => visible(c, d) && c.req && (
    c.t === 'multi' ? !(d[c.k] || []).length : c.t === 'sino' ? (d[c.k] || []).some(x => !x) : c.t === 'check' ? !d[c.k] : d[c.k] === null || d[c.k] === undefined || d[c.k] === '')).map(c => c.k);
}

/* ----------------------------------------------------------- Alertas */
export function alertas(d) {
  const a = [];
  (d.parq || []).forEach((r, i) => { if (r === 'Sí') a.push('PAR-Q: ' + PARQ[i]); });
  if (['Embarazada', 'Posparto'].includes(d.embarazo)) a.push(`${d.embarazo}${d.embarazo_tiempo ? ' · ' + d.embarazo_tiempo : ''}`);
  if (d.dolor_actual === 'Sí') a.push(`Dolor actual ${d.dolor_intensidad || '?'}/10 en ${(d.dolor_zona || []).join(', ').toLowerCase()}`);
  const cond = (d.condiciones || []).filter(x => x !== 'Ninguna');
  if (cond.length) a.push('Condiciones: ' + cond.join(', '));
  return a;
}
export const requiereRevisionMedica = d => (d.parq || []).includes('Sí') || d.embarazo === 'Embarazada' || Number(d.dolor_intensidad) >= 6;

/* ----------------------------------------------------------- Resumen */
export function edad(iso) { if (!iso) return null; const n = new Date(iso + 'T12:00:00'), h = new Date(); let e = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--; return e; }
function valor(c, v) {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return null;
  if (c.t === 'multi') return v.join(', ');
  if (c.t === 'check') return v ? 'Sí' : 'No';
  if (c.t === 'sino') return null;
  return String(v);
}
export function htmlResumen(d) {
  return PASOS.filter(p => p.id !== 'confirmacion').map(p => {
    const filas = p.campos.filter(c => visible(c, d)).map(c => {
      if (c.t === 'sino') {
        const si = (d[c.k] || []).map((r, i) => r === 'Sí' ? PARQ[i] : null).filter(Boolean);
        return `<div><dt>PAR-Q</dt><dd>${si.length ? `<b class="an-si">${si.length} respuesta${si.length > 1 ? 's' : ''} afirmativa${si.length > 1 ? 's' : ''}</b><ul>${si.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : 'Todas en «No»'}</dd></div>`;
      }
      const v = valor(c, d[c.k]); if (v === null) return '';
      const etiqueta = c.l.replace(/\s*\(.*?\)\s*$/, '');
      const txt = c.t === 'date' ? new Date(v + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }) : v;
      return `<div><dt>${esc(etiqueta)}</dt><dd>${esc(txt)}${c.k === 'nacimiento' && edad(v) !== null ? ` · ${edad(v)} años` : ''}</dd></div>`;
    }).join('');
    return `<section class="an-sec"><p class="eyebrow">${esc(p.titulo)}</p><dl class="respuestas">${filas}</dl></section>`;
  }).join('');
}
