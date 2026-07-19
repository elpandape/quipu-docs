# Reversión

La **Reversión** (código `RR`) da de baja comprobantes de **retención** o **percepción** ya emitidos. Comparte
el esquema y el flujo asíncrono de la Comunicación de Baja (RA), pero usa el prefijo `RR` y se envía al host
**otrosCpe**.

<Availability lite pro />

## Modelo

`Reversion` tiene la misma estructura que `Voidance`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `sequenceNumber` | `string` | correlativo de la reversión |
| `referenceDate` | `DateTimeImmutable` | fecha de referencia |
| `issueDate` | `DateTimeImmutable` | fecha de envío |
| `company` | `Company` | agente |
| `items` | `list<VoidedItem>` | retenciones/percepciones a revertir |

Cada `VoidedItem` lleva el tipo (`Retention` `20` o `Perception` `40`), serie, número y motivo.

## Nombre de archivo

La reversión usa el prefijo `RR`:

<CodeTabs>
<template #php>

```php
$reversion->fileName(); // p. ej. "20512345678-RR-20260715-1"
```

</template>
</CodeTabs>

## Flujo

::: warning Verificado con transporte mockeado, no en vivo
Este flujo está construido y cubierto por tests con el transporte **mockeado**, pero su round-trip en vivo
(el CDR final contra SUNAT) **no está confirmado en beta**. La reversión además se sirve desde un **host
distinto** (`otherCpeUrl`) que el Resumen Diario y la Comunicación de Baja, así que es un endpoint aparte
por ejercer. Ver [límites](/empezando/limites#casos-no-cubiertos-hoy).
:::

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Model\Reversion;
use ElPandaPe\Quipu\Model\VoidedItem;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Xml\CompositeBuilder;

$reversion = new Reversion(
    sequenceNumber: '1',
    referenceDate: new DateTimeImmutable('2026-07-14'),
    issueDate: new DateTimeImmutable('2026-07-15'),
    company: $company,
    items: [
        new VoidedItem(
            documentType: DocumentType::Retention,
            series: 'R001',
            number: '5',
            reason: 'RETENCIÓN ANULADA',
        ),
    ],
);

// OJO: la reversión se sirve desde el host otrosCpe
$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(
        SoapEndpoints::production()->otherCpeUrl(),   // ← host otrosCpe
        $ruc . $solUser,
        $solPassword,
    ),
);

$ticket = $quipu->emitReversion($reversion);

// Polling:
$cdr = $quipu->getStatus($ticket->ticket);
```

</template>
</CodeTabs>

::: warning Host distintos
Una reversión enviada al host FE (`billServiceUrl`) falla. Siempre usa `otherCpeUrl()` para retención,
percepción y reversión.
:::

## Representación impresa: no cubierta

> [!WARNING]
> `qrString()` y `printable()` **solo** soportan factura/boleta (`Invoice`) y notas (`Note`). Con un `Reversion`
> lanzan `InvalidDocumentException`. La reversión es un documento consolidado sin representación impresa propia,
> y el formato de QR no está confirmado contra ningún anexo técnico de SUNAT: se difirió a propósito en vez de
> inventarlo. Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Comunicación de baja](/documentos/comunicacion-baja) — la baja de comprobantes FE (RA).
- [Retención](/documentos/retencion) y [Percepción](/documentos/percepcion).
