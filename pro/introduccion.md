# quipu Pro

<Availability pro />

**quipu Pro** (`elpandape/quipu-pro`) es la edición comercial que se monta **encima** de quipu Lite. No sustituye
nada: Lite ya construye el XML UBL, lo firma, lo envía a SUNAT y parsea el CDR. Pro añade una capa de
**productividad, calidad y operación avanzada**, toda ella **100 % local** —no hay servicio remoto, ni telemetría,
ni llamadas de red propias— sobre las mismas interfaces que ya conoces.

## Lite emite bien; Pro te hace productivo

La división es deliberada:

- **Lite** es el emisor completo: si sabes armar un `Model\Invoice` correcto, Lite lo emite. Es la maquinaria.
- **Pro** es el andamiaje alrededor de esa maquinaria: builders fluidos que producen documentos válidos desde
  inputs mínimos, un motor tributario que calcula IGV/ISC/IVAP/ICBPER/detracción/percepción/retención por ti,
  validadores estrictos y cruzados, diagnóstico accionable de rechazos, decoradores de reintento/logging/
  idempotencia sobre el transporte, utilidades de certificados y de inspección de XML, y un toolkit de testing
  para probar la integración con SUNAT sin red ni certificado.

Todo lo que Pro añade **implementa los contratos de Lite** (`Contract\Validator`, `Contract\Sender`, etc.), así
que puedes adoptarlo pieza por pieza o de golpe con la fachada.

## Instalación

Pro depende de Lite y se instala como un paquete aparte:

<CodeTabs>
<template #php>

```bash
composer require elpandape/quipu-pro
```

</template>
</CodeTabs>

::: warning Pro es comercial y aún no se publica
A diferencia de Lite —`elpandape/quipu-lite`, ya en Packagist (`v1.0.0`)—, Pro es la edición **comercial** y
todavía **no se publica en Packagist**. Para adquirir una licencia o evaluarlo, escribe a **contacto@elpanda.pe**.
Ver [Estado y versionado](/proyecto/estado-y-versionado).
:::

## La fachada `QuipuPro`

`QuipuPro` es el punto de entrada único. `QuipuPro::for(...)` compone un `Quipu` de Lite ya cableado con el
**sender resiliente** (logging sobre retry sobre idempotencia, en ese orden) y con los **validadores base de
Lite más los validadores Pro**, y encima expone las utilidades Pro pre-sembradas con tu empresa emisora.

<CodeTabs>
<template #php>

```php
<?php

declare(strict_types=1);

use ElPandaPe\Quipu\Model\Address;
use ElPandaPe\Quipu\Model\Client;
use ElPandaPe\Quipu\Model\Company;
use ElPandaPe\Quipu\Catalog\IdentityDocumentType;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Xml\CompositeBuilder;
use ElPandaPe\QuipuPro\QuipuPro;

$issuer = new Company(
    ruc: '20000000001',
    legalName: 'EMPRESA DE PRUEBA SAC',
    tradeName: 'QUIPU DEMO',
    address: new Address(
        ubigeo: '150101',
        department: 'LIMA',
        province: 'LIMA',
        district: 'LIMA',
        line: 'AV. SIEMPRE VIVA 123',
    ),
);

$endpoint = SoapEndpoints::beta()->billServiceUrl();

// for() sólo exige emisor + los tres servicios (builder, signer, sender);
// el resto —logger, RetryPolicy, Sleeper, ResultStore, GreSender, servicios de
// consulta CPE— tiene defaults sensatos y se pasa sólo si lo necesitas.
$pro = QuipuPro::for(
    issuer: $issuer,
    builder: new CompositeBuilder(),
    signer: new XmlSecSigner($certificate),
    sender: new SoapSender($endpoint, '20000000001MODDATOS', 'moddatos'),
);
```

</template>
</CodeTabs>

### Qué te devuelve

Con la fachada montada tienes tres cosas:

<CodeTabs>
<template #php>

```php
// 1) core(): el facade Quipu de Lite, ya resiliente y con los validadores Pro.
//    Emites con él exactamente como en Lite (emitInvoice, sign, sendBill, emitSummary, …).
$quipu = $pro->core();

// 2) Builders fluidos pre-sembrados con tu empresa emisora (ver Fluent Builder).
$client = new Client(
    documentType: IdentityDocumentType::Ruc,
    documentNumber: '20123456789',
    legalName: 'CLIENTE SAC',
);

$invoice = $pro->invoice($client)
    ->series('F001')
    ->number('123')
    ->addLine('P001', 'Producto de prueba', quantity: 2.0, unitValue: 100.0)
    ->build();

$result = $pro->core()->emitInvoice($invoice);

// 3) Diagnóstico accionable de un rechazo (ver Validación y diagnóstico).
if (!$result->cdr->isAccepted()) {
    $diagnosis = $pro->diagnose($result->cdr->responseCode);
    echo $diagnosis->action;   // qué hacer
    echo $diagnosis->remedy;   // cómo resolverlo
    echo $diagnosis->retryable ? 'reintenta' : 'corrige y reemite';
}
```

</template>
</CodeTabs>

La fachada también expone `creditNote(Client)` y `debitNote(Client)` para las notas, y `diagnoseCdr(CdrResult)` /
`diagnoseFault(SunatFaultException)` para diagnosticar a partir de un CDR o de una falla SOAP.

## Los bloques de Pro

| Bloque | Qué añade | Página |
|---|---|---|
| **Builders fluidos** | Documentos válidos desde inputs mínimos, plantillas, importe en letras | [Fluent Builder](/pro/fluent-builder) |
| **Motor tributario** | Calculadores de IGV, ISC, IVAP, ICBPER, detracción, percepción y retención | [Motor tributario](/pro/motor-tributario) |
| **Validación y diagnóstico** | Validadores estrictos y cruzados + lectura accionable de errores SUNAT | [Validación y diagnóstico](/pro/validacion-diagnostico) |
| **Infraestructura** | Decoradores de reintento, logging (PSR-3) e idempotencia sobre el transporte | [Infraestructura](/pro/infra) |
| **Certificados** | Inspección, conversión PFX→PEM y verificación pre-vuelo | [Certificados](/pro/certificados) |
| **Herramientas XML** | Inspector XPath, comparador de XML y conversor a JSON | [Herramientas XML](/pro/xml-tooling) |
| **Testing toolkit** | Fakes y aserciones para probar la integración sin red ni certificado | [Testing toolkit](/pro/testing) |
| **CLI y Laravel** | Consola y paquete Laravel (próximamente) | [CLI y Laravel](/pro/cli-laravel) |

## Filosofía

Pro no cambia el contrato con SUNAT: el XML que sale por el cable es el mismo que produce Lite. Lo que Pro te da
es **no tener que calcular a mano** los impuestos, **no descubrir en producción** un rechazo evitable, y **operar
con reintentos e idempotencia** sin escribir esa plomería tú. Es una capa de conveniencia y robustez, siempre
local y siempre opt-in.

## Siguiente paso

- Empieza por el [Fluent Builder](/pro/fluent-builder): la forma más rápida de emitir un documento válido.
- Revisa el [motor tributario](/pro/motor-tributario) si liquidas impuestos a mano hoy.
- Prepara producción con la [infraestructura resiliente](/pro/infra) y el [diagnóstico de errores](/pro/validacion-diagnostico).
