# microtools.lat — sitio raíz

Índice del portafolio. Es un sitio independiente del de cada herramienta: su
propio repositorio, su propio sitio en Netlify y su propio `js/config.js`.

Cada herramienta vive en un subdominio (`qr.microtools.lat`, y las siguientes)
y se despliega por separado. Este sitio solo las presenta y enlaza.

## Poner en marcha

En Windows, doble clic en **`ver-sitio.bat`**. Desde la terminal:

```bash
node servidor.mjs --abrir  # sirve el sitio en :4174 y abre el navegador
node build/generar.mjs     # regenera HTML, sitemap, robots, ads.txt y netlify.toml
```

El puerto es 4174 y no 4173 para poder tener los dos sitios levantados a la vez.

**No abras `index.html` con doble clic:** las rutas son absolutas y el navegador
bloquea los módulos ES sobre `file://`.

## Por qué este sitio tiene que existir

Dos razones, y ninguna es estética:

- **AdSense.** Un dominio raíz que redirige a un subdominio, o que solo enlaza,
  es motivo de rechazo: la revisión pide contenido propio. De ahí las 900+
  palabras del índice, que el build cuenta y avisa si bajan de 500.
- **`ads.txt`.** Google lo busca en el **dominio raíz**, y mientras el ID de
  editor sea el mismo en todos los subdominios, el archivo de la raíz los cubre.
  Solo haría falta un `ads.txt` propio por subdominio —declarado en el de la
  raíz con `subdomain=`— si alguno vendiera con otro ID. Si no existe aquí,
  AdSense marca «ads.txt no encontrado» aunque los subdominios funcionen.

## Los valores de producción

En `js/config.js`:

| Campo | Qué es | De dónde sale |
| --- | --- | --- |
| `dominio` | `https://microtools.lat`, sin barra final | ya puesto |
| `marca` | nombre en cabecera, pie y textos | ya puesto |
| `adsense.cliente` | `ca-pub-...` | AdSense → Cuenta |
| `adsense.bloques.*` | ID de cada bloque (top, mid, bottom) | AdSense → Anuncios |
| `analitica.ga4` | `G-...` | Google Analytics 4 |

`adsense.cliente` alimenta dos cosas: el script de anuncios y la línea de
`ads.txt`. Después de rellenarlo hay que volver a ejecutar
`node build/generar.mjs`.

Mientras esté vacío, los huecos de anuncio se retiran solos del DOM y `ads.txt`
sale como comentario.

## Desplegar en Netlify

Sitio **nuevo**, distinto del de la herramienta:

1. Sube esta carpeta a su propio repositorio.
2. Netlify: *Add new site → Import an existing project*.
3. Build command: `node build/generar.mjs` · Publish directory: `.`
4. *Domain management* → añade `microtools.lat` y `www.microtools.lat`.
5. En el DNS, apunta el subdominio de cada herramienta a su propio sitio de
   Netlify con un CNAME.

## Estructura

```
index.html              índice del portafolio      (generado)
legal/                  aviso legal, privacidad, cookies (generadas)
ads.txt                 línea DIRECT de AdSense    (generado)
sitemap.xml robots.txt manifest.webmanifest favicon.svg netlify.toml (generados)

data/sitio.json         herramientas, secciones y preguntas  ← se edita aquí
build/generar.mjs       expande el JSON al sitio
css/home.css            sistema visual (mismos tokens que las herramientas)
js/config.js            los valores de producción
js/home.js             marca, analítica y anuncios
js/ads.js              carga diferida de los bloques de anuncio
```

## Añadir una herramienta al índice

Una entrada más en `herramientas`, dentro de `data/sitio.json`:

```json
{
  "nombre": "...",
  "url": "https://algo.microtools.lat/",
  "estado": "disponible",
  "resumen": "...",
  "puntos": ["...", "..."],
  "icono": "qr"
}
```

Con `"estado": "en preparación"` (o `url` vacía) la tarjeta se pinta apagada y
sin enlace, en lugar de dejar un enlace roto. Los iconos disponibles están en
`ICONOS`, dentro de `build/generar.mjs`: son SVG dibujados a mano, no glifos de
una fuente, para que hereden el color del tema y se vean igual en todas las
plataformas.
