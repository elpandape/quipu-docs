# Retención

El **Comprobante de Retención electrónica** (código `20`) lo emite un **agente de retención** designado por
SUNAT, para reportar los montos retenidos a sus proveedores.

<Availability lite pro />

> [!IMPORTANT]
> La retención (y la percepción) se sirven desde un **host distinto** al de factura/boleta: el host **otrosCpe**
> de SUNAT. Inyecta un `Sender` construido con `SoapEndpoints::otherCpeUrl()`, **no** `billServiceUrl()`.

## Modelo

`Retention`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `series` | `string` | `R001` |
| `number` | `string` | correlativo |
| `issueDate` | `DateTimeImmutable` | fecha de emisión |
| `company` | `Company` | agente de retención |
| `supplier` | `Client` | proveedor al que se le retiene |
| `regimeCode` | `RetentionRegime` | Cat. 23 (`Rate3` o `Rate6`) |
| `percent` | `float` | tasa aplicada (p. ej. `3.0`) |
| `retainedAmount` | `float` | monto retenido |
| `paidAmount` | `float` | monto pagado al proveedor (neto) |
| `items` | `list<RetentionItem>` | documentos afectados |

### `RetentionItem`

| Propiedad | Tipo | Notas |
|---|---|---|
| `affectedDocumentType` | `DocumentType` | tipo del comprobante de compra afectado |
| `affectedDocumentId` | `string` | serie+número |
| `affectedIssueDate` | `DateTimeImmutable` | fecha del comprobante afectado |
| `affectedCurrency` | `Currency` | moneda del comprobante afectado |
| `affectedTotal` | `float` | total del comprobante afectado |
| `retainedAmount` | `float` | monto retenido de ese documento |
| `retentionDate` | `DateTimeImmutable` | fecha de retención |
| `netPaid` | `float` | neto pagado por ese documento |

## Ejemplo

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Catalog\Currency;
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Catalog\RetentionRegime;
use ElPandaPe\Quipu\Model\Retention;
use ElPandaPe\Quipu\Model\RetentionItem;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Xml\CompositeBuilder;

$retention = new Retention(
    series: 'R001',
    number: '1',
    issueDate: new DateTimeImmutable(),
    company: $company,
    supplier: $supplier,
    regimeCode: RetentionRegime::Rate3,
    percent: 3.0,
    retainedAmount: 30.0,
    paidAmount: 970.0,
    items: [
        new RetentionItem(
            affectedDocumentType: DocumentType::Invoice,
            affectedDocumentId: 'F001-10',
            affectedIssueDate: new DateTimeImmutable('2026-07-10'),
            affectedCurrency: Currency::Sol,
            affectedTotal: 1000.0,
            retainedAmount: 30.0,
            retentionDate: new DateTimeImmutable(),
            netPaid: 970.0,
        ),
    ],
);

// OJO: endpoint otrosCpe, NO billService
$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(
        SoapEndpoints::production()->otherCpeUrl(),   // ← host otrosCpe
        $ruc . $solUser,
        $solPassword,
    ),
);

$result = $quipu->emit($retention);
$cdr = $result->cdr;
```

</template>
</CodeTabs>

## Importes siempre en soles (PEN)

`RetentionBuilder` emite **siempre en PEN** los importes del comprobante de retención, con independencia de la
moneda de los comprobantes afectados (el modelo `Retention` no tiene campo de moneda propio):

- El total retenido (`cbc:TotalInvoiceAmount`) y el total pagado (`sac:SUNATTotalPaid`) de la cabecera van con
  `currencyID="PEN"`.
- Por ítem, el retenido (`sac:SUNATRetentionAmount`) y el neto pagado (`sac:SUNATNetTotalPaid`) también van en
  `PEN`.
- **Solo** el total del comprobante afectado (`cbc:TotalInvoiceAmount` dentro de la referencia) respeta la
  moneda que declaras en `RetentionItem::$affectedCurrency`.

::: danger Ojo si el comprobante afectado está en USD (u otra moneda)
Como los importes de la retención se etiquetan siempre como PEN, no puedes pasarles directamente los montos en
dólares de una factura en USD: quipu los marcaría como `PEN` y el XML saldría inconsistente (la referencia del
comprobante afectado en USD y la retención "en PEN"). Convierte los montos retenidos y pagados a soles antes de
construir el `Retention` y sus `RetentionItem`. quipu **no** valida este descalce de monedas, así que el
documento incorrecto se firma y se envía sin aviso.
:::

## Nombre de archivo

La retención usa el código `20`:

<CodeTabs>
<template #php>

```php
$retention->fileName(); // p. ej. "20512345678-20-R001-1"
```

</template>
</CodeTabs>

## Representación impresa: no cubierta

> [!WARNING]
> El comprobante de retención **sí tiene** representación impresa por norma —pero **quipu no te la da**.
> `qrString()` y `printable()` solo soportan factura/boleta (`Invoice`) y notas (`Note`): con un `Retention`
> lanzan `InvalidDocumentException`. El motivo es deliberado: el formato del QR de retención no está confirmado
> contra su anexo técnico de SUNAT, y se prefirió no emitir un QR inventado antes que uno incorrecto. El impreso
> (QR incluido) queda de tu lado. Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Percepción](/documentos/percepcion) — análoga, host otrosCpe.
- [Reversión](/documentos/reversion) — baja de retención/percepción (RR).
- [Endpoints](/referencia/endpoints) — los tres hosts de SUNAT.
