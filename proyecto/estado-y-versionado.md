# Estado y versionado

quipu funciona —construye, firma, envía y parsea el CDR— pero **todavía no es 1.0**. Esta página dice, sin
maquillaje, en qué estado está el proyecto, qué puedes considerar API pública y qué se puede romper sin aviso.
Léela antes de construir nada serio encima.

## Estado real del proyecto

quipu está en fase **pre-release**. Tres hechos verificables lo definen hoy:

- **No hay releases.** El repositorio no tiene *tags* (`git tag -l` no devuelve nada) y `composer.json` no
  declara una clave `version`. El desarrollo ocurre sobre la rama `main`.
- **No está publicado en Packagist.** `composer require elpandape/quipu` todavía falla: el paquete no existe
  en el registry. La forma de usarlo hoy es clonar el repo y apuntar Composer a esa copia local (ver
  [Instalación](/empezando/instalacion)). Publicarlo en Packagist está, por ahora, fuera del alcance del core.
- **La API puede cambiar sin aviso.** Al no haber un 1.0 etiquetado, nada te protege de un *breaking change*
  en la siguiente Pull Request. Esto es lo que cambia cuando se publique (ver [Versionado](#versionado)).

::: danger Pre-release: no lo trates como estable
Mientras no exista un tag `1.0.0`, quipu puede romper su API en cualquier commit. Si lo usas hoy, ancla a un
commit específico de `main` (no a `main` flotando) y revisa el diff en cada actualización. Lo que sí puedes
esperar que se mantenga está descrito en [Qué es API pública](#que-es-api-publica).
:::

### Cobertura funcional

Están implementados los **9 documentos** que cubren los **11 códigos** del Catálogo 01 de SUNAT (tipo de
comprobante). Cada familia tiene su *builder* XML y su validador de reglas de negocio:

| Documento (familia) | Código Cat.01 | Builder |
|---|---|---|
| Factura / Boleta de venta | `01` / `03` | `InvoiceBuilder` |
| Nota de crédito / débito | `07` / `08` | `NoteBuilder` |
| Guía de remisión remitente (GRE) | `09` | `DespatchBuilder` |
| Guía de remisión transportista (GRE) | `31` | `CarrierDespatchBuilder` |
| Comprobante de retención | `20` | `RetentionBuilder` |
| Comprobante de percepción | `40` | `PerceptionBuilder` |
| Resumen diario | `RC` | `SummaryBuilder` |
| Comunicación de baja | `RA` | `VoidedBuilder` |
| Resumen de reversiones | `RR` | `ReversionBuilder` |

Los códigos viven en el enum `Catalog\DocumentType` (`src/Catalog/DocumentType.php`), que también expone el
nombre en español para la representación impresa.

### Calidad y CI

El *quality gate* del proyecto exige **100 % de cobertura de líneas y 100 % de cobertura de tipos** (definido
en `composer review` y verificado en cada Push/PR). La integración continua corre sobre una matriz
**PHP 8.4 y PHP 8.5** (`.github/workflows/ci.yml`), instalando las extensiones `soap`, `dom`, `openssl` y `zip`.
La suite ronda los 700 tests automatizados.

## Qué es API pública

La API pública es **lo que quipu-laravel y los usuarios pueden consumir sin sorpresas**. Mientras quipu sea
pre-release "sin sorpresas" significa *se romperá poco y de forma ruidosa*; cuando se publique pasará a
significar *cubierto por SemVer*. Concreto: depende de los contratos, no de las clases que los implementan.

### El facade `Quipu`

`src/Quipu.php` es la puerta de entrada. Expone **21 métodos públicos**, agrupados por responsable:

| Responsable | Métodos |
|---|---|
| Validación local | `validate()`, `assertValid()` |
| Firma y lectura local | `sign()`, `read()`, `qrString()`, `printable()` |
| Envío síncrono (factura, boleta, nota) | `emit()`, `emitInvoice()`, `sendBill()` |
| Envío asíncrono (vía *ticket*) | `sendSummary()`, `sendPack()`, `getPackStatus()`, `getStatus()`, `emitSummary()`, `emitVoidance()`, `emitReversion()` |
| Guía de remisión electrónica (GRE, REST) | `emitGuide()`, `getGuideStatus()` |
| Consulta de validez de un CPE ajeno | `validateCpe()` |
| Consulta de un CPE propio (billConsult) | `getBillStatus()`, `retrieveCdr()` |

El facade recibe **todas sus dependencias por constructor** como interfaces, con *defaults* sensatos. Esa es
la costura que te permite cambiar el transporte, el firmante o el lector XML sin tocar tu código.

### Contratos, modelos, resultados y catálogos

Además del facade, es API pública todo lo que aparece en la frontera tipada:

- **`Contract/`** — las interfaces que el facade consume y que quipu-laravel implementa/extiende:
  `Document`, `XmlBuilder`, `Signer`, `Sender`, `GreSender`, `Validator`, `SchemaValidator`, `DocumentReader`,
  `CpeValidator`, `CpeStatusService`, `QrEncoder`, `PrintViewBuilder`, `HttpClient`, `TokenStore`, `Clock`.
- **`Model/`** — los DTO `readonly` que construyes y pasas al facade: `Invoice`, `Company`, `Client`,
  `SaleDetail`, `DailySummary`, `Voidance`, `Retention`, `Perception`, `Reversion`, `Despatch`, `CpeQuery`,
  etc.
- **`Result/`** — lo que el facade te devuelve, ya tipado: `SignedXml`, `BillResult`, `TicketResult`,
  `CdrResult`, `BillConsultResult`, más los enums `CdrStatus` y `CdrSeverity`.
- **`Catalog/`** — los enums con los códigos oficiales de SUNAT: `DocumentType`, `Currency`, `Tribute`,
  `IgvAffectationType`, `UnitOfMeasure`, `PriceType`, `RetentionRegime`, `PerceptionRegime`, y el resto.

::: tip La regla operativa
Si lo importas desde `ElPandaPe\Quipu\` a secas (el facade) o desde `Contract\`, `Model\`, `Result\` o
`Catalog\`, es API pública. Si lo importas desde `Xml\`, `Ws\`, `Validation\`, `Signer\`, `Cdr\` u otra carpeta
de implementación, no lo es.
:::

## Qué NO es API pública

Los detalles de implementación pueden cambiar (refactor, reemplazo de librería, reorganización de namespaces)
sin considerarse un *breaking change*. No acoples tu código a ellos:

- **`Xml/Abstract*`** — las clases base de los *builders* y *readers* UBL (`AbstractUblBuilder`,
  `AbstractUblReader`, `AbstractSaleDocumentReader`, `AbstractRetentionPerceptionReader`,
  `AbstractVoidedDocumentsBuilder`, `AbstractVoidedDocumentsReader`). Su forma exacta es un asunto interno.
- **Los *builders* concretos** — `InvoiceBuilder`, `NoteBuilder`, `SummaryBuilder`, `VoidedBuilder`,
  `RetentionBuilder`, `PerceptionBuilder`, `ReversionBuilder`, `DespatchBuilder`, `CarrierDespatchBuilder` y el
  `CompositeBuilder`. El facade los orquesta por ti; tú dependes de la interfaz `Contract\XmlBuilder`.
- **El *plumbing* SOAP y REST** — `Ws\SoapClientSupport` (el *trait* con la montura SOAP 1.1 + WS-Security),
  `Ws\SoapSender`, `Ws\GreClient`, `Ws\CpeValidityClient`, `Ws\BillConsultClient`, `Ws\OAuthAuthenticator` y
  `Ws\CurlHttpClient`. Son clases concretas que envuelven `SoapClient` y curl; se abstraen detrás de
  `Contract\Sender`, `Contract\GreSender`, `Contract\CpeValidator`, `Contract\CpeStatusService` e
  `Contract\HttpClient`.

::: warning No heredes ni instancies directamente lo interno
Si necesitas un `XmlBuilder` distinto, implementa `Contract\XmlBuilder` e inyéctalo en el facade. Subclasificar
`AbstractUblBuilder` o instanciar `SoapSender` a mano te acopla a internos que pueden moverse o renombrarse.
:::

## Versionado

La política prevista es **Semantic Versioning (SemVer)** *a partir de la publicación*. Mientras quipu sea
pre-release, esa política aún no entra en vigor: la API puede cambiar en cualquier momento, sin bump de
versión mayor, porque no hay versión que bumpar.

- `MAJOR` — cambios incompatibles en la API pública.
- `MINOR` — funcionalidad añadida compatible hacia atrás.
- `PATCH` — correcciones compatibles hacia atrás.

No hay fecha comprometida para el `1.0.0` estable; alcanzarla depende de estabilizar la API pública descrita
arriba y de publicar en Packagist. **No planifiques contra una fecha que no existe.**

### Cambios de regla de SUNAT y versionado

Cuando SUNAT modifica una regla, el impacto en la versión depende del tipo de cambio, no del mero hecho de que
SUNAT se movió. El criterio previsto:

- **Aditivo y compatible** (p. ej. SUNAT añade un valor a un catálogo, un campo opcional, un nuevo tipo de
  comprobante soportado): bump **`MINOR`**.
- **Ruptura** (p. ej. SUNAT vuelve obligatorio un campo que era opcional, cambia el formato de un código,
  depreca un comprobante): bump **`MAJOR`**, porque quipu refleja el cambio y eso rompe construcciones que
  antes pasaban.

El proceso para detectar esos cambios y reaccionar está documentado en
[Vigilancia de SUNAT](/produccion/vigilancia-sunat).

## Matriz PHP y extensiones

| Requisito | Detalle |
|---|---|
| PHP | `^8.4` — probado en CI sobre **8.4** y **8.5** (`composer.json`, `.github/workflows/ci.yml`) |
| `ext-soap` | Transporte SOAP a los webservices de SUNAT |
| `ext-dom` | Construcción y lectura del XML UBL 2.1 |
| `ext-openssl` | Firma xmldsig y manejo del certificado |
| `ext-zip` | Compresión del XML en ZIP para el envío |
| `ext-curl` | **Condicional.** Solo si usas el `Ws\CurlHttpClient` incluido (transporte HTTP de la GRE REST y de la Consulta de CPE). No está en `require`: `GreClient` y `CpeValidityClient` reciben un `Contract\HttpClient` por constructor, así puedes inyectar tu propio cliente (Guzzle, Symfony HttpClient) y omitir curl. |

`robrichards/xmlseclibs ^3.1` es la única dependencia de runtime: la firma y la canonicalización C14N se apoyan
en ella. El detalle de instalación y contenedores Docker está en [Instalación](/empezando/instalacion).

## Siguiente paso

Si vienes de evaluar si quipu te sirve, lo útil ahora es ver la [visión general](/arquitectura/vision-general)
y el [inicio rápido](/empezando/inicio-rapido). Si ya lo estás integrando, repasa
[cómo usar quipu](/buenas-practicas/como-usar) y qué [errores comunes](/buenas-practicas/errores-comunes) evitar.
