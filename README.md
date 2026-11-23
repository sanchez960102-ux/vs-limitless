# VS Limitless · Landing

Sitio estático (HTML, CSS y JS sin dependencias) para captar aplicaciones al Equipo Limitless.

- `index.html`: la página
- `styles.css`: estilos con los tokens del sistema de diseño VS Limitless
- `app.js`: validación y envío del formulario
- `config.js`: URL y clave pública de Supabase, y correo de avisos
- `supabase/schema.sql`: tabla `aplicaciones` con seguridad por filas (el público solo inserta)

Cada aplicación se guarda en Supabase y llega por correo vía FormSubmit. La primera vez, FormSubmit manda un correo de activación que hay que confirmar.

Despliegue: Vercel, importando este repositorio sin configuración adicional.
