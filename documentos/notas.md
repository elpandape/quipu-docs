# Notas de crédito y débito

Un comprobante emitido **no se borra**: para anular una venta, registrar una devolución o ajustar un importe,
se emite una **nota de crédito** o **nota de débito** que **referencia el comprobante original** e indica un
**motivo tipificado** por catálogo SUNAT.

- **Nota de crédito** (Cat. 01 código `07`) — anulaciones, devoluciones, descuentos posteriores. Motivo del
  **Catálogo 09**.
- **Nota de débito** (Cat. 01 código `08`) — ajustes al alza (intereses, cargos posteriores). Motivo del
  **Catálogo 10**.

<Availability lite pro />

## Modelo

`Note` es un DTO `readonly`. La nota hereda la estructura de un comprobante de venta
(detalles, totales, leyendas) y añade la **referencia al documento afectado** y el **motivo**:

| Propiedad | Tipo | Notas |
|---|---|---|
| `motive` | `CreditNoteType \| DebitNoteType` | el motivo tipifica si es crédito o débito |
| `motiveDescription` | `string` | descripción del motivo |
| `affectedDocumentType` | `DocumentType` | tipo del comprobante que se corrige |
| `affectedDocumentId` | `string` | serie+número del comprobante que se corrige |
| `series` | `string` | ligada a la serie del comprobante original |
| `number` | `string` | correlativo |
| `company`, `client`, `details`, `legends`, totales | … | igual que `Invoice` |

El `documentType()` se infiere del motivo: si `motive` es `CreditNoteType` → `DocumentType::CreditNote`; si es
`DebitNoteType` → `DocumentType::DebitNote`.

## Motivos (Catálogo 09 — nota de crédito)

| Código | Motivo |
|---|---|
| `01` | Anulación de la operación |
| `02` | Anulación por error en el RUC |
| `03` | Corrección por error en la descripción |
| `04` | Descuento global |
| `05` | Descuento por ítem |
| `06` | Devolución total |
| `07` | Devolución por ítem |
| `08` | Bonificación |
| `09` | Disminución en el valor |
| `10` | Otros conceptos |
| `11` | Ajustes de operaciones de exportación |
| `12` | Ajustes afectos al IVAP |
| `13` | Ajustes en fecha y/o monto |

## Motivos (Catálogo 10 — nota de débito)

| Código | Motivo |
|---|---|
| `01` | Intereses por mora |
| `02` | Aumento en el valor |
| `03` | Penalidades u otros cargos |
| `10` | Ajustes de operaciones de exportación |
| `11` | Ajustes afectos al IVAP |

## Ejemplo: nota de crédito por devolución total

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Catalog\CreditNoteType;
use ElPandaPe\Quipu\Catalog\Currency;
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Catalog\LegendCode;
use ElPandaPe\Quipu\Model\Legend;
use ElPandaPe\Quipu\Model\Note;

$note = new Note(
    motive: CreditNoteType::TotalReturn,
    motiveDescription: 'DEVOLUCIÓN TOTAL DE LA VENTA',
    affectedDocumentType: DocumentType::Invoice,
    affectedDocumentId: 'F001-1',
    series: 'FC01',
    number: '1',
    issueDate: new DateTimeImmutable(),
    currency: Currency::Sol,
    company: $company,
    client: $client,
    details: [$detail],
    legends: [new Legend(LegendCode::AmountInWords, 'SON ...')],
    taxableAmount: 200.0,
    igvAmount: 36.0,
    taxTotal: 36.0,
    saleValue: 200.0,
    totalAmount: 236.0,
);
```

</template>
</CodeTabs>

## Emisión

Las notas **sobre factura** se envían **individualmente** (flujo síncrono, como la factura):

<CodeTabs>
<template #php>

```php
$quipu = new Quipu(
    new CompositeBuilder(),                  // NoteBuilder está dentro del composite
    new XmlSecSigner($certificate),
    new SoapSender(SoapEndpoints::production()->billServiceUrl(), $user, $pass),
);

$result = $quipu->emit($note);
$cdr = $result->cdr;
```

</template>
</CodeTabs>

::: warning Las notas sobre BOLETA van en el Resumen Diario
Una nota de crédito/débito que corrige una **boleta** se reporta **consolidada** en el Resumen Diario, como
una línea más: ese es el mecanismo estándar para las boletas y sus notas, no `emit()`. Se arma un
`SummaryItem` con `documentType: DocumentType::CreditNote` (o `DebitNote`) y la boleta corregida en
`affectedDocumentType` / `affectedDocumentId`:

<CodeTabs>
<template #php>

```php
new SummaryItem(
    documentType: DocumentType::CreditNote,
    documentId: 'BC01-1',
    // …
    affectedDocumentType: DocumentType::Receipt,   // la boleta que corrige
    affectedDocumentId: 'B001-1',
);
```

</template>
</CodeTabs>

`SummaryBuilder` solo emite el nodo `cac:BillingReference` cuando **ambos** campos `affected*` están
presentes; si falta uno, la nota viaja sin referencia al original. Ver
[resumen diario](/documentos/resumen-diario).
:::

::: tip Usa CompositeBuilder
`NoteBuilder` solo sabe construir notas (crédito y débito son ambas `Note`, y las distingue por el `motive`, no
por el `DocumentType`): si le pasas otro documento lanza `InvalidDocumentException`. Si emites varios tipos en
la misma app, usa `CompositeBuilder`, que despacha al builder adecuado según el `DocumentType`.
:::

## Diferencias frente a `Invoice`

La nota comparte la estructura de un comprobante de venta (detalles, totales, leyendas), pero **no todos** los
opcionales de `Invoice`: no tiene `dueDate`, `purchaseOrder`, `ivapAmount`/`ivapBaseAmount`,
`othAmount`/`othBaseAmount`, `prepaidPayments`/`prepaidAmount`, `despatchReferences`,
`additionalDocumentReferences`, `deliveryAddress`, `perception`, `embeddedDespatch` ni `seller`. La firma
completa está en [modelos — `Note`](/referencia/modelos#note-nota-de-credito-debito).

### Una nota al contado **no** emite Forma de Pago

A diferencia de la factura y la boleta, una `Note` con `PaymentForm::Cash` (el default) **no** genera el bloque
`cac:PaymentTerms` de Forma de Pago. `NoteBuilder` solo emite ese nodo cuando hay una detracción declarada o
cuando `paymentForm` es `Credit` (para el plan de cuotas): la Forma de Pago es una regla de los comprobantes de
venta (factura/boleta), no de las notas, así que una nota simple viaja sin ese nodo. Si necesitas reportar
cuotas, marca `PaymentForm::Credit` y entrega `installments`.

::: tip El crédito requiere cuotas, igual que la factura
No hay trato distinto para la nota: con `PaymentForm::Credit` debes entregar al menos un `installment`. Una nota
al crédito sin cuotas se rechaza en la validación con *"El pago al crédito requiere al menos una cuota."*
(`NoteValidator`), la misma regla que cumple la factura (`InvoiceValidator`). Y al contado, como en la factura,
no se admiten cuotas.
:::

## Serie de la nota

Las notas de crédito/débito **referencian** el comprobante original (tipo, serie, número) y llevan su propia
serie, típicamente ligada al tipo que corrigen:

- Nota de crédito sobre factura → serie `FC01` (o la que asignaste)
- Nota de crédito sobre boleta → serie `BC01`
- Nota de débito sobre factura → serie `FD01`

La convención de series la define el emisor; quipu no impone una, solo la recibe.

## Representación impresa y QR

Las notas son una de las familias **cubiertas** por la representación impresa de quipu (vía `NotePrintMapper`),
junto con factura y boleta:

<CodeTabs>
<template #php>

```php
$signed = $quipu->sign($note);

$qr   = $quipu->qrString($note, $signed);   // string del QR (Anexo N.6)
$view = $quipu->printable($note, $signed);  // datos para armar el PDF
```

</template>
</CodeTabs>

Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Comunicación de baja](/documentos/comunicacion-baja) — otro mecanismo de anulación.
- [Validación local](/guias/validacion-local) — valida la nota antes de enviar.
