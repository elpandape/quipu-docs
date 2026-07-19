# Testing toolkit

<Availability pro />

Probar el flujo de emisión no debería exigir red ni certificado. El **testing toolkit** de Pro es un conjunto de
dobles (fakes) y aserciones que sustituyen cada frontera externa —el XML builder, el firmador, el sender SOAP, el
sender de guías, el cliente HTTP y el reloj— por una versión programable y observable. Con ellos armas un `Quipu`
o un `QuipuPro` completo **sin certificado ni conexión a SUNAT**, y verificas qué se envió y qué se recibió.

::: tip Es código de producción, no de tu carpeta de tests
El toolkit vive en `src/Testing/` del paquete Pro y se distribuye con él: lo importas desde tus propios tests
(`ElPandaPe\QuipuPro\Testing\...`). No es infraestructura interna de quipu; es una herramienta que Pro te entrega.
:::

## Los dobles

| Doble | Sustituye a | Configuración | Inspección |
|---|---|---|---|
| `FakeXmlBuilder` | `XmlBuilder` | `willBuild(string $xml)` | `built(): PayloadRecorder` |
| `FakeSigner` | `Signer` | `willSign(SignedXml)` | `signed(): PayloadRecorder` |
| `FakeSender` | `Sender` | `willAccept()` / `willReject()` / `willObserve()` / `willFail()` | `sent(): PayloadRecorder` |
| `FakeGreSender` | `GreSender` | `willAccept()` / `willReject()` / `willFail()` | `sent(): PayloadRecorder` |
| `FakeHttpClient` | `HttpClient` | `willRespond(int, string)` / `willFail()` | `requests(): PayloadRecorder` |
| `FakeClock` | `Clock` | `set(int)` / `advance(int)` | `now(): int` |

### `FakeSender`: CDRs a pedido

`FakeSender` devuelve CDRs pre-construidos en vez de golpear SUNAT, y registra lo que se le envió. Por defecto
acepta; configura el modo persistente de forma fluida.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Testing\FakeSender;

$sender = new FakeSender();

$sender->willAccept();                         // CDR aceptado (código '0') — es el default
$sender->willReject('2223', 'Rechazado');      // CDR rechazado con código y descripción
$sender->willObserve(['Observación de prueba']); // aceptado con observaciones
$sender->willFail(new RuntimeException('timeout')); // lanza al enviar (prueba tu reintento)

// Inspeccionar lo enviado:
$sender->sent()->wasCalled();   // bool
$sender->sent()->count();       // int
$sender->sent()->last();        // el último payload enviado (un SignedXml)
```

</template>
</CodeTabs>

### `FakeClock`: control del tiempo

`FakeClock` implementa el `Clock` de Lite con un tiempo que tú mueves: úsalo para probar vigencias de certificado,
fechas de emisión y el backoff de reintentos sin esperas reales.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Testing\FakeClock;

$clock = new FakeClock(now: 1_700_000_000);
$clock->advance(3600);   // +1 hora
$clock->set(1_800_000_000);
$clock->now();           // int
```

</template>
</CodeTabs>

### `FakeHttpClient`: el borde REST

Para el transporte REST de las guías, `FakeHttpClient` devuelve una respuesta fija y registra cada petición como
un `RecordedRequest` (`method`, `url`, `headers`, `body`).

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Testing\FakeHttpClient;

$http = new FakeHttpClient();
$http->willRespond(status: 200, body: '{"ok":true}');

// ...tras ejercitar el código que lo usa:
$request = $http->requests()->last();   // RecordedRequest
$request->method;   // "POST"
$request->url;
$request->headers;  // array<string, string>
$request->body;     // ?string
```

</template>
</CodeTabs>

## Un `QuipuPro` sin certificado ni red

Combinando `FakeXmlBuilder`, `FakeSigner` y `FakeSender` armas una fachada Pro completa que emite de principio a
fin sin tocar nada externo. Ideal para probar tu propia lógica alrededor de la emisión.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\QuipuPro;
use ElPandaPe\QuipuPro\Testing\FakeSender;
use ElPandaPe\QuipuPro\Testing\FakeSigner;
use ElPandaPe\QuipuPro\Testing\FakeXmlBuilder;

$sender = (new FakeSender())->willAccept();

$pro = QuipuPro::for(
    issuer: $issuer,
    builder: new FakeXmlBuilder(),
    signer: new FakeSigner(),
    sender: $sender,
);

$invoice = $pro->invoice($client)
    ->series('F001')->number('1')
    ->addLine('P001', 'Producto', quantity: 1.0, unitValue: 100.0)
    ->build();

$result = $pro->core()->emitInvoice($invoice);

// El documento válido se construyó y "se emitió" sin red ni certificado;
// $sender->sent() prueba que el flujo llegó al transporte.
```

</template>
</CodeTabs>

## Aserciones sobre el CDR: `CdrAsserter`

`CdrAsserter` da aserciones fluidas y agnósticas del framework de test sobre un CDR: cada una lanza
`CdrAssertionException` (con mensaje en español) si la expectativa falla, y encadena.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Testing\CdrAsserter;

CdrAsserter::for($result)          // acepta un BillResult o un CdrResult
    ->isAccepted()
    ->hasResponseCode('0')
    ->hasNoObservations();

// Para un rechazo o una observación:
CdrAsserter::for($rejected)->isRejected()->hasResponseCode('2223');
CdrAsserter::for($observed)->isObserved()->hasObservation('duplicado');
```

</template>
</CodeTabs>

Como lanza una excepción en vez de depender de un runner concreto, funciona igual con Pest, PHPUnit o cualquier
otro: la excepción hace fallar el test.

## Siguiente paso

- Prueba el apilado de reintento/idempotencia de la [infraestructura](/pro/infra) usando `FakeSender::willFail()` y `FakeClock`.
- Repasa el flujo real de emisión en [Introducción a Pro](/pro/introduccion).
