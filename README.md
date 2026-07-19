# quipu-docs

**El sitio público de documentación de [quipu](https://github.com/elpandape/quipu-php-lite)** —la librería de
facturación electrónica de SUNAT (CPE Perú) en PHP— construido con [VitePress](https://vitepress.dev), en
español. Aquí vive el contenido que consume quien **usa** quipu: cómo instalar, emitir cada tipo de comprobante,
integrar con un framework y operar en producción.

## Cómo levantarlo

Requiere **Node 22+**. El sitio usa `lastUpdated`, que saca la fecha de cada página del historial con `git log`,
así que trabaja sobre el repo clonado (no sobre un tarball sin `.git`).

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # build de producción → .vitepress/dist/
npm run preview   # sirve el build ya generado
```

## Regla de contenido: todo en español

El sitio es **íntegramente en español, con tildes correctas** (`lang: 'es'` en la config). Eso incluye títulos,
prosa, comentarios dentro de los bloques de código y los textos de la UI del tema. Los identificadores de la
librería (clases, métodos, propiedades) se quedan en inglés, como en el código.

## Cómo añadir una página

Son **dos pasos**. Saltarse el segundo deja la página publicada pero inalcanzable desde la navegación:

1. Crea el `.md` en la carpeta que le toque (ver el criterio abajo).
2. Regístrala en el `sidebar` de `.vitepress/config.ts`, dentro del grupo correspondiente:

   ```ts
   { text: 'Título en el menú', link: '/guias/mi-pagina' },
   ```

   El `link` es la ruta **sin** `.md` (`cleanUrls: true`). Si además debe aparecer en la barra superior,
   añádela al `nav`.

## Estructura de carpetas

Cada carpeta responde a una pregunta distinta del lector. Si dudas dónde va una página, elige por la pregunta,
no por el tema:

| Carpeta | Criterio — responde a… |
|---|---|
| `empezando/` | "¿Qué es esto y cómo arranco?" Introducción, límites y alcance, instalación, conceptos, inicio rápido. Es el camino de entrada, se lee en orden. |
| `arquitectura/` | "¿Cómo está armado por dentro?" Visión general de las piezas y el facade `Quipu`, lo justo para entender la API pública. |
| `documentos/` | "¿Cómo emito X?" Una página por tipo de comprobante: factura, boleta, notas, resumen diario, comunicación de baja, GRE, retención, percepción, reversión. |
| `guias/` | "¿Cómo resuelvo esta tarea concreta?" Transversal a los tipos de documento: firma local, validación local, certificados, representación impresa, consulta de CPE, lotes, multi-tenant. |
| `integraciones/` | "¿Cómo lo uso con mi framework?" La integración con Laravel (`quipu-laravel`): instalación, uso, edición Pro, multi-tenant y testing. |
| `pro/` | "¿Qué añade la edición Pro?" Motor tributario y builders fluidos, infra resiliente, validación y diagnóstico, certificados, tooling de XML y testing. |
| `produccion/` | "¿Cómo lo pongo y lo mantengo en vivo?" Paso de beta a producción, checklist de go-live, operación, vigilancia de cambios de SUNAT. |
| `referencia/` | "¿Cuál es la firma exacta?" Consulta puntual, no lectura lineal: modelos, catálogos SUNAT, resultados, contratos, excepciones, endpoints. |
| `buenas-practicas/` | "¿Lo estoy usando bien?" Cómo usar y cómo NO usar quipu, manejo de errores, errores comunes. |
| `dominio-sunat/` | "¿Por qué SUNAT exige esto?" Reglas del régimen, no de la librería: CDR y ciclo de vida, plazos, sensibilidad temporal. |
| `proyecto/` | "¿Cómo está el proyecto?" Estado y versionado, ecosistema multi-lenguaje, cómo contribuir. |

Además: `index.md` es la portada; `public/` son los estáticos servidos tal cual (p. ej. `favicon.svg`); y
`.vitepress/` contiene `config.ts` (nav, sidebar, tema y componentes) más `cache/` y `dist/`, ambos ignorados
por git.

## Despliegue

El destino es **GitHub Pages** en `https://elpandape.github.io/quipu/`, servido bajo el subdirectorio `/quipu/`.
Por eso `.vitepress/config.ts` declara `base: '/quipu/'`: ese valor **debe coincidir** con el subdirectorio de
publicación, o los enlaces a los assets se rompen. El workflow de despliegue vive en `.github/workflows/`.
