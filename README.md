# VS Limitless · Landing

Sitio estático (HTML, CSS y JS sin dependencias) para captar aplicaciones al Equipo Limitless.

- `index.html`: la página
- `styles.css`: estilos con los tokens del sistema de diseño VS Limitless
- `app.js`: validación y envío del formulario
- `config.js`: URL y clave pública de Supabase, y correo de avisos
- `supabase/schema.sql`: tabla `aplicaciones` con seguridad por filas (el público solo inserta)

Cada aplicación se guarda en Supabase y llega por correo vía FormSubmit. La primera vez, FormSubmit manda un correo de activación que hay que confirmar.

Despliegue: Vercel, importando este repositorio sin configuración adicional.

## App de miembros

- `/app/` — app del miembro (instalable en el celular): plan de la semana, registro de sesiones, check-in, videos de técnica y progreso.
- `/coach/` — panel del coach: miembros con alertas, aplicaciones → invitación, editor de plan por semana, respuestas a check-ins y revisión de videos.
- `/app/?demo` y `/coach/?demo` — modo demostración con datos de ejemplo (también se activa solo mientras Supabase no esté configurado).

Para activarla con datos reales:
1. En Supabase → SQL Editor, ejecutar `supabase/schema.sql` y después `supabase/app.sql`.
2. En Authentication → URL Configuration: Site URL `https://vs-limitless.vercel.app` y en Redirect URLs agregar `https://vs-limitless.vercel.app/**`.
3. Poner la Project URL y la clave anon en `config.js`.
4. Entrar a `/coach/` con el correo del coach (definido en `supabase/app.sql`).
