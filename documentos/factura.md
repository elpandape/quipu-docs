# Factura electrónica

La **factura electrónica** (Cat. 01 código `01`) se emite cuando el cliente aporta **RUC** y la solicita. Se
envía **individualmente** a SUNAT y recibe su **CDR síncrono** en la misma respuesta.

<Availability lite pro />

::: tip Un builder fluido en Pro
Emitir la factura —construir, firmar, enviar y leer el CDR— es capacidad de la edición **Lite**, la que cubre
esta página. Si prefieres armarla desde inputs mínimos, con plantillas y sin liquidar los totales a mano, el
*fluent builder* es una comodidad de **quipu Pro** <Availability pro />. Ver [Fluent Builder](/pro/fluent-builder).
:::

## Modelo

`ElPandaPe\Quipu\Model\Invoice` es un DTO `readonly` que sirve para **factura y boleta** —se distinguen por el
`DocumentType`. Las propiedades clave del constructor:

| Propiedad | Tipo | Notas |
|---|---|---|
| `documentType` | `DocumentType::Invoice` | `01` |
| `series` | `string` | `F001`, inicia con `F` |
| `number` | `string` | correlativo incremental, sin huecos |
| `issueDate` | `DateTimeImmutable` | fecha de emisión |
| `operationType` | `OperationType` | Cat. 51 (p. ej. `InternalSale`) |
| `currency` | `Currency` | Cat. 02 (p. ej. `Sol`) |
| `company` | `Company` | emisor (RUC + razón social + dirección) |
| `client` | `Client` | receptor (RUC + razón social) |
| `details` | `list<SaleDetail>` | líneas de la venta |
| `legends` | `list<Legend>` | leyendas (Cat. 52); **obligatoria** la del monto en palabras |
| `taxableAmount` | `float` | base imponible total |
| `igvAmount` | `float` | IGV total |
| `taxTotal` | `float` | total de tributos |
| `saleValue` | `float` | valor de venta (sin IGV) |
| `totalAmount` | `float` | total a pagar (con IGV) |
| `paymentForm` | `PaymentForm` | **obligatorio para SUNAT** (R.S. 000193-2020); opcional en la firma: tiene default `PaymentForm::Cash` |

::: tip Forma de pago obligatoria
La **Forma de Pago** (`PaymentTerms`) es obligatoria **para SUNAT**, pero **no** es un parámetro obligatorio del
constructor: `paymentForm` es un enum no nullable con default `PaymentForm::Cash`, así que si lo omites quipu
emite el nodo como `Contado` y el comprobante cumple. No se puede "olvidar" ni anular. Lo que **sí** debes
recordar: si es a crédito (`Credit`), tienes que proveer las **cuotas** (`installments`) —el validador rechaza
`Credit` sin cuotas, **si lo llamas**—.
:::

::: warning La validación es opt-in
`sign()`, `emit()` y `emitInvoice()` **nunca** validan implícitamente: `emit()` construye, firma y envía. Para
que el validador atrape un `Credit` sin cuotas **antes** de que SUNAT lo rechace, tienes que llamar tú a
`$quipu->assertValid($invoice)` (lanza) o `$quipu->validate($invoice)` (devuelve la lista de errores). Ver
[validación local](/guias/validacion-local).
:::

El constructor tiene además parámetros opcionales para escenarios avanzados: `exoneratedAmount`,
`unaffectedAmount`, `exportAmount`, `freeAmount`, `iscAmount`, `icbperAmount`, `ivapAmount`, `detraction`,
`allowanceCharges` (descuentos/cargos globales, Cat. 53), `prepaidPayments` (anticipos),
`despatchReferences` (guias que sustentan el traslado), `deliveryAddress`, `perception` (percepción embebida),
`embeddedDespatch` (datos de traslado embebidos) y `seller` (venta por cuenta de tercero).

## Ejemplo

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Catalog\Currency;
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Catalog\LegendCode;
use ElPandaPe\Quipu\Catalog\OperationType;
use ElPandaPe\Quipu\Model\Installment;
use ElPandaPe\Quipu\Model\Invoice;
use ElPandaPe\Quipu\Model\Legend;
use ElPandaPe\Quipu\Model\PaymentForm;

$invoice = new Invoice(
    documentType: DocumentType::Invoice,
    series: 'F001',
    number: '1',
    issueDate: new DateTimeImmutable(),
    operationType: OperationType::InternalSale,
    currency: Currency::Sol,
    company: $company,
    client: $client,
    details: [$detail],
    legends: [new Legend(LegendCode::AmountInWords, 'SON DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES')],
    taxableAmount: 200.0,
    igvAmount: 36.0,
    taxTotal: 36.0,
    saleValue: 200.0,
    totalAmount: 236.0,
);

// A crédito: forma de pago + cuotas obligatorias
$invoiceCredito = new Invoice(
    // ...mismos campos base...
    paymentForm: PaymentForm::Credit,
    installments: [
        new Installment(/* ... */),
        new Installment(/* ... */),
    ],
);
```

</template>
</CodeTabs>

## Emisión

<CodeTabs>
<template #php>

```php
$quipu = new Quipu(
    new InvoiceBuilder(),                     // o CompositeBuilder para múltiples tipos
    new XmlSecSigner($certificate),
    new SoapSender(
        SoapEndpoints::production()->billServiceUrl(),
        $ruc . $solUser,
        $solPassword,
    ),
);

// Opt-in: emitInvoice() NO valida por su cuenta. Llama a assertValid() si quieres
// un error local y accionable en lugar de arriesgar un rechazo de SUNAT.
$quipu->assertValid($invoice); // lanza InvalidDocumentException

$result = $quipu->emitInvoice($invoice);
$cdr = $result->cdr;

if ($cdr->status === CdrStatus::Rejected) {
    // el comprobante NO vale: emitir uno nuevo corregido
}
```

</template>
</CodeTabs>

::: warning Usa el builder correcto
`InvoiceBuilder` solo sabe construir facturas/boletas (ambas son `Invoice`). Si emites varios tipos de
documento en la misma app, usa `CompositeBuilder`, que despacha al builder adecuado según el `DocumentType`.
:::

## Identificación del cliente

La **factura** exige siempre **RUC** del cliente + razón social + dirección fiscal (sustenta gasto/crédito
fiscal). Usa `IdentityDocumentType::Ruc` y provee `address` en el `Client`.

## Nombre de archivo

El nombre de archivo SUNAT sigue el patrón `{ruc}-{tipo}-{serie}-{numero}`:

<CodeTabs>
<template #php>

```php
$invoice->fileName(); // p. ej. "20512345678-01-F001-1"
```

</template>
</CodeTabs>

## Representación impresa y QR

La factura es una de las familias **cubiertas** por la representación impresa de quipu (junto con la boleta y
las notas). Con el `SignedXml` en mano:

<CodeTabs>
<template #php>

```php
$signed = $quipu->sign($invoice);

$qr   = $quipu->qrString($invoice, $signed);   // string del QR (Anexo N.6)
$view = $quipu->printable($invoice, $signed);  // datos para armar el PDF
```

</template>
</CodeTabs>

El PDF lo rindes tú: quipu entrega el string del QR y una `PrintView` tipada, no el documento.
Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Boleta](/documentos/boleta) — el mismo modelo con `DocumentType::Receipt`.
- [Notas](/documentos/notas) — para anular o corregir una factura.
- [Validación local](/guias/validacion-local) antes de enviar.
