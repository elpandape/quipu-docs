# Edición Pro

<Availability pro />

Todo lo de esta página requiere `elpandape/quipu-pro` además de `quipu-laravel`. Pro es comercial y se instala
desde un repositorio Composer privado con las credenciales de tu licencia — ver
[Instalación de Pro](/pro/instalacion). La integración lo
**auto-detecta** y enriquece la emisión **sin que cambies tu código**: lo de [Uso (base)](/integraciones/laravel/uso)
sigue funcionando igual, solo que mejor por debajo. El detalle de cada capacidad vive en la sección
[quipu Pro](/pro/introduccion); esta página describe cómo Laravel la activa.

## Auto-detección

`config('quipu.pro')` controla las capacidades Pro:

- `"auto"` (por defecto) — se activan si `elpandape/quipu-pro` está instalado; si no, **degrada limpio** a Lite.
- `true` — fuerza Pro; si el paquete falta, lanza un error claro en vez de degradar.
- `false` — fuerza Lite.

Con Pro activo, el emisor se compone vía `QuipuPro::for(...)` y la integración se enriquece en los frentes que
siguen.

## Envío resiliente

El `Sender` se envuelve en logging → retry → idempotencia. El backoff se afina en `config('quipu.retry')` (solo
se reintentan las excepciones de sistema transitorias de SUNAT). Las claves de idempotencia se **persisten** en
la tabla `quipu_idempotency_keys` (Eloquent). Ver [Infraestructura resiliente](/pro/infra).

## Validación avanzada y diagnóstico

Validadores estrictos y cruzados, más la lectura **accionable** de un rechazo: el `RejectionReport` (con
`action`, `remedy`, `retryable`) se puebla en el evento `DocumentRejected` (sin Pro llega `null`). Ver
[Validación y diagnóstico](/pro/validacion-diagnostico).

## Motor tributario y builders fluidos

Con Pro instalado, el facade siembra los builders con tu emisor y el **motor tributario** (calcula
IGV/ISC/etc.), así aportas lo mínimo:

```php
use ElPandaPe\QuipuLaravel\Facades\Quipu;

$invoice = Quipu::invoice($client)
    ->addLine('S001', 'Servicio de consultoría', quantity: 1, unitValue: 1000.0)
    ->build();

Quipu::emit($invoice);
```

También `Quipu::creditNote($client, $reason)` y `Quipu::debitNote($client, $reason)`. **Sin Pro**, estos tres
métodos lanzan una excepción clara. Ver el [Fluent Builder](/pro/fluent-builder) y el
[motor tributario](/pro/motor-tributario).

### La tasa de IGV

Cada builder se siembra con la tasa de IGV configurada en
[`config('quipu.igv_rate')`](/integraciones/laravel/instalacion#la-tasa-de-igv) (18 % por defecto), la misma
para factura, boleta y nota. Puedes sobreescribirla **por documento** —útil bajo el régimen MYPE del 8 % (Ley
31556)— o **por línea** cuando el comprobante mezcla tasas:

```php
// Todo el documento al 8 %:
$invoice = Quipu::invoice($client)
    ->withIgvRate(8.0)
    ->addLine('P001', 'Menú', quantity: 1, unitValue: 100.0)
    ->build();

// O una tasa distinta en una línea concreta:
$invoice = Quipu::invoice($client)
    ->addLine('P001', 'Bien', quantity: 1, unitValue: 100.0)             // 18 %
    ->addLine('P002', 'Menú', quantity: 1, unitValue: 50.0, igvRate: 8.0) // 8 %
    ->build();
```

En [multi-tenant](/integraciones/laravel/multi-tenant) cada emisor puede fijar su propia tasa por defecto sin
tocar este código.

## Certificados

Con Pro puedes trabajar directamente con `.pfx`/`.p12`: inspección, conversión a PEM, pre-flight y alerta de
expiración. Además, `quipu:doctor` se enriquece con el **pre-flight del certificado**. Ver
[Certificados de Pro](/pro/certificados).

## Comandos Artisan (Pro)

A los [comandos base](/integraciones/laravel/uso#comandos-artisan-base) se suman:

| Comando               | Qué hace                                                    |
|-----------------------|-------------------------------------------------------------|
| `quipu:cert:inspect`  | Inspecciona un certificado (`.pfx`/PEM).                     |
| `quipu:cert:convert`  | Convierte `.pfx`→PEM.                                        |
| `quipu:cert:alert`    | Alerta de expiración del certificado.                       |
| `quipu:diagnose`      | Diagnóstico accionable de un rechazo.                       |
| `quipu:xml:inspect`   | Inspecciona un XML CPE.                                      |
| `quipu:xml:diff`      | Compara dos XML.                                             |
| `quipu:pro:retry`     | Reintento inteligente de los pendientes.                    |

## Schedules Pro

El reintento simple se reemplaza por el **reintento inteligente** (`quipu:pro:retry`) y se añade la **alerta de
expiración del certificado** (`quipu:cert:alert`), controlada por `QUIPU_SCHEDULE_CERT_ALERT_CRON` y
`QUIPU_SCHEDULE_CERT_EXPIRY_DAYS`. Ver la [configuración de scheduling](/integraciones/laravel/instalacion#scheduling).

## Siguiente paso

- Emite para muchos emisores en [Multi-tenant](/integraciones/laravel/multi-tenant).
- Explora todo lo que ofrece la edición en la [introducción a quipu Pro](/pro/introduccion).
