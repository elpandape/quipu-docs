# Motor tributario

<Availability pro />

El motor tributario de Pro es el conjunto de **calculadores** que liquidan cada tributo del régimen peruano con
aritmética exacta. Internamente los usan los [builders fluidos](/pro/fluent-builder), pero también los puedes
llamar directamente cuando necesitas la cifra suelta —para una previsualización, una cotización o un cálculo
paralelo— sin construir un documento entero.

## Dinero exacto: `Soles`

Los calculadores no trabajan con `float`: reciben y devuelven un `Brick\Money\Money` para evitar los errores de
redondeo del coma flotante. La clase `Soles` es el puente: crea un `Money` en soles, lo lleva a `float` y
da el cero.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Value\Soles;

$base = Soles::of('1000.00');   // acepta string (recomendado) o float
$zero = Soles::zero();

$total = Soles::of(1500.50);
echo Soles::toFloat($total);    // 1500.5
```

</template>
</CodeTabs>

## IGV — `IgvCalculator`

El Impuesto General a las Ventas, tasa estándar 18 %. `amount()` acepta una tasa distinta para escenarios
especiales.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\IgvCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$igv = new IgvCalculator();

$amount = $igv->amount(Soles::of('200.00'));                 // 36.00 (18 %)
$custom = $igv->amount(Soles::of('200.00'), ratePercent: 10.0);

echo Soles::toFloat($amount);        // 36.0
echo IgvCalculator::STANDARD_RATE;   // 18.0
```

</template>
</CodeTabs>

## ISC — `IscCalculator`

El Impuesto Selectivo al Consumo, en sus tres sistemas del Catálogo 08:

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\IscCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$isc = new IscCalculator();

// Al valor (porcentaje sobre la base):
$porValor = $isc->value(Soles::of('100.00'), ratePercent: 17.0);

// Específico (monto fijo por unidad × cantidad):
$especifico = $isc->fixed(Soles::of('1.50'), quantity: 6.0);

// Al valor según precio de venta al público (PVP por unidad × cantidad):
$pvp = $isc->retail(Soles::of('20.00'), ratePercent: 10.0, quantity: 6.0);

// Tasa efectiva de un ISC ya conocido sobre su base:
$rate = $isc->effectiveRate(Soles::of('17.00'), Soles::of('100.00'));  // 17.0
```

</template>
</CodeTabs>

Para meter un ISC en una línea del builder no usas el calculador directo, sino `IscInput`, que lo declara
por sistema: `IscInput::value($rate)`, `IscInput::fixed($perUnit)`, `IscInput::retail($pvp, $rate)`.

## IVAP — `IvapCalculator`

El Impuesto a la Venta de Arroz Pilado, con su propia tasa del 4 %.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\IvapCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$ivap = new IvapCalculator();
$amount = $ivap->amount(Soles::of('300.00'));   // 12.00 (4 %)
echo IvapCalculator::RATE;                       // 4.0
```

</template>
</CodeTabs>

## ICBPER — `IcbperCalculator`

El Impuesto al Consumo de Bolsas de Plástico: un monto fijo **por bolsa**, que cambia cada año. El calculador
conoce los factores oficiales por año.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\IcbperCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$icbper = new IcbperCalculator();

$factor = $icbper->factorForYear(2026);                    // factor por bolsa del año
$amount = $icbper->amount(quantity: 5.0, year: 2026);      // 5 bolsas × factor
$custom = $icbper->amountWithFactor(5.0, Soles::of('0.50'));

echo Soles::toFloat($amount);
```

</template>
</CodeTabs>

En el builder esto se expresa con `IcbperInput::forYear($year)` o `IcbperInput::withFactor($factor)`, o con
los atajos `icbperYear:` / `icbperFactor:` de `addLine()`.

## Detracción (SPOT) — `DetractionCalculator`

El monto detraído es un porcentaje del total, con un **piso** por debajo del cual no aplica (por defecto S/ 700).

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\DetractionCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$detraction = new DetractionCalculator();

$amount = $detraction->amount(Soles::of('1000.00'), ratePercent: 12.0);   // 120.00
$conPiso = $detraction->amount(Soles::of('1000.00'), 12.0, minimum: Soles::of('700.00'));

echo DetractionCalculator::DEFAULT_MINIMUM;   // 700.0
```

</template>
</CodeTabs>

## Percepción — `PerceptionCalculator`

Distingue la percepción **embebida** en un comprobante de venta (factor decimal) de la percepción **autónoma**
(comprobante de percepción, tasa en porcentaje), y calcula el total con percepción incluida.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\PerceptionCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$perception = new PerceptionCalculator();

// Embebida: el factor es decimal (0.02 = 2 %), no se divide entre 100.
$embedded = $perception->embedded(Soles::of('1180.00'), factor: 0.02);       // 23.60

// Autónoma: la tasa va en porcentaje.
$standalone = $perception->standalone(Soles::of('1180.00'), ratePercent: 2.0);

// Total con percepción (base + percepción):
$total = $perception->totalWithPerception(Soles::of('1180.00'), $embedded);  // 1203.60
```

</template>
</CodeTabs>

## Retención — `RetentionCalculator`

El monto retenido sobre la base y el neto que efectivamente se paga al proveedor.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Tax\RetentionCalculator;
use ElPandaPe\QuipuPro\Value\Soles;

$retention = new RetentionCalculator();

$amount = $retention->amount(Soles::of('1000.00'), ratePercent: 3.0);     // 30.00
$net = $retention->netPaid(Soles::of('1000.00'), $amount);                // 970.00
```

</template>
</CodeTabs>

## ¿Calculador o builder?

Si vas a **emitir**, deja que el [Fluent Builder](/pro/fluent-builder) llame a estos calculadores por ti: así los
totales de cabecera quedan garantizados coherentes con las líneas. Usa los calculadores sueltos sólo cuando
necesitas la cifra para otra cosa (mostrarla en pantalla, cotizar, conciliar), no para armar el XML a mano.

## Siguiente paso

- Vuelve al [Fluent Builder](/pro/fluent-builder) para ver cómo entran estos tributos en un documento completo.
