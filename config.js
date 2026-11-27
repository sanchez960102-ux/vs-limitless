// Configuración de la landing. Solo valores públicos: la clave "anon" de Supabase
// está pensada para ir en el navegador; la tabla solo acepta inserciones.
window.VSL_CONFIG = {
  supabaseUrl: "https://hdexemursvsjtiuedhmv.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZXhlbXVyc3ZzanRpdWVkaG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NzI0MjEsImV4cCI6MjExMTA0ODQyMX0.hg9ZWu_DDjtg24jvvtIfiOQLV6qjw00TglvsKw3mMAs",
  correoAvisos: "laf.victor.sanchez@gmail.com", // correo donde Vic recibe cada aplicación
  // Planes sin lugares: el botón cambia a lista de espera. Ej. ["Élite"]
  listaEspera: [],
  // Promoción vigente. Se apaga sola al pasar "termina". Los lugares restantes se controlan desde el panel del coach.
  promo: {
    id: "black_friday_25",
    nombre: "Black Friday",
    descuento: 25,
    termina: "2026-11-30T23:59:59-06:00",
    lugaresTotales: 5,
    precios: { Base: 300, Limitless: 450, "Élite": 950 }
  }
};
