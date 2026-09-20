/* home.js — Lo unico que el sitio raiz necesita ejecutar.
 *
 * El indice es una pagina de contenido: no tiene aplicacion. Aqui solo entra
 * la marca en los huecos marcados, arranca la publicidad diferida y se avisa a
 * GA4 de la herramienta que el visitante ha elegido.
 */

import { CONFIG, listoAnalitica, aplicarMarca } from './config.js';
import { iniciarPublicidad } from './ads.js';

function cargarAnalitica() {
  if (!listoAnalitica()) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', CONFIG.analitica.ga4);

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.analitica.ga4}`;
  document.head.appendChild(s);
}

/** Un solo evento: a que herramienta sale el visitante desde el indice. */
function medirSalidas() {
  for (const a of document.querySelectorAll('[data-herramienta]')) {
    a.addEventListener('click', () => {
      window.gtag?.('event', 'salida_herramienta', {
        herramienta: a.dataset.herramienta,
      });
    });
  }
}

export function init() {
  aplicarMarca();
  cargarAnalitica();
  medirSalidas();
  iniciarPublicidad();
}
