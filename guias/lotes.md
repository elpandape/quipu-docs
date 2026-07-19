# Lotes (sendPack)

quipu puede enviar un **lote de hasta 500 documentos** en un solo ZIP (`sendPack`), en lugar de uno por uno.
Es útil cuando facturas a escala y quieres reducir los viajes a SUNAT.

<Availability lite pro />

::: tip Reintentos e idempotencia sin escribirlos a mano
El envío por lotes es del **emisor base (Lite)**, incluido el polling con backoff que verás abajo. Si no quieres
mantener a mano el reintento y evitar reenvíos duplicados, **quipu Pro** <Availability pro /> envuelve el envío
con decoradores de **retry**, **logging** e **idempotencia** respetando la misma interfaz. Ver
[Infraestructura resiliente (Pro)](/pro/infra).
:::

## El flujo

`sendPack` es **asíncrono**: SUNAT responde con un **ticket**, y luego consultas el estado con `getPackStatus()`
(**no** `getStatus()`), que devuelve **un `CdrResult` por documento**, indexado por nombre de comprobante.

<CodeTabs>
<template #php>

```php
// 1) Firma cada documento localmente (como siempre)
$signed1 = $quipu->sign($invoice1);
$signed2 = $quipu->sign($invoice2);
$signed3 = $quipu->sign($invoice3);

// 2) Envía el lote (hasta 500)
$batchName = (new BatchNamer())->build($ruc, new DateTimeImmutable(), '1');
$ticket = $quipu->sendPack([$signed1, $signed2, $signed3], $batchName);

// 3) Polling: un CdrResult por documento (¡con espera! ver más abajo)
$results = pollPack($quipu, $ticket->ticket);
// $results = ['20512345678-01-F001-1' => CdrResult, ...]

foreach ($results as $fileName => $cdr) {
    printf("%s: %s\n", $fileName, $cdr->status->value);
}
```

</template>
</CodeTabs>

::: danger Los nombres duplicados se pierden en silencio
El ZIP del lote se **indexa por nombre de archivo**: `sendPack` construye el array de entradas con
`$entries[$extractor->extract($signedXml->xml) . '.xml'] = $signedXml->xml`. Si dos `SignedXml` del lote
resuelven al **mismo `{ruc}-{tipo}-{serie}-{número}`** (p. ej. reutilizaste un correlativo), el segundo
**sobrescribe al primero**: el ZIP viaja con **un solo documento**, sin excepción ni aviso, y el
`getPackStatus()` devuelve un CDR menos de los que enviaste.

quipu **no** valida esto hoy. Está registrado como pendiente en el repo:

> **sendPack:** el límite de 500 docs/lote no se valida en código (SUNAT lo rechaza en el borde);
> `SoapSender::sendPack` indexa por nombre base, así que correlativos duplicados por el llamador
> deduplicarían en silencio → un `throw` en colisión sería un endurecimiento barato.

Mientras tanto, **es tuya la responsabilidad**: verifica antes de enviar que los correlativos del lote no se
repitan, y **compara `count($results)` contra `count($documents)`** al resolver el ticket. Si no cuadran,
colapsó un duplicado.
:::

## Nombre del lote

SUNAT espera un nombre de lote con la convención `{ruc}-LT-{yyyymmdd}-{correlativo}.zip`. Usa `BatchNamer`:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\BatchNamer;

$batchName = (new BatchNamer())->build(
    ruc: '20512345678',
    generatedAt: new DateTimeImmutable(),
    sequenceNumber: '1',   // único por RUC; lo asignas tú
);
```

</template>
</CodeTabs>

::: warning El correlativo es tuyo
SUNAT solo exige que el correlativo del lote sea **único por RUC**. quipu no lleva estado de secuencias —eso es
del consumidor—. Asígualo tú de forma atómica.
:::

## `getPackStatus()` vs `getStatus()`

- `getStatus(ticket)` — para `sendSummary` (resumen/baja/reversión): el ZIP del ticket tiene **un solo CDR**.
  Devuelve un `CdrResult`.
- `getPackStatus(ticket)` — para `sendPack`: el ZIP del ticket tiene **un CDR por documento**. Devuelve un
  `array<string, CdrResult>` indexado por nombre de comprobante.

Ambos llaman a la misma operación `getStatus` de SUNAT; la diferencia es cómo se parsea el ZIP devuelto.

## Un ticket en proceso **lanza excepción** (no devuelve null)

Un lote no se procesa al instante. Si consultas el ticket antes de que SUNAT termine, este responde con
`statusCode` `98` y quipu **lanza `TransportException`**:

```
The summary is still being processed.
```

No hay valor de retorno "todavía no": `getPackStatus()` (y `getStatus()`) **o devuelven el CDR o lanzan**.
Por eso **hay que hacer polling con espera**, y no llamar una sola vez:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\TransportException;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Result\CdrResult;
use RuntimeException;

/** @return array<string, CdrResult> */
function pollPack(Quipu $quipu, string $ticket): array
{
    for ($attempt = 1; $attempt <= 20; $attempt++) {
        try {
            return $quipu->getPackStatus($ticket);
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

::: warning El único discriminante es el mensaje
`TransportException` **no expone el `statusCode` de SUNAT** — no lleva código ni propiedad alguna, solo el
mensaje (`TransportException` extiende `QuipuException`, que extiende `RuntimeException`). Y quipu
lanza la **misma clase** para el CDR vacío, para un `statusCode` inesperado y para un SOAP Fault
(`SunatFaultException` **extiende** `TransportException`, así que también entra en ese `catch`).

Es decir: **no puedes reintentar a ciegas** capturando `TransportException` — un fallo real te dejaría en un
bucle infinito. Distingue por el mensaje (como arriba) y **acota siempre los intentos**.
:::

## Límite de 500

SUNAT rechaza lotes de más de 500 documentos. quipu **no** valida este límite en código (SUNAT lo hace en el
borde): asegúrate de no excederlo al construir el array.

## Alcance: solo facturas, boletas y notas

`sendPack` es una operación del **`billService` del host FE** (`billServiceUrl()`), pensada para
**facturas, boletas y notas de crédito/débito**. La firma, en cambio, declara `@param list<SignedXml>`:
acepta **cualquier `SignedXml`** y **no valida el tipo**.

Nada te impide meter en el lote un **Resumen Diario**, una **Comunicación de baja** o una **Retención /
Percepción** — y nada en quipu te lo advertirá. Pero:

- **Resumen y baja** se sirven desde el **mismo host FE**, pero por una **operación distinta**
  (`sendSummary` + `getStatus`): no van en lote.
- **Retención (20) y Percepción (40)** se sirven desde un **host distinto**
  (`otherCpeUrl()`, `ol-ti-itemision-otroscpe-gem`). Un `Quipu` apuntado al host FE **no** puede enviarlas,
  en lote ni sueltas.

::: warning Un lote, una familia
Arma el lote **solo** con facturas, boletas y notas. Los demás comprobantes tienen su propio camino — ver
[endpoints](/referencia/endpoints).
:::

## Siguiente paso

- [El facade Quipu](/arquitectura/facade)
- [Manejo de errores](/buenas-practicas/manejo-errores)
