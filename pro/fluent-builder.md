# Fluent Builder

<Availability pro />

Armar un `Invoice` a mano es correcto pero verboso: tienes que calcular cada `igvAmount`, cada
`taxableAmount`, poner la leyenda del importe en letras, y cuadrar los totales de cabecera con la suma de las
líneas o SUNAT rechaza el subtotal. El **Fluent Builder** de Pro hace todo eso por ti: declaras las partes, los
metadatos y las líneas, y `build()` liquida los impuestos, agrega la cabecera y ensambla un documento **que los
validadores de Lite aceptan con cero errores**.

## `FluentInvoiceBuilder`

`FluentInvoiceBuilder::for(Company, Client)` abre un builder para una factura o boleta. Desde la fachada lo tienes
pre-sembrado con tu empresa emisora vía `$pro->invoice($client)`.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Builder\FluentInvoiceBuilder;

$invoice = FluentInvoiceBuilder::for($company, $client)
    ->series('F001')
    ->number('123')
    ->addLine('P001', 'Laptop 14"', quantity: 1.0, unitValue: 2500.0)
    ->addLine('P002', 'Mouse inalámbrico', quantity: 2.0, unitValue: 50.0)
    ->build();

// $invoice es un Model\Invoice de Lite, con IGV, subtotales, totales y la
// leyenda "importe en letras" ya calculados. Emítelo con el facade de Lite:
$result = $quipu->emitInvoice($invoice);
```

</template>
</CodeTabs>

### Tipos de línea

Cada afectación del Catálogo 07 tiene su método dedicado. `addLine()` es la gravada onerosa estándar (10); el
resto cubre las variantes:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\UnitOfMeasure;
use ElPandaPe\QuipuPro\Value\IscInput;

$invoice = $pro->invoice($client)
    ->series('F001')->number('1')

    // Gravada onerosa (10). Opcionalmente con ICBPER (bolsas de plástico):
    ->addLine('P001', 'Producto', quantity: 3.0, unitValue: 10.0)
    ->addLine('BOLSA', 'Bolsa plástica', quantity: 5.0, unitValue: 0.0, icbperYear: 2026)

    // Gravada con ISC apilado en la base del IGV (ver motor tributario):
    ->addIscLine('CERV', 'Cerveza', quantity: 6.0, unitValue: 5.0, isc: IscInput::value(17.0))

    // Gravada con Otros Tributos (OTH, Cat.05 '9999'):
    ->addOthLine('SERV', 'Servicio con OTH', quantity: 1.0, unitValue: 100.0, othPercentage: 5.0)

    // IVAP (arroz pilado, 4%):
    ->addIvapLine('ARROZ', 'Arroz pilado', quantity: 10.0, unitValue: 3.0, unit: UnitOfMeasure::Kilogram)

    // Exonerada (20), inafecta (30), exportación (40):
    ->addExoneratedLine('LIBRO', 'Libro', quantity: 1.0, unitValue: 40.0)
    ->addUnaffectedLine('X', 'Operación inafecta', quantity: 1.0, unitValue: 20.0)
    ->addExportLine('EXP', 'Bien exportado', quantity: 1.0, unitValue: 500.0)

    // Transferencia gratuita (bonificación / donación):
    ->addFreeLine('PROMO', 'Muestra gratis', quantity: 1.0, unitValue: 15.0)
    ->build();
```

</template>
</CodeTabs>

El builder añade **automáticamente** las leyendas que las líneas exigen: la del importe en letras (1000)
siempre, la de IVAP (2007) si hay una línea IVAP y la de transferencia gratuita (1002) si hay una línea gratuita.

### Conceptos de cabecera

Junto a las líneas van los conceptos de documento, todos encadenables:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\AllowanceChargeReason;
use ElPandaPe\Quipu\Model\Detraction;
use ElPandaPe\Quipu\Model\Installment;

$invoice = $pro->invoice($client)
    ->series('F001')->number('1')
    ->addLine('P001', 'Producto', quantity: 1.0, unitValue: 1000.0)

    // Forma de pago: contado (default) o crédito con sus cuotas.
    ->credit(
        new Installment(/* ... primera cuota ... */),
        // ...cuotas restantes
    )

    // Descuento o cargo global (Cat.53). El factor se deriva de amount/baseAmount.
    ->withDiscount(AllowanceChargeReason::GlobalDiscountAffectsBase, amount: 100.0, baseAmount: 1000.0)

    // Percepción embebida (agrega la leyenda 2000 sola; factor decimal 0.02 = 2%):
    ->withPerception(factor: 0.02)

    // Detracción / SPOT (agrega la leyenda 2006 y fija el tipo de operación):
    ->withDetraction(new Detraction(/* ... */))

    // Anticipo ya cobrado (se descuenta del pagable):
    ->withPrepaid('ANT-001', amount: 200.0)
    ->build();
```

</template>
</CodeTabs>

::: tip El builder garantiza documentos coherentes
`credit()` exige al menos una cuota, así que la regla de SUNAT "crédito ⇒ hay cuota" no se puede romper por este
camino. Los globales y los anticipos llegan **con la misma cifra** al motor tributario y al `Invoice`, de modo
que los totales de cabecera nunca divergen de la suma de líneas. `withPerception()` sólo acepta soles (Ley 29173).
:::

## `FluentNoteBuilder`

El hermano para notas de crédito y débito. Se abre con `FluentNoteBuilder::creditNote(...)` /
`::debitNote(...)` —o desde la fachada con `$pro->creditNote($client)` / `$pro->debitNote($client)`— y requiere,
además de las líneas, el documento afectado y el motivo.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\CreditNoteType;

$note = $pro->creditNote($client, CreditNoteType::CancellationOfOperation)
    ->series('FC01')
    ->number('1')
    ->referenceDocument('F001-123')             // el comprobante que corrige
    ->motive('Anulación de la operación')
    ->addLine('P001', 'Producto', quantity: 1.0, unitValue: 1000.0)
    ->build();

$result = $quipu->emitInvoice($note);
```

</template>
</CodeTabs>

Las notas alcanzan un subconjunto de tipos de línea (gravada onerosa con ISC/ICBPER, exonerada, inafecta,
exportación y transferencia gratuita): no hay IVAP ni OTH, porque el validador de notas de Lite no los admite.

## Plantillas: `InvoiceTemplate`

Si emites muchos documentos bajo la misma serie, empresa y moneda, `InvoiceTemplate` guarda esos defaults y te
entrega un `FluentInvoiceBuilder` ya preconfigurado; sólo pones el correlativo y las líneas.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Template\InvoiceTemplate;

$template = new InvoiceTemplate(
    company: $issuer,
    defaultClient: $frequentClient,   // opcional; puedes pasar otro en newInvoice()
    seriesPrefix: 'F001',             // se usa tal cual como serie SUNAT
);

$invoice = $template->newInvoice()    // usa el cliente por defecto
    ->number('124')
    ->addLine('P001', 'Producto', quantity: 1.0, unitValue: 100.0)
    ->build();

// Otro cliente puntual:
$otra = $template->newInvoice($walkInClient)->number('125')->addLine(/* ... */)->build();
```

</template>
</CodeTabs>

Si la plantilla no tiene cliente por defecto y no le pasas uno a `newInvoice()`, lanza `InvalidArgumentException`.

## Importe en letras: `AmountInWords`

La leyenda 1000 ("SON ... CON NN/100 SOLES") la escribe `AmountInWords`, y los builders la aplican solos. También
puedes llamarla directamente si armas un documento a mano:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\Currency;
use ElPandaPe\QuipuPro\Support\AmountInWords;

$legend = AmountInWords::forCurrency(236.00, Currency::Sol);
// "SON DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES"
```

</template>
</CodeTabs>

## Siguiente paso

- Los tipos ISC/ICBPER que pasas al builder los produce el [motor tributario](/pro/motor-tributario).
- Antes de emitir, refuerza con los [validadores avanzados](/pro/validacion-diagnostico).
