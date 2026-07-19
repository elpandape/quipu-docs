# Introducción

**quipu** es la **librería de facturación electrónica de SUNAT** (Comprobantes de Pago Electrónicos, CPE, Perú):
la maquinaria que construye el comprobante, lo firma, lo envía a SUNAT y lee la respuesta. Está pensada para
**todo el ecosistema**, bajo una sola documentación **agnóstica de lenguaje** —lo que se explica es el dominio de
SUNAT, no la API de un lenguaje concreto—.

Su **implementación de referencia, y la única disponible hoy, es en PHP** (`elpandape/quipu-lite`): PHP puro y
framework-agnóstico. Las implementaciones en otros lenguajes son la [hoja de ruta del ecosistema](/proyecto/ecosistema),
no algo que puedas instalar todavía; por eso los ejemplos de código muestran PHP hoy y anuncian el resto como
"próximamente".

Cubre las cuatro piezas técnicas del sistema propio del contribuyente:

1. **Construir** el documento XML según el **UBL** que SUNAT exige para cada familia: **2.1** para factura, boleta, notas y guías; **2.0** para resumen diario, baja, reversión, retención y percepción.
2. **Firmar** ese XML con el certificado tributario (firma xmldsig enveloped, dentro de `UBLExtensions`).
3. **Enviar** el XML (comprimido en ZIP + base64) a los **webservices SOAP** de SUNAT —o por **REST/OAuth** para las guías de remisión— y recibir la respuesta.
4. **Parsear** el **CDR** (Constancia de Recepción) y su estado, devolviendo un resultado tipado.

## Por qué existe

quipu se construyó en casa para **dueñar el dominio**: entender cada rechazo de SUNAT, no depender de una caja
negra, y tener control total del código con buenas prácticas modernas. Es **agnóstica**: nada de Laravel, nada
de pasarelas de pago, nada de una aplicación concreta. Solo el dominio SUNAT, expuesto tras interfaces limpias.

> [!IMPORTANT]
> **Emitir un comprobante es un hecho tributario** ("vendí X por S/ Y a Z"), independiente del framework y del
> medio de pago. Por eso quipu no sabe ni le importa cómo se cobró —o si se cobró— la venta.

## Lo que quipu NO hace

quipu es deliberadamente **solo la maquinaria**. No asume responsabilidades que pertenecen al consumidor:

- **No persiste nada** (ni comprobantes, ni CDR, ni XML). Devuelve resultados tipados; guardarlos es del consumidor.
- **No gestiona series ni correlativos**. La numeración atómica sin huecos ni duplicados es del consumidor.
- **No agenda el Resumen Diario ni reintenta**. El *scheduling* y los reintentos son del consumidor.
- **No depende de ningún framework ni ORM**. Cero Laravel/Symfony en el core.
- **No genera el PDF** de representación impresa. Provee los datos (vista de impresión + string QR), pero renderizar
  el PDF es decisión del consumidor con el driver que prefiera.

Esa separación es intencional: quipu recibe un `Model\*` ya armado (implementa `Contract\Document`) y devuelve
un `Result\*`; no sabe de bases de datos. La integración con un framework concreto (persistencia, correlativos, estados, jobs) vivirá en
un paquete aparte.

## Ediciones: Lite y Pro

**Emitir** cualquier comprobante —construir, firmar, enviar y leer el CDR— es capacidad de la edición **Lite**
(`elpandape/quipu-lite`), gratuita y de código abierto. Todo lo de "Empezando" y de [Documentos](/documentos/factura)
funciona con Lite:

<Availability lite pro />

**quipu Pro** (`elpandape/quipu-pro`) se monta encima de Lite y añade, sobre la misma maquinaria, una capa de
**productividad y operación**: builders fluidos, motor tributario, validación y diagnóstico accionable,
infraestructura resiliente y utilidades. No hace falta para emitir; es conveniencia y robustez opt-in:

<Availability pro />

Ver [la sección Pro](/pro/introduccion) y el detalle del [ecosistema](/proyecto/ecosistema).

## Requisitos

Para la implementación de referencia en PHP:

- **PHP 8.4+**
- Extensiones de PHP: `soap`, `dom`, `openssl`, `zip`
- Composer

## Disclaimer

quipu es un paquete **no oficial**. No está afiliado, avalado ni patrocinado por SUNAT. Se distribuye bajo
licencia **MIT**.

## Siguiente paso

Continúa con la [instalación](/empezando/instalacion) o salta al [inicio rápido](/empezando/inicio-rapido).
