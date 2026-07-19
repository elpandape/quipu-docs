# Firma local

La **firma** es la pieza instantánea de la maquinaria: construye el XML y lo firma con tu certificado, **sin
tocar la red**. Es el paso que se hace en el camino crítico de la venta; el envío a SUNAT puede hacerse después.

<Availability lite pro />

## El método `sign()`

<CodeTabs>
<template #php>

```php
$signed = $quipu->sign($invoice);

$signed->xml;          // el XML UBL firmado (xmldsig)
$signed->digestValue;  // el DigestValue de la firma
```

</template>
</CodeTabs>

`sign()` hace dos cosas:

1. **Construye** el XML UBL a partir del `Model\*` (vía el `XmlBuilder` inyectado). La versión la fija el
   builder según la familia: **2.1** para factura, boleta, notas y guías; **2.0** para resumen diario, baja,
   reversión, retención y percepción.
2. **Firma** el XML con el `Signer` inyectado (firma enveloped, RSA-SHA1 / SHA1 digest / C14N, dentro de
   `ext:UBLExtensions`).

## El signer

quipu usa `Signer\XmlSecSigner`, que envuelve `robrichards/xmlseclibs`:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Signer\XmlSecSigner;

$signer = new XmlSecSigner($certificate);  // PEM: cert + llave privada concatenados
```

</template>
</CodeTabs>

El certificado es un **PEM** con el certificado X.509 y la llave privada (sin passphrase) concatenados. Ver
[certificados digitales](/guias/certificados) para cómo obtenerlo.

## Sin red, sin espera

`sign()` **no llama a SUNAT**. Es puramente local: criptografía + DOM. Por eso es instantáneo y testable al
100%. Puedes firmar y entregar el comprobante al cliente sin depender de la disponibilidad de SUNAT.

<CodeTabs>
<template #php>

```php
// En el punto de venta, al instante:
$signed = $quipu->sign($invoice);

// Entregar al cliente (XML, QR, vista de impresión):
file_put_contents('storage/' . $invoice->fileName() . '.xml', $signed->xml);
$qr = $quipu->qrString($invoice, $signed);
$view = $quipu->printable($invoice, $signed);

// El reporte a SUNAT va después, en un job diferido:
// $billResult = $quipu->sendBill($signed);
```

</template>
</CodeTabs>

> [!NOTE] `qrString()`/`printable()` solo para la familia de venta
> El ejemplo de arriba funciona porque `$invoice` es una factura. Ambos métodos soportan **solo**
> `Model\Invoice` (factura y boleta) y `Model\Note` (NC/ND); con guía de remisión, retención, percepción,
> resumen diario, baja o reversión lanzan `Exception\InvalidDocumentException`, porque el formato de su QR no
> está confirmado contra el anexo técnico de SUNAT. Ver
> [representación impresa](/guias/representacion-impresa).

## Detalles de la firma

- **Algoritmo**: RSA-SHA1 para la firma, SHA1 para el digest, C14N para la canonicalización —lo que SUNAT espera.
- **Ubicación**: la firma va **dentro de `ext:UBLExtensions`** (enveloped), como exige SUNAT.
- **UBLExtensions**: el signer crea el bloque `ext:UBLExtensions` si no existe; si el builder ya emitió uno
  (p. ej. retención/percepción, que lo exigen por esquema UBL 2.0, o una factura con traslado embebido), el
  signer **se une** a él en lugar de crear un segundo bloque inválido.

## Errores de firma

Si la firma falla, quipu lanza `ElPandaPe\Quipu\Exception\SigningException` (subclase de `QuipuException`):

- El PEM no contiene un certificado X.509 válido.
- El PEM no contiene una llave privada válida.
- El XML de entrada está malformado.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\SigningException;

try {
    $signed = $quipu->sign($invoice);
} catch (SigningException $e) {
    // problema con el certificado o el XML
}
```

</template>
</CodeTabs>

## Siguiente paso

- [Certificados digitales](/guias/certificados)
- [Validación local](/guias/validacion-local) antes de firmar
- [Representación impresa](/guias/representacion-impresa) (QR + vista)
