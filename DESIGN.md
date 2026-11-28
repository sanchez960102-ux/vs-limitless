---
version: alpha
name: VS-Limitless
description: Coaching híbrido de fuerza y resistencia con estética de editorial deportiva de lujo. Lienzo casi negro, tipografía condensada en mayúsculas, un solo rojo de competencia para la acción y la urgencia, esquinas rectas en la landing y vidrio líquido en la app. Referencias, sin copiar ninguna: Ferrari por el negro cálido con un solo rojo y el botón recto en mayúsculas, Nike por el titular gigante sobre fotografía de atleta, Apple por el ritmo de secciones, el aire y la sombra única sobre el producto.

colors:
  rojo: "#E10600"
  rojo-texto: "#FF3B30"
  fondo: "#0B0B0B"
  fondo-2: "#111111"
  superficie: "#161616"
  linea: "#262626"
  linea-suave: "#1E1E1E"
  tinta: "#F2EFEA"
  tinta-suave: "#C9C6C1"
  tinta-tenue: "#8F8C88"
  exito: "#3FB950"
  aviso: "#E3B341"

typography:
  display-hero:
    fontFamily: "Anton, Bebas Neue, Impact, sans-serif"
    fontSize: clamp(48px, 8.4vw, 128px)
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: 0.005em
    textTransform: uppercase
  display-l:
    fontFamily: "Anton, Bebas Neue, Impact, sans-serif"
    fontSize: clamp(36px, 4.6vw, 64px)
    fontWeight: 400
    lineHeight: 1
    textTransform: uppercase
  display-m:
    fontFamily: "Anton, Bebas Neue, Impact, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.05
    textTransform: uppercase
  cifra:
    fontFamily: "Anton, Bebas Neue, Impact, sans-serif"
    fontSize: clamp(52px, 5.6vw, 84px)
    fontWeight: 400
    lineHeight: 1
  lead:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: clamp(17px, 1.6vw, 20px)
    fontWeight: 300
    lineHeight: 1.6
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  eyebrow:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    letterSpacing: 0.22em
    textTransform: uppercase
  boton:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    letterSpacing: 0.16em
    textTransform: uppercase

rounded:
  landing: 2px
  landing-md: 4px
  app-tarjeta: 22px
  app-pastilla: 9999px

spacing:
  base: 8px
  seccion: 136px
  seccion-movil: 96px
  boton: 20px 30px

components:
  boton-primario:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.fondo}"
    typography: "{typography.boton}"
    rounded: "{rounded.landing}"
    padding: "{spacing.boton}"
  boton-promo:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.tinta}"
    typography: "{typography.boton}"
    rounded: "{rounded.landing}"
  boton-linea:
    backgroundColor: transparent
    textColor: "{colors.tinta}"
    borderColor: "{colors.linea}"
    typography: "{typography.boton}"
    rounded: "{rounded.landing}"
  nav-vidrio:
    backgroundColor: "rgba(11,11,11,.86)"
    backdropFilter: blur(14px)
  tarjeta-plan-recomendado:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.fondo}"
  barra-promo:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.tinta}"
---

## Personalidad

VS Limitless se ve como una revista deportiva cara, no como un gimnasio. El negro no es vacío, es el escenario. Lo que tiene que brillar es el atleta, los datos y la acción, nunca la decoración.

**Rasgos que no se negocian:**
- Lienzo casi negro (`{colors.fondo}`), nunca negro puro. El blanco es un hueso cálido (`{colors.tinta}`), nunca blanco de pantalla.
- Un solo rojo (`{colors.rojo}`). Se usa para acción urgente, promociones, el punto de la marca y alertas. Nunca de relleno.
- Titulares en Anton, mayúsculas, grandes y apretados. El segundo renglón del hero se apaga en gris para que el primero pegue más.
- Botones rectos con etiqueta en mayúsculas espaciadas en la landing. En la app, pastillas y vidrio líquido, porque ahí se toca con el pulgar.
- Las secciones van numeradas (01, 02…) como capítulos de una revista.

## Color

- **Tinta** para todo lo que se lee. **Tinta suave** para párrafos secundarios. **Tinta tenue** para etiquetas y notas.
- **Rojo** solo cuando algo requiere acción ahora: promoción, pago vencido, el botón de aplicar en la promoción. Si todo es rojo, nada es urgente.
- La única excepción: el remate de un titular sobre fotografía, una vez por página, como "El plan es mío."
- **Rojo texto** (`#FF3B30`) es la variante legible para texto rojo sobre negro.
- Verde y ámbar existen solo como estados en la app y el panel: al día, por vencer.
- Sin degradados decorativos en la landing. La profundidad viene de la fotografía y del cambio de superficie (`fondo` → `fondo-2` → `superficie`).

## Tipografía

- **Display:** Anton, peso 400, siempre en mayúsculas, interlineado cerrado (0.94 a 1.05).
- **Texto:** Inter. Párrafos a 17px y peso 400, que es lo que se lee bien sobre negro. El peso 300 queda solo para el lead y citas grandes, donde se siente aire.
- **Cifras grandes:** Anton. Los números son protagonistas: precios, marcas, distancias, zonas.
- Nunca texto de cuerpo en Anton. Nunca titulares en Inter.

## Ritmo y espacio

- Base de 8px. Secciones de 136px de alto vertical en escritorio y 96px en móvil.
- Una idea por sección. El aire es parte del precio: una página apretada se ve barata.
- Las secciones se separan por cambio de superficie o por una línea de 1px, nunca por adornos.
- Texto de lectura con ancho máximo cercano a 60 caracteres.

## Profundidad

- La landing es plana. La única sombra fuerte del sistema va bajo los teléfonos que muestran la app, que son el producto.
- La barra superior se vuelve vidrio oscuro al hacer scroll.
- La app usa vidrio líquido: superficies translúcidas con desenfoque y un borde de luz de 1px.

## Fotografía

- Gradación de rojo selectivo: todo en blanco y negro salvo los rojos y naranjas, que se quedan a color. El jersey rojo hace de color de marca.
- Las fotos de carrera se recortan sin el banner de patrocinadores y llevan el crédito del fotógrafo.
- El atleta real, entrenando, en blanco y negro o con color bajo. Sudor, esfuerzo y concentración. Nada de poses de catálogo.
- El titular puede ir encima de la foto, como Nike. La foto ocupa el ancho completo.
- Nunca fotos de banco de imágenes con modelos. La credibilidad es la marca.

## Componentes

- **Botón primario:** hueso sobre negro. Al pasar el mouse se invierte. Al tocar, se encoge un poco (scale 0.97).
- **Botón de línea:** borde gris de 1px. Es la segunda acción, nunca la primera.
- **Tarjeta del plan recomendado:** invertida en hueso para que sea la única clara del bloque.
- **Barra de promoción:** rojo completo, mayúsculas, cuenta regresiva. Solo existe mientras hay una promoción activa.
- **Formulario:** campos con solo línea inferior, sin cajas. Etiquetas claras arriba.

## Sí

- Un solo llamado principal por pantalla.
- Datos concretos en lugar de adjetivos: "Q225 tu primer mes", "5K–42K".
- Mayúsculas espaciadas en etiquetas pequeñas y botones.
- Mantener el número de sección en cada bloque nuevo.

## No

- No agregar un segundo color de marca.
- No redondear los botones de la landing.
- No usar sombras en tarjetas ni en texto.
- No llenar de íconos. Si hace falta un ícono para entender algo, el texto está mal.
- No usar emojis en la landing.
- No poner el rojo en algo que no pide acción.

## Responsive

- Escritorio: contenido hasta 1240px, titulares al tamaño máximo del clamp.
- Menos de 900px: el hero apila texto y botones; el sello de promoción entra dentro del hero.
- Menos de 640px: botones a ancho completo, barra fija inferior con la acción principal, barra de promoción en una sola línea.
- Toques mínimos de 44px.
