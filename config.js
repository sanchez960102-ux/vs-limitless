// Configuración de la landing. Solo valores públicos: la clave "anon" de Supabase
// está pensada para ir en el navegador; la tabla solo acepta inserciones.
window.VSL_CONFIG = {
  supabaseUrl: "",      // https://xxxx.supabase.co
  supabaseAnonKey: "",  // Project Settings → API → anon public
  correoAvisos: "",     // correo donde Vic recibe cada aplicación
  // Planes sin lugares: el botón cambia a lista de espera. Ej. ["Élite"]
  listaEspera: []
};
