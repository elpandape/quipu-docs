# Certificados

<Availability pro />

Firmar contra SUNAT exige un certificado digital bien formado, vigente, con la clave privada presente y cuyo RUC
coincida con el del emisor. Pro trae tres utilidades para trabajar con certificados **en local**, antes de
intentar firmar: convertir el formato que te entrega la autoridad, inspeccionar qué contiene, y verificar que
está listo para emitir.

## Conversión PFX→PEM: `CertificateConverter`

Las autoridades suelen entregar el certificado en formato **PFX/PKCS#12** (`.pfx` / `.p12`, protegido con
contraseña), pero el firmador de quipu trabaja con **PEM** (certificado + clave privada concatenados).
`CertificateConverter` hace la conversión.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Certificate\CertificateConverter;

$converter = new CertificateConverter();

$pfx = file_get_contents('certificado.pfx');
$pem = $converter->pfxToPem($pfx, password: 'mi-clave-pfx');

// $pem ya sirve para XmlSecSigner:
$signer = new ElPandaPe\Quipu\Signer\XmlSecSigner($pem);
```

</template>
</CodeTabs>

## Inspección: `CertificateInspector`

`CertificateInspector::inspect(string $pem)` lee un PEM y devuelve un `CertificateInfo` tipado con todo lo que
necesitas para decidir si el certificado sirve.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Certificate\CertificateInspector;

$inspector = new CertificateInspector();
$info = $inspector->inspect($pem);

$info->commonName;    // string, el CN del subject
$info->subjectRuc;    // ?string, el RUC extraído del subject (null si no se halló)
$info->issuer;        // string, el CN del emisor del certificado
$info->serialNumber;  // string
$info->notBefore;     // int, timestamp de inicio de vigencia
$info->notAfter;      // int, timestamp de fin de vigencia
$info->hasPrivateKey; // bool, si el PEM incluye la clave privada
$info->keyBits;       // ?int, tamaño de la clave (p. ej. 2048)

// Ayudas de vigencia (contra un timestamp):
$info->isValidAt(time());       // bool
$info->isExpiredAt(time());     // bool
$info->daysUntilExpiry(time()); // int, días restantes
```

</template>
</CodeTabs>

Por defecto el RUC se busca en los campos `serialNumber`, `CN` y `OU` del subject, en ese orden. Puedes cambiar la
lista pasándola al constructor: `new CertificateInspector(['serialNumber', 'CN'])`.

## Verificación pre-vuelo: `PreFlightChecker`

`PreFlightChecker` es el contrapeso de los validadores de documento, pero del lado del certificado: comprueba,
**antes de firmar**, que todo está en orden. Devuelve una lista de problemas en español (lista vacía = listo para
firmar); nunca lanza.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\SystemClock;
use ElPandaPe\QuipuPro\Certificate\CertificateInspector;
use ElPandaPe\QuipuPro\Certificate\PreFlightChecker;

$info = (new CertificateInspector())->inspect($pem);

$checker = new PreFlightChecker();
$errors = $checker->errorsFor($info, emitterRuc: '20000000001', clock: new SystemClock());

if ($errors !== []) {
    foreach ($errors as $problem) {
        echo "- {$problem}\n";   // p. ej. "El certificado expiró el 2025-12-31."
    }
    exit(1);
}

// Sin errores: el certificado tiene clave privada, está vigente, su RUC
// coincide con el emisor y su clave es de al menos 2048 bits.
```

</template>
</CodeTabs>

El checker verifica cuatro cosas: que la clave privada esté presente, que la ventana de vigencia cubra el
"ahora" del `Clock`, que el RUC del certificado coincida con el del emisor, y que la clave tenga al menos
**2048 bits** (el mínimo que exige SUNAT para RSA).

::: tip Ejecútalo al arrancar, no al emitir
Corre el `PreFlightChecker` cuando cargas la configuración del emisor —no en el camino crítico de cada venta—.
Así detectas un certificado por vencer o mal emitido antes de que rechace tu primer envío del día. `CertificateInfo::daysUntilExpiry()`
te sirve para avisar con anticipación.
:::

## Errores

Cuando el PEM no es un X.509 válido o el PFX no se puede abrir, las utilidades lanzan `CertificateException` (una
`QuipuException`), con un mensaje claro en español.

## Siguiente paso

- Con el PEM listo, monta la fachada en [Introducción a Pro](/pro/introduccion).
- Para el detalle de cómo genera SUNAT los certificados y cómo crear uno de prueba, ver la guía de Lite
  [certificados digitales](/guias/certificados).
