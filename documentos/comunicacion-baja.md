# Comunicación de baja

La **Comunicación de Baja** (código `RA`) da de baja comprobantes ante SUNAT en los casos que la norma lo
permite. Es un documento **consolidado** con flujo **asíncrono** (ticket + polling), igual que el Resumen Diario.

<Availability lite pro />

::: danger La boleta NO se da de baja con un RA
La comunicación de baja es para **facturas y sus notas**. Una **boleta** se anula informándola en el
**Resumen Diario** con `SummaryStatus::Cancel` (`'3'`, Catálogo 19) —
ver [resumen diario](/documentos/resumen-diario).

quipu **no te frena**: `VoidanceValidator` comprueba que haya ítems, que cada uno traiga motivo y que
referencie serie-correlativo, pero **no mira el `documentType`**. Un `VoidedItem` con
`DocumentType::Receipt` se construye, se firma y se envía sin una sola queja local — el rechazo llega de
SUNAT, no de la librería. Esta página es el único guardarraíl.
:::

::: tip Baja vs. nota de crédito
La baja y la nota de crédito son mecanismos **distintos**. La nota de crédito corrige/anula una venta
referenciando el original; la comunicación de baja retira el comprobante en los casos normativos previstos.
Revisa cuál aplica a tu caso.
:::

## Modelo

`Voidance`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `sequenceNumber` | `string` | correlativo de la comunicación |
| `referenceDate` | `DateTimeImmutable` | fecha de referencia de los documentos a dar de baja |
| `issueDate` | `DateTimeImmutable` | fecha de envío |
| `company` | `Company` | emisor |
| `items` | `list<VoidedItem>` | los documentos a dar de baja |

### `VoidedItem`

| Propiedad | Tipo | Notas |
|---|---|---|
| `documentType` | `DocumentType` | tipo del comprobante a dar de baja (factura/nota — **no** boleta) |
| `series` | `string` | serie del comprobante |
| `number` | `string` | correlativo del comprobante |
| `reason` | `string` | motivo de la baja |

## Nombre de archivo

La baja usa el prefijo `RA`:

<CodeTabs>
<template #php>

```php
$voidance->fileName(); // p. ej. "20512345678-RA-20260715-1"
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
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Model\Voidance;
use ElPandaPe\Quipu\Model\VoidedItem;

$voidance = new Voidance(
    sequenceNumber: '1',
    referenceDate: new DateTimeImmutable('2026-07-14'),
    issueDate: new DateTimeImmutable('2026-07-15'),
    company: $company,
    items: [
        new VoidedItem(
            documentType: DocumentType::Invoice,   // factura o nota, nunca boleta
            series: 'F001',
            number: '1',
            reason: 'ANULACION POR ERROR EN EL RUC',
        ),
    ],
);

// 1) Enviar: SUNAT responde con un ticket
$ticket = $quipu->emitVoidance($voidance);

// 2) Polling: consultar el estado hasta que el CDR esté listo
$cdr = $quipu->getStatus($ticket->ticket);
```

</template>
</CodeTabs>

## Anular una boleta

No uses este documento. La boleta ya fue informada (o se informará) en un Resumen Diario, y ahí mismo se
anula: se envía un `SummaryItem` con `status: SummaryStatus::Cancel`.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Catalog\IdentityDocumentType;
use ElPandaPe\Quipu\Model\SummaryItem;
use ElPandaPe\Quipu\Model\SummaryStatus;   // ojo: Model\, no Catalog\

new SummaryItem(
    documentType: DocumentType::Receipt,
    documentId: 'B001-5',
    clientDocumentType: IdentityDocumentType::Dni,
    clientDocumentNumber: '44556677',
    status: SummaryStatus::Cancel,   // ← anula la boleta
    total: 118.0,
    taxableAmount: 100.0,
    igvAmount: 18.0,
);
```

</template>
</CodeTabs>

El camino completo está en [resumen diario](/documentos/resumen-diario). Ojo con el plazo: SUNAT rechaza con
`2376` — *"La boleta de venta a dar de baja fue informada en un resumen con fecha de recepcion fuera del plazo
permitido"* — cuando el resumen que la informó quedó fuera de la ventana. Ver
[plazos de SUNAT](/dominio-sunat/plazos-sunat).

## Representación impresa: no cubierta

> [!WARNING]
> `qrString()` y `printable()` **solo** soportan factura/boleta (`Invoice`) y notas (`Note`). Con un `Voidance`
> lanzan `InvalidDocumentException`. La comunicación de baja es un documento consolidado sin representación
> impresa propia, y su formato de QR no está confirmado contra ningún anexo técnico de SUNAT: se difirió a
> propósito en vez de inventarlo. Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Resumen diario](/documentos/resumen-diario) — mismo flujo asíncrono (RC).
- [Reversión](/documentos/reversion) — baja de retención/percepción (RR, host otrosCpe).
