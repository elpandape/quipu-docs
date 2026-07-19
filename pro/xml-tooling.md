# Herramientas XML

<Availability pro />

A veces necesitas mirar el XML directamente: comprobar que un campo salió con el valor esperado, comparar el XML
que produce quipu contra el de otra librería durante una migración, o exportar un documento a JSON para un log o
una API interna. Pro trae tres utilidades para eso, todas locales y de sólo lectura sobre el XML.

## Inspector XPath: `XmlInspector`

`XmlInspector` envuelve un XML UBL y te deja consultarlo por **XPath** sin pelear con los namespaces: ya trae
registrados los prefijos de SUNAT (`cbc`, `cac`, `ext`, `ds`, `sac`) y expone la raíz como `doc`.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Xml\XmlInspector;

$inspector = new XmlInspector($signedXml->xml);

// Un valor único (el primero que casa), o null si no existe:
$id = $inspector->value('//cbc:ID');                 // "F001-123"
$total = $inspector->value('//cbc:PayableAmount');   // "236.00"

// Todos los valores que casan:
$lineIds = $inspector->values('//cac:InvoiceLine/cbc:ID');   // list<string>

// Existencia y conteo:
$inspector->exists('//ext:UBLExtensions//ds:Signature');   // bool: ¿está firmado?
$lineCount = $inspector->count('//cac:InvoiceLine');       // int: número de líneas
```

</template>
</CodeTabs>

Los prefijos disponibles son los estándar de UBL más los de SUNAT: `cbc` (componentes básicos), `cac`
(agregados), `ext` (extensiones, donde vive la firma), `ds` (xmldsig) y `sac` (agregados SUNAT). Si el XML no se
puede interpretar, el constructor lanza `InvalidDocumentException`.

## Comparador: `XmlComparator`

`XmlComparator::compare(string $left, string $right)` compara dos XML **estructuralmente** —no por texto— y
devuelve una lista de diferencias tipadas. Es la herramienta para una migración: comparar el XML de quipu con el
de tu emisor anterior y ver exactamente en qué difieren.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Xml\XmlComparator;

// Por defecto ignora el bloque de firma (que legítimamente difiere en cada emisión):
$comparator = new XmlComparator(ignoreSignature: true);

$differences = $comparator->compare($quipuXml, $legacyXml);   // list<XmlDifference>

foreach ($differences as $diff) {
    // $diff->path   → ruta del nodo, p. ej. "/Invoice/cbc:ID"
    // $diff->kind   → DifferenceKind (ElementName, Text, Attribute, MissingElement, UnexpectedElement)
    // $diff->left   → ?string, el valor del primer XML
    // $diff->right  → ?string, el valor del segundo XML
    printf("[%s] %s: %s ≠ %s\n", $diff->kind->name, $diff->path, $diff->left ?? '∅', $diff->right ?? '∅');
}

if ($differences === []) {
    echo "Los dos XML son estructuralmente equivalentes.\n";
}
```

</template>
</CodeTabs>

Cada `XmlDifference` clasifica el tipo de discrepancia con el enum `DifferenceKind`:

| Caso | Significado |
|---|---|
| `ElementName` | El nombre (o namespace) del elemento difiere |
| `Text` | El contenido de texto de un nodo hoja difiere |
| `Attribute` | Un atributo difiere |
| `MissingElement` | Un elemento del primer XML falta en el segundo |
| `UnexpectedElement` | El segundo XML tiene un elemento que el primero no |

## Conversor a JSON: `JsonConverter`

`JsonConverter` proyecta cualquier `Document` de quipu (un `Model\Invoice`, `Note`, etc.) a un arreglo o a una
cadena JSON. Útil para logs estructurados, colas, APIs internas o snapshots de depuración.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Converter\JsonConverter;

$converter = new JsonConverter();

$array = $converter->toArray($invoice);   // array<string, mixed>
$json = $converter->toJson($invoice);     // string JSON bonito, UTF-8 sin escapar
```

</template>
</CodeTabs>

El JSON sale con `JSON_PRETTY_PRINT`, `JSON_UNESCAPED_UNICODE` y `JSON_UNESCAPED_SLASHES`, y preserva los decimales
(`JSON_PRESERVE_ZERO_FRACTION`): los enums se serializan por su `value` (o su `name` si no son *backed*) y las
fechas en formato legible.

## Siguiente paso

- Combina el inspector con el [diagnóstico de errores](/pro/validacion-diagnostico) para investigar un rechazo.
- El comparador es útil al migrar desde otra librería: compara el XML que produce quipu contra el de referencia.
