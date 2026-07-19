# Infraestructura resiliente

<Availability pro />

Enviar a SUNAT por la red falla de formas transitorias: timeouts, caídas momentáneas, excepciones de sistema del
lado de SUNAT. Y reenviar sin cuidado puede duplicar un comprobante. Pro trae tres **decoradores** que envuelven
el `Sender` (y el `GreSender`) de Lite y resuelven eso sin que toques tu código de emisión: **reintento**,
**logging** e **idempotencia**. Como son decoradores sobre los mismos contratos, se apilan en el orden que quieras.

## Los tres decoradores

### Reintento — `RetryingSender`

Reintenta las operaciones ante fallas transitorias con backoff exponencial. Qué es "transitorio" y con qué
cadencia lo define una `RetryPolicy`.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Retry\RetryPolicy;
use ElPandaPe\QuipuPro\Retry\RetryingSender;

// Políticas de fábrica:
$policy = RetryPolicy::default();   // 3 intentos, 1s base, factor 2, tope 30s
$none   = RetryPolicy::none();      // 1 intento (desactiva el reintento)
$poll   = RetryPolicy::polling();   // 20 intentos, intervalo constante de 3s (tickets)

// O a medida:
$custom = new RetryPolicy(maxAttempts: 5, baseDelayMs: 500, factor: 2.0, capDelayMs: 10000);

$policy->isRetryable($error);   // bool: sólo TransportException y excepciones de sistema (<1000)
$policy->delayFor(2);           // ms de espera antes del intento 2

$sender = new RetryingSender($innerSender, $policy, $sleeper);
```

</template>
</CodeTabs>

`RetryPolicy` sólo marca como reintentable lo que puede cambiar al reintentar: fallas de transporte y las
excepciones de sistema de SUNAT (severidad *exception*, código < 1000). Un rechazo de contenido (2xxx/3xxx) **no**
se reintenta, porque reenviar el mismo XML volvería a fallar.

### Logging — `LoggingSender`

Registra cada operación (inicio, éxito, reintento, fallo) contra un logger **PSR-3** vía `OperationLogger`. Por
defecto no registra nada (`NullLogger`); pásale tu logger para ver la traza.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Logging\LoggingSender;
use ElPandaPe\QuipuPro\Logging\OperationLogger;

$logger = new OperationLogger($psr3Logger);   // cualquier Psr\Log\LoggerInterface
$sender = new LoggingSender($innerSender, $logger);
```

</template>
</CodeTabs>

### Idempotencia — `IdempotentSender`

Evita el reenvío duplicado: guarda el resultado de cada envío en un `ResultStore` y, si vuelve a llegar el mismo
documento, devuelve el resultado guardado en vez de golpear SUNAT otra vez. `InMemoryResultStore` es la
implementación de memoria; implementa la interfaz `ResultStore` para persistirlo entre procesos.

<CodeTabs>
<template #php>

```php
use ElPandaPe\QuipuPro\Idempotency\IdempotentSender;
use ElPandaPe\QuipuPro\Idempotency\InMemoryResultStore;

$store = new InMemoryResultStore();
$sender = new IdempotentSender($innerSender, $store);
```

</template>
</CodeTabs>

## El orden de composición

Los decoradores se apilan. El orden recomendado —y el que arma la fachada— es **logging(retry(idempotencia))**:
la idempotencia más adentro (decide si hay que enviar), el reintento en medio (reintenta el envío real) y el
logging afuera (registra el resultado neto de todo).

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\QuipuPro\Idempotency\IdempotentSender;
use ElPandaPe\QuipuPro\Idempotency\InMemoryResultStore;
use ElPandaPe\QuipuPro\Logging\LoggingSender;
use ElPandaPe\QuipuPro\Logging\OperationLogger;
use ElPandaPe\QuipuPro\Retry\RealSleeper;
use ElPandaPe\QuipuPro\Retry\RetryingSender;
use ElPandaPe\QuipuPro\Retry\RetryPolicy;

$soap   = new SoapSender($endpoint, $username, $password);
$logger = new OperationLogger($psr3Logger);

$resilient = new LoggingSender(
    new RetryingSender(
        new IdempotentSender($soap, new InMemoryResultStore()),
        RetryPolicy::default(),
        new RealSleeper(),
        $logger,
    ),
    $logger,
);

// Inyéctalo como el Sender del facade de Lite:
$quipu = new Quipu($builder, $signer, $resilient);
```

</template>
</CodeTabs>

::: tip La fachada lo hace por ti
`QuipuPro::for(...)` monta exactamente este apilado —en el orden correcto— con los defaults, y te deja
sobreescribir el `OperationLogger`, la `RetryPolicy`, el `Sleeper` y el `ResultStore` por parámetro. Sólo
compones los decoradores a mano si no usas la fachada.
:::

## Guías de remisión

Existe el mismo par para el transporte REST de las guías: `RetryingGreSender` y `LoggingGreSender`, con las
mismas firmas (envuelven un `GreSender`). La fachada los aplica automáticamente cuando le pasas un `greSender`.

## `Sleeper`: control del tiempo

`RetryingSender` espera entre intentos a través de un `Sleeper`. En producción usas `RealSleeper`; en los tests,
`FakeClock`/dobles evitan que el tiempo real ralentice la suite. Ver el [testing toolkit](/pro/testing).

## Siguiente paso

- Decide qué reintentar con el [diagnóstico de errores](/pro/validacion-diagnostico) (usa la misma severidad).
- Prueba el apilado sin red con el [testing toolkit](/pro/testing).
