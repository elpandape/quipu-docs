# Resultados

Esta página documenta los **value objects `readonly`** tipados bajo `ElPandaPe\Quipu\Result\` — el tipo de
retorno de `sign()`, `emit*()` y el polling de tickets.

<Availability lite pro />

No todas las operaciones del facade devuelven un `Result\*`. Algunas devuelven un **array** y otras un value
object que vive en otro namespace; todas son clases propias de quipu (no expone tipos de terceros), pero el tipo
concreto sí varía:

| Operación | Devuelve | Vive en |
|---|---|---|
| `validate($doc)` | `list<string>` (las violaciones) | array plano |
| `getPackStatus($ticket)` | `array<string, CdrResult>` (un `CdrResult` por comprobante del lote) | array plano |
| `validateCpe($query)` | `CpeValidity` | `Model\` |
| `printable($doc, $signed)` | `PrintView` | `Presentation\` |
| `read($xml)` | `Document` (el `Model\*` correspondiente) | `Contract\` |

El resto de operaciones —`sign()`, `sendBill()`, `emit*()`, el polling de tickets y las consultas— sí devuelve un
`Result\*`, documentado a continuación.

## `SignedXml`

Resultado de `sign()` — el XML firmado y su digest.

<CodeTabs>
<template #php>

```php
$signed = $quipu->sign($invoice);

$signed->xml;          // string, XML UBL firmado (xmldsig)
$signed->digestValue;  // string, DigestValue de la firma
```

</template>
</CodeTabs>

## `BillResult`

Resultado de `sendBill()` / `emit()` / `emitInvoice()` — el CDR síncrono.

<CodeTabs>
<template #php>

```php
$result = $quipu->emitInvoice($invoice);
$result->cdr;   // CdrResult
```

</template>
</CodeTabs>

## `TicketResult`

Resultado de `sendSummary()` / `emitSummary()` / `emitVoidance()` / `emitReversion()` / `sendPack()` /
`emitGuide()` — el ticket asíncrono.

<CodeTabs>
<template #php>

```php
$ticket = $quipu->emitSummary($summary);
$ticket->ticket;   // string, el ticket para hacer polling
```

</template>
</CodeTabs>

### Cada productor de ticket se hace polling con un método distinto

No hay un único `getStatus()`: el método de polling depende de qué operación generó el ticket. Usar el
equivocado no lanza —devuelve un resultado silenciosamente incorrecto—.

| Ticket de | Poll con | Devuelve |
|---|---|---|
| `sendSummary()` / `emitSummary()` / `emitVoidance()` / `emitReversion()` | `getStatus($ticket)` | un `CdrResult` |
| `sendPack()` (lote) | `getPackStatus($ticket)` | `array<string, CdrResult>` (uno por comprobante) |
| `emitGuide()` (GRE) | `getGuideStatus($ticket)` | un `CdrResult` (requiere `GreSender`) |

::: danger `getStatus()` sobre un ticket de lote da un resultado incorrecto, sin lanzar
Un ticket de `sendPack()` **solo** se resuelve con `getPackStatus()`. Si lo pasas a `getStatus()`, este no
falla: resuelve el ticket a un único `CdrResult` y pierde el resto del lote. Es lo que advierte el propio
facade en el docblock de `sendPack()`. Antes de hacer polling, correlaciona cada ticket con el método que lo
generó.
:::

## `CdrResult`

El CDR parseado — el tipo central de los resultados.

<CodeTabs>
<template #php>

```php
$cdr = $result->cdr;   // o $quipu->getStatus($ticket->ticket)

$cdr->status;           // CdrStatus enum
$cdr->responseCode;     // string, código de SUNAT ("0" = aceptado)
$cdr->description;      // string, descripción del código
$cdr->notes;            // list<string>, observaciones
$cdr->xml;              // ?string, XML del CDR si SUNAT lo devolvió
$cdr->severity;         // ?CdrSeverity, severidad para reintentos
$cdr->resolvedMessage;  // ?string, responseCode traducido vía ErrorCatalog
$cdr->isAccepted();     // bool, true salvo rechazo
```

</template>
</CodeTabs>

### `CdrStatus` (enum)

<CodeTabs>
<template #php>

```php
CdrStatus::Accepted;                 // 'accepted'
CdrStatus::AcceptedWithObservations; // 'accepted_with_observations'
CdrStatus::Rejected;                 // 'rejected'
```

</template>
</CodeTabs>

### `CdrSeverity` (enum)

Severidad derivada del `responseCode`, ortogonal al `CdrStatus`. Útil para decidir si reintentar:

<CodeTabs>
<template #php>

```php
CdrSeverity::Accepted;   // código 0
CdrSeverity::Exception;  // 100–1999 (sistema o formato): no reintentar a ciegas
CdrSeverity::Rejection;  // 2000–3999 (contenido): corregir antes de reenviar
CdrSeverity::Observation;// 4000+ (aceptado con observación)
```

</template>
</CodeTabs>

Los rangos siguen la clasificación del *Manual del Programador*: `100`–`999` son excepciones del **sistema de
SUNAT** (transitorias, seguras de reintentar); `1000`–`1999` son excepciones de **formato/estructura del
contribuyente** (llegan como SOAP Fault, no como CDR: hay que corregir el XML, no reintentar a ciegas). Ambas
bandas son excepciones —no se emite CDR—, y por eso ambas mapean a `Exception`.

Constrúyela desde un código: `CdrSeverity::fromCode((int) $code)`.

> [!IMPORTANT] El default es `Exception`
> Cualquier código **fuera de los rangos conocidos** —incluidos los negativos, que SUNAT nunca emite, y la
> franja `1`–`99`— cae en `CdrSeverity::Exception`. Es una decisión de diseño deliberada: ante un código que no
> se puede clasificar, `Exception` es el bucket más seguro. Para tu lógica de reintentos esto implica que un
> código desconocido **nunca** se tratará como `Accepted` ni como `Observation` por accidente.

## `BillConsultResult`

Resultado de `getBillStatus()` / `retrieveCdr()` — la consulta de tu propio CPE (SOAP `billConsultService`).

> [!NOTE]
> Es un **espacio de códigos distinto** al de `CdrResult`/`CdrStatus`. `$statusCode` es el estado propio de
> `billConsultService`, un nivel por encima; el `responseCode` del CDR vive dentro de `$cdr`, cuando SUNAT lo
> adjunta.

<CodeTabs>
<template #php>

```php
$result = $quipu->getBillStatus($ruc, $tipo, $serie, $numero);

$result->statusCode;      // "0001" aceptado, "0002" rechazado, "0003" de baja, ...
$result->statusMessage;   // string
$result->cdr;             // ?CdrResult, presente si SUNAT adjuntó el CDR

$result->exists();        // bool
$result->isAccepted();    // bool
$result->isRejected();    // bool
$result->isVoided();      // bool
$result->isNotFound();    // bool
$result->isNotOwned();    // bool
$result->hasCdr();        // bool
```

</template>
</CodeTabs>

### Cuándo viene el `$cdr`

`$cdr` se puebla **solo cuando SUNAT adjunta un `content` no vacío** en su respuesta, y ese CDR se parsea con
éxito. Es `null` en los resultados de solo consulta: un comprobante de baja, o cualquiera de los errores de
entrada/búsqueda (`0004`–`0012`).

> [!IMPORTANT]
> `retrieveCdr()` (`getStatusCdr`) **no es la única vía** para obtener el CDR. Ambas operaciones comparten el
> mismo tipo XSD `statusResponse`, así que **`getBillStatus()` (`getStatus`) también puede devolverlo**. No
> asumas que `$result->cdr` es `null` solo porque llamaste a `getBillStatus()`: comprueba `hasCdr()`.

Ver [consulta de CPE](/guias/consulta-cpe) para los códigos completos.

## Siguiente paso

- [Excepciones](/referencia/excepciones) — la jerarquía de errores.
- [El facade Quipu](/arquitectura/facade) — qué método devuelve qué resultado.
