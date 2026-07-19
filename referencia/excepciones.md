# Excepciones

quipu tiene una **jerarquía de excepciones de dominio** bajo `ElPandaPe\Quipu\Exception\`. Todas heredan de
`QuipuException`, así que puedes atrapar todas las fallas de quipu con un solo `catch`.

<Availability lite pro />

::: tip Diagnóstico accionable en Pro
Esta jerarquía es del **emisor base (Lite)**. **quipu Pro** <Availability pro /> añade, encima de estos errores,
un **diagnóstico** que traduce el código de rechazo o el `faultCode` a una causa y una acción sugerida, más una
`CertificateException` para los fallos de certificado. Ver
[Validación y diagnóstico](/pro/validacion-diagnostico) y [Certificados (Pro)](/pro/certificados).
:::

## Jerarquía

```
QuipuException (extends RuntimeException)
├── InvalidDocumentException    // el modelo/XML no es válido (o no hay soporte para su familia)
├── SigningException            // la firma falló
└── TransportException          // fallo de red/SOAP/REST
    └── SunatFaultException     // SOAP Fault síncrono con código SUNAT
```

> [!NOTE]
> **Un CDR rechazado no es una excepción.** SUNAT aceptó y procesó el ZIP; el rechazo viene como un
> `CdrResult` con estado `Rejected` dentro del `BillResult`. Se inspecciona, no se atrapa
> (ver [El rechazo de CDR no lanza](#el-rechazo-de-cdr-no-lanza)).

## `QuipuException`

Base de la jerarquía. Atrapa esta para capturar **todo** lo que quipu pueda lanzar.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\QuipuException;

try {
    $result = $quipu->emitInvoice($invoice);
} catch (QuipuException $e) {
    // cualquier falla de quipu
}
```

</template>
</CodeTabs>

## `InvalidDocumentException`

La excepción más transversal de quipu: cubre todo aquello que **no se puede representar** —de modelo a XML o de
vuelta—. La lanzan cinco frentes:

| Origen | Cuándo |
|---|---|
| `Quipu::assertValid()` | El documento viola reglas de negocio de SUNAT o su XSD |
| `Contract\SchemaValidator::assertValid()` | El XML construido no coincide con el esquema |
| `Contract\DocumentReader::read()` | El XML no se puede parsear, o su tipo no tiene lector registrado |
| `Quipu::qrString()` / `Quipu::printable()` | La familia del documento no tiene QR ni proyección de impresión |
| `Cdr\CdrParser` (vía `sendBill()`/`emitInvoice()` y el polling de tickets) | El CDR que devuelve SUNAT no se puede descomprimir o no tiene la estructura esperada |

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\InvalidDocumentException;

try {
    $quipu->assertValid($invoice);
} catch (InvalidDocumentException $e) {
    echo $e->getMessage(); // "campo X obligatorio; monto Y no coincide..."
}
```

</template>
</CodeTabs>

Al leer un XML de vuelta:

<CodeTabs>
<template #php>

```php
try {
    $document = $quipu->read($xml);
} catch (InvalidDocumentException $e) {
    // XML no parseable, o sin lector para su tipo de documento
}
```

</template>
</CodeTabs>

::: danger Un CDR corrupto lanza `InvalidDocumentException` — el fallo es de SUNAT, no de tu documento
`sendBill()` y `emitInvoice()` parsean el CDR que SUNAT devuelve con `Cdr\CdrParser`; el polling de tickets
(`getStatus()`, `getPackStatus()`, `getGuideStatus()`) hace lo mismo. Si ese CDR llega corrupto —ZIP sin abrir,
sin XML, o sin `ResponseCode`— quipu lanza `InvalidDocumentException` con mensajes como
«CDR ZIP could not be opened.» o «CDR has no response code.». Es la **misma excepción** que `assertValid()` usa
para un comprobante mal armado, así que es fácil concluir que el error está en tu XML cuando en realidad está en
la respuesta de SUNAT. Ante esos mensajes, no corrigas tu comprobante: reenvía o consulta su estado.
:::

> [!WARNING] `qrString()` y `printable()` solo soportan `Invoice` y `Note`
> Las demás familias —GRE (`Despatch`, `CarrierDespatch`), retención, percepción, resumen diario, comunicación
> de baja y reversión— **lanzan `InvalidDocumentException`**. No es un error de tus datos: es que esos
> comprobantes aún no tienen encoder de QR ni proyección de impresión. Si construyes una representación impresa
> genérica, filtra por tipo antes de llamarlos.

<CodeTabs>
<template #php>

```php
try {
    $view = $quipu->printable($despatch, $signed);
} catch (InvalidDocumentException $e) {
    // "No hay proyección de impresión para el comprobante «09»."
}
```

</template>
</CodeTabs>

## `SigningException`

Lanzada por `sign()` (y por extensión `emit*()`) cuando la firma falla: PEM inválido, llave privada ausente,
XML malformado.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\SigningException;
```

</template>
</CodeTabs>

## `TransportException`

Fallo de transporte: red caída, SOAP inalcanzable, respuesta vacía, estado inesperado del ticket, o un servicio
opcional (GRE, consulta) no inyectado.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\TransportException;
```

</template>
</CodeTabs>

## `SunatFaultException`

Subclase de `TransportException`. Envuelve **cualquier** SOAP Fault que devuelva SUNAT: quipu no filtra por
código, así que un fault llega aquí tanto si es tu XML como si el servicio está caído o tu clave SOL está mal.
Lleva el `faultCode` de SUNAT.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\SunatFaultException;

try {
    $result = $quipu->emitInvoice($invoice);
} catch (SunatFaultException $e) {
    $e->faultCode;    // código de SUNAT (string)
    $e->getMessage(); // enriquecido con la traducción del catálogo de errores
}
```

</template>
</CodeTabs>

### Las bandas del `faultCode`

Capturar `SunatFaultException` **no** te dice qué hacer: la acción depende de la banda del código.

| Banda | Qué significa | Acción |
|---|---|---|
| `100`–`999` | Sistema de SUNAT o credenciales | **Depende**: reintenta si es del sistema; **no** si es de credenciales |
| `1000`–`1999` | Formato/estructura de **tu** XML | **No reintentes**: corrige el XML y reenvía |

Dentro de `100`–`999` conviven dos cosas distintas:

- **Transitorio** (reintenta con backoff): `100` y `109` —*«El sistema no puede responder su solicitud»*—,
  y la familia `130`–`138` (no se pudo encolar, error en base de datos…).
- **Permanente** (reintentar no arregla nada; escala a una persona): `102` *«Usuario o contraseña
  incorrectos»*, `103` *«El Usuario ingresado no existe»*, `104` *«La Clave ingresada es incorrecta»*,
  `105` *«El Usuario no está activo»*, `111` *«No tiene el perfil para enviar comprobantes electronicos»*.

::: danger Un fault no es siempre «corrige tu XML»
Si tratas todo `SunatFaultException` como error de estructura, un `109` (SUNAT caída) se archiva como
comprobante roto y **nunca se reintenta**. Mira el `faultCode` antes de decidir.
:::

### `fromSoapFault()`

Factory estática pública que construye la excepción a partir de un `SoapFault` crudo, enriqueciendo el mensaje
con la traducción del `Error\ErrorCatalog` cuando el código es conocido (si no, usa el `faultstring` de SUNAT):

<CodeTabs>
<template #php>

```php
public static function fromSoapFault(SoapFault $fault): self;
```

</template>
</CodeTabs>

> [!TIP] El `SoapFault` original queda como `previous`
> `fromSoapFault()` conserva el fault crudo como excepción previa, así que puedes loggear detalles que la
> excepción de dominio no expone —`faultactor`, `detail`— sin perder el mensaje traducido:

<CodeTabs>
<template #php>

```php
catch (SunatFaultException $e) {
    $original = $e->getPrevious();   // el SoapFault crudo
    $logger->error($e->getMessage(), [
        'faultCode'  => $e->faultCode,
        'faultactor' => $original?->faultactor ?? null,
        'detail'     => $original?->detail ?? null,
    ]);
}
```

</template>
</CodeTabs>

Te resulta útil si envuelves tu propio `SoapClient`: es el mismo camino que usa `Ws\SoapSender` internamente.

::: tip SOAP Fault ≠ CDR rechazado
Un `SunatFaultException` es una falla **síncrona**: SUNAT respondió con un Fault en vez de procesar el envío
(porque el XML no pasó la validación de estructura, o porque el servicio o tus credenciales fallaron). Un CDR
rechazado es **asíncrono** —SUNAT aceptó el ZIP, lo procesó y devolvió un CDR con estado Rechazado— y se
representa con un `CdrResult` de estado `Rejected`, no con una excepción.
:::

## El rechazo de CDR no lanza

Un rechazo de CDR se detecta **inspeccionando el resultado**, nunca con un `catch`:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Result\CdrStatus;

$result = $quipu->emitInvoice($invoice);

if ($result->cdr->status === CdrStatus::Rejected) {
    // rechazado: $result->cdr->responseCode dice por qué
}
```

</template>
</CodeTabs>

Es una decisión deliberada: `emitInvoice()` y `sendBill()` devuelven el `CdrResult` dentro del `BillResult` y
dejan que el consumidor decida si el rechazo es una excepción de su dominio o un resultado más a inspeccionar.
Si prefieres lo primero, lanza **tu propia** excepción desde tu capa: quipu no impone una.

## Patrón de captura

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\{
    QuipuException,
    InvalidDocumentException,
    SigningException,
    TransportException,
    SunatFaultException,
};

try {
    $quipu->assertValid($invoice);
    $result = $quipu->emitInvoice($invoice);
} catch (InvalidDocumentException $e) {
    // documento mal armado: corrige y reintenta
} catch (SigningException $e) {
    // problema con el certificado
} catch (SunatFaultException $e) {
    // SOAP Fault de SUNAT: mira $e->faultCode
    // 100–999 → sistema/credenciales; 1000–1999 → estructura de tu XML
} catch (TransportException $e) {
    // red caída o estado inesperado: reintenta en diferido
} catch (QuipuException $e) {
    // cualquier otra falla de quipu
}
```

</template>
</CodeTabs>

Ver [manejo de errores](/buenas-practicas/manejo-errores) para la estrategia de reintentos.

## Siguiente paso

- [Manejo de errores](/buenas-practicas/manejo-errores)
- [Resultados](/referencia/resultados)
