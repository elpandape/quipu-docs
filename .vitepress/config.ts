import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  lang: 'es',
  title: 'quipu',
  description: 'Facturación electrónica de SUNAT (CPE Perú) en PHP puro, sin framework. Construye el XML UBL, lo firma, lo envía a SUNAT y parsea el CDR.',

  lastUpdated: true,
  cleanUrls: true,

  // README.md documenta cómo trabajar en el sitio, no es contenido del sitio: sin esto se
  // publicaría como página huérfana (/README) y entraría al sitemap.
  srcExclude: ['README.md'],

  // El sitio se publica como GitHub Pages de proyecto: https://elpandape.github.io/quipu/.
  // Si algún día se usa un dominio propio (CNAME en quipu-docs/public/), las tres cosas van
  // juntas: quitar `base`, dejar `sitemap.hostname` en la raíz del dominio y volver el favicon
  // del `head` a '/favicon.svg' (VitePress NO le aplica `base` a los atributos del head).
  base: '/quipu/',

  head: [
    ['meta', { name: 'theme-color', content: '#3aa675' }],
    ['meta', { name: 'author', content: 'ElPandaPe' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'quipu — Facturación electrónica SUNAT en PHP' }],
    ['meta', { property: 'og:description', content: 'Librería PHP pura, framework-agnóstica, para la maquinaria de facturación electrónica de SUNAT (CPE Perú).' }],
    ['meta', { property: 'og:url', content: 'https://elpandape.github.io/quipu/' }],
    // TODO: subir a 'summary_large_image' cuando exista public/og.png (PNG de 1200x630) y
    // declarar og:image apuntando a https://elpandape.github.io/quipu/og.png. Hoy public/ solo
    // tiene favicon.svg, y un SVG no sirve como og:image.
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/quipu/favicon.svg' }],
  ],

  sitemap: {
    // Las <loc> se derivan de la ruta del .md SIN aplicar `base`, así que el hostname debe
    // incluirlo. La barra final es obligatoria: sin ella el join descarta el /quipu/.
    hostname: 'https://elpandape.github.io/quipu/',
  },

  themeConfig: {
    outline: {
      level: [2, 3],
      label: 'En esta página',
    },

    docFooter: {
      prev: 'Anterior',
      next: 'Siguiente',
    },

    lastUpdatedText: 'Actualizado',

    editLink: {
      // `:path` se reemplaza por la ruta relativa a srcDir (que es quipu-docs/), por eso el
      // /quipu-docs/ va escrito en el pattern.
      pattern: 'https://github.com/elpandape/quipu/edit/main/quipu-docs/:path',
      text: 'Editar esta página en GitHub',
    },

    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    darkModeSwitchLabel: 'Tema',
    lightModeSwitchTitle: 'Cambiar a tema claro',
    darkModeSwitchTitle: 'Cambiar a tema oscuro',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: 'Buscar',
            buttonAriaLabel: 'Buscar',
          },
          modal: {
            displayDetails: 'Mostrar detalles',
            resetButtonTitle: 'Limpiar',
            backButtonTitle: 'Cerrar',
            noResultsText: 'Sin resultados',
            footer: {
              selectText: 'Seleccionar',
              navigateText: 'Navegar',
              closeText: 'Cerrar',
            },
          },
        },
      },
    },

    nav: [
      { text: 'Empezando', link: '/empezando/introduccion' },
      { text: 'Documentos', link: '/documentos/factura' },
      { text: 'Guías', link: '/guias/firma-local' },
      { text: 'Referencia', link: '/referencia/modelos' },
      { text: 'Producción', link: '/produccion/de-beta-a-produccion' },
      { text: 'Pro', link: '/pro/introduccion' },
      { text: 'Integraciones', link: '/integraciones/laravel' },
      {
        text: 'Más',
        items: [
          { text: 'Arquitectura', link: '/arquitectura/vision-general' },
          { text: 'Buenas prácticas', link: '/buenas-practicas/como-usar' },
          { text: 'Dominio SUNAT', link: '/dominio-sunat/cdr-ciclo-vida' },
          { text: 'Proyecto', link: '/proyecto/estado-y-versionado' },
          { text: 'Changelog', link: 'https://github.com/elpandape/quipu/blob/main/CHANGELOG.md' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Empezando',
        items: [
          { text: 'Introducción', link: '/empezando/introduccion' },
          { text: 'Límites y alcance', link: '/empezando/limites' },
          { text: 'Instalación', link: '/empezando/instalacion' },
          { text: 'Conceptos de dominio', link: '/empezando/conceptos' },
          { text: 'Inicio rápido', link: '/empezando/inicio-rapido' },
          { text: 'Preguntas frecuentes', link: '/empezando/faq' },
        ],
      },
      {
        text: 'Arquitectura',
        items: [
          { text: 'Arquitectura', link: '/arquitectura/vision-general' },
          { text: 'El facade Quipu', link: '/arquitectura/facade' },
        ],
      },
      {
        text: 'Documentos',
        items: [
          { text: 'Factura', link: '/documentos/factura' },
          { text: 'Boleta', link: '/documentos/boleta' },
          { text: 'Notas de crédito y débito', link: '/documentos/notas' },
          { text: 'Resumen diario', link: '/documentos/resumen-diario' },
          { text: 'Comunicación de baja', link: '/documentos/comunicacion-baja' },
          { text: 'Guía de remisión (GRE)', link: '/documentos/guia-remision' },
          { text: 'Guía de remisión transportista', link: '/documentos/guia-remision-transportista' },
          { text: 'Retención', link: '/documentos/retencion' },
          { text: 'Percepción', link: '/documentos/percepcion' },
          { text: 'Reversión', link: '/documentos/reversion' },
        ],
      },
      {
        text: 'Guías prácticas',
        items: [
          { text: 'Firma local', link: '/guias/firma-local' },
          { text: 'Validación local', link: '/guias/validacion-local' },
          { text: 'Certificados digitales', link: '/guias/certificados' },
          { text: 'Representación impresa y QR', link: '/guias/representacion-impresa' },
          { text: 'Consulta de CPE', link: '/guias/consulta-cpe' },
          { text: 'Lotes (sendPack)', link: '/guias/lotes' },
          { text: 'Multi-tenant', link: '/guias/multi-tenant' },
          { text: 'Primer envío (troubleshooting)', link: '/guias/primer-envio' },
        ],
      },
      {
        text: 'Producción',
        items: [
          { text: 'De beta a producción', link: '/produccion/de-beta-a-produccion' },
          { text: 'Checklist de go-live', link: '/produccion/checklist' },
          { text: 'Operación en producción', link: '/produccion/operacion' },
          { text: 'Vigilancia de cambios de SUNAT', link: '/produccion/vigilancia-sunat' },
        ],
      },
      {
        text: 'Pro',
        items: [
          { text: 'Introducción', link: '/pro/introduccion' },
          { text: 'Fluent Builder', link: '/pro/fluent-builder' },
          { text: 'Motor tributario', link: '/pro/motor-tributario' },
          { text: 'Validación y diagnóstico', link: '/pro/validacion-diagnostico' },
          { text: 'Infraestructura resiliente', link: '/pro/infra' },
          { text: 'Certificados', link: '/pro/certificados' },
          { text: 'Herramientas XML', link: '/pro/xml-tooling' },
          { text: 'Testing toolkit', link: '/pro/testing' },
          { text: 'CLI y Laravel', link: '/pro/cli-laravel' },
        ],
      },
      {
        text: 'Integraciones',
        items: [
          {
            text: 'Laravel (quipu-laravel)',
            items: [
              { text: 'Introducción', link: '/integraciones/laravel' },
              { text: 'Instalación y configuración', link: '/integraciones/laravel/instalacion' },
              { text: 'Uso (base)', link: '/integraciones/laravel/uso' },
              { text: 'Edición Pro', link: '/integraciones/laravel/pro' },
              { text: 'Multi-tenant', link: '/integraciones/laravel/multi-tenant' },
              { text: 'Testing', link: '/integraciones/laravel/testing' },
            ],
          },
        ],
      },
      {
        text: 'Referencia',
        items: [
          { text: 'Modelos', link: '/referencia/modelos' },
          { text: 'Catálogos SUNAT', link: '/referencia/catalogos' },
          { text: 'Resultados', link: '/referencia/resultados' },
          { text: 'Contratos (interfaces)', link: '/referencia/contratos' },
          { text: 'Excepciones', link: '/referencia/excepciones' },
          { text: 'Endpoints SOAP y REST', link: '/referencia/endpoints' },
        ],
      },
      {
        text: 'Buenas prácticas',
        items: [
          { text: 'Cómo usar quipu', link: '/buenas-practicas/como-usar' },
          { text: 'Cómo NO usar quipu', link: '/buenas-practicas/como-no-usar' },
          { text: 'Manejo de errores', link: '/buenas-practicas/manejo-errores' },
          { text: 'Errores comunes', link: '/buenas-practicas/errores-comunes' },
        ],
      },
      {
        text: 'Dominio SUNAT',
        items: [
          { text: 'CDR y ciclo de vida', link: '/dominio-sunat/cdr-ciclo-vida' },
          { text: 'Plazos de SUNAT', link: '/dominio-sunat/plazos-sunat' },
          { text: 'Sensibilidad temporal', link: '/dominio-sunat/sensibilidad-temporal' },
        ],
      },
      {
        text: 'Proyecto',
        items: [
          { text: 'Estado y versionado', link: '/proyecto/estado-y-versionado' },
          { text: 'Ecosistema', link: '/proyecto/ecosistema' },
          { text: 'Contribuir', link: '/proyecto/contribuir' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/elpandape/quipu' },
    ],

    footer: {
      message: 'Lanzado bajo <a href="https://github.com/elpandape/quipu/blob/main/LICENSE.md">licencia MIT</a>. Paquete no oficial, no afiliado a SUNAT.',
      copyright: 'Copyright © 2026 ElPandaPe',
    },
  },
}))
