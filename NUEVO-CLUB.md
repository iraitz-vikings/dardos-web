# Montar la web de otro club

Esta web (y su backend, `dardos-club-backend`) no llevan escrito a mano nada
de un club concreto. Todo lo propio del club está en unos pocos archivos,
así que la web de otro club es una copia de estos repos con esos archivos
cambiados.

## Qué es de cada club

### Frontend (este repo)

| Archivo | Qué contiene |
|---|---|
| `club.config.js` | Nombres, dominio, URL del backend, logos y favicons, iconos de la app instalada y de los avisos, contacto y dirección, redes, vídeo de portada, música de la galería, torneo por defecto de la portada, textos propios del club en cada idioma |
| `src/club.css` | Paleta de colores y foto de fondo |
| `public/mapa-club.webp` | Captura de Google Maps con el club marcado (footer) |
| `public/favicon.ico` | Favicon de reserva (el que piden los navegadores por su cuenta) |

A partir de `club.config.js`, `vite.config.js` genera en cada build (y al
vuelo en `npm run dev`): los metadatos de `index.html` (título, Open Graph,
favicons), `manifest.json`, `manifest-admin.json`, `robots.txt`,
`sitemap.xml` y `club-config.js` (la config que leen `service-worker.js` y
`push-token-db.js`, que no pasan por Vite). **No hay que crearlos a mano en
`public/`**: uno con el mismo nombre en `public/` chocaría con el generado.

Variable de entorno del build: `VITE_API_URL` (opcional; si no está, se usa
`apiUrl` de `club.config.js`).

### Backend

Todo por variables de entorno: ver `.env.example` y el README del backend.

## Pasos

1. **Copiar los repos** (`dardos-web` y `dardos-club-backend`) a repos
   nuevos del club. Para seguir recibiendo las mejoras de Vikings:
   ```
   git remote add upstream https://github.com/iraitz-vikings/dardos-web.git
   git fetch upstream && git merge upstream/main
   ```
   Al mezclar, los únicos conflictos esperables son los archivos de la tabla
   de arriba: se queda siempre la versión del club.
2. **Subir las imágenes del club** a su Cloudinary: escudo transparente,
   escudo cuadrado opaco (iconos), icono del admin, silueta monocroma para
   el icono pequeño de los avisos en Android, foto de fondo, insignia de
   torneo por defecto e imagen para redes.
3. **Rellenar `club.config.js`** (todos los campos llevan su explicación)
   y `src/club.css`. Cambiar `public/mapa-club.webp` y `public/favicon.ico`.
   En `club.config.js`, dejar `pushTokenDb` con un nombre propio del club.
4. **Backend**: base de datos nueva y variables de `.env.example` con valores
   nuevos (secretos, claves VAPID, bot de Telegram, Cloudinary, cuentas de
   las plataformas si juegan ligas externas).
5. **Desplegar** el backend, comprobar `https://<backend>/api/health`,
   y después la web (con `apiUrl` o `VITE_API_URL` apuntando al backend nuevo)
   y conectar el dominio.
6. **Poner en marcha** desde la web: entrar en `/admin` con `ADMIN_TOKEN`,
   registrar al primer socio con `CODIGO_INVITACION` y aprobarlo; dar de alta
   plataformas, fabricantes, máquinas, equipos, patrocinadores.
7. **Probar**: registro/login, activar avisos e instalar la app (Android e
   iOS), bot de Telegram, subida de fotos, un torneo de prueba con el
   marcador, y la vista previa del enlace al compartirlo por WhatsApp.
8. Dar de alta el dominio en Google Search Console con `/sitemap.xml`.

## Lo que todavía no es configurable

- **Idiomas**: la web está en castellano, euskera y francés (`src/i18n.jsx`,
  selector en `src/Nav.jsx`, y los avisos del backend). Quitar o añadir un
  idioma requiere tocar código.
- **Textos legales / RGPD**: los datos del titular (razón social, NIF,
  domicilio) van en `titular` de `club.config.js`, pero el texto del aviso
  legal y de la política de privacidad (`src/textosLegales.js`) y los avisos
  de cookies y servicios externos (`src/i18n.jsx`) hay que revisarlos por si
  el club nuevo usa otros proveedores.
- **Tonos derivados de la paleta**: `src/styles.css` tiene algunos colores
  semitransparentes escritos a mano a partir de la paleta de Vikings (busca
  `#0e0f13` y `#9a2b28`). Si la paleta nueva es muy distinta, conviene
  repasarlos.
- **Zona horaria**: los recordatorios del backend usan `Europe/Madrid`.
- Algunos identificadores internos del código se siguen llamando "vikings"
  (el componente `VikingsCounter`, clases CSS `vikingscounter-*`, la pestaña
  interna `"vikings"` de Competiciones). No se ven en la web: lo que se
  muestra sale de `club.config.js`.
