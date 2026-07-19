# Validación y diagnóstico

<Availability pro />

Lite valida la aritmética del documento (que los totales cuadren, que las leyendas obligatorias estén). Pro añade
dos cosas encima: **validadores que cazan los rechazos comunes de SUNAT que Lite no mira** —formato, coherencia
entre campos, coherencia entre documentos— y un **diagnóstico accionable** que traduce un código de SUNAT en qué
hacer, cómo resolverlo y si tiene sentido reintentar.

## Validadores avanzados

Los tres validadores Pro implementan el `Validator` de Lite (`errorsFor(Document): list<string>`,
mensajes en español, lista vacía = pasa). Están pensados para correr **junto a** los de Lite, componiéndolos con
`CompositeValidator`. La fachada `QuipuPro` ya los incluye; esta sección es para cuando armas el `Quipu` tú.

### `StrictInvoiceValidator` — formato

Caza los rechazos de **formato** que el validador aritmético de Lite deja pasar: formato de serie/número/RUC y del
documento del cliente, montos de cabecera con más de dos decimales, redondeo por línea más estricto que el de
Lite (tolerancia 0.01), cantidades no positivas, fecha de emisión futura y textos obligatorios faltantes. Nunca
revuelve los totales que Lite ya reconcilia.

### `CrossFieldValidator` — coherencia entre campos

Caza las **contradicciones que cruzan dos o más campos**: régimen ↔ moneda, tipo de documento ↔ monto ↔
adquirente, tipo de operación ↔ afectación de las líneas, y la consistencia de detracción / cuotas / anticipos /
transferencia gratuita. No revisa una suma ni una leyenda por su cuenta; sólo las incoherencias que un validador
de un solo campo no puede ver.

### `CrossDocumentValidator` — coherencia entre documentos

Caza la incoherencia entre una **nota** (de crédito o débito) y **la factura que ajusta**: adquirente, moneda y
total. Como para verla necesita el documento de origen, resuelve ese origen desde un `DocumentStore` con las
coordenadas de la propia nota.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Validation\BaseValidators;
use ElPandaPe\Quipu\Validation\CompositeValidator;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\QuipuPro\Validation\CrossDocumentValidator;
use ElPandaPe\QuipuPro\Validation\CrossFieldValidator;
use ElPandaPe\QuipuPro\Validation\InMemoryDocumentStore;
use ElPandaPe\QuipuPro\Validation\StrictInvoiceValidator;

// El almacén guarda las facturas de origen; la nota se valida contra ellas.
$store = new InMemoryDocumentStore();
$store->put($originInvoice);

$validator = new CompositeValidator(
    ...BaseValidators::all(),          // los validadores de Lite
    new StrictInvoiceValidator(),      // formato
    new CrossFieldValidator(),         // coherencia entre campos
    new CrossDocumentValidator($store) // coherencia nota ↔ factura
);

// Inyéctalo en el facade, o úsalo directo:
$errors = $validator->errorsFor($invoice);   // list<string>, vacío = ok

$quipu = new Quipu($builder, $signer, $sender, validator: $validator);
$quipu->assertValid($invoice);   // lanza si hay errores (reglas + XSD)
```

</template>
</CodeTabs>

::: tip La fachada ya trae dos de los tres
`QuipuPro::for(...)` compone los validadores base de Lite más `StrictInvoiceValidator` y `CrossFieldValidator`.
El `CrossDocumentValidator` no entra por defecto porque necesita que le proveas un `DocumentStore` con las
facturas de origen; si emites notas, arma el `Quipu` con él como en el ejemplo de arriba.
:::

`DocumentStore` es una interfaz (`find(string $key): ?Document`); `InMemoryDocumentStore` es la implementación de
memoria (`put()` / `find()`). Para persistir los orígenes entre procesos, implementa la interfaz contra tu
almacenamiento.

## Diagnóstico de errores: `ErrorDiagnosis`

Cuando SUNAT rechaza (o el CDR trae observaciones, o el SOAP devuelve una falla), tienes un código. `ErrorDiagnosis`
lo convierte en un `Diagnosis`: el mensaje oficial de SUNAT (del catálogo de Lite) **más** la acción concreta, el
remedio y si reintentar el mismo envío puede funcionar.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Error\ErrorDiagnosis;

$diagnosis = new ErrorDiagnosis();

$d = $diagnosis->diagnose(2223);       // por código (int o string)
$d = $diagnosis->forCdr($result->cdr); // desde un CdrResult
$d = $diagnosis->forFault($exception); // desde una SunatFaultException (falla SOAP)

$d->code;         // int, el código SUNAT
$d->sunatMessage; // ?string, el texto oficial (del ErrorCatalog de Lite)
$d->severity;     // CdrSeverity, la banda para decidir reintentos
$d->action;       // string, qué hacer (p. ej. "Emitir con una nueva numeración")
$d->remedy;       // string, cómo resolverlo, en detalle
$d->retryable;    // bool, si reintentar el mismo envío puede tener éxito
```

</template>
</CodeTabs>

El `ErrorDiagnosis` agrupa los códigos por banda: autenticación/sistema (101/102/127, reintentables),
formato SOAP (1032/1033/1034, corrige, no reintentes a ciegas), rechazos de CDR (2017-2223, 3001-3211: corrige el
XML) y observaciones (4000/4327, informativas).

### Desde la fachada

`QuipuPro` expone el diagnóstico ya montado, sin instanciar nada:

<CodeTabs>
<template #php>

```php
$result = $pro->core()->emitInvoice($invoice);

if (!$result->cdr->isAccepted()) {
    $d = $pro->diagnose($result->cdr->responseCode);

    echo "Acción: {$d->action}\n";
    echo "Remedio: {$d->remedy}\n";

    if ($d->retryable) {
        // reintenta el mismo envío (típico en 101/127)
    } else {
        // corrige el documento y reemite con nueva numeración
    }
}

// También: $pro->diagnoseCdr($result->cdr) y $pro->diagnoseFault($sunatFault).
```

</template>
</CodeTabs>

## Cómo encaja

El flujo robusto es: **validar antes de enviar** (los tres validadores atrapan lo evitable en local, gratis) y
**diagnosticar después** (si SUNAT igual rechaza, sabes en un paso qué hacer). Los reintentos automáticos por
fallas transitorias los pone la [infraestructura resiliente](/pro/infra), que usa la misma severidad que ves aquí.

## Siguiente paso

- Automatiza el reintento de fallas transitorias con la [infraestructura](/pro/infra).
- Revisa las [herramientas XML](/pro/xml-tooling) para inspeccionar el XML que fue rechazado.
