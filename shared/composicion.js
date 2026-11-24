// Mapa corporal InBody: silueta por segmentos comparada con la medición anterior.
import { esc } from '/shared/ui.js';

export const SEGMENTOS = [
  { k: 'brazo_der', nombre: 'Brazo derecho', par: 'brazo_izq' },
  { k: 'brazo_izq', nombre: 'Brazo izquierdo', par: 'brazo_der' },
  { k: 'tronco', nombre: 'Tronco' },
  { k: 'pierna_der', nombre: 'Pierna derecha', par: 'pierna_izq' },
  { k: 'pierna_izq', nombre: 'Pierna izquierda', par: 'pierna_der' }
];
export const GENERALES = [
  { k: 'peso', nombre: 'Peso', u: 'kg', mejor: null },
  { k: 'pct_grasa', nombre: '% de grasa', u: '%', mejor: 'menor' },
  { k: 'musculo_esqueletico', nombre: 'Músculo esquelético', u: 'kg', mejor: 'mayor' },
  { k: 'grasa_visceral', nombre: 'Grasa visceral', u: 'nivel', mejor: 'menor' },
  { k: 'agua', nombre: 'Agua corporal', u: 'L', mejor: null }
];
const n = v => (v === null || v === undefined || v === '') ? null : Number(v);
const r1 = v => Math.round(v * 10) / 10;
const signo = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(r1(v)).toLocaleString('es-GT');

// Más masa magra y menos grasa es mejor; cambios menores a 0.1 kg se consideran iguales
export function estadoSegmento(act, prev, k) {
  if (!prev) return 'sin';
  const dm = (n(act['magra_' + k]) ?? 0) - (n(prev['magra_' + k]) ?? 0);
  const dg = (n(act['grasa_' + k]) ?? 0) - (n(prev['grasa_' + k]) ?? 0);
  if (Math.abs(dm) < 0.1 && Math.abs(dg) < 0.1) return 'igual';
  const score = dm - dg;
  return score > 0.05 ? 'mejoro' : score < -0.05 ? 'bajo' : 'igual';
}

export function desbalances(m) {
  const pares = [
    { a: 'brazo_der', b: 'brazo_izq', parte: 'brazo', lados: ['brazo derecho', 'brazo izquierdo'], art: 'el' },
    { a: 'pierna_der', b: 'pierna_izq', parte: 'pierna', lados: ['pierna derecha', 'pierna izquierda'], art: 'la' }
  ];
  return pares.flatMap(({ a, b, parte, lados, art }) => {
    const ma = n(m['magra_' + a]), mb = n(m['magra_' + b]);
    if (!ma || !mb) return [];
    const pct = Math.abs(ma - mb) / Math.max(ma, mb) * 100;
    if (pct < 5) return [];
    const [debil, fuerte] = ma < mb ? lados : [lados[1], lados[0]];
    return [{ parte, pct: Math.round(pct), texto: `Tu ${debil} tiene ${Math.round(pct)}% menos masa magra que ${art} ${fuerte.split(' ')[1]}.` }];
  });
}

// Vista de frente: el lado derecho del miembro queda a la izquierda de la pantalla, como en el reporte InBody
const FORMAS = {
  tronco: 'M70 76 Q100 68 130 76 L137 188 Q100 206 63 188 Z',
  brazo_der: 'M65 80 Q50 84 46 102 L34 186 Q32 202 41 204 Q50 206 52 192 L63 120 Z',
  brazo_izq: 'M135 80 Q150 84 154 102 L166 186 Q168 202 159 204 Q150 206 148 192 L137 120 Z',
  pierna_der: 'M64 194 Q80 208 98 206 L97 300 L94 382 Q91 392 78 390 L71 300 Z',
  pierna_izq: 'M136 194 Q120 208 102 206 L103 300 L106 382 Q109 392 122 390 L129 300 Z'
};
export function svgSilueta(act, prev, sel) {
  return `<svg class="silueta" viewBox="0 0 200 400" role="group" aria-label="Mapa corporal por segmentos">
    <circle cx="100" cy="40" r="22" class="cabeza"/><rect x="92" y="60" width="16" height="14" rx="5" class="cabeza"/>
    ${SEGMENTOS.map(s => `<path d="${FORMAS[s.k]}" class="seg ${estadoSegmento(act, prev, s.k)} ${s.k === sel ? 'sel' : ''}" data-seg="${s.k}" tabindex="0" role="button" aria-label="${s.nombre}"/>`).join('')}
    <text x="40" y="232" class="lado">D</text><text x="160" y="232" class="lado">I</text>
  </svg>`;
}

function filaDelta(nombre, act, prev, u, mejor) {
  const a = n(act), p = n(prev);
  if (a === null) return '';
  let cls = '', d = '';
  if (p !== null) {
    const dif = a - p; d = signo(dif) + ' ' + u;
    if (Math.abs(dif) >= 0.05 && mejor) cls = (mejor === 'mayor' ? dif > 0 : dif < 0) ? 'sube' : 'baja';
  }
  return `<div class="cg-fila"><dt>${nombre}</dt><dd><b>${a.toLocaleString('es-GT')} ${u}</b>${d ? `<span class="${cls}">${d}</span>` : ''}</dd></div>`;
}

export function htmlMapa(meds, idx, sel) {
  const act = meds[idx], prev = meds[idx - 1] || null;
  const seg = SEGMENTOS.find(s => s.k === sel) || SEGMENTOS[2];
  const f = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: '2-digit' });
  const des = desbalances(act);
  const est = estadoSegmento(act, prev, seg.k);
  const etiqueta = { mejoro: 'Mejoró', igual: 'Sin cambio', bajo: 'Bajó', sin: 'Primera medición' }[est];
  return `
    <div class="mapa-linea" role="tablist" aria-label="Mediciones">${meds.map((m, i) => `<button type="button" role="tab" data-med="${i}" aria-selected="${i === idx}" class="${i === idx ? 'on' : ''}">${f(m.fecha)}</button>`).join('')}</div>
    <div class="mapa-cuerpo">
      ${svgSilueta(act, prev, seg.k)}
      <div class="mapa-info">
        <div class="seg-det ${est}"><p class="seg-n">${seg.nombre}</p><span class="seg-e">${etiqueta}${prev ? ` vs ${f(prev.fecha)}` : ''}</span>
          <dl>${filaDelta('Masa magra', act['magra_' + seg.k], prev?.['magra_' + seg.k], 'kg', 'mayor')}${filaDelta('Grasa', act['grasa_' + seg.k], prev?.['grasa_' + seg.k], 'kg', 'menor')}</dl></div>
        <div class="leyenda"><span><i class="mejoro"></i>Mejoró</span><span><i class="igual"></i>Igual</span><span><i class="bajo"></i>Bajó</span></div>
        <p class="tenue" style="font-size:12px;margin:0">Toca un segmento para ver sus valores.</p>
      </div>
    </div>
    ${des.map(d => `<div class="desbalance"><b>Desbalance de ${d.parte}s</b><span>${esc(d.texto)}</span></div>`).join('')}
    <dl class="cg">${GENERALES.map(g => filaDelta(g.nombre, act[g.k], prev?.[g.k], g.u, g.mejor)).join('')}</dl>`;
}

// Monta el mapa interactivo en un contenedor
export function montarMapa(cont, meds) {
  if (!meds.length) return;
  let idx = meds.length - 1, sel = 'tronco';
  const pintar = () => {
    cont.innerHTML = htmlMapa(meds, idx, sel);
    cont.querySelectorAll('[data-med]').forEach(b => b.onclick = () => { idx = Number(b.dataset.med); pintar(); });
    cont.querySelectorAll('[data-seg]').forEach(p => {
      const elegir = () => { sel = p.dataset.seg; pintar(); cont.querySelector(`[data-seg="${sel}"]`)?.focus(); };
      p.onclick = elegir; p.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } };
    });
    cont.querySelector('.mapa-linea .on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  };
  pintar();
}
