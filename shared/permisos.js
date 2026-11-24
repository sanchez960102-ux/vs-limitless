// Permisos por plan: única fuente de verdad, alineada con lo que promete la landing.
// La base de datos refuerza lo crítico (videos) con la función public.plan_permite().
export const ORDEN_PLANES = ['Base', 'Limitless', 'Élite'];

export const PERMISOS = {
  Base: {
    checkin: { cadaDias: 30, nombre: 'mensual' },
    tecnicaVideo: false,
    videollamada: false,
    ajustePlanSemanas: 4,
    whatsapp: false,
    cargas: true,
    composicion: true,
    tests: true
  },
  Limitless: {
    checkin: { cadaDias: 7, nombre: 'semanal' },
    tecnicaVideo: true,
    videollamada: false,
    ajustePlanSemanas: 2,
    whatsapp: 'lunes a viernes',
    cargas: true,
    composicion: true,
    tests: true
  },
  'Élite': {
    checkin: { cadaDias: 7, nombre: 'semanal' },
    tecnicaVideo: true,
    videollamada: { cadaDias: 14 },
    ajustePlanSemanas: 1,
    whatsapp: '7 días',
    cargas: true,
    composicion: true,
    tests: true
  }
};

export const permisos = plan => PERMISOS[plan] || PERMISOS.Base;
export const puede = (plan, funcion) => Boolean(permisos(plan)[funcion]);
// Plan más económico que incluye la función
export const planMinimo = funcion => ORDEN_PLANES.find(p => puede(p, funcion)) || 'Élite';

export const NOMBRES = { tecnicaVideo: 'Revisión de técnica por video', videollamada: 'Videollamada con Vic', whatsapp: 'Soporte por WhatsApp' };
