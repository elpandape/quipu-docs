# Preguntas frecuentes

Respuestas cortas que **resumen y remiten** al detalle de cada tema. Esta página no duplica el contenido de las
demás: existe solo para que encuentres rápido la respuesta y el enlace donde se profundiza.

## ¿Está quipu en Packagist?

Sí, el emisor: `composer require elpandape/quipu-lite` funciona (**`v1.0.0`**, MIT). La edición **Pro**
(comercial) aún no se publica. Ver [instalación](/empezando/instalacion).

## ¿Hay releases estables?

Sí. `quipu-lite` publicó su **`1.0.0`** estable y sigue Semantic Versioning (dentro de `1.x`, sin cambios
incompatibles en la API pública). La edición **Pro** sigue en pre-release. Detalle en
[estado y versionado](/proyecto/estado-y-versionado).

## ¿Necesito Laravel para usar quipu?

No. quipu es **agnóstica de framework**: está construida en PHP puro, sin Laravel/Symfony en el core, y funciona
en cualquier proyecto PHP 8.4+ con Composer. Ver [introducción](/empezando/introduccion).

## ¿Genera el PDF de representación impresa?

No. quipu no renderiza el PDF: te entrega los datos (la vista de impresión tipada y el string del QR) y **tú**
armas el PDF con el motor que prefieras. Ver [representación impresa y QR](/guias/representacion-impresa).

## ¿Lee el XML de la guía de remisión transportista (tipo 31)?

No. La guía transportista es **emisión-only**: quipu la construye y la envía a SUNAT, pero no reconstruye el
modelo leyendo su XML de vuelta (la guía del remitente `09` sí es legible; la `31` no). Ver
[guía de remisión transportista (31)](/documentos/guia-remision-transportista).

## ¿Cubre el catálogo UNSPSC (Cat. 25)?

No. La tabla de códigos de producto UNSPSC **no está cargada** (~150.000 códigos sin fuente oficial
contrastable); el código de producto queda como string libre y su validación es un no-op. Ver
[catálogos SUNAT](/referencia/catalogos).

## ¿La validación local es automática?

No, es **opt-in**. `sign()`, `emit()` y `emitInvoice()` nunca llaman a `validate()`/`assertValid()` por ti: la
invocas tú cuando quieres un error local antes de arriesgarte a un rechazo. Ver
[validación local](/guias/validacion-local).

## ¿Cómo pruebo sin afectar producción?

Contra **SUNAT beta** (homologación), que tiene credenciales públicas de prueba y acepta un certificado
autofirmado: copias el ejemplo del inicio rápido, lo ejecutas tal cual y produces sin trámites. Ver
[inicio rápido](/empezando/inicio-rapido).

## ¿Qué hago si SUNAT cambia una regla?

SUNAT cambia esquemas, catálogos y reglas de validación del lado servidor (que no viven en el XSD). quipu te da
los ganchos —versiones, catálogos y códigos de error— para que montes la vigilancia; la guía explica qué vigilar
y dónde. Ver [vigilancia de cambios de SUNAT](/produccion/vigilancia-sunat).

## ¿No está tu pregunta?

Si no la resolviste aquí, lo más rápido es revisar los [límites y el alcance](/empezando/limites) (qué hace y qué
no hace quipu) o el [inicio rápido](/empezando/inicio-rapido) para ver el flujo completo.
