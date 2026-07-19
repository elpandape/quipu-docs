# Percepción

El **Comprobante de Percepción electrónica** (código `40`) lo emite un **agente de percepción** designado por
SUNAT, para reportar los montos percibidos de sus clientes.

<Availability lite pro />

> [!IMPORTANT]
> Igual que la retención, la percepción se sirve desde el host **otrosCpe** de SUNAT. Inyecta un `Sender`
> construido con `SoapEndpoints::otherCpeUrl()`.

## Modelo

`ElPandaPe\Quipu\Model\Perception`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `series` | `string` | `P001` |
| `number` | `string` | correlativo |
| `issueDate` | `DateTimeImmutable` | fecha de emisión |
| `company` | `Company` | agente de percepción |
| `supplier` | `Client` | cliente al que se le percibe |
| `regimeCode` | `PerceptionRegime` | Cat. 22 |
| `percent` | `float` | tasa (2.0 / 1.0 / 0.5 según régimen) |
| `perceivedAmount` | `float` | monto percibido |
| `collectedAmount` | `float` | monto cobrado (incluye percepción) |
| `items` | `list<PerceptionItem>` | documentos afectados |

### Régimen (Catálogo 22)

| Código | Régimen | Tasa |
|---|---|---|
| `01` | `InternalSale` (venta interna) | 2.00% |
| `02` | `FuelAcquisition` (adquisición de combustible) | 1.00% |
| `03` | `SpecialRate` (tasa especial) | 0.50% |

### `PerceptionItem`

| Propiedad | Tipo | Notas |
|---|---|---|
| `affectedDocumentType` | `DocumentType` | tipo del comprobante de venta afectado |
| `affectedDocumentId` | `string` | serie+número |
| `affectedIssueDate` | `DateTimeImmutable` | fecha del comprobante afectado |
| `affectedCurrency` | `Currency` | moneda |
| `affectedTotal` | `float` | total del comprobante afectado → `cbc:TotalInvoiceAmount` de la referencia |
| `collectedAmount` | `float` | **importe percibido** por ese documento → `sac:SUNATPerceptionAmount` |
| `perceptionDate` | `DateTimeImmutable` | fecha de percepción |
| `netCollected` | `float` | neto cobrado por ese documento (afectado + percibido) → `sac:SUNATNetTotalCashed` |

::: danger `collectedAmount` del ítem NO es el monto cobrado
El nombre engaña, y el mismo nombre significa **cosas distintas** en la cabecera y en el ítem:

| Campo | Nodo UBL | Qué es |
|---|---|---|
| `Perception::$perceivedAmount` | `cbc:TotalInvoiceAmount` | percibido total |
| `Perception::$collectedAmount` | `sac:SUNATTotalCashed` | **cobrado** total |
| `PerceptionItem::$collectedAmount` | `sac:SUNATPerceptionAmount` | **percibido** del ítem |
| `PerceptionItem::$netCollected` | `sac:SUNATNetTotalCashed` | **cobrado** neto del ítem |

Poner el cobrado (`1020.0`) en `PerceptionItem::$collectedAmount` declara un percibido de 1020 sobre una venta
de 1000. `PerceptionValidator` lo detecta —suma los `collectedAmount` de los ítems y los contrasta contra
`perceivedAmount`— pero **la validación es opt-in**: si no la ejecutas, el XML se firma y llega a SUNAT como
rechazo. Ver [validación local](/guias/validacion-local).
:::

## Ejemplo

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Catalog\Currency;
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Catalog\PerceptionRegime;
use ElPandaPe\Quipu\Model\Perception;
use ElPandaPe\Quipu\Model\PerceptionItem;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Xml\CompositeBuilder;

$perception = new Perception(
    series: 'P001',
    number: '1',
    issueDate: new DateTimeImmutable(),
    company: $company,
    supplier: $client,
    regimeCode: PerceptionRegime::InternalSale,
    percent: 2.0,
    perceivedAmount: 20.0,        // percibido total  → cbc:TotalInvoiceAmount
    collectedAmount: 1020.0,      // cobrado total    → sac:SUNATTotalCashed
    items: [
        new PerceptionItem(
            affectedDocumentType: DocumentType::Invoice,
            affectedDocumentId: 'F001-10',
            affectedIssueDate: new DateTimeImmutable('2026-07-10'),
            affectedCurrency: Currency::Sol,
            affectedTotal: 1000.0,    // venta afectada
            collectedAmount: 20.0,    // PERCIBIDO del ítem → sac:SUNATPerceptionAmount
            perceptionDate: new DateTimeImmutable(),
            netCollected: 1020.0,     // cobrado neto (1000 + 20) → sac:SUNATNetTotalCashed
        ),
    ],
);

$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(
        SoapEndpoints::production()->otherCpeUrl(),   // ← host otrosCpe
        $ruc . $solUser,
        $solPassword,
    ),
);

$result = $quipu->emit($perception);
$cdr = $result->cdr;
```

</template>
</CodeTabs>

## Importes siempre en soles (PEN)

`PerceptionBuilder` emite **siempre en PEN** los importes del comprobante de percepción, con independencia de la
moneda de los comprobantes afectados (el modelo `Perception` no tiene campo de moneda propio):

- El total percibido (`cbc:TotalInvoiceAmount`) y el total cobrado (`sac:SUNATTotalCashed`) de la cabecera van
  con `currencyID="PEN"`.
- Por ítem, el percibido (`sac:SUNATPerceptionAmount`) y el neto cobrado (`sac:SUNATNetTotalCashed`) también van
  en `PEN`.
- **Solo** el total del comprobante afectado (`cbc:TotalInvoiceAmount` dentro de la referencia) respeta la
  moneda que declaras en `PerceptionItem::$affectedCurrency`.

::: danger Ojo si el comprobante afectado está en USD (u otra moneda)
Como los importes de la percepción se etiquetan siempre como PEN, no puedes pasarles directamente los montos en
dólares de una factura en USD: quipu los marcaría como `PEN` y el XML saldría inconsistente (la referencia del
comprobante afectado en USD y la percepción "en PEN"). Convierte los montos percibidos y cobrados a soles antes
de construir el `Perception` y sus `PerceptionItem`. quipu **no** valida este descalce de monedas, así que el
documento incorrecto se firma y se envía sin aviso.
:::

## Nombre de archivo

La percepción usa el código `40`:

<CodeTabs>
<template #php>

```php
$perception->fileName(); // p. ej. "20512345678-40-P001-1"
```

</template>
</CodeTabs>

## Representación impresa: no cubierta

> [!WARNING]
> El comprobante de percepción **sí tiene** representación impresa por norma —pero **quipu no te la da**.
> `qrString()` y `printable()` solo soportan factura/boleta (`Invoice`) y notas (`Note`): con un `Perception`
> lanzan `InvalidDocumentException`. El motivo es deliberado: el formato del QR de percepción no está confirmado
> contra su anexo técnico de SUNAT, y se prefirió no emitir un QR inventado antes que uno incorrecto. El impreso
> (QR incluido) queda de tu lado. Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Retención](/documentos/retencion) — análoga, host otrosCpe.
- [Reversión](/documentos/reversion) — baja de retención/percepción (RR).
