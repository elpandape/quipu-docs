# Contratos (interfaces)

Las interfaces bajo `ElPandaPe\Quipu\Contract\` son el **seam público**: el consumidor depende de estas
abstracciones, no de las clases concretas de firma o transporte. Así puede mockearlas en tests y sustituirlas
sin tocar el dominio.

<Availability lite pro />

::: tip El seam es lo que aprovecha Pro
Estas interfaces son del **emisor base (Lite)**. Como todo pasa por ellas, **quipu Pro** <Availability pro />
puede envolverlas sin tocar el dominio: sus decoradores de **retry/logging/idempotencia** implementan el mismo
`Sender`, y sus **fakes** de testing implementan estos mismos contratos. Ver [quipu Pro](/pro/introduccion).
:::

## `XmlBuilder`

Construye el XML UBL sin firmar a partir de un `Document`.

<CodeTabs>
<template #php>

```php
interface XmlBuilder
{
    public function build(Document $document): string;
}
```

</template>
</CodeTabs>

Implementación: `Xml\CompositeBuilder` (despacha por tipo) o `Xml\InvoiceBuilder`, `Xml\NoteBuilder`, etc.

La **versión de UBL la fija el builder**, según lo que SUNAT exige para cada familia: `InvoiceBuilder`,
`NoteBuilder`, `DespatchBuilder` y `CarrierDespatchBuilder` emiten `cbc:UBLVersionID` **2.1**; `SummaryBuilder`,
`VoidedBuilder`, `ReversionBuilder`, `RetentionBuilder` y `PerceptionBuilder` emiten **2.0**.

## `Signer`

Firma el XML (xmldsig enveloped).

<CodeTabs>
<template #php>

```php
interface Signer
{
    public function sign(string $xml): SignedXml;
}
```

</template>
</CodeTabs>

Implementación: `Signer\XmlSecSigner`.

## `Sender`

Envía documentos firmados a SUNAT y recupera el CDR.

<CodeTabs>
<template #php>

```php
interface Sender
{
    public function sendBill(SignedXml $signedXml): BillResult;
    public function sendSummary(SignedXml $signedXml): TicketResult;

    /** @param list<SignedXml> $documents */
    public function sendPack(array $documents, string $batchName): TicketResult;

    public function getStatus(string $ticket): CdrResult;

    /** @return array<string, CdrResult> */
    public function getPackStatus(string $ticket): array;
}
```

</template>
</CodeTabs>

Implementación: `Ws\SoapSender`. Sobre esta misma interfaz, **quipu Pro** <Availability pro /> intercala
decoradores de **retry**, **logging** e **idempotencia** —ver [Infraestructura (Pro)](/pro/infra)— y su
[testing toolkit](/pro/testing) ofrece un `FakeSender` para pruebas sin red.

## `Validator`

Reglas de negocio de SUNAT antes de firmar.

<CodeTabs>
<template #php>

```php
interface Validator
{
    /** @return list<string> violaciones (en español); vacío = ok */
    public function errorsFor(Document $document): array;
}
```

</template>
</CodeTabs>

Implementación: `Validation\CompositeValidator` (despacha a un validador por familia).

## `SchemaValidator`

Validación contra el XSD de SUNAT.

<CodeTabs>
<template #php>

```php
interface SchemaValidator
{
    /** @throws InvalidDocumentException si el XML no coincide con el esquema del documento */
    public function assertValid(Document $document, string $xml): void;

    /** @return list<string> violaciones de esquema; vacío = el XML es válido */
    public function errorsFor(Document $document, string $xml): array;
}
```

</template>
</CodeTabs>

Dos modos para el mismo chequeo: `assertValid()` **lanza**
[`InvalidDocumentException`](/referencia/excepciones#invaliddocumentexception) con **todas** las violaciones
encontradas (se concatenan con `; `), no solo la primera; `errorsFor()` **devuelve** la lista y deja la decisión
al consumidor.

Implementación: `Xml\DocumentSchemaValidator`.

## `DocumentReader`

Lee un XML UBL de vuelta a su `Model\*` (inverso de `XmlBuilder`).

<CodeTabs>
<template #php>

```php
interface DocumentReader
{
    public function read(string $xml): Document;
}
```

</template>
</CodeTabs>

Implementación: `Xml\CompositeReader`.

> [!WARNING] No es un inverso total: la GRE del transportista (31) no tiene lector
> `CompositeReader` lee todas las familias salvo `CarrierDespatch` (la guía de remisión del transportista,
> tipoDoc 31): ese brazo lanza `InvalidDocumentException` ("No hay un lector registrado para la guía de remisión
> de tipo «31»."). Factura, nota, resumen diario, comunicación de baja, reversión, retención, percepción y la GRE
> del remitente (tipoDoc 09) sí se leen. Ver `Xml\CompositeReader::readDespatchAdvice()`.

## `Document`

Marcador de los modelos emitibles.

<CodeTabs>
<template #php>

```php
interface Document
{
    public function documentType(): DocumentType;
    public function fileName(): string;  // p. ej. "20512345678-01-F001-1"
}
```

</template>
</CodeTabs>

Lo implementan `Invoice`, `Note`, `Despatch`, `DailySummary`, `Voidance`, `Reversion`, `Retention`,
`Perception`, `CarrierDespatch`.

## `GreSender`

Envía guías de remisión por la API REST de SUNAT.

<CodeTabs>
<template #php>

```php
interface GreSender
{
    public function sendGuide(string $fileName, SignedXml $signedXml): TicketResult;
    public function guideStatus(string $ticket): CdrResult;
}
```

</template>
</CodeTabs>

Implementación: `Ws\GreClient`.

## `CpeValidator`

Consulta de validez de CPE de terceros.

<CodeTabs>
<template #php>

```php
interface CpeValidator
{
    public function validate(CpeQuery $query): CpeValidity;
}
```

</template>
</CodeTabs>

Implementación: `Ws\CpeValidityClient`.

## `CpeStatusService`

Consulta de estado y re-descarga de CDR de tu propio CPE.

<CodeTabs>
<template #php>

```php
interface CpeStatusService
{
    public function getStatus(string $ruc, string $documentType, string $series, int $number): BillConsultResult;
    public function getStatusCdr(string $ruc, string $documentType, string $series, int $number): BillConsultResult;
}
```

</template>
</CodeTabs>

Implementación: `Ws\BillConsultClient`.

## `QrEncoder`

Construye el string del QR de SUNAT.

<CodeTabs>
<template #php>

```php
interface QrEncoder
{
    public function encode(Document $document, SignedXml $signedXml): string;
}
```

</template>
</CodeTabs>

Implementación: `Presentation\SunatQrEncoder`.

## `PrintViewBuilder`

Proyecta un documento firmado en una vista de impresión tipada.

<CodeTabs>
<template #php>

```php
interface PrintViewBuilder
{
    public function build(Document $document, SignedXml $signedXml): PrintView;
}
```

</template>
</CodeTabs>

Implementación: `Presentation\CompositePrintViewBuilder`.

## `Clock`

Abstracción del reloj, para tests deterministas.

<CodeTabs>
<template #php>

```php
interface Clock
{
    /** Instante actual como epoch Unix, en segundos. */
    public function now(): int;
}
```

</template>
</CodeTabs>

> [!NOTE]
> `now()` devuelve un **`int`** (epoch Unix en segundos), no un `DateTimeImmutable`. El contrato existe para la
> lógica dependiente del tiempo —sobre todo la expiración de los tokens OAuth—, donde un entero es lo que se
> compara. Si necesitas una fecha, conviértela en tu implementación.

Implementación: `Ws\SystemClock`.

## `HttpClient`

Cliente HTTP para las APIs REST de SUNAT (GRE y consulta).

<CodeTabs>
<template #php>

```php
interface HttpClient
{
    /** @param array<string, string> $headers */
    public function request(string $method, string $url, array $headers, ?string $body): HttpResponse;
}
```

</template>
</CodeTabs>

> [!NOTE]
> `$headers` y `$body` **no tienen valor por default**: los cuatro argumentos son obligatorios. Para un GET sin
> cuerpo, pasa `[]` y `null` explícitamente.

Implementación: `Ws\CurlHttpClient`.

## `TokenStore`

Almacén de tokens OAuth para la GRE (cache entre llamadas).

<CodeTabs>
<template #php>

```php
interface TokenStore
{
    /** El token cacheado para $key, o null si no hay o ya expiró. */
    public function get(string $key): ?string;

    /** Guarda $token para $key, válido durante $expiresIn segundos desde ahora. */
    public function put(string $key, string $token, int $expiresIn): void;
}
```

</template>
</CodeTabs>

El `$key` lo define la implementación; en la práctica es el `clientId` de OAuth más el usuario SOL. El backing
store queda a tu elección: memoria, archivo, Redis…

> [!NOTE]
> El tercer parámetro se llama **`$expiresIn`**, no `$ttlSeconds`. Si usas argumentos nombrados
> (`$store->put(key: ..., token: ..., expiresIn: 3600)`), el nombre importa.

Implementación: `Ws\InMemoryTokenStore`, que **recibe un `Contract\Clock` obligatorio** en el constructor
(`new InMemoryTokenStore(new SystemClock())`): el reloj se inyecta para que la expiración sea determinista en
tests. Se inyecta en `Ws\GreClient` (6.º parámetro) y en `Ws\CpeValidityClient` (4.º parámetro); ver
[endpoints](/referencia/endpoints).

## Siguiente paso

- [El facade Quipu](/arquitectura/facade) — cómo se orquestan estos contratos.
- [Arquitectura](/arquitectura/vision-general) — el diagrama de capas.
