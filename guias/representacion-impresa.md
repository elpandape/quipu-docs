# Representación impresa y QR

quipu **no genera el PDF** de la representación impresa —eso es una decisión de rendering del consumidor— pero
te entrega **todos los datos** listos para alimentar una plantilla: la **vista de impresión tipada** y el
**string del QR** de SUNAT.

<Availability lite pro />

> [!WARNING] Solo la familia de venta
> `qrString()` y `printable()` **solo** soportan `Model\Invoice` (factura y boleta) y `Model\Note` (NC/ND).
> Para **guía de remisión, retención, percepción, resumen diario, comunicación de baja y reversión lanzan
> `Exception\InvalidDocumentException`**. No es un olvido: el formato del QR de esas familias **no está
> confirmado** contra el anexo técnico de SUNAT, y se prefirió diferirlo antes que inventar un formato que
> saldría impreso en un comprobante. Ver `Presentation\SunatQrEncoder` y `Presentation\CompositePrintViewBuilder`.

## String del QR

<CodeTabs>
<template #php>

```php
$qr = $quipu->qrString($invoice, $signed);
// "20000000001|01|F001|1|36.00|236.00|2026-07-12|6|10000000001|ry2HIoafnH1AwiQirOEHSkMfIgA="
```

</template>
</CodeTabs>

**El QR no es una URL.** Es lo que manda el **Anexo N.º 6 de la R.S. 244-2019/SUNAT (num. 6.4.3)**: **diez
campos unidos por `|`**, **sin pipe final**, terminando en el `DigestValue` de la firma.

| # | Campo | Origen | Formato |
|---|---|---|---|
| 1 | RUC del emisor | `company->ruc` | 11 dígitos |
| 2 | Tipo de comprobante | `documentType` (Catálogo 01) | p. ej. `01` factura, `03` boleta, `07` NC, `08` ND |
| 3 | Serie | `series` | p. ej. `F001` |
| 4 | Número | `number` | correlativo |
| 5 | Monto del IGV | `igvAmount` | 2 decimales |
| 6 | Monto total | `totalAmount` | 2 decimales |
| 7 | Fecha de emisión | `issueDate` | `Y-m-d` |
| 8 | Tipo de doc. del adquirente | `client->documentType` (Catálogo 06) | p. ej. `6` RUC, `1` DNI |
| 9 | Nro. de doc. del adquirente | `client->documentNumber` | |
| 10 | Valor resumen | `SignedXml->digestValue` | DigestValue en base64 |

Los importes se formatean con `Support\Money`: **exactamente dos decimales, punto como separador decimal y sin
separador de miles** — la misma función que usan los builders UBL, así que el QR impreso nunca diverge del XML
firmado. La fecha va siempre como `Y-m-d`.

Es un string listo para codificar en una imagen QR (con la librería que prefieras: `endroid/qr-code`,
`chillerlan/php-qrcode`, etc.). quipu no acopla a ninguna.

## Vista de impresión

<CodeTabs>
<template #php>

```php
$view = $quipu->printable($invoice, $signed);
```

</template>
</CodeTabs>

`view` es un `Presentation\PrintView` tipado, con todo lo que una plantilla de comprobante necesita:

| Propiedad | Tipo | Contenido |
|---|---|---|
| `qrString` | `string` | el string del QR |
| `digestValue` | `string` | hash de la firma |
| `documentTypeLabel` | `string` | p. ej. "FACTURA ELECTRÓNICA" |
| `series`, `number` | `string` | serie y correlativo |
| `issueDate` | `DateTimeImmutable` | fecha de emisión |
| `currencyLabel` | `string` | p. ej. "SOLES" |
| `issuer` | `PrintParty` | emisor (razón social, RUC, dirección) |
| `customer` | `PrintParty` | cliente (razón social, doc, dirección) |
| `lines` | `list<PrintLine>` | líneas con unidad, cantidad, precio, IGV |
| `totals` | `PrintTotals` | totales (base, IGV, ISC, ICBPER, total) |
| `amountInWords` | `string` | monto en palabras (de las leyendas); `''` si no hay leyenda |

> [!NOTE] `amountInWords` puede venir vacío
> El mapper busca la leyenda con `Catalog\LegendCode::AmountInWords` entre los `legends` del documento y
> devuelve **cadena vacía `''`** si no la encuentra (ver `Presentation\AbstractSalePrintMapper`). No es `null`:
> tu plantilla debe contemplar el caso vacío (o asegurarte de emitir siempre esa leyenda).

Las etiquetas legibles (`documentTypeLabel`, `currencyLabel`, `unitLabel` de cada línea y
`PrintParty::documentTypeLabel`) salen de los métodos `label()` de los enums de catálogo —
`Catalog\DocumentType`, `Catalog\Currency`, `Catalog\UnitOfMeasure` y `Catalog\IdentityDocumentType`. Son
**API pública**: puedes llamarlos directo desde tus propias plantillas o pantallas, sin pasar por `printable()`.

### `PrintParty`

| Propiedad | Tipo |
|---|---|
| `legalName` | `string` |
| `documentTypeLabel` | `string` (p. ej. "RUC", "DNI") |
| `documentNumber` | `string` |
| `tradeName` | `?string` |
| `address` | `?Address` |

### `PrintLine`

| Propiedad | Tipo |
|---|---|
| `number` | `int` |
| `description` | `string` |
| `unitLabel` | `string` (p. ej. "UNIDAD") |
| `quantity`, `unitPrice`, `lineValue`, `igvAmount`, `taxTotal` | `float` |
| `productCode` | `?string` |

### `PrintTotals`

| Propiedad | Tipo |
|---|---|
| `taxableAmount`, `exoneratedAmount`, `unaffectedAmount` | `float` |
| `igvAmount`, `iscAmount`, `icbperAmount`, `taxTotal`, `totalAmount` | `float` |
| `roundingAmount` | `float` |

## Ejemplo: armar el PDF tú mismo

quipu te da los datos; el PDF lo haces con el motor de tu elección (Dompdf, wkhtmltopdf, mPDF, un servicio
externo, etc.):

<CodeTabs>
<template #php>

```php
$signed = $quipu->sign($invoice);
$view = $quipu->printable($invoice, $signed);
$qr = $view->qrString;

// Render con Dompdf (ejemplo ilustrativo — Dompdf no es dependencia de quipu)
$html = renderTemplate('invoice.php', $view, $qr);
$dompdf = new Dompdf();
$dompdf->loadHtml($html);
$dompdf->render();
file_put_contents('storage/' . $invoice->fileName() . '.pdf', $dompdf->output());
```

</template>
</CodeTabs>

## Por qué el PDF no está en el core

La representación impresa es un **concern separable**: depende del diseño visual, el idioma de la plantilla, el
motor de PDF y hasta del medio de entrega (puede ser un HTML para email en vez de un PDF). Meter eso en el core
acoplaría a una librería y a un diseño que no sirven para todos. quipu entrega los datos; tú eliges cómo
renderizar.

## Siguiente paso

- [Firma local](/guias/firma-local) — `printable()` funciona con el XML firmado.
- [Inicio rápido](/empezando/inicio-rapido)
