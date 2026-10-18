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
const { guias } = JSON.parse(readFileSync(join(RAIZ, 'data', 'guias.json'), 'utf8'));

const configJs = readFileSync(join(RAIZ, 'js', 'config.js'), 'utf8');
const leerConfig = (clave) => (configJs.match(new RegExp(`${clave}:\\s*'([^']*)'`)) || [])[1] || '';
const DOMINIO = leerConfig('dominio').replace(/\/$/, '');
const MARCA = leerConfig('marca') || datos.sitio.autor;
const CLIENTE = leerConfig('cliente');
const CORREO = leerConfig('correo');
const HOY = new Date().toISOString().slice(0, 10);
const FECHA_LARGA = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });

/* El ID de editor de AdSense va en el HTML generado, NO inyectado por
   JavaScript. El robot que verifica el sitio lee el HTML tal como llega del
   servidor: un script añadido en el evento load no lo ve, y la verificación
   falla aunque los anuncios funcionen. La meta es el método de verificación
   que documenta Google; el script es la carga real. */
function etiquetasAdSense() {
  if (!CLIENTE) return '';
  return `<meta name="google-adsense-account" content="${CLIENTE}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENTE}" crossorigin="anonymous"></script>`;
}


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

  zapato: '<path d="M3 16.5c0-1.6.6-3 1.7-4l2.3-2.2c1.4-1.3 3.6-1.6 5.3-.6l1.9 1.1 4.3.9c1.6.4 2.5 1.5 2.5 2.9v1.9H3z"/>'
    + '<path d="M3 19.5h18M9.5 10.5l1 2M12 10l1 2"/>',

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
  ['/guias/', 'Guías'],
  ['/sobre-nosotros/', 'Sobre nosotros'],
  ['/contacto/', 'Contacto'],
];

function cabecera(rutaActual) {
  const enlaces = NAV.map(([r, t]) => {
    const externo = r.startsWith('http');
    const actual = !externo && (r === rutaActual || (r !== '/' && rutaActual.startsWith(r))) ? ' aria-current="page"' : '';
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
    <a href="/guias/">Gu&iacute;as</a>
    <a href="/sobre-nosotros/">Sobre nosotros</a>
    <a href="/contacto/">Contacto</a>
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
${etiquetasAdSense()}
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

  <section class="bloque-guias" aria-labelledby="guias">
    <h2 class="titulo-seccion" id="guias">Gu&iacute;as</h2>
    <p class="bloque-guias__intro">Explicaciones paso a paso de lo que hay detr&aacute;s de cada herramienta.</p>
${listaGuias(guias)}
    <p><a href="/guias/">Ver todas las gu&iacute;as</a></p>
  </section>

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

/* ---------- guias y paginas de contenido ---------- */

function listaGuias(lista) {
  return `    <ul class="lista-guias">
${lista.map((g) => `      <li class="lista-guias__item">
        <a class="lista-guias__titulo" href="/guias/${g.slug}/">${esc(g.titulo)}</a>
        <p>${esc(g.metaDescripcion)}</p>
      </li>`).join('\n')}
    </ul>`;
}

function migas(items) {
  const html = '<nav class="migas" aria-label="Ruta"><ol>' + items.map(([r, t]) => r
    ? `<li><a href="${r}">${esc(t)}</a></li>` : `<li aria-current="page">${esc(t)}</li>`).join('') + '</ol></nav>';
  const ld = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([r, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, ...(r ? { item: abs(r) } : {}) })),
  };
  return [html, ld];
}

function documento({ ruta, titulo, descripcion, cuerpo, ld = [], tipo = 'website' }) {
  return `<!doctype html>
<html lang="${datos.sitio.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
${DOMINIO ? `<link rel="canonical" href="${abs(ruta)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${tipo}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:locale" content="es_PE">
<meta property="og:site_name" content="${esc(MARCA)}">
${DOMINIO ? `<meta property="og:url" content="${abs(ruta)}">` : ''}
<link rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin>
<link rel="stylesheet" href="/css/home.css">
${ld.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n')}
${etiquetasAdSense()}
</head>
<body>
<a class="salto-contenido" href="#contenido">Ir al contenido</a>
${cabecera(ruta)}
<main id="contenido"><div class="contenedor estrecho">
${cuerpo}
</div></main>
${pie()}
<script type="module">
  import { init } from '/js/home.js';
  init();
</script>
</body>
</html>
`;
}

function seccionGuia(sec) {
  let h = `    <h2>${esc(sec.h2)}</h2>\n` + sec.parrafos.map((p) => `    <p>${esc(p)}</p>`).join('\n');
  if (sec.lista) h += `\n    <ul>\n${sec.lista.map((li) => `      <li>${esc(li)}</li>`).join('\n')}\n    </ul>`;
  if (sec.despues) h += '\n' + sec.despues.map((p) => `    <p>${esc(p)}</p>`).join('\n');
  return h;
}

function cajaHerramienta(t) {
  return `  <aside class="cta-herramienta">
    <p>${esc(t.texto)}</p>
    <a class="boton" href="${t.url}" data-herramienta="${esc(t.boton)}">${esc(t.boton)} ${icono('flecha', 18)}</a>
  </aside>`;
}

function paginaGuia(g) {
  const ruta = `/guias/${g.slug}/`;
  const [htmlMigas, ldMigas] = migas([['/', 'Inicio'], ['/guias/', 'Guías'], [null, g.titulo]]);
  const mitad = Math.ceil(g.secciones.length / 2);
  const otras = guias.filter((o) => o.slug !== g.slug);
  const ldArticulo = {
    '@context': 'https://schema.org', '@type': 'Article', headline: g.h1, description: g.metaDescripcion,
    inLanguage: datos.sitio.idioma, dateModified: HOY, mainEntityOfPage: abs(ruta),
    author: { '@type': 'Organization', name: MARCA, url: abs('/') },
    publisher: { '@type': 'Organization', name: MARCA, url: abs('/') },
  };
  const ldFaq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: g.faq.map(([p, r]) => ({ '@type': 'Question', name: p, acceptedAnswer: { '@type': 'Answer', text: r } })),
  };
  const cuerpo = `  ${htmlMigas}
  <div class="entrada">
    <h1>${esc(g.h1)}</h1>
    ${g.entrada.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
    <p class="fecha">Actualizado el ${FECHA_LARGA}</p>
  </div>
  ${huecoAnuncio('top')}
  <article class="articulo">
${g.secciones.slice(0, mitad).map(seccionGuia).join('\n')}
  </article>
${cajaHerramienta(g.herramienta)}
  ${huecoAnuncio('mid')}
  <article class="articulo">
${g.secciones.slice(mitad).map(seccionGuia).join('\n')}
  </article>
  <section class="faq" aria-labelledby="preguntas">
    <h2 id="preguntas">Preguntas frecuentes</h2>
${g.faq.map(([p, r]) => `    <details class="faq__item">
      <summary>${esc(p)}</summary>
      <p>${esc(r)}</p>
    </details>`).join('\n')}
  </section>
${cajaHerramienta(g.herramienta)}
  <section class="bloque-guias" aria-labelledby="otras">
    <h2 class="titulo-seccion" id="otras">Otras gu&iacute;as</h2>
${listaGuias(otras)}
  </section>
  ${huecoAnuncio('bottom')}`;
  return documento({ ruta, titulo: `${g.metaTitulo} | ${MARCA}`, descripcion: g.metaDescripcion, cuerpo, ld: [ldArticulo, ldFaq, ldMigas], tipo: 'article' });
}

function paginaGuias() {
  const [htmlMigas, ldMigas] = migas([['/', 'Inicio'], [null, 'Guías']]);
  const cuerpo = `  ${htmlMigas}
  <div class="entrada">
    <h1>Gu&iacute;as</h1>
    <p>Explicaciones claras y verificables de los temas que resuelven nuestras herramientas: c&oacute;mo se calculan los beneficios laborales en Per&uacute;, c&oacute;mo hacer que un c&oacute;digo QR funcione bien impreso y c&oacute;mo acertar con la talla al comprar calzado en tallas de Estados Unidos.</p>
    <p>Cada gu&iacute;a termina con la herramienta que hace el c&aacute;lculo por ti.</p>
  </div>
${listaGuias(guias)}
  ${huecoAnuncio('bottom')}`;
  return documento({ ruta: '/guias/', titulo: `Guías: CTS, liquidación, códigos QR y tallas | ${MARCA}`,
    descripcion: 'Guías prácticas sobre CTS y liquidación en Perú, tamaño y usos de los códigos QR y cómo acertar con la talla de zapatillas en tallas de EE. UU.',
    cuerpo, ld: [ldMigas] });
}

function paginaSobre() {
  const [htmlMigas, ldMigas] = migas([['/', 'Inicio'], [null, 'Sobre nosotros']]);
  const cuerpo = `  ${htmlMigas}
  <div class="entrada">
    <h1>Sobre <span data-marca>${esc(MARCA)}</span></h1>
    <p>microtools es un proyecto personal de un ingeniero industrial en Lima, Per&uacute;, que trabaja en automatizaci&oacute;n de procesos y sistemas empresariales. Cada herramienta naci&oacute; de un problema propio o cercano que se resolv&iacute;a con m&aacute;s pasos de los necesarios.</p>
  </div>
  <div class="articulo">
    <h2>Qu&eacute; hacemos</h2>
    <p>Construimos herramientas web peque&ntilde;as que resuelven una tarea concreta de principio a fin: generar un c&oacute;digo QR listo para imprimir, incluso en 3D; calcular una liquidaci&oacute;n laboral seg&uacute;n la normativa peruana con el detalle de cada concepto; o convertir una talla de calzado de Estados Unidos a la talla local. Junto a cada herramienta publicamos gu&iacute;as que explican el tema con ejemplos, para que el resultado se pueda entender y comprobar.</p>
    <h2>C&oacute;mo trabajamos</h2>
    <p>Todas las herramientas se ejecutan en el navegador de quien las usa. No pedimos registro, no guardamos lo que se escribe y no ponemos l&iacute;mites ni marcas de agua para luego cobrar por quitarlos. Cuando una herramienta se apoya en normas o en tablas de terceros, lo indicamos y revisamos esas fuentes cuando cambian.</p>
    <p>Las gu&iacute;as se redactan a partir de la normativa vigente y de la documentaci&oacute;n t&eacute;cnica de cada est&aacute;ndar. Son informativas: no reemplazan la asesor&iacute;a de un abogado, un contador o un especialista cuando hay una decisi&oacute;n importante de por medio.</p>
    <h2>C&oacute;mo se financia</h2>
    <p>El sitio se sostiene con publicidad de Google AdSense, mostrada en espacios reservados que no tapan las herramientas. Los anunciantes no influyen en el contenido de las gu&iacute;as ni en c&oacute;mo funcionan las herramientas.</p>
    <h2>Errores y sugerencias</h2>
    <p>Si encuentras un c&aacute;lculo que no cuadra, un dato desactualizado o tienes una idea para una herramienta nueva, escr&iacute;benos desde la p&aacute;gina de <a href="/contacto/">contacto</a>. Las correcciones se publican en cuanto se verifican.</p>
  </div>`;
  return documento({ ruta: '/sobre-nosotros/', titulo: `Sobre nosotros | ${MARCA}`,
    descripcion: 'Quién está detrás de microtools, cómo construimos las herramientas, cómo se financia el sitio y cómo reportar un error.', cuerpo, ld: [ldMigas] });
}

function paginaContacto() {
  const [htmlMigas, ldMigas] = migas([['/', 'Inicio'], [null, 'Contacto']]);
  const cuerpo = `  ${htmlMigas}
  <div class="entrada">
    <h1>Contacto</h1>
    <p>Para consultas, reportes de errores o sugerencias de nuevas herramientas, escr&iacute;benos por correo. Respondemos en un plazo de dos a tres d&iacute;as h&aacute;biles.</p>
  </div>
  <div class="articulo">
    <p class="correo-contacto" data-correo-bloque>Correo: <a data-correo href="mailto:${esc(CORREO)}">${esc(CORREO)}</a></p>
    <h2>Para que podamos ayudarte m&aacute;s r&aacute;pido</h2>
    <ul>
      <li>Indica qu&eacute; herramienta o gu&iacute;a usaste, con su enlace.</li>
      <li>Si un c&aacute;lculo no cuadra, cu&eacute;ntanos qu&eacute; datos ingresaste y qu&eacute; resultado esperabas. No env&iacute;es documentos con datos personales.</li>
      <li>Si un c&oacute;digo QR no escanea, adjunta una captura o una foto del c&oacute;digo impreso y dinos con qu&eacute; tel&eacute;fono lo probaste.</li>
    </ul>
    <h2>Lo que no podemos hacer</h2>
    <p>No damos asesor&iacute;a legal, laboral ni tributaria personalizada. Si tu caso tiene consecuencias econ&oacute;micas importantes, consulta a un profesional o a la SUNAFIL. Tampoco podemos recuperar resultados generados con las herramientas: como todo se procesa en tu navegador, no guardamos ninguna copia.</p>
  </div>`;
  return documento({ ruta: '/contacto/', titulo: `Contacto | ${MARCA}`,
    descripcion: 'Escríbenos para reportar un error, hacer una consulta o sugerir una nueva herramienta de microtools.', cuerpo, ld: [ldMigas] });
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
${DOMINIO ? `<link rel="canonical" href="${abs(l.ruta)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/home.css">
${etiquetasAdSense()}
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
  const entrada = (ruta, prioridad, frecuencia) => `  <url>
    <loc>${abs(ruta)}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${frecuencia}</changefreq>
    <priority>${prioridad}</priority>
  </url>`;

  // Las legales entran en el sitemap aunque nadie las busque. Quien revisa el
  // sitio —AdSense sobre todo— espera encontrar la politica de privacidad
  // indexada, no solo enlazada en el pie. Prioridad baja y cambio anual, que
  // es lo que de verdad son.
  const urls = [
    entrada('/', '1.0', 'monthly'),
    entrada('/guias/', '0.8', 'monthly'),
    ...guias.map((g) => entrada(`/guias/${g.slug}/`, '0.8', 'monthly')),
    entrada('/sobre-nosotros/', '0.5', 'yearly'),
    entrada('/contacto/', '0.4', 'yearly'),
    ...datos.legales.map((l) => entrada(l.ruta, '0.3', 'yearly')),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
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
escritos.push(escribir('guias/index.html', paginaGuias()));
for (const g of guias) escritos.push(escribir(`guias/${g.slug}/index.html`, paginaGuia(g)));
escritos.push(escribir('sobre-nosotros/index.html', paginaSobre()));
escritos.push(escribir('contacto/index.html', paginaContacto()));
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
