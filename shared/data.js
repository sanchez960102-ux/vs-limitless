// Capa de datos de la app VS Limitless.
// Misma API sobre Supabase (producción) o sobre datos de demostración en memoria.

const SUPABASE_JS = 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const PLANES = ['Base', 'Limitless', 'Élite'];
export const TIPOS = ['fuerza', 'carrera', 'bici', 'movilidad', 'mixta'];

export function hoyISO() { const f = new Date(); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; }
export function diaSemanaHoy() { const d = new Date().getDay(); return d === 0 ? 7 : d; }
export function semanaActual(bloque) {
  if (!bloque) return 1;
  const ini = new Date(bloque.fecha_inicio + 'T00:00:00');
  const dias = Math.floor((Date.now() - ini.getTime()) / 86400000);
  return Math.min(Math.max(Math.floor(dias / 7) + 1, 1), bloque.semanas);
}
export function lunesDe(fecha = new Date()) {
  const d = new Date(fecha); const dia = d.getDay() || 7;
  d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - dia + 1); return d;
}
export function diasDesde(iso) { return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null; }

export const PRECIOS = { Base: { 1: 300 }, Limitless: { 1: 450, 3: 1250 }, 'Élite': { 1: 950, 3: 2650 } };

const fechaLocal = iso => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const isoLocal = f => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
export function sumarDias(iso, n) { const f = fechaLocal(iso); f.setDate(f.getDate() + n); return isoLocal(f); }
// Estado de pago: sin control, al día, por vencer (≤3 días), en gracia o bloqueado
export function estadoPago(perfil, gracia = 5) {
  if (!perfil?.pagado_hasta) return { tipo: 'sin' };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((fechaLocal(perfil.pagado_hasta) - hoy) / 86400000);
  if (dias > 3) return { tipo: 'al_dia', dias };
  if (dias >= 0) return { tipo: 'por_vencer', dias };
  const vencido = -dias;
  if (vencido <= gracia) return { tipo: 'gracia', vencido, quedan: gracia - vencido, limite: sumarDias(perfil.pagado_hasta, gracia) };
  return { tipo: 'bloqueado', vencido };
}

export function modoDemo() {
  const cfg = window.VSL_CONFIG || {};
  return new URLSearchParams(location.search).has('demo') || !cfg.supabaseUrl || !cfg.supabaseAnonKey;
}

export async function crearDatos() {
  return modoDemo() ? crearDemo() : crearSupabase();
}

/* ------------------------------------------------------------------ Supabase */
async function crearSupabase() {
  const cfg = window.VSL_CONFIG;
  const { createClient } = await import(SUPABASE_JS);
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const uid = async () => (await sb.auth.getUser()).data.user?.id;

  const api = {
    demo: false,
    async sesionActiva() { return (await sb.auth.getSession()).data.session; },
    async enviarEnlace(correo, ruta) {
      ok(await sb.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: location.origin + ruta } }));
    },
    async entrarConClave(correo, clave) { ok(await sb.auth.signInWithPassword({ email: correo, password: clave })); },
    async crearClave(clave) { ok(await sb.auth.updateUser({ password: clave })); },
    async salir() { await sb.auth.signOut(); },
    // Solo reacciona cuando cambia el usuario, y fuera del aviso de Supabase:
    // volver a pedir la sesión dentro del aviso bloquea la app (se queda cargando).
    alCambiarSesion(fn) {
      let ultimo;
      sb.auth.onAuthStateChange((evento, s) => {
        const id = s?.user?.id || null;
        if (evento === 'INITIAL_SESSION') { ultimo = id; return; }
        if (id === ultimo) return;
        ultimo = id;
        setTimeout(() => fn(s), 0);
      });
    },
    async yo() { const id = await uid(); if (!id) return null; return ok(await sb.from('perfiles').select('*').eq('id', id).maybeSingle()); },

    // Miembro
    async bloqueActivo(miembroId) {
      return ok(await sb.from('bloques').select('*').eq('miembro_id', miembroId).eq('activo', true)
        .order('fecha_inicio', { ascending: false }).limit(1).maybeSingle());
    },
    async sesionesSemana(bloqueId, semana) {
      return ok(await sb.from('sesiones').select('*, items(*), registros(*)').eq('bloque_id', bloqueId).eq('semana', semana)
        .order('dia').order('orden'));
    },
    async sesion(id) {
      const s = ok(await sb.from('sesiones').select('*, items(*), registros(*)').eq('id', id).single());
      s.items.sort((a, b) => a.orden - b.orden); return s;
    },
    async guardarRegistro(sesion, datos) {
      const id = await uid();
      return ok(await sb.from('registros').upsert({ sesion_id: sesion.id, miembro_id: id, ...datos }, { onConflict: 'sesion_id' }).select().single());
    },
    async borrarRegistro(sesionId) { ok(await sb.from('registros').delete().eq('sesion_id', sesionId)); },
    async registros(miembroId) {
      return ok(await sb.from('registros').select('*, sesiones(titulo, semana, dia, tipo)').eq('miembro_id', miembroId).order('created_at', { ascending: false }));
    },
    async checkins(miembroId) {
      return ok(await sb.from('checkins').select('*').eq('miembro_id', miembroId).order('created_at', { ascending: false }));
    },
    async crearCheckin(datos) { const id = await uid(); return ok(await sb.from('checkins').insert({ miembro_id: id, ...datos }).select().single()); },
    async videos(miembroId) {
      return ok(await sb.from('videos').select('*').eq('miembro_id', miembroId).order('created_at', { ascending: false }));
    },
    async subirVideo(archivo, ejercicio, nota) {
      const id = await uid();
      const ext = (archivo.name.split('.').pop() || 'mp4').toLowerCase();
      const ruta = `${id}/${Date.now()}.${ext}`;
      ok(await sb.storage.from('tecnica').upload(ruta, archivo, { contentType: archivo.type || 'video/mp4' }));
      return ok(await sb.from('videos').insert({ miembro_id: id, ejercicio, nota, ruta }).select().single());
    },
    async urlVideo(ruta) { return ok(await sb.storage.from('tecnica').createSignedUrl(ruta, 3600)).signedUrl; },

    // Coach
    async miembros() {
      return ok(await sb.from('perfiles').select('*').eq('rol', 'miembro').order('created_at', { ascending: false }));
    },
    async miembro(id) { return ok(await sb.from('perfiles').select('*').eq('id', id).single()); },
    async actualizarMiembro(id, cambios) { return ok(await sb.from('perfiles').update(cambios).eq('id', id).select().single()); },
    async aplicaciones() { return ok(await sb.from('aplicaciones').select('*').order('created_at', { ascending: false })); },
    async marcarAplicacion(id, estado) { ok(await sb.from('aplicaciones').update({ estado }).eq('id', id)); },
    async borrarAplicaciones(ids) { if (ids.length) ok(await sb.from('aplicaciones').delete().in('id', ids)); },
    async invitaciones() { return ok(await sb.from('invitaciones').select('*').order('created_at', { ascending: false })); },
    async invitar({ correo, nombre, plan, objetivo, aplicacion_id }) {
      return ok(await sb.from('invitaciones').insert({ correo: correo.trim().toLowerCase(), nombre, plan, objetivo, aplicacion_id }).select().single());
    },
    async bloques(miembroId) { return ok(await sb.from('bloques').select('*').eq('miembro_id', miembroId).order('fecha_inicio', { ascending: false })); },
    async crearBloque(datos) {
      if (datos.activo !== false) await sb.from('bloques').update({ activo: false }).eq('miembro_id', datos.miembro_id);
      return ok(await sb.from('bloques').insert(datos).select().single());
    },
    async guardarSesion(s) {
      const { items, registros, ...fila } = s;
      return ok(await sb.from('sesiones').upsert(fila).select().single());
    },
    async borrarSesion(id) { ok(await sb.from('sesiones').delete().eq('id', id)); },
    async guardarItem(it) { return ok(await sb.from('items').upsert(it).select().single()); },
    async borrarItem(id) { ok(await sb.from('items').delete().eq('id', id)); },
    async copiarSemana(bloque, desde, hacia) {
      const origen = await api.sesionesSemana(bloque.id, desde);
      for (const s of origen) {
        const nueva = ok(await sb.from('sesiones').insert({ bloque_id: bloque.id, miembro_id: bloque.miembro_id, semana: hacia, dia: s.dia, titulo: s.titulo, tipo: s.tipo, notas: s.notas, orden: s.orden }).select().single());
        if (s.items.length) ok(await sb.from('items').insert(s.items.map(({ id, sesion_id, ...i }) => ({ ...i, sesion_id: nueva.id }))));
      }
    },
    async responderCheckin(id, respuesta) { return ok(await sb.from('checkins').update({ respuesta }).eq('id', id).select().single()); },
    async videosPendientes() {
      return ok(await sb.from('videos').select('*, perfiles(nombre, correo)').eq('estado', 'pendiente').order('created_at'));
    },
    async revisarVideo(id, comentario) { return ok(await sb.from('videos').update({ comentario, estado: 'revisado' }).eq('id', id).select().single()); },
    async resumenMiembro(m) { return resumen(api, m); },

    // Cobros
    async ajustesCobro() {
      const filas = ok(await sb.from('ajustes').select('clave, valor').like('clave', 'cobro\\_%'));
      const o = Object.fromEntries(filas.map(f => [f.clave.replace('cobro_', ''), f.valor]));
      return { instrucciones: o.instrucciones || '', whatsapp: o.whatsapp || '', gracia: Number(o.gracia ?? 5) };
    },
    async guardarAjustesCobro(a) {
      ok(await sb.from('ajustes').upsert([
        { clave: 'cobro_instrucciones', valor: a.instrucciones || '' },
        { clave: 'cobro_whatsapp', valor: a.whatsapp || '' },
        { clave: 'cobro_gracia', valor: String(a.gracia ?? 5) }]));
    },
    async composicion(mid) { return ok(await sb.from('composicion').select('*').eq('miembro_id', mid).order('fecha').order('created_at')); },
    async guardarComposicion(c) { return ok(await sb.from('composicion').upsert(c).select().single()); },
    async borrarComposicion(id) { ok(await sb.from('composicion').delete().eq('id', id)); },
    async cargas(mid) { return ok(await sb.from('cargas').select('*').eq('miembro_id', mid).order('fecha').order('created_at')); },
    async guardarCarga(c) { return ok(await sb.from('cargas').upsert(c, { onConflict: 'item_id' }).select().single()); },
    async borrarCargasDeItems(ids) { if (ids.length) ok(await sb.from('cargas').delete().in('item_id', ids)); },
    async tests() { return ok(await sb.from('tests').select('*').eq('activo', true).order('orden').order('nombre')); },
    async guardarTest(t) { return ok(await sb.from('tests').upsert(t).select().single()); },
    async resultadosTest(mid) { return ok(await sb.from('resultados_test').select('*').eq('miembro_id', mid).order('fecha').order('created_at')); },
    async guardarResultadoTest(r) {
      if (r.item_id) return ok(await sb.from('resultados_test').upsert(r, { onConflict: 'item_id' }).select().single());
      return ok(await sb.from('resultados_test').insert(r).select().single());
    },
    async borrarResultadoTest(id) { ok(await sb.from('resultados_test').delete().eq('id', id)); },
    async anamnesis(mid) { return ok(await sb.from('anamnesis').select('*').eq('miembro_id', mid).maybeSingle()); },
    async anamnesisTodas() { return ok(await sb.from('anamnesis').select('miembro_id, completada, alerta_salud, revisada_at, paso')); },
    async guardarAnamnesis(mid, cambios) { return ok(await sb.from('anamnesis').upsert({ miembro_id: mid, ...cambios, updated_at: new Date().toISOString() }).select().single()); },
    async actualizarAnamnesis(mid, cambios) { return ok(await sb.from('anamnesis').update(cambios).eq('miembro_id', mid).select().maybeSingle()); },
    async eliminarMiembro(id) { ok(await sb.rpc('eliminar_miembro', { p_miembro: id })); },
    async pagos(miembroId) { return ok(await sb.from('pagos').select('*').eq('miembro_id', miembroId).order('created_at', { ascending: false })); },
    async registrarPago(miembroId, { meses, monto, metodo, nota }) {
      return ok(await sb.rpc('registrar_pago', { p_miembro: miembroId, p_meses: meses, p_monto: monto, p_metodo: metodo || null, p_nota: nota || null }));
    }
  };
  return api;
}

/* ---------------------------------------------------------- Resumen (común) */
async function resumen(api, m) {
  const bloque = await api.bloqueActivo(m.id);
  let programadas = 0, hechas = 0, semana = null;
  if (bloque) {
    semana = semanaActual(bloque);
    const ss = await api.sesionesSemana(bloque.id, semana);
    programadas = ss.length; hechas = ss.filter(s => s.registros?.length && s.registros[0].completada).length;
  }
  const [regs, chks, vids] = await Promise.all([api.registros(m.id), api.checkins(m.id), api.videos(m.id)]);
  const fechas = [regs[0]?.created_at, chks[0]?.created_at].filter(Boolean).sort().reverse();
  const ultima = fechas[0] || null;
  const sinRespuesta = chks.filter(c => !c.respuesta).length;
  const pendientes = vids.filter(v => v.estado === 'pendiente').length;
  const inactivo = diasDesde(ultima ?? m.created_at);
  return { bloque, semana, programadas, hechas, adherencia: programadas ? Math.round(hechas / programadas * 100) : null,
    ultima, inactivo, alerta: inactivo >= 5, sinRespuesta, pendientes, sinPlan: !bloque, checkins: chks };
}

/* --------------------------------------------------------------------- Demo */
function crearDemo() {
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const hace = d => new Date(Date.now() - d * 86400000).toISOString();
  const lunes = lunesDe(); const iniBloque = new Date(lunes); iniBloque.setDate(iniBloque.getDate() - 14);
  const iso = d => d.toISOString().slice(0, 10);

  const coach = { id: 'coach', correo: 'laf.victor.sanchez@gmail.com', nombre: 'Vic Sánchez', rol: 'coach', created_at: hace(30) };
  const ana = { id: 'ana', correo: 'ana@ejemplo.com', nombre: 'Ana López', rol: 'miembro', plan: 'Limitless', estado: 'activo', pagado_hasta: iso(new Date(Date.now() - 2 * 86400000)), objetivo: 'Correr mis primeros 10K en abril', created_at: hace(20) };
  const luis = { id: 'luis', correo: 'luis@ejemplo.com', nombre: 'Luis Méndez', rol: 'miembro', plan: 'Base', estado: 'activo', pagado_hasta: iso(new Date(Date.now() + 18 * 86400000)), objetivo: 'Ganar músculo', created_at: hace(12) };
  const db = {
    perfiles: [coach, ana, luis],
    bloques: [{ id: 'b1', miembro_id: 'ana', nombre: 'Bloque 1 · Base aeróbica + fuerza', fecha_inicio: iso(iniBloque), semanas: 4, notas: 'Construir base sin lesionarse.', activo: true, created_at: hace(14) }],
    sesiones: [], items: [], registros: [], checkins: [], videos: [], invitaciones: [],
    tests: [
      { id: 't-cooper', nombre: 'Test de Cooper (12 min)', categoria: 'carrera', unidad: 'm', mejor: 'mayor', distancia: null, calculo: 'cooper', protocolo: 'Calienta 10 min trotando suave. Corre la mayor distancia posible en 12 minutos. Anota los metros totales.', orden: 1 },
      { id: 't-umbral', nombre: 'Test de 30 min (umbral)', categoria: 'carrera', unidad: 'bpm', mejor: 'mayor', distancia: null, calculo: 'umbral30', protocolo: 'Calienta 15 min. Corre 30 minutos al máximo esfuerzo sostenible. Anota la FC promedio de los últimos 20 minutos, la distancia total y la FC más alta que viste.', orden: 6 },
      { id: 't-5k', nombre: '5 km contrarreloj', categoria: 'carrera', unidad: 'tiempo', mejor: 'menor', distancia: 5000, calculo: 'ritmo', protocolo: 'Calienta 15 min. Corre 5 km al mejor ritmo que puedas sostener, en terreno plano. Anota el tiempo total.', orden: 4 },
      { id: 't-sentadilla', nombre: 'Sentadilla · RM estimado', categoria: 'fuerza', unidad: 'kg_reps', mejor: 'mayor', distancia: null, calculo: '1rm', protocolo: 'Calienta con 2–3 series progresivas. Elige un peso que puedas mover entre 3 y 8 repeticiones con buena técnica. Anota el peso y las repeticiones.', orden: 10 },
      { id: 't-flexiones', nombre: 'Flexiones máximas', categoria: 'fuerza', unidad: 'reps', mejor: 'mayor', distancia: null, calculo: null, protocolo: 'Cuerpo en línea recta, pecho hasta un puño del suelo. Máximas repeticiones continuas.', orden: 15 },
      { id: 't-plancha', nombre: 'Plancha frontal máxima', categoria: 'funcional', unidad: 'tiempo', mejor: 'mayor', distancia: null, calculo: null, protocolo: 'Apoyo en antebrazos, cuerpo alineado. Detén el tiempo cuando la cadera caiga o se eleve.', orden: 20 },
      { id: 't-tobillo', nombre: 'Dorsiflexión de tobillo (rodilla a la pared)', categoria: 'movilidad', unidad: 'cm', mejor: 'mayor', distancia: null, calculo: null, protocolo: 'Lleva la rodilla a la pared sin despegar el talón y mide la distancia máxima del dedo gordo a la pared.', orden: 31 }],
    composicion: [
      { id: 'cp1', miembro_id: 'ana', fecha: iso(new Date(Date.now() - 56 * 86400000)), peso: 66.8, pct_grasa: 31.2, musculo_esqueletico: 24.6, grasa_visceral: 7, agua: 33.4,
        magra_brazo_der: 2.18, grasa_brazo_der: 1.62, magra_brazo_izq: 2.12, grasa_brazo_izq: 1.66, magra_tronco: 20.1, grasa_tronco: 10.4,
        magra_pierna_der: 7.42, grasa_pierna_der: 3.71, magra_pierna_izq: 7.02, grasa_pierna_izq: 3.80, created_at: hace(56) },
      { id: 'cp2', miembro_id: 'ana', fecha: iso(new Date(Date.now() - 28 * 86400000)), peso: 65.6, pct_grasa: 29.9, musculo_esqueletico: 24.9, grasa_visceral: 6, agua: 33.7,
        magra_brazo_der: 2.24, grasa_brazo_der: 1.55, magra_brazo_izq: 2.13, grasa_brazo_izq: 1.60, magra_tronco: 20.3, grasa_tronco: 9.8,
        magra_pierna_der: 7.55, grasa_pierna_der: 3.60, magra_pierna_izq: 7.10, grasa_pierna_izq: 3.66, created_at: hace(28) },
      { id: 'cp3', miembro_id: 'ana', fecha: iso(new Date(Date.now() - 3 * 86400000)), peso: 64.2, pct_grasa: 28.1, musculo_esqueletico: 25.3, grasa_visceral: 6, agua: 34.1,
        magra_brazo_der: 2.31, grasa_brazo_der: 1.47, magra_brazo_izq: 2.22, grasa_brazo_izq: 1.58, magra_tronco: 20.6, grasa_tronco: 9.1,
        magra_pierna_der: 7.71, grasa_pierna_der: 3.48, magra_pierna_izq: 7.22, grasa_pierna_izq: 3.52, created_at: hace(3) }],
    cargas: (() => {
      const c = (ej, dias, series) => { const v = series.map(([kg, reps]) => ({ kg, reps })); const top = Math.max(...v.map(s => s.kg));
        return { id: uuid(), miembro_id: 'ana', item_id: null, ejercicio: ej, clave: ej.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), fecha: iso(new Date(Date.now() - dias * 86400000)), series: v, top_kg: top,
          e1rm: Math.max(...v.map(s => Math.round(s.kg * (1 + s.reps / 30) * 2) / 2)), volumen: v.reduce((a, s) => a + s.kg * s.reps, 0), created_at: hace(dias) }; };
      return [
        c('Sentadilla goblet', 14, [[16, 8], [16, 8], [16, 8], [16, 7]]), c('Peso muerto rumano', 14, [[12, 10], [12, 10], [12, 10]]),
        c('Press de banca mancuerna', 11, [[10, 8], [10, 8], [10, 7], [10, 6]]), c('Remo con mancuerna', 11, [[14, 10], [14, 10], [14, 10], [14, 10]]),
        c('Sentadilla goblet', 7, [[18, 8], [18, 8], [18, 8], [18, 8]]), c('Peso muerto rumano', 7, [[14, 10], [14, 10], [14, 9]]),
        c('Press de banca mancuerna', 4, [[10, 8], [10, 8], [10, 8], [10, 7]]), c('Remo con mancuerna', 4, [[16, 10], [16, 10], [16, 9], [16, 9]])];
    })(),
    resultados: [
      { id: 'r1', miembro_id: 'ana', test_id: 't-5k', item_id: null, valor: 1860, detalle: null, fecha: iso(new Date(Date.now() - 19 * 86400000)), created_at: hace(19) },
      { id: 'r2', miembro_id: 'ana', test_id: 't-sentadilla', item_id: null, valor: 46.5, detalle: '40 kg × 5', fecha: iso(new Date(Date.now() - 18 * 86400000)), created_at: hace(18) },
      { id: 'r4', miembro_id: 'ana', test_id: 't-umbral', item_id: null, valor: 171, detalle: '5,600 m · FC máx 188', fecha: iso(new Date(Date.now() - 17 * 86400000)), created_at: hace(17) },
      { id: 'r3', miembro_id: 'ana', test_id: 't-plancha', item_id: null, valor: 75, detalle: null, fecha: iso(new Date(Date.now() - 18 * 86400000)), created_at: hace(18) }],
    anamnesis: [{ miembro_id: 'ana', paso: 6, completada: true, alerta_salud: true, completada_at: hace(20), revisada_at: null, datos: {
      nacimiento: '1994-03-12', sexo: 'Mujer', estatura: '163', peso: '64.2', ocupacion: 'Contadora', actividad_laboral: 'Sentado', emergencia_nombre: 'Carlos López (esposo)', emergencia_tel: '+502 5555 0000',
      parq: ['No', 'No', 'No', 'No', 'No', 'Sí', 'No'], condiciones: ['Ninguna'], medicamentos: 'Ninguno', cirugias: '', embarazo: 'No',
      dolor_actual: 'Sí', dolor_zona: ['Rodilla'], dolor_intensidad: 3, dolor_detalle: 'Molestia en la rodilla derecha al bajar gradas después de correr.', lesiones_previas: 'Esguince de tobillo izquierdo en 2021, sin secuelas.',
      sueno: '6 a 7', estres: 4, alimentacion: 'Regular', agua: '1 a 2 L', tabaco: 'No', alcohol: 'Ocasional',
      experiencia: '6 meses a 2 años', actual: '1 a 2 días', deportes: 'Natación en el colegio', marcas: '5K en 31 min', fc_reposo: '68',
      objetivo: 'Correr mis primeros 10K en abril sin lesionarme.', motivo: 'Quiero demostrarme que puedo ser constante.', dias: ['Lunes', 'Martes', 'Jueves', 'Sábado'], minutos: '60 min', lugar: ['Gimnasio', 'Aire libre'], equipo: ['Ligas'], no_gusta: 'Burpees',
      veraz: true, avisar: true, riesgo: true } }],
    cobro: { instrucciones: 'Transferencia a Banco Industrial · Cuenta monetaria 000-000000-0 a nombre de Víctor Sánchez. Envíame el comprobante por WhatsApp.', whatsapp: '50255555555', gracia: 5 },
    pagos: [{ id: 'p1', miembro_id: 'ana', fecha: iso(new Date(Date.now() - 32 * 86400000)), monto: 450, meses: 1, metodo: 'Transferencia', nota: '', cubre_hasta: iso(new Date(Date.now() - 2 * 86400000)), created_at: hace(32) }],
    aplicaciones: [
      { id: 'a0', created_at: hace(9), nombre: 'María Fernández', correo: 'Maria@Ejemplo.com ', whatsapp: '5555-1234', ciudad: 'Guatemala', edad: 32, objetivo: 'Running o resistencia', meta: 'Correr 10K', nivel: 'Entreno a veces, sin plan', dias: 3, lugar: 'Aire libre', lesiones: 'ninguna', por_que_ahora: 'Quiero empezar a correr en serio.', ultima_vez: 'Me aburrí de correr sola.', semana_mala: 'Intentaría hacer algo aunque sea corto.', compromiso: 7, plan: 'Base', acepta_compromiso: true, estado: 'nueva' },
      { id: 'a1', created_at: hace(1), nombre: 'María Fernández', correo: 'maria@ejemplo.com', whatsapp: '+502 5555 1234', ciudad: 'Guatemala', edad: 32, objetivo: 'Running o resistencia', meta: 'Medio maratón en junio', nivel: 'Entreno a veces, sin plan', dias: 4, lugar: 'Gimnasio, Aire libre', lesiones: 'ninguna', por_que_ahora: 'Me inscribí al medio maratón y no quiero improvisar.', ultima_vez: 'Dejé de correr cuando cambié de trabajo y perdí la rutina.', semana_mala: 'Haría lo mínimo y te escribiría para ajustar.', compromiso: 9, plan: 'Limitless', acepta_compromiso: true, estado: 'nueva' },
      { id: 'a2', created_at: hace(3), nombre: 'Jorge Pérez', correo: 'jorge@ejemplo.com', whatsapp: '+502 5555 9876', ciudad: 'Mixco', edad: 27, objetivo: 'Objetivo estético: músculo o grasa', meta: 'Bajar 6 kg', nivel: 'No entreno', dias: 3, lugar: 'Casa', lesiones: 'Dolor de rodilla leve', por_que_ahora: 'Me vi en fotos y quiero cambiar.', ultima_vez: 'Me aburrí a las dos semanas.', semana_mala: 'No sé, probablemente lo dejaría.', compromiso: 5, plan: 'Base', acepta_compromiso: true, estado: 'nueva' }
    ]
  };
  const plantilla = [
    { dia: 1, titulo: 'Fuerza tren inferior', tipo: 'fuerza', items: [['Sentadilla goblet', '4', '8', '20 kg', '', '90 s'], ['Peso muerto rumano', '3', '10', '2×14 kg', '', '90 s'], ['Zancada inversa', '3', '8 c/lado', 'Corporal', '', '60 s'], ['Plancha', '3', '40 s', '', '', '45 s']] },
    { dia: 2, titulo: 'Rodaje suave Z2', tipo: 'carrera', items: [['Carrera continua', '1', '35 min', '', 'Z2', ''], ['Strides', '4', '20 s', '', 'Rápido y suelto', '60 s']] },
    { dia: 4, titulo: 'Fuerza tren superior + core', tipo: 'fuerza', items: [['Press de banca mancuerna', '4', '8', '2×12 kg', '', '90 s'], ['Remo con mancuerna', '4', '10', '16 kg', '', '60 s'], ['Press militar', '3', '10', '2×8 kg', '', '60 s'], ['Dead bug', '3', '10 c/lado', '', '', '45 s']] },
    { dia: 6, titulo: 'Fondo largo', tipo: 'carrera', items: [['Carrera continua', '1', '50 min', '', 'Z2', ''], ['Movilidad de cadera', '1', '8 min', '', '', '']] }
  ];
  const NOTAS_DEMO = {
    'Sentadilla goblet': 'Baja en 3 segundos y empuja el piso al subir. Rodillas siguiendo la punta del pie. Si las 8 salen fáciles, sube a 22 kg la próxima.',
    'Peso muerto rumano': 'Cadera hacia atrás, espalda neutra. Para cuando sientas el estiramiento atrás del muslo, no antes de la rodilla.',
    'Carrera continua': 'Tienes que poder hablar en frases completas. Si no, baja el ritmo aunque se sienta lento.'
  };
  for (let sem = 1; sem <= 4; sem++) plantilla.forEach((p, k) => {
    const s = { id: uuid(), bloque_id: 'b1', miembro_id: 'ana', semana: sem, dia: p.dia, titulo: p.titulo, tipo: p.tipo, notas: p.dia === 1 ? 'Calienta 8 minutos con movilidad de cadera antes de empezar. Hoy la técnica manda sobre el peso.' : '', orden: k };
    db.sesiones.push(s);
    p.items.forEach(([ejercicio, series, reps, carga, ritmo, descanso], o) => db.items.push({ id: uuid(), sesion_id: s.id, ejercicio, series, reps, carga, ritmo, descanso, nota: NOTAS_DEMO[ejercicio] || '', video_url: '', orden: o }));
  });
  const conTest = db.sesiones.find(s => s.semana === 3 && s.dia === 4);
  if (conTest) [['t-flexiones', 'Flexiones máximas'], ['t-plancha', 'Plancha frontal máxima']].forEach(([tid, nombre], k) =>
    db.items.push({ id: uuid(), sesion_id: conTest.id, ejercicio: nombre, series: '1', reps: 'Máximo', carga: '', ritmo: '', descanso: '3 min', nota: 'Es test: dalo todo con buena técnica. Con esto ajusto tus cargas del próximo bloque.', video_url: '', orden: 10 + k, test_id: tid }));
  db.sesiones.filter(s => s.semana < 3).forEach((s, k) => { if (k !== 3) db.registros.push({ id: uuid(), sesion_id: s.id, miembro_id: 'ana', completada: true, rpe: 6 + (k % 3), nota: '', resultados: {}, created_at: hace(14 - k * 2) }); });
  const s3 = db.sesiones.find(s => s.semana === 3 && s.dia === 1);
  if (s3) db.registros.push({ id: uuid(), sesion_id: s3.id, miembro_id: 'ana', completada: true, rpe: 7, nota: 'La sentadilla se sintió pesada.', resultados: {}, created_at: hace(1) });
  db.checkins.push({ id: uuid(), miembro_id: 'ana', peso: 64.2, sueno: 4, energia: 4, sesiones_cumplidas: 4, comentario: 'Buena semana, el fondo largo me costó.', respuesta: 'Excelente. Bajamos 5 min el fondo esta semana y mantenemos ritmo.', created_at: hace(8) });
  db.checkins.push({ id: uuid(), miembro_id: 'ana', peso: 63.8, sueno: 3, energia: 3, sesiones_cumplidas: 3, comentario: 'Dormí poco por trabajo.', respuesta: null, created_at: hace(1) });
  db.videos.push({ id: uuid(), miembro_id: 'ana', ejercicio: 'Sentadilla goblet', ruta: '', nota: 'Siento que se me van las rodillas hacia adentro.', comentario: null, estado: 'pendiente', created_at: hace(1), perfiles: { nombre: 'Ana López', correo: 'ana@ejemplo.com' } });

  // ?demo&anamnesis muestra el cuestionario inicial como lo vería un miembro nuevo
  if (new URLSearchParams(location.search).has('anamnesis')) db.anamnesis = [];
  // ?demo&plan=Base (o Élite) muestra la app con los permisos de ese plan
  const planDemo = new URLSearchParams(location.search).get('plan');
  if (planDemo && ['Base', 'Limitless', 'Élite'].includes(planDemo)) db.perfiles.find(p => p.id === 'ana').plan = planDemo;
  let yo = null;
  const conHijos = s => ({ ...s, items: db.items.filter(i => i.sesion_id === s.id).sort((a, b) => a.orden - b.orden), registros: db.registros.filter(r => r.sesion_id === s.id) });
  const espera = v => new Promise(r => setTimeout(() => r(v), 60));

  const api = {
    demo: true,
    async sesionActiva() { return yo ? { user: { id: yo.id } } : null; },
    async enviarEnlace() { },
    async entrarConClave() { },
    async crearClave() { },
    async entrarDemo(rol) { yo = rol === 'coach' ? coach : ana; },
    async salir() { yo = null; },
    alCambiarSesion() { },
    async yo() { return espera(yo); },
    async bloqueActivo(mid) { return espera(db.bloques.filter(b => b.miembro_id === mid && b.activo).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0] || null); },
    async sesionesSemana(bid, sem) { return espera(db.sesiones.filter(s => s.bloque_id === bid && s.semana === sem).sort((a, b) => a.dia - b.dia || a.orden - b.orden).map(conHijos)); },
    async sesion(id) { return espera(conHijos(db.sesiones.find(s => s.id === id))); },
    async guardarRegistro(sesion, datos) {
      let r = db.registros.find(x => x.sesion_id === sesion.id);
      if (r) Object.assign(r, datos); else { r = { id: uuid(), sesion_id: sesion.id, miembro_id: yo.id, created_at: new Date().toISOString(), ...datos }; db.registros.push(r); }
      return espera(r);
    },
    async borrarRegistro(sid) { db.registros = db.registros.filter(r => r.sesion_id !== sid); },
    async registros(mid) {
      return espera(db.registros.filter(r => r.miembro_id === mid).sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(r => ({ ...r, sesiones: db.sesiones.find(s => s.id === r.sesion_id) })));
    },
    async checkins(mid) { return espera(db.checkins.filter(c => c.miembro_id === mid).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
    async crearCheckin(d) { const c = { id: uuid(), miembro_id: yo.id, respuesta: null, created_at: new Date().toISOString(), ...d }; db.checkins.push(c); return espera(c); },
    async videos(mid) { return espera(db.videos.filter(v => v.miembro_id === mid).sort((a, b) => b.created_at.localeCompare(a.created_at))); },
    async subirVideo(archivo, ejercicio, nota) {
      const v = { id: uuid(), miembro_id: yo.id, ejercicio, nota, ruta: URL.createObjectURL(archivo), comentario: null, estado: 'pendiente', created_at: new Date().toISOString(), perfiles: { nombre: yo.nombre, correo: yo.correo } };
      db.videos.push(v); return espera(v);
    },
    async urlVideo(ruta) { return ruta; },
    async miembros() { return espera(db.perfiles.filter(p => p.rol === 'miembro')); },
    async miembro(id) { return espera(db.perfiles.find(p => p.id === id)); },
    async actualizarMiembro(id, c) { const m = db.perfiles.find(p => p.id === id); Object.assign(m, c); return espera(m); },
    async aplicaciones() { return espera([...db.aplicaciones].sort((a, b) => b.created_at.localeCompare(a.created_at))); },
    async marcarAplicacion(id, estado) { db.aplicaciones.find(a => a.id === id).estado = estado; },
    async borrarAplicaciones(ids) { db.aplicaciones = db.aplicaciones.filter(a => !ids.includes(a.id)); return espera(); },
    async invitaciones() { return espera(db.invitaciones); },
    async invitar(d) {
      const inv = { id: uuid(), usada: true, created_at: new Date().toISOString(), ...d };
      db.invitaciones.push(inv);
      db.perfiles.push({ id: uuid(), correo: d.correo, nombre: d.nombre, rol: 'miembro', plan: d.plan, estado: 'activo', objetivo: d.objetivo, created_at: new Date().toISOString() });
      return espera(inv);
    },
    async bloques(mid) { return espera(db.bloques.filter(b => b.miembro_id === mid)); },
    async crearBloque(d) {
      db.bloques.filter(b => b.miembro_id === d.miembro_id).forEach(b => b.activo = false);
      const b = { id: uuid(), activo: true, created_at: new Date().toISOString(), ...d }; db.bloques.push(b); return espera(b);
    },
    async guardarSesion(s) {
      const { items, registros, ...fila } = s;
      if (fila.id) { Object.assign(db.sesiones.find(x => x.id === fila.id), fila); return espera(fila); }
      const n = { id: uuid(), orden: 0, notas: '', ...fila }; db.sesiones.push(n); return espera(n);
    },
    async borrarSesion(id) { db.sesiones = db.sesiones.filter(s => s.id !== id); db.items = db.items.filter(i => i.sesion_id !== id); },
    async guardarItem(it) {
      if (it.id) { Object.assign(db.items.find(x => x.id === it.id), it); return espera(it); }
      const n = { id: uuid(), orden: 0, ...it }; db.items.push(n); return espera(n);
    },
    async borrarItem(id) { db.items = db.items.filter(i => i.id !== id); },
    async copiarSemana(b, desde, hacia) {
      db.sesiones.filter(s => s.bloque_id === b.id && s.semana === desde).forEach(s => {
        const n = { ...s, id: uuid(), semana: hacia }; db.sesiones.push(n);
        db.items.filter(i => i.sesion_id === s.id).forEach(i => db.items.push({ ...i, id: uuid(), sesion_id: n.id }));
      });
    },
    async responderCheckin(id, respuesta) { const c = db.checkins.find(x => x.id === id); c.respuesta = respuesta; return espera(c); },
    async videosPendientes() { return espera(db.videos.filter(v => v.estado === 'pendiente')); },
    async revisarVideo(id, comentario) { const v = db.videos.find(x => x.id === id); Object.assign(v, { comentario, estado: 'revisado' }); return espera(v); },
    async resumenMiembro(m) { return resumen(api, m); },
    async ajustesCobro() { return espera({ ...db.cobro }); },
    async guardarAjustesCobro(a) { db.cobro = { ...a, gracia: Number(a.gracia) }; return espera(); },
    async composicion(mid) { return espera(db.composicion.filter(c => c.miembro_id === mid).sort((a, b) => a.fecha.localeCompare(b.fecha))); },
    async guardarComposicion(c) { let x = c.id && db.composicion.find(y => y.id === c.id); if (x) Object.assign(x, c); else { x = { id: uuid(), created_at: new Date().toISOString(), ...c }; db.composicion.push(x); } return espera(x); },
    async borrarComposicion(id) { db.composicion = db.composicion.filter(c => c.id !== id); return espera(); },
    async cargas(mid) { return espera(db.cargas.filter(c => c.miembro_id === mid)); },
    async guardarCarga(c) { let x = c.item_id && db.cargas.find(y => y.item_id === c.item_id); if (x) Object.assign(x, c); else { x = { id: uuid(), created_at: new Date().toISOString(), ...c }; db.cargas.push(x); } return espera(x); },
    async borrarCargasDeItems(ids) { db.cargas = db.cargas.filter(c => !ids.includes(c.item_id)); return espera(); },
    async tests() { return espera(db.tests.filter(t => t.activo !== false).sort((a, b) => a.orden - b.orden)); },
    async guardarTest(t) { let x = t.id && db.tests.find(y => y.id === t.id); if (x) Object.assign(x, t); else { x = { id: uuid(), activo: true, orden: 99, ...t }; db.tests.push(x); } return espera(x); },
    async resultadosTest(mid) { return espera(db.resultados.filter(r => r.miembro_id === mid).sort((a, b) => a.fecha.localeCompare(b.fecha))); },
    async guardarResultadoTest(r) { let x = r.item_id && db.resultados.find(y => y.item_id === r.item_id); if (x) Object.assign(x, r); else { x = { id: uuid(), fecha: hoyISO(), created_at: new Date().toISOString(), ...r }; db.resultados.push(x); } return espera(x); },
    async borrarResultadoTest(id) { db.resultados = db.resultados.filter(r => r.id !== id); return espera(); },
    async anamnesis(mid) { return espera(db.anamnesis.find(a => a.miembro_id === mid) || null); },
    async anamnesisTodas() { return espera(db.anamnesis.map(a => ({ ...a }))); },
    async guardarAnamnesis(mid, c) { let a = db.anamnesis.find(x => x.miembro_id === mid); if (!a) { a = { miembro_id: mid, datos: {}, paso: 0, completada: false }; db.anamnesis.push(a); } Object.assign(a, c); return espera(a); },
    async actualizarAnamnesis(mid, c) { const a = db.anamnesis.find(x => x.miembro_id === mid); if (a) Object.assign(a, c); return espera(a); },
    async eliminarMiembro(id) { db.perfiles = db.perfiles.filter(p => p.id !== id); return espera(); },
    async pagos(mid) { return espera(db.pagos.filter(x => x.miembro_id === mid)); },
    async registrarPago(mid, { meses, monto, metodo, nota }) {
      const m = db.perfiles.find(x => x.id === mid); const hoy = hoyISO();
      const base = fechaLocal(m.pagado_hasta && m.pagado_hasta > hoy ? m.pagado_hasta : hoy); base.setMonth(base.getMonth() + Number(meses));
      m.pagado_hasta = isoLocal(base);
      db.pagos.unshift({ id: uuid(), miembro_id: mid, fecha: hoy, monto, meses, metodo, nota, cubre_hasta: m.pagado_hasta, created_at: new Date().toISOString() });
      return espera(m.pagado_hasta);
    }
  };
  return api;
}
