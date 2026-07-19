# Resumen diario

El **Resumen Diario** (código `RC`) es un documento **consolidado** que reporta las boletas (y sus notas) de un
mismo día calendario. Su envío es **asíncrono**: SUNAT responde con un **ticket** y el CDR se obtiene después,
consultando el estado del ticket.

<Availability lite pro />

## Modelo

`ElPandaPe\Quipu\Model\DailySummary`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `sequenceNumber` | `string` | correlativo del resumen (propio del resumen, no de las boletas) |
| `referenceDate` | `DateTimeImmutable` | día calendario al que pertenecen las boletas |
| `issueDate` | `DateTimeImmutable` | fecha de envío del resumen |
| `currency` | `Currency` | moneda |
| `company` | `Company` | emisor |
| `items` | `list<SummaryItem>` | una línea por boleta/nota consolidada |

### `SummaryItem`

Cada `SummaryItem` es una boleta (o su nota) consolidada:

| Propiedad | Tipo | Notas |
|---|---|---|
| `documentType` | `DocumentType` | `Receipt`, `CreditNote` o `DebitNote` |
| `documentId` | `string` | serie+número de la boleta |
| `clientDocumentType` | `IdentityDocumentType` | tipo de doc del cliente |
| `clientDocumentNumber` | `string` | número de doc del cliente |
| `status` | `SummaryStatus` | estado del ítem (agregar/anular/modificar) |
| `total`, `taxableAmount`, `igvAmount`, … | `float` | totales de la boleta |
| `affectedDocumentType` | `?DocumentType` | si es nota, el tipo del comprobante afectado |
| `affectedDocumentId` | `?string` | si es nota, el id del comprobante afectado |

## Nombre de archivo

El resumen usa el prefijo `RC` y la fecha de envío:

<CodeTabs>
<template #php>

```php
$summary->fileName(); // p. ej. "20512345678-RC-20260715-1"
```

</template>
</CodeTabs>

## Flujo asíncrono

::: warning Verificado con transporte mockeado, no en vivo
Este flujo `sendSummary` → ticket → `getStatus` está construido y cubierto por tests con el transporte
**mockeado**, pero su round-trip en vivo (el CDR final contra SUNAT) **no está confirmado en beta**: el
servidor batch asíncrono de SUNAT beta estaba caído al verificar. Ver
[límites](/empezando/limites#casos-no-cubiertos-hoy).
:::

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Catalog\Currency;
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Catalog\IdentityDocumentType;
use ElPandaPe\Quipu\Model\DailySummary;
use ElPandaPe\Quipu\Model\SummaryItem;
use ElPandaPe\Quipu\Model\SummaryStatus;

$summary = new DailySummary(
    sequenceNumber: '1',
    referenceDate: new DateTimeImmutable('2026-07-15'),
    issueDate: new DateTimeImmutable('2026-07-16'),
    currency: Currency::Sol,
    company: $company,
    items: [
        new SummaryItem(
            documentType: DocumentType::Receipt,
            documentId: 'B001-1',
            clientDocumentType: IdentityDocumentType::Dni,
            clientDocumentNumber: '44556677',
            status: SummaryStatus::Add,
            total: 118.0,
            taxableAmount: 100.0,
            igvAmount: 18.0,
        ),
    ],
);

// 1) Enviar: SUNAT responde con un ticket (no el CDR todavía)
$ticket = $quipu->emitSummary($summary);
printf("Ticket: %s\n", $ticket->ticket);

// 2) Polling: consultar el estado hasta que el CDR esté listo (¡con espera!)
$cdr = pollSummary($quipu, $ticket->ticket);
printf("Estado: %s\n", $cdr->status->value);
```

</template>
</CodeTabs>

### El ticket en proceso **lanza excepción**

SUNAT no procesa el resumen al instante. Si consultas antes de tiempo, responde con `statusCode` `98` y quipu
lanza `TransportException` con el mensaje `The summary is still being processed.`. **No** existe un retorno
"todavía no": `getStatus()` o devuelve el `CdrResult` o lanza. Así que llamarlo **una sola vez, sin bucle,
falla casi siempre**:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\TransportException;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Result\CdrResult;
use RuntimeException;

function pollSummary(Quipu $quipu, string $ticket): CdrResult
{
    for ($attempt = 1; $attempt <= 20; $attempt++) {
        try {
            return $quipu->getStatus($ticket);
        } catch (TransportException $e) {
            if (!str_contains($e->getMessage(), 'still being processed')) {
                throw $e; // fallo real: CDR vacío, status inesperado o SOAP Fault
            }

            sleep(min(2 ** $attempt, 60)); // backoff exponencial, tope 60 s
        }
    }

    throw new RuntimeException('El ticket sigue en proceso tras 20 intentos.');
}
```

</template>
</CodeTabs>

::: warning No reintentes a ciegas
`TransportException` **no expone el `statusCode`** de SUNAT: solo el mensaje. Y quipu lanza esa **misma
clase** para el CDR vacío, para un `statusCode` inesperado y para un SOAP Fault (`SunatFaultException`
extiende `TransportException`). Capturarla y reintentar sin mirar el mensaje convierte un fallo real en un
bucle infinito: discrimina por el mensaje y **acota los intentos**.
Ver [lotes](/guias/lotes) y [manejo de errores](/buenas-practicas/manejo-errores).
:::

::: warning El CDR es del conjunto, no por boleta
En el Resumen Diario el CDR **no es por boleta** sino **del resumen como conjunto**. Si el resumen es
**RECHAZADO**, las boletas de ese resumen **quedaron sin informar** → corrige la causa y reenvía.
:::

## El día tributario es de Lima

> [!IMPORTANT]
> El Resumen Diario agrupa boletas por **día calendario de Lima** (`America/Lima`), no por el día UTC del
> servidor. Un comprobante de las 23:30 hora Perú cae "mañana" en UTC; agruparlo mal lo pone en el resumen
> equivocado.

quipu **no** hace el corte de agrupación ni la agenda del envío —eso es del consumidor—. Recibe un
`DailySummary` ya armado con la `referenceDate` correcta.

## Representación impresa: no cubierta

> [!WARNING]
> `qrString()` y `printable()` **solo** soportan factura/boleta (`Invoice`) y notas (`Note`). Con un
> `DailySummary` lanzan `InvalidDocumentException`. El resumen es un documento consolidado sin representación
> impresa propia (la que se entrega al cliente es la **boleta**, y esa sí está cubierta), y su formato de QR no
> está confirmado contra ningún anexo técnico de SUNAT: se difirió a propósito en vez de inventarlo.
> Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Comunicación de baja](/documentos/comunicacion-baja) — mismo flujo asíncrono (RA).
- [Plazos de SUNAT](/dominio-sunat/plazos-sunat) — ventanas de envío.
