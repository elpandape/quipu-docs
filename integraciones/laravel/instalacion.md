# Instalación y configuración

<Availability lite pro />

Cómo instalar `quipu-laravel`, publicar la configuración y las migraciones, y configurarlo por completo. Para
las funcionalidades base ve a [Uso](/integraciones/laravel/uso); para lo que activa Pro, a
[Edición Pro](/integraciones/laravel/pro).

## Instalación

```bash
composer require elpandape/quipu-laravel
```

El `ServiceProvider` se registra por **auto-discovery**; no hay que añadir nada a `config/app.php`. Publica la
configuración y las migraciones con un solo comando:

```bash
php artisan quipu:install
php artisan migrate
```

`quipu:install` es un atajo de `vendor:publish`. Si prefieres publicar cada cosa por separado:

```bash
# Solo la configuración (config/quipu.php)
php artisan vendor:publish --tag=quipu-config

# Solo las migraciones (para adueñarte del esquema)
php artisan vendor:publish --tag=quipu-migrations
```

::: tip Migraciones sin publicar
Las migraciones (comprobantes, tickets, series, idempotencia) se **cargan solas**: `php artisan migrate` las
corre aunque no las publiques. Publícalas solo si quieres versionar o modificar el esquema en tu app.
:::

## Configuración

Todo vive en `config/quipu.php`, respaldado por variables de entorno. Lo mínimo en tu `.env`:

```dotenv
# Emisor (contribuyente)
QUIPU_RUC=20123456789
QUIPU_LEGAL_NAME="ACME CORP SAC"
QUIPU_SOL_USER=MODDATOS
QUIPU_SOL_PASS=moddatos

# Tasa de IGV por defecto (puntos porcentuales); 18.0 estándar, 8.0 para el
# régimen MYPE de restaurantes/hoteles (Ley 31556). Solo aplica con Pro.
QUIPU_IGV_RATE=18.0

# Ambiente SUNAT: "beta" (homologación) o "produccion"
QUIPU_ENVIRONMENT=beta

# Certificado de firma (PEM: certificado X.509 + clave privada)
QUIPU_CERT_SOURCE=path
QUIPU_CERTIFICATE_PATH=/ruta/al/certificado.pem
QUIPU_CERTIFICATE_PASSPHRASE=
```

### El emisor

`config('quipu.emisor')` describe al contribuyente que emite: `ruc`, `legal_name` (razón social, alimenta la
`Company` y por tanto los builders de Pro; si se deja vacío cae al RUC), `trade_name` (nombre comercial,
opcional) y las credenciales SOL `sol_user` / `sol_pass`.

### La tasa de IGV

<Availability pro />

`config('quipu.igv_rate')` es la tasa de IGV **por defecto** (en puntos porcentuales) que el motor tributario
de Pro aplica a toda línea gravada. Es la misma para factura, boleta y nota —la tasa es una propiedad de la
**operación/negocio, no del tipo de documento**—, así que se configura en un solo lugar:

```dotenv
QUIPU_IGV_RATE=18.0   # estándar; usa 8.0 para el régimen MYPE (Ley 31556)
```

Cámbiala ante una modificación nacional de la tasa, o fíjala en `8.0` si emites bajo el IGV especial de
restaurantes y hoteles. En **[multi-tenant](/integraciones/laravel/multi-tenant)** cada emisor puede declarar la
suya (cayendo a este valor global cuando no lo hace), y sigue siendo sobreescribible por documento o por línea
en la emisión —ver [Motor tributario](/integraciones/laravel/pro#motor-tributario-y-builders-fluidos). Con solo
`quipu-lite` no hay tasa que configurar: tú construyes el `Model\Invoice` y consignas el `igvPercentage` de cada
línea.

### El certificado, por fuente

`config('quipu.certificate.source')` abstrae **de dónde** se carga el PEM de firma. Existe precisamente porque
una **ruta local no sobrevive** en serverless ni en Laravel Cloud: el contenedor es efímero y el archivo no
persiste entre despliegues.

| Fuente   | Variable                 | Uso                                                        |
|----------|--------------------------|------------------------------------------------------------|
| `path`   | `QUIPU_CERTIFICATE_PATH` | Archivo PEM local. **Solo desarrollo.**                    |
| `inline` | `QUIPU_CERT_PEM`         | El PEM completo **en base64** dentro de una env var (mono-tenant cloud). |
| `disk`   | `QUIPU_CERT_DISK`        | Un disco de `config/filesystems.php` (p. ej. S3); `QUIPU_CERTIFICATE_PATH` es la ruta del objeto dentro del disco. |

En cloud usa `inline` (el secreto viaja como variable de entorno, gestionada por tu plataforma) o `disk` sobre
S3 (el PEM vive en un bucket privado). Reserva `path` para tu máquina de desarrollo. Cuando la clave privada
está cifrada, fija `QUIPU_CERTIFICATE_PASSPHRASE`; se aplica después de cargar el PEM.

::: warning Cargar un `.pfx`/`.p12` directamente es Pro
La fuente `path`/`inline`/`disk` espera **PEM**. Convertir un `.pfx` a PEM (o inspeccionarlo) es una capacidad
de la edición Pro (`quipu:cert:convert`, `quipu:cert:inspect`). Ver [Certificados de Pro](/pro/certificados).
:::

### Ambiente y endpoints

- `config('quipu.environment')` — `beta` (homologación) o `produccion`.
- `config('quipu.endpoints.bill_service')` — override opcional de la URL SOAP `billService` (factura, boleta,
  nota, resumen y baja). Déjalo `null` para usar el default del ambiente.
- `config('quipu.verify_tls')` — verificación TLS del certificado de SUNAT. **Mantenlo `true` en producción**;
  ponlo `false` solo para SUNAT beta, cuyo certificado no siempre valida.

### Almacenamiento por disco

`config('quipu.storage')` guarda el XML firmado y el CDR en un **disco de Laravel**. Cualquier disco de
`config/filesystems.php` funciona —`local`, `s3` o uno propio— **sin código especial**: S3 es solo otro disco.

```dotenv
QUIPU_STORAGE_DISK=s3
QUIPU_STORAGE_PATH_SIGNED=signed
QUIPU_STORAGE_PATH_CDR=cdr
QUIPU_STORAGE_PATH_INBOX=inbox
```

Las `paths` son las carpetas lógicas dentro del disco: `signed` (el XML que generamos), `cdr` (el que devuelve
SUNAT) e `inbox` (XML subido a mano o descargado del portal).

### Colas y logging

- `config('quipu.queue.connection')` — conexión para los jobs de envío y sondeo. `null` usa la conexión por
  defecto de la app.
- `config('quipu.logging.channel')` — canal de log dedicado para la actividad de quipu. `null` enruta al canal
  por defecto. Cada entrada lleva el contexto `component => quipu`; **nunca se registran credenciales,
  certificados ni el XML del documento**.

### Nombres de tabla configurables

`config('quipu.tables')` deja renombrar las tablas que la integración posee, para encajar en un esquema
existente o evitar un choque con la app anfitriona. Las migraciones, los modelos Eloquent y el contador de
correlativos leen estos valores, así que un solo cambio mantiene todo consistente.

```dotenv
QUIPU_TABLE_DOCUMENTS=quipu_documents
QUIPU_TABLE_TICKETS=quipu_tickets
QUIPU_TABLE_SERIES=quipu_series
QUIPU_TABLE_IDEMPOTENCY=quipu_idempotency_keys   # solo se usa con Pro
```

### Scheduling

`config('quipu.schedule')` habilita un mantenimiento recurrente desde el service provider (**off por defecto**):
sondear tickets pendientes, reintentar comprobantes aún en espera, enviar un resumen diario preparado y podar el
inbox. Cada tarea tiene su cron configurable.

```dotenv
QUIPU_SCHEDULE_ENABLED=true
QUIPU_SCHEDULE_POLL_TICKETS_CRON="*/15 * * * *"
QUIPU_SCHEDULE_RETRY_PENDING_CRON="*/30 * * * *"
QUIPU_SCHEDULE_DAILY_SUMMARY_CRON="0 1 * * *"
QUIPU_SCHEDULE_DAILY_SUMMARY_FILE=            # sin valor, la tarea de resumen no se registra
QUIPU_SCHEDULE_PRUNE_CRON="0 3 * * *"
```

Con la edición Pro activa, el reintento simple se reemplaza por el **reintento inteligente** (`quipu:pro:retry`)
y se añade la **alerta de expiración del certificado** (`quipu:cert:alert`), controlada por
`QUIPU_SCHEDULE_CERT_ALERT_CRON` y `QUIPU_SCHEDULE_CERT_EXPIRY_DAYS`. Ver [Edición Pro](/integraciones/laravel/pro).

## Siguiente paso

- Emite tu primer comprobante en [Uso (base)](/integraciones/laravel/uso).
- Si instalaste `quipu-pro`, revisa qué [se activa automáticamente](/integraciones/laravel/pro).
