/* config.js — Los valores que cambian al poner el sitio raiz en produccion.
 *
 * Este es el sitio de microtools.lat: el indice del portafolio. Cada
 * herramienta vive en su propio subdominio y en su propio repositorio, con su
 * propio config.js. Aqui solo esta lo del dominio raiz.
 *
 *  1. dominio    — el dominio raiz, sin barra final.
 *  2. marca      — el nombre que aparece en la cabecera, el pie y los textos.
 *  3. adsense    — el ID de editor (ca-pub-...) y el ID de cada bloque.
 *  4. analitica  — el ID de medicion de GA4 (G-...).
 *
 * El ID de editor se usa dos veces: para cargar los anuncios de esta pagina y
 * para generar /ads.txt. Google busca ads.txt en el dominio raiz, y mientras
 * todos los subdominios vendan con este mismo ID, el archivo de la raiz los
 * cubre: no hace falta uno por subdominio.
 */

export const CONFIG = {
  dominio: 'https://microtools.lat',
  marca: 'microtools',
  correo: 'soporte.microtools.lat@gmail.com',

  adsense: {
    cliente: '',            // 'ca-pub-0000000000000000'
    bloques: {
      top: '',              // ID del bloque display horizontal
      mid: '',              // ID del bloque in-article
      bottom: '',           // ID del bloque display inferior
    },
  },

  analitica: {
    ga4: '',                // 'G-XXXXXXXXXX'
  },
};

export const listoAdSense = () => Boolean(CONFIG.adsense.cliente);
export const listoAnalitica = () => Boolean(CONFIG.analitica.ga4);

export function urlAbsoluta(ruta) {
  const base = CONFIG.dominio || (typeof location !== 'undefined' ? location.origin : '');
  return base.replace(/\/$/, '') + ruta;
}

/** Escribe la marca y el correo en los elementos marcados. */
export function aplicarMarca(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-marca]')) el.textContent = CONFIG.marca;
  for (const el of raiz.querySelectorAll('[data-correo]')) {
    if (!CONFIG.correo) { el.closest('[data-correo-bloque]')?.remove(); continue; }
    el.textContent = CONFIG.correo;
    if (el.tagName === 'A') el.href = 'mailto:' + CONFIG.correo;
  }
}
