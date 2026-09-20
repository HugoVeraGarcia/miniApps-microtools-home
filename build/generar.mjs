#!/usr/bin/env node
/* generar.mjs — Expande data/sitio.json al sitio raiz de microtools.lat.
 *
 * Salida: index.html, las tres paginas legales, sitemap.xml, robots.txt,
 * ads.txt, favicon.svg, manifest.webmanifest y netlify.toml.
 *
 * El dominio, la marca y el ID de editor se leen de js/config.js, que es el
 * unico archivo que se toca al publicar.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datos = JSON.parse(readFileSync(join(RAIZ, 'data', 'sitio.json'), 'utf8'));

const configJs = readFileSync(join(RAIZ, 'js', 'config.js'), 'utf8');
const leerConfig = (clave) => (configJs.match(new RegExp(`${clave}:\\s*'([^']*)'`)) || [])[1] || '';
const DOMINIO = leerConfig('dominio').replace(/\/$/, '');
const MARCA = leerConfig('marca') || datos.sitio.autor;
const CLIENTE = leerConfig('cliente');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = (ruta) => (DOMINIO ? DOMINIO + ruta : ruta);
const avisos = [];

/* ---------- iconos ---------- */

/* Dibujados a mano, no tipografia: un glifo de una fuente del sistema se ve
   distinto en cada plataforma y no hereda el color del tema. */
const ICONOS = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.2"/>'
    + '<rect x="14" y="3" width="7" height="7" rx="1.2"/>'
    + '<rect x="3" y="14" width="7" height="7" rx="1.2"/>'
    + '<path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h0M21 14h0"/>',

  calculadora: '<rect x="4" y="2.5" width="16" height="19" rx="2"/>'
    + '<path d="M8 6.5h8M8 11h0M12 11h0M16 11h0M8 14.5h0M12 14.5h0M16 14.5h0'
    + 'M8 18h0M12 18h0M16 18h0"/>',

  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

function icono(nombre, tam = 22) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none"`
    + ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round"'
    + ` stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONOS[nombre]}</svg>`;
}

/* ---------- piezas comunes ---------- */

const NAV = [
  ['/', 'Inicio'],
  ['https://qr.microtools.lat/', 'Generador de QR'],
];

function cabecera(rutaActual) {
  const enlaces = NAV.map(([r, t]) => {
    const externo = r.startsWith('http');
    const actual = !externo && r === rutaActual ? ' aria-current="page"' : '';
    return `<a href="${r}"${actual}${externo ? ' rel="noopener"' : ''}>${esc(t)}</a>`;
  }).join('\n    ');

  return `<header class="cabecera"><div class="contenedor cabecera__fila">
  <a class="logo" href="/"><span data-marca>${esc(MARCA)}</span></a>
  <nav class="nav" aria-label="Principal">
    ${enlaces}
  </nav>
</div></header>`;
}

function pie() {
  return `<footer class="pie"><div class="contenedor">
  <div class="pie__enlaces">
    ${datos.legales.map((l) => `<a href="${l.ruta}">${esc(l.titulo)}</a>`).join('\n    ')}
  </div>
  <p>Todas las herramientas se ejecutan en tu navegador. Nada de lo que escribes se env&iacute;a a ning&uacute;n servidor.</p>
  <p>&copy; ${new Date().getFullYear()} <span data-marca>${esc(MARCA)}</span> &middot; ${esc(datos.sitio.pais)}</p>
</div></footer>`;
}

function huecoAnuncio(clave) {
  return `<div class="ad-slot ad-slot--${clave}" data-slot="${clave}"></div>`;
}

/* ---------- datos estructurados ---------- */

function datosEstructurados() {
  const bloques = [];

  bloques.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: MARCA,
    url: abs('/'),
    inLanguage: datos.sitio.idioma,
    description: datos.sitio.metaDescripcion,
  });

  const disponibles = datos.herramientas.filter((h) => h.estado === 'disponible' && h.url);
  if (disponibles.length) {
    bloques.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Herramientas de ' + MARCA,
      itemListElement: disponibles.map((h, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: h.url,
        name: h.nombre,
      })),
    });
  }

  if (datos.faq?.length) {
    bloques.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: datos.faq.map(([p, r]) => ({
        '@type': 'Question',
        name: p,
        acceptedAnswer: { '@type': 'Answer', text: r },
      })),
    });
  }

  return bloques
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join('\n');
}

/* ---------- indice ---------- */

function tarjeta(h) {
  const disponible = h.estado === 'disponible' && Boolean(h.url);
  const titulo = disponible
    ? `<a href="${h.url}" data-herramienta="${esc(h.nombre)}">${esc(h.nombre)}</a>`
    : esc(h.nombre);

  const pie = disponible
    ? `<a class="boton" href="${h.url}" data-herramienta="${esc(h.nombre)}">`
      + `Abrir la herramienta ${icono('flecha', 18)}</a>`
    : '<p class="nota-pendiente">A&uacute;n no est&aacute; publicada. Esta p&aacute;gina la anunciar&aacute; cuando lo est&eacute;.</p>';

  return `  <li class="tarjeta tarjeta--${disponible ? 'disponible' : 'pendiente'}">
    <div class="tarjeta__alto">
      <span class="tarjeta__icono">${icono(h.icono)}</span>
      <div>
        <h3 class="tarjeta__titulo">${titulo}</h3>
        ${disponible ? '' : '<span class="etiqueta">En preparaci&oacute;n</span>'}
      </div>
    </div>
    <p class="tarjeta__resumen">${esc(h.resumen)}</p>
    <ul class="tarjeta__puntos">
      ${h.puntos.map((p) => `<li>${esc(p)}</li>`).join('\n      ')}
    </ul>
    <div class="tarjeta__pie">${pie}</div>
  </li>`;
}

function paginaIndice() {
  const s = datos.sitio;

  return `<!doctype html>
<html lang="${s.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.metaTitulo)}</title>
<meta name="description" content="${esc(s.metaDescripcion)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
${DOMINIO ? `<link rel="canonical" href="${abs('/')}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(s.metaTitulo)}">
<meta property="og:description" content="${esc(s.metaDescripcion)}">
<meta property="og:locale" content="es_PE">
<meta property="og:site_name" content="${esc(MARCA)}">
${DOMINIO ? `<meta property="og:url" content="${abs('/')}">` : ''}
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin>
<link rel="stylesheet" href="/css/home.css">
${datosEstructurados()}
</head>
<body>
<a class="salto-contenido" href="#contenido">Ir al contenido</a>
${cabecera('/')}
<main id="contenido">
<div class="contenedor">

  <div class="entrada">
    <h1>${esc(s.h1)}</h1>
    ${s.entrada.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
  </div>

  ${huecoAnuncio('top')}

  <h2 class="titulo-seccion" id="herramientas">Las herramientas</h2>
  <ul class="herramientas">
${datos.herramientas.map(tarjeta).join('\n')}
  </ul>

  ${huecoAnuncio('mid')}

  <div class="articulo">
${datos.secciones.map((sec) => `    <h2>${esc(sec.h2)}</h2>\n`
    + sec.parrafos.map((p) => `    <p>${esc(p)}</p>`).join('\n')).join('\n')}
  </div>

  <section class="faq" aria-labelledby="preguntas">
    <h2 id="preguntas">Preguntas frecuentes</h2>
${datos.faq.map(([p, r]) => `    <details class="faq__item">
      <summary>${esc(p)}</summary>
      <p>${esc(r)}</p>
    </details>`).join('\n')}
  </section>

  ${huecoAnuncio('bottom')}

</div>
</main>
${pie()}
<script type="module">
  import { init } from '/js/home.js';
  init();
</script>
</body>
</html>
`;
}

/* ---------- paginas legales ---------- */

const TEXTOS_LEGALES = {
  'Aviso legal': `
<h2>Titular del sitio</h2>
<p>El titular de este sitio web y de los subdominios de <span data-marca></span> es una persona natural domiciliada en Lima, Per&uacute;.</p>
<p data-correo-bloque>Para cualquier comunicaci&oacute;n: <a data-correo href="#"></a>.</p>
<h2>Objeto</h2>
<p>Este dominio agrupa un conjunto de herramientas web gratuitas. Cada herramienta reside en su propio subdominio y se ejecuta &iacute;ntegramente en el navegador del usuario: no requiere registro y no env&iacute;a a ning&uacute;n servidor el contenido que el usuario introduce.</p>
<h2>Uso de los resultados</h2>
<p>Las im&aacute;genes, archivos y c&aacute;lculos generados con estas herramientas pertenecen a quien los crea. Pueden usarse con fines personales o comerciales, sin atribuci&oacute;n y sin l&iacute;mite de cantidad.</p>
<h2>Exenci&oacute;n de responsabilidad</h2>
<p>Las herramientas se ofrecen tal cual, sin garant&iacute;a de resultado. El titular no se responsabiliza del contenido que los usuarios introduzcan ni de las decisiones que tomen a partir de los resultados obtenidos.</p>
<p>En particular, las herramientas de c&aacute;lculo con base normativa —como la calculadora de liquidaci&oacute;n laboral— son una ayuda de estimaci&oacute;n y no constituyen asesor&iacute;a legal, laboral, contable ni tributaria. Ante una decisi&oacute;n con consecuencias econ&oacute;micas, consulte a un profesional.</p>
<h2>Propiedad intelectual</h2>
<p>El c&oacute;digo fuente, los textos y el dise&ntilde;o de este sitio pertenecen al titular. Los est&aacute;ndares t&eacute;cnicos que las herramientas implementan son abiertos y de libre uso; las librer&iacute;as de terceros incluidas conservan su propia licencia, indicada junto a sus archivos.</p>
<h2>Legislaci&oacute;n aplicable</h2>
<p>Este sitio se rige por la legislaci&oacute;n de la Rep&uacute;blica del Per&uacute;. Cualquier controversia derivada de su uso se someter&aacute; a los jueces y tribunales de Lima, Per&uacute;.</p>`,

  'Política de privacidad': `
<h2>Qu&eacute; datos tratamos</h2>
<p>Este dominio y sus subdominios no tienen servidor de aplicaci&oacute;n propio ni base de datos. El contenido que introduces en cualquiera de las herramientas —enlaces, contrase&ntilde;as de WiFi, datos de contacto, cifras de una liquidaci&oacute;n— y los archivos que abras en ellas se procesan &iacute;ntegramente en tu navegador. No se transmiten a ning&uacute;n servidor nuestro.</p>
<p>Puedes comprobarlo de la forma m&aacute;s directa: carga la herramienta, desconecta internet y sigue us&aacute;ndola.</p>
<h2>Almacenamiento en tu navegador</h2>
<p>Algunas herramientas guardan informaci&oacute;n en el almacenamiento local de tu propio navegador (localStorage) para ofrecerte un historial de tus &uacute;ltimos resultados. Esa informaci&oacute;n no sale de tu dispositivo, no la recibimos y puedes borrarla desde la propia herramienta o limpiando los datos del sitio en los ajustes de tu navegador.</p>
<h2>Publicidad</h2>
<p>Este sitio se financia con publicidad servida por Google AdSense. Google y sus proveedores pueden usar cookies e identificadores de publicidad para mostrar anuncios basados en tus visitas anteriores a este u otros sitios web.</p>
<p>Puedes configurar o desactivar la publicidad personalizada en los <a href="https://myadcenter.google.com/" rel="nofollow noopener" target="_blank">ajustes de anuncios de Google</a>, y consultar c&oacute;mo Google trata estos datos en su <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow noopener" target="_blank">p&aacute;gina de sitios asociados</a>. Si te encuentras en un pa&iacute;s cuya normativa lo exige, Google mostrar&aacute; su propio aviso de consentimiento antes de personalizar los anuncios.</p>
<h2>Anal&iacute;tica</h2>
<p>Usamos Google Analytics 4 para saber qu&eacute; p&aacute;ginas se visitan y en qu&eacute; proporci&oacute;n, de forma agregada. Esos datos no se cruzan con el contenido que generas, porque ese contenido nunca llega a nosotros.</p>
<h2>Alojamiento</h2>
<p>El sitio est&aacute; alojado en Netlify, que como cualquier servidor web registra las peticiones que recibe —direcci&oacute;n IP, fecha, p&aacute;gina solicitada y navegador— con fines de seguridad y funcionamiento. Esos registros son de Netlify; nosotros no los explotamos.</p>
<h2>Tus derechos</h2>
<p>La Ley N.&deg; 29733 de Protecci&oacute;n de Datos Personales del Per&uacute; te reconoce los derechos de informaci&oacute;n, acceso, actualizaci&oacute;n, inclusi&oacute;n, rectificaci&oacute;n, supresi&oacute;n y oposici&oacute;n sobre tus datos personales. Como este sitio no recoge datos identificativos, en la pr&aacute;ctica el control se ejerce desde los ajustes de tu navegador y desde los ajustes de anuncios de Google.</p>
<p data-correo-bloque>Si crees que alguna funci&oacute;n del sitio trata datos tuyos y quieres ejercer alg&uacute;n derecho, escribe a <a data-correo href="#"></a>.</p>
<h2>Menores de edad</h2>
<p>Las herramientas no est&aacute;n dirigidas a menores de 14 a&ntilde;os ni recogen deliberadamente informaci&oacute;n sobre ellos.</p>`,

  'Política de cookies': `
<h2>Qu&eacute; es una cookie</h2>
<p>Una cookie es un peque&ntilde;o archivo que un sitio web guarda en tu navegador para recordar informaci&oacute;n entre visitas. Junto a ellas existen otras tecnolog&iacute;as de almacenamiento local, como localStorage, que cumplen una funci&oacute;n parecida.</p>
<h2>Qu&eacute; usa este sitio</h2>
<p><b>Almacenamiento t&eacute;cnico y de preferencias.</b> Algunas herramientas guardan en el almacenamiento local de tu navegador tu historial de resultados y tus preferencias de uso. No es seguimiento: no sale de tu dispositivo y no lo recibimos.</p>
<p><b>Cookies publicitarias.</b> Google AdSense instala cookies para mostrar anuncios y medir su rendimiento. Si no has dado tu consentimiento —en los pa&iacute;ses donde Google lo solicita mediante su propio aviso—, los anuncios que ver&aacute;s ser&aacute;n no personalizados.</p>
<p><b>Cookies anal&iacute;ticas.</b> Google Analytics 4 instala cookies para medir el tr&aacute;fico de forma agregada.</p>
<h2>C&oacute;mo gestionarlas</h2>
<p>Puedes revisar y cambiar tu configuraci&oacute;n de anuncios personalizados en los <a href="https://myadcenter.google.com/" rel="nofollow noopener" target="_blank">ajustes de anuncios de Google</a>, y bloquear o borrar cookies desde los ajustes de tu navegador.</p>
<p>Bloquear las cookies publicitarias y anal&iacute;ticas no afecta al funcionamiento de las herramientas: ninguna de ellas las necesita para calcular.</p>`,
};

function paginaLegal(l) {
  return `<!doctype html>
<html lang="${datos.sitio.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(l.titulo)} — ${esc(MARCA)}</title>
<meta name="description" content="${esc(l.titulo)} de ${esc(MARCA)}.">
<meta name="robots" content="noindex, follow">
${DOMINIO ? `<link rel="canonical" href="${abs(l.ruta)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/home.css">
</head>
<body>
<a class="salto-contenido" href="#contenido">Ir al contenido</a>
${cabecera(l.ruta)}
<main id="contenido"><div class="contenedor estrecho">
  <div class="entrada"><h1>${esc(l.titulo)}</h1></div>
  <div class="articulo">${TEXTOS_LEGALES[l.titulo]}</div>
</div></main>
${pie()}
<script type="module">
  import { aplicarMarca } from '/js/config.js';
  aplicarMarca();
</script>
</body>
</html>
`;
}

/* ---------- archivos de raiz ---------- */

function sitemap() {
  const hoy = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${abs('/')}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

function robots() {
  return `User-agent: *
Allow: /

${DOMINIO ? `Sitemap: ${abs('/sitemap.xml')}` : '# Sitemap: se añade al fijar el dominio en js/config.js'}
`;
}

/* Google busca ads.txt en el dominio raiz. Como todos los subdominios venden
   con este mismo ID de editor, el archivo de la raiz los cubre y no hace falta
   uno por subdominio: por eso vive aqui y no en el sitio del generador. */
function adsTxt() {
  if (!CLIENTE) {
    avisos.push('No hay ID de editor en js/config.js: /ads.txt sale vacío y AdSense avisará de que falta.');
    return '# Pendiente: al tener el ID de editor de AdSense, se genera aquí la línea\n'
      + '# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n'
      + '# ejecutando: node build/generar.mjs\n';
  }
  const pub = CLIENTE.replace(/^ca-/, '');
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}

function manifest() {
  return JSON.stringify({
    name: MARCA,
    short_name: MARCA,
    start_url: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#C2410C',
    lang: datos.sitio.idioma,
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }, null, 2) + '\n';
}

function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#C2410C"/>
  <g fill="#fff">
    <rect x="7" y="7" width="7" height="7" rx="1.5"/>
    <rect x="18" y="7" width="7" height="7" rx="1.5"/>
    <rect x="7" y="18" width="7" height="7" rx="1.5"/>
    <rect x="18" y="18" width="3" height="3" rx="1"/>
    <rect x="22" y="22" width="3" height="3" rx="1"/>
  </g>
</svg>
`;
}

function netlifyToml() {
  return `# Generado por build/generar.mjs

[build]
  command = "node build/generar.mjs"
  publish = "."

[[headers]]
  for = "/css/*"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/js/*"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/ads.txt"
  [headers.values]
    Content-Type = "text/plain; charset=utf-8"
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`;
}

/* ---------- escritura ---------- */

function escribir(ruta, contenido) {
  const destino = join(RAIZ, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido, 'utf8');
  return ruta;
}

const escritos = [];

escritos.push(escribir('index.html', paginaIndice()));
for (const l of datos.legales) escritos.push(escribir(l.archivo, paginaLegal(l)));
escritos.push(escribir('sitemap.xml', sitemap()));
escritos.push(escribir('robots.txt', robots()));
escritos.push(escribir('ads.txt', adsTxt()));
escritos.push(escribir('manifest.webmanifest', manifest()));
escritos.push(escribir('favicon.svg', favicon()));
escritos.push(escribir('netlify.toml', netlifyToml()));

/* ---------- comprobaciones de contenido ---------- */

const palabras = [
  ...datos.sitio.entrada,
  ...datos.secciones.flatMap((s) => [s.h2, ...s.parrafos]),
  ...datos.faq.flat(),
  ...datos.herramientas.flatMap((h) => [h.resumen, ...h.puntos]),
].join(' ').trim().split(/\s+/).length;

if (palabras < 500) {
  avisos.push(`El índice tiene ${palabras} palabras: por debajo de 500 AdSense lo trata como una página puente sin contenido.`);
}
if (!DOMINIO) avisos.push('No hay dominio en js/config.js: sin canonical, sin og:url y sin Sitemap en robots.txt.');
if (!leerConfig('ga4')) avisos.push('No hay ID de GA4 en js/config.js: no se carga analítica.');

console.log(`Generadas ${escritos.length} rutas:`);
for (const r of escritos) console.log('  ' + r);
console.log(`\nÍndice: ${palabras} palabras de contenido propio.`);

if (avisos.length) {
  console.log('\nPendiente antes de publicar:');
  for (const a of avisos) console.log('  - ' + a);
}
