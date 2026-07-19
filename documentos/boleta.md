# Boleta de venta electrónica

La **boleta** (Cat. 01 código `03`) se emite para cliente **consumidor final** (B2C). Se reporta por el flujo
asíncrono del **Resumen Diario**, aunque opcionalmente puede enviarse individualmente.

<Availability lite pro />

## Modelo

La boleta usa el **mismo `Model\Invoice`** que la factura; se distingue por el `DocumentType`:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\DocumentType;
use ElPandaPe\Quipu\Model\Invoice;

$receipt = new Invoice(
    documentType: DocumentType::Receipt,   // '03'
    series: 'B001',                        // inicia con 'B'
    number: '1',
    // ... resto igual que la factura
);
```

</template>
</CodeTabs>

## Identificación del cliente

A diferencia de la factura, la identificación del cliente en la boleta es **obligatoria solo cuando el importe
supera S/ 700.00** o cuando el cliente la solicita. Por debajo del umbral puede emitirse sin identificar al
comprador.

::: warning En quipu el `Client` es siempre obligatorio
`Client` es un parámetro obligatorio del constructor de `Invoice`, y `Client` a su vez exige `documentType`,
`documentNumber` y `legalName` (ninguno tiene default). "Sin identificar al comprador" **no** significa omitir
el `Client`: significa construirlo con el cliente genérico que usa quipu para esos casos:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\IdentityDocumentType;
use ElPandaPe\Quipu\Model\Client;

// Cliente genérico para consumidor final no identificado:
$client = new Client(
    documentType: IdentityDocumentType::NonDomiciledWithoutRuc, // '0' — no domiciliado sin RUC
    documentNumber: '-',
    legalName: 'CLIENTES VARIOS',
);
```

</template>
</CodeTabs>

Es el mismo patrón que usa internamente el test de boleta (`tests/Feature/InvoiceBuilderTest.php`).
:::

::: tip Captura el documento siempre
Regla recomendada: captura tipo y número de documento del cliente **siempre**, desde el primer contacto de venta.
Añadirlo tarde obliga a migrar datos y deja comprobantes históricos sin identificar; y una venta que hoy está
bajo el umbral puede superarlo mañana.
:::

## Dos caminos de reporte

### 1. Resumen Diario (estándar, asíncrono)

Las boletas y sus notas se reportan **consolidadas** en un Resumen Diario. Ver [Resumen diario](/documentos/resumen-diario)
para el flujo completo de ticket + polling.

<CodeTabs>
<template #php>

```php
// La boleta se firma localmente al instante:
$signed = $quipu->sign($receipt);

// ...y se incluye como SummaryItem en un DailySummary que se envía después:
$summary = new DailySummary(/* ...items... */);
$ticket = $quipu->emitSummary($summary);

// Polling:
$cdr = $quipu->getStatus($ticket->ticket);
```

</template>
</CodeTabs>

::: warning Usa `CompositeBuilder` para el Resumen Diario
El camino del Resumen Diario combina dos tipos de documento: la boleta (un `Invoice`, que `sign()` construye)
y el `DailySummary` (que `emitSummary()` construye). `InvoiceBuilder` **solo** sabe construir `Invoice`: si lo
inyectas en el `Quipu`, `sign($receipt)` funciona, pero `emitSummary($summary)` lanza
`InvalidDocumentException`. Para este flujo usa `CompositeBuilder`, que despacha al builder correcto según el
`DocumentType` (ver [factura — Emisión](/documentos/factura#emision)).
:::

### 2. Envío individual (opcional)

Si prefieres enviar la boleta individualmente (CDR síncrono, como una factura):

<CodeTabs>
<template #php>

```php
$result = $quipu->emitInvoice($receipt);
$cdr = $result->cdr;
```

</template>
</CodeTabs>

::: warning El Resumen Diario es el mecanismo estándar
El envío individual de boletas es **opcional**. El mecanismo que SUNAT espera para boletas es el Resumen Diario.
Evalúa cuál encaja en tu flujo antes de elegir el individual.
:::

## Emisión local diferida

Igual que la factura, sigue el principio **emitir local / reportar diferido**:

<CodeTabs>
<template #php>

```php
// Al instante, en el punto de venta:
$signed = $quipu->sign($receipt);
$qr = $quipu->qrString($receipt, $signed);
$view = $quipu->printable($receipt, $signed);

// El cliente se va con su boleta. SUNAT se reporta después en el Resumen Diario.
```

</template>
</CodeTabs>

## Siguiente paso

- [Resumen diario](/documentos/resumen-diario) — el flujo asíncrono de boletas.
- [Notas](/documentos/notas) — notas de crédito/débito sobre boletas.
- [Representación impresa](/guias/representacion-impresa) — QR y vista de impresión.
