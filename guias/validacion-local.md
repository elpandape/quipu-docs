# Validación local

quipu puede **validar un documento antes de firmarlo y enviarlo**, para que recibas un error accionable en lugar
de un rechazo críptico de SUNAT. Hay dos niveles, ambos **locales** (sin red): **reglas de negocio** (coherencia
de montos, campos obligatorios por tipo) y **esquema XSD** (estructura del XML).

<Availability lite pro />

::: tip Validación estricta y diagnóstico en Pro
Todo lo de esta página —`validate()`, `assertValid()`, `CompositeValidator` y los validadores por familia— es del
**emisor base (Lite)**. **quipu Pro** <Availability pro /> añade validación **estricta** y **cross-field/cross-document**
más un **diagnóstico** que traduce el error a una causa accionable. Ver
[Validación y diagnóstico](/pro/validacion-diagnostico).
:::

::: tip Es opt-in
`sign()`, `emit()` y `emitInvoice()` **nunca** llaman a `validate()`/`assertValid()` implícitamente. La
validación es **opt-in**: la llamas tú cuando quieres un error local en lugar de arriesgarte a un rechazo de
SUNAT.
:::

## `validate()` — inspecciona sin lanzar

<CodeTabs>
<template #php>

```php
$errors = $quipu->validate($invoice);

if ($errors !== []) {
    foreach ($errors as $error) {
        echo "- $error\n";
    }
    // detente y corrige antes de seguir
}
```

</template>
</CodeTabs>

Devuelve una `list<string>` con las violaciones (en español). **No lanza**: te toca decidir qué hacer. Útil
cuando quieres **inspeccionar** sin interrumpir el flujo (p. ej. para mostrar los errores en un formulario).

Una lista vacía significa que el documento pasa las reglas que quipu implementa, no que SUNAT lo vaya a
aceptar: ver [La validación no reemplaza al CDR](#la-validacion-no-reemplaza-al-cdr).

## `assertValid()` — valida y lanza

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\InvalidDocumentException;

try {
    $quipu->assertValid($invoice);
} catch (InvalidDocumentException $e) {
    echo $e->getMessage(); // "campo X es obligatorio; el monto Y no coincide con..."
}
```

</template>
</CodeTabs>

`assertValid()` combina las reglas de negocio **y** la validación contra el XSD (construye el XML y lo valida
contra el esquema de SUNAT). Lanza `InvalidDocumentException` con **todas** las violaciones encontradas, no
solo la primera. Úsalo cuando quieres un **fallo explícito** antes de firmar.

## Cuándo usar cada uno

| Escenario | Usa |
|---|---|
| Formulario de venta, feedback temprano al usuario | `validate()` |
| Antes de `emit()`/`sign()`, quieres frenar a tiempo | `assertValid()` |
| Ya confías en tus datos (validaste arriba) | omite (ahorra el costo del XSD) |

## Qué valida

`CompositeValidator` (el default del facade) despacha a un validador por familia de documentos:

| Validador | Familia |
|---|---|
| `InvoiceValidator` | Factura y boleta |
| `NoteValidator` | Notas de crédito/débito |
| `DailySummaryValidator` | Resumen diario |
| `VoidanceValidator` | Comunicación de baja |
| `RetentionValidator` | Retención |
| `PerceptionValidator` | Percepción |
| `DespatchValidator` | Guía de remisión remitente (09) |
| `CarrierDespatchValidator` | Guía de remisión transportista (31) |
| `ReversionValidator` | Reversión |

Las reglas cubren, entre otras: campos obligatorios por tipo, coherencia de totales (`igvAmount` vs
`igvBaseAmount × igvPercentage`, `totalAmount` vs `saleValue + taxes`), leyendas obligatorias, coherencia de la
forma de pago con las cuotas (una venta al crédito exige cuotas; una al contado no las admite), y los códigos
reservados del Cat. 53 (`51`–`53` y `61` no pueden ir en el array genérico de `AllowanceCharge`).

Un tipo de documento sin validador registrado **pasa sin errores**: la ausencia de violaciones no prueba que
quipu haya mirado el documento.

## Validación de catálogos (opt-in)

`CatalogValidator` comprueba que los valores que **sí están presentes** existan en las tablas de referencia de
SUNAT (país, unidades de medida, UBIGEO). **No** forma parte del `CompositeValidator` por defecto, a propósito:
la pertenencia a una tabla grande no es una regla de negocio que quipu pueda computar, sino datos que quipu
puede tener o no, así que activarla por defecto arriesgaría rechazar un documento correcto por un hueco en el
propio catálogo de quipu.

Actívala explícitamente cuando quieras esa red extra:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Reference\CatalogRepository;
use ElPandaPe\Quipu\Validation\CatalogValidator;
use ElPandaPe\Quipu\Validation\CompositeValidator;
use ElPandaPe\Quipu\Validation\InvoiceValidator;
use ElPandaPe\Quipu\Validation\NoteValidator;

$catalogValidator = new CatalogValidator(CatalogRepository::fromResourceDirectory());

$quipu = new Quipu(
    $builder,
    $signer,
    $sender,
    validator: new CompositeValidator(
        new InvoiceValidator(),
        new NoteValidator(),
        // ...el resto de los validadores por default de quipu...
        $catalogValidator,
    ),
);
```

</template>
</CodeTabs>

::: warning El parámetro `validator:` reemplaza, no agrega
Si pasas tu propio `CompositeValidator`, sustituyes por completo el default: hay que re-listar los nueve
validadores, o perderás las reglas que ya tenías.
:::

Alcance real, para que no esperes de más:

- Hoy solo juzga `Invoice` y `Note` (los dos tipos que llevan líneas `SaleDetail`).
- Las unidades de medida (Cat. 03) **no** son una brecha: `SaleDetail::$unit` está tipado con el enum
  `UnitOfMeasure`, así que una unidad inválida es inconstruible. Los campos que sí gana esta validación son
  `Address::$country` (string plano, default `'PE'`) y `Address::$ubigeo`.
- El Cat. 25 (UNSPSC) **no está cargado**, así que el chequeo del código de producto es un no-op incluso con la
  validación activada.

Ver [catálogos SUNAT](/referencia/catalogos).

## No todo valida contra UBL 2.1

`DocumentSchemaValidator` elige el XSD según el tipo de documento, y **no todos usan la misma versión de UBL**:

| Documento | XSD | UBL |
|---|---|---|
| Factura, boleta | `UBL-Invoice-2.1.xsd` | **2.1** |
| Nota de crédito / débito | `UBL-CreditNote-2.1.xsd` / `UBL-DebitNote-2.1.xsd` | **2.1** |
| Guía de remisión (remitente y transportista) | `UBL-DespatchAdvice-2.1.xsd` | **2.1** |
| Resumen diario | `UBL-SummaryDocuments-2.0.xsd` | **2.0** |
| Comunicación de baja y reversión | `UBL-VoidedDocuments-2.0.xsd` | **2.0** |
| Retención | `UBL-Retention-2.0.xsd` | **2.0** |
| Percepción | `UBL-Perception-2.0.xsd` | **2.0** |

Es lo que SUNAT exige: los documentos consolidados y los de otrosCpe siguen anclados a **UBL 2.0**.

## Validación solo de esquema

Para validar **solo** el XSD, sin las reglas de negocio, inyecta `DocumentSchemaValidator` y llámalo
directo:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Xml\DocumentSchemaValidator;
use ElPandaPe\Quipu\Xml\InvoiceBuilder;

$validator = new DocumentSchemaValidator();
$errors = $validator->errorsFor($invoice, (new InvoiceBuilder())->build($invoice));
```

</template>
</CodeTabs>

## La validación no reemplaza al CDR

La validación local atrapa la mayoría de los errores, pero **no todos**: los validadores cubren las reglas que
en la práctica disparan los rechazos más comunes, y SUNAT tiene reglas que no están documentadas o que cambian
sin aviso. Un documento que pasa `assertValid()` puede **aun así** ser rechazado. Trátala como una red de
seguridad, no como una garantía.

## Costo

`validate()` solo corre las reglas de negocio (barato, no construye el XML). `assertValid()` además **construye
el XML** y lo valida contra el XSD (más caro). Si llamas `assertValid()` y luego `sign()`, el XML se construye
dos veces; en flujo de alto volumen, evalúa si te basta con `validate()`.

## Siguiente paso

- [Firma local](/guias/firma-local)
- [Manejo de errores](/buenas-practicas/manejo-errores)
