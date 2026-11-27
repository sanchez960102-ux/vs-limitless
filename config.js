// Configuración de la landing. Solo valores públicos: la clave "anon" de Supabase
// está pensada para ir en el navegador; la tabla solo acepta inserciones.
window.VSL_CONFIG = {
  supabaseUrl: "https://hdexemursvsjtiuedhmv.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZXhlbXVyc3ZzanRpdWVkaG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NzI0MjEsImV4cCI6MjExMTA0ODQyMX0.hg9ZWu_DDjtg24jvvtIfiOQLV6qjw00TglvsKw3mMAs",
  correoAvisos: "laf.victor.sanchez@gmail.com", // correo donde Vic recibe cada aplicación
  // Planes sin lugares: el botón cambia a lista de espera. Ej. ["Élite"]
  listaEspera: [],
  // WhatsApp público para regalos. Vacío: los regalos se piden con el formulario.
  whatsappPublico: "",
  // Calendario de promociones. Cada una se enciende y se apaga sola en sus fechas.
  // tipo: "descuento" (−% el primer mes), "regalo", "cupo" (grupo cerrado) o "valor" (algo extra, mismo precio).
  // Los lugares restantes se controlan desde el panel del coach. Regla: máximo 4 promociones de precio al año.
  promos: [
    { id: "black_friday_25", nombre: "Black Friday", tipo: "descuento", descuento: 25, lugares: 5, claveLugares: "promo_bf_lugares",
      inicio: "2026-11-23T00:00:00-06:00", termina: "2026-11-30T23:59:59-06:00" },
    { id: "regalo_navidad", nombre: "Regala entrenamiento", tipo: "regalo",
      inicio: "2026-12-01T00:00:00-06:00", termina: "2026-12-24T23:59:59-06:00",
      titulo: "Este año regala algo que sí se usa",
      texto: "1 o 3 meses de coach, plan personalizado y app para quien tú quieras. Se activa cuando esa persona esté lista para arrancar.",
      barra: "Regala 1 o 3 meses de entrenamiento", cta: "Regalar entrenamiento" },
    { id: "generacion_enero", nombre: "Generación Enero", tipo: "cupo", lugares: 10,
      inicio: "2026-12-26T00:00:00-06:00", termina: "2027-01-17T23:59:59-06:00",
      titulo: "Generación Enero · grupo cerrado de 10",
      texto: "Arrancas con test de umbral y anamnesis guiada por mí en tu primera semana. Cuando se llenan los 10, se cierra.",
      barra: "Grupo cerrado", cta: "Quiero mi lugar" },
    { id: "pareja_20", nombre: "Entrena en pareja", tipo: "descuento", descuento: 20,
      inicio: "2027-02-01T00:00:00-06:00", termina: "2027-02-15T23:59:59-06:00",
      texto: "Aplican los dos y cada uno tiene −20% en su primer mes. Pareja, amigo, hermano: tú decides.",
      campo: "¿Con quién entrenas? Nombre y WhatsApp de tu pareja de entrenamiento" },
    { id: "regalo_mama", nombre: "Día de la Madre", tipo: "regalo",
      inicio: "2027-04-26T00:00:00-06:00", termina: "2027-05-10T23:59:59-06:00",
      titulo: "Regálale a mamá un coach",
      texto: "Plan personalizado y seguimiento real, con entrenamiento especializado para embarazo y adultos mayores. 1 o 3 meses.",
      barra: "Regálale entrenamiento a mamá", cta: "Regalar a mamá" },
    { id: "regalo_papa", nombre: "Día del Padre", tipo: "regalo",
      inicio: "2027-06-07T00:00:00-06:00", termina: "2027-06-17T23:59:59-06:00",
      titulo: "Ya es hora de que papá corra su primer 10K",
      texto: "Regálale 1 o 3 meses de coach, plan y app. Yo me encargo de que llegue a la meta.",
      barra: "Regálale entrenamiento a papá", cta: "Regalar a papá" },
    { id: "bono14", nombre: "Bono 14", tipo: "valor", lugares: 10, mesesExtra: 1,
      inicio: "2027-07-01T00:00:00-06:00", termina: "2027-07-15T23:59:59-06:00",
      titulo: "Invierte tu Bono 14 en ti",
      texto: "Paga 3 meses y entrena 4, en cualquier plan. El cuarto mes va por mi cuenta.",
      barra: "Paga 3 meses, entrena 4", cta: "Invertir mi Bono 14" },
    { id: "preparacion_carrera", nombre: "Preparación de carrera", tipo: "valor",
      inicio: "2027-08-02T00:00:00-06:00", termina: "2027-08-22T23:59:59-06:00",
      titulo: "Llega a tu carrera con un plan, no con esperanza",
      texto: "Plan hacia tu evento con fecha y test de 30 minutos al inicio y al final, para que veas en números lo que ganaste.",
      barra: "Plan hacia tu evento", cta: "Preparar mi carrera",
      campo: "¿Qué carrera vas a correr y cuándo?" },
    { id: "patrio_15", nombre: "15 de septiembre", tipo: "descuento", descuento: 15, lugares: 15,
      inicio: "2027-09-01T00:00:00-06:00", termina: "2027-09-15T23:59:59-06:00" },
    { id: "black_friday_2027", nombre: "Black Friday", tipo: "descuento", descuento: 25, lugares: 5,
      inicio: "2027-11-22T00:00:00-06:00", termina: "2027-11-29T23:59:59-06:00",
      vipDesde: "2027-11-20T00:00:00-06:00" }
  ],
  precios: { Base: 300, Limitless: 450, "Élite": 950 }
};
