// Capa de datos de la app VS Limitless.
// Misma API sobre Supabase (producción) o sobre datos de demostración en memoria.

const SUPABASE_JS = 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const PLANES = ['Base', 'Limitless', 'Élite'];
export const TIPOS = ['fuerza', 'carrera', 'bici', 'movilidad', 'mixta'];

export function hoyISO() { return new Date().toISOString().slice(0, 10); }
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
export function puedeVideos(plan) { return plan === 'Limitless' || plan === 'Élite'; }
export function checkinCada(plan) { return plan === 'Base' ? 30 : 7; }

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
    alCambiarSesion(fn) { sb.auth.onAuthStateChange((_e, s) => fn(s)); },
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
    async resumenMiembro(m) { return resumen(api, m); }
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
  const ana = { id: 'ana', correo: 'ana@ejemplo.com', nombre: 'Ana López', rol: 'miembro', plan: 'Limitless', estado: 'activo', objetivo: 'Correr mis primeros 10K en abril', created_at: hace(20) };
  const luis = { id: 'luis', correo: 'luis@ejemplo.com', nombre: 'Luis Méndez', rol: 'miembro', plan: 'Base', estado: 'activo', objetivo: 'Ganar músculo', created_at: hace(12) };
  const db = {
    perfiles: [coach, ana, luis],
    bloques: [{ id: 'b1', miembro_id: 'ana', nombre: 'Bloque 1 · Base aeróbica + fuerza', fecha_inicio: iso(iniBloque), semanas: 4, notas: 'Construir base sin lesionarse.', activo: true, created_at: hace(14) }],
    sesiones: [], items: [], registros: [], checkins: [], videos: [], invitaciones: [],
    aplicaciones: [
      { id: 'a1', created_at: hace(1), nombre: 'María Fernández', correo: 'maria@ejemplo.com', whatsapp: '+502 5555 1234', ciudad: 'Guatemala', edad: 32, objetivo: 'Running o resistencia', meta: 'Medio maratón en junio', nivel: 'Entreno a veces, sin plan', dias: 4, lugar: 'Gimnasio, Aire libre', lesiones: 'ninguna', por_que_ahora: 'Me inscribí al medio maratón y no quiero improvisar.', ultima_vez: 'Dejé de correr cuando cambié de trabajo y perdí la rutina.', semana_mala: 'Haría lo mínimo y te escribiría para ajustar.', compromiso: 9, plan: 'Limitless', acepta_compromiso: true, estado: 'nueva' },
      { id: 'a2', created_at: hace(3), nombre: 'Jorge Pérez', correo: 'jorge@ejemplo.com', whatsapp: '+502 5555 9876', ciudad: 'Mixco', edad: 27, objetivo: 'Objetivo estético: músculo o grasa', meta: 'Bajar 6 kg', nivel: 'No entreno', dias: 3, lugar: 'Casa', lesiones: 'Dolor de rodilla leve', por_que_ahora: 'Me vi en fotos y quiero cambiar.', ultima_vez: 'Me aburrí a las dos semanas.', semana_mala: 'No sé, probablemente lo dejaría.', compromiso: 5, plan: 'Base', acepta_compromiso: true, estado: 'nueva' }
    ]
  };
  const plantilla = [
    { dia: 1, titulo: 'Fuerza tren inferior', tipo: 'fuerza', items: [['Sentadilla goblet', '4', '8', '20 kg', '', '90 s'], ['Peso muerto rumano', '3', '10', '2×14 kg', '', '90 s'], ['Zancada inversa', '3', '8 c/lado', 'Corporal', '', '60 s'], ['Plancha', '3', '40 s', '', '', '45 s']] },
    { dia: 2, titulo: 'Rodaje suave Z2', tipo: 'carrera', items: [['Carrera continua', '1', '35 min', '', '6:40–7:00 /km', ''], ['Strides', '4', '20 s', '', 'Rápido y suelto', '60 s']] },
    { dia: 4, titulo: 'Fuerza tren superior + core', tipo: 'fuerza', items: [['Press de banca mancuerna', '4', '8', '2×12 kg', '', '90 s'], ['Remo con mancuerna', '4', '10', '16 kg', '', '60 s'], ['Press militar', '3', '10', '2×8 kg', '', '60 s'], ['Dead bug', '3', '10 c/lado', '', '', '45 s']] },
    { dia: 6, titulo: 'Fondo largo', tipo: 'carrera', items: [['Carrera continua', '1', '50 min', '', '6:50–7:10 /km', ''], ['Movilidad de cadera', '1', '8 min', '', '', '']] }
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
  db.sesiones.filter(s => s.semana < 3).forEach((s, k) => { if (k !== 3) db.registros.push({ id: uuid(), sesion_id: s.id, miembro_id: 'ana', completada: true, rpe: 6 + (k % 3), nota: '', resultados: {}, created_at: hace(14 - k * 2) }); });
  const s3 = db.sesiones.find(s => s.semana === 3 && s.dia === 1);
  if (s3) db.registros.push({ id: uuid(), sesion_id: s3.id, miembro_id: 'ana', completada: true, rpe: 7, nota: 'La sentadilla se sintió pesada.', resultados: {}, created_at: hace(1) });
  db.checkins.push({ id: uuid(), miembro_id: 'ana', peso: 64.2, sueno: 4, energia: 4, sesiones_cumplidas: 4, comentario: 'Buena semana, el fondo largo me costó.', respuesta: 'Excelente. Bajamos 5 min el fondo esta semana y mantenemos ritmo.', created_at: hace(8) });
  db.checkins.push({ id: uuid(), miembro_id: 'ana', peso: 63.8, sueno: 3, energia: 3, sesiones_cumplidas: 3, comentario: 'Dormí poco por trabajo.', respuesta: null, created_at: hace(1) });
  db.videos.push({ id: uuid(), miembro_id: 'ana', ejercicio: 'Sentadilla goblet', ruta: '', nota: 'Siento que se me van las rodillas hacia adentro.', comentario: null, estado: 'pendiente', created_at: hace(1), perfiles: { nombre: 'Ana López', correo: 'ana@ejemplo.com' } });

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
    async resumenMiembro(m) { return resumen(api, m); }
  };
  return api;
}
