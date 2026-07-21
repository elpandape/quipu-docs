# Integración con Laravel — quipu-laravel

<Availability lite pro />

**`quipu-laravel`** (`elpandape/quipu-laravel`) cablea la maquinaria de quipu —construir el XML UBL 2.1,
firmarlo, enviarlo a los webservices de SUNAT y parsear el CDR— dentro del contenedor, la configuración y las
facades de Laravel. Es la **capa de aplicación** sobre el emisor: lo que quipu, por ser framework-agnóstico,
deja deliberadamente fuera.

Es **MIT y gratuito**, está publicado en Packagist (`composer require elpandape/quipu-laravel`) y funciona con
solo `quipu-lite`; si además hay licencia de Pro, la [auto-detecta](/integraciones/laravel/pro).

## Qué añade sobre el core

quipu (Lite y Pro) es PHP puro: recibe un `Model\Invoice` correcto y lo emite. **No** persiste nada, no lleva
correlativos ni estados, no encola ni agenda. `quipu-laravel` aporta justo ese hueco:

- **Persistencia**: cada comprobante es una fila `Document` con su XML firmado y su CDR en un disco de Laravel.
- **Series y correlativos** atómicos por serie.
- **Máquina de estados** del ciclo de vida (borrador → firmado → enviado → aceptado/observado/rechazado → dado de baja).
- **Colas y jobs** para envío y sondeo asíncronos.
- **Eventos** de dominio a los que enganchar listeners.
- **Comandos Artisan** para operar desde la terminal.
- **Scheduling** opcional para las tareas recurrentes.
- **Multi-tenant**: drivers para `stancl/tenancy` y `spatie/laravel-multitenancy`, emisor y certificado por
  tenant, y `Quipu::forTenant`.
- **Auto-detección de la edición Pro** <Availability pro />: si `elpandape/quipu-pro` está instalado, se activan
  el envío resiliente, la validación avanzada, el diagnóstico de rechazos, el motor tributario y las utilidades
  de certificados y XML, sin tocar tu código.

::: tip El core sigue siendo el mismo
`quipu-laravel` no reimplementa la emisión: se apoya en el facade `Quipu` del emisor. El XML que sale por el
cable es idéntico al que produce quipu en PHP puro. Ver la [visión general de la arquitectura](/arquitectura/vision-general).
:::

## Lite vs Pro

La integración funciona **igual con solo `quipu-lite`**; si además instalas
[`elpandape/quipu-pro`](/pro/instalacion) —comercial, desde su repositorio privado—, la capa lo
[auto-detecta](/integraciones/laravel/pro) y enriquece la emisión sin que cambies tu código. Este es el corte:

| Capacidad | Solo `quipu-lite` | Con `quipu-pro` |
|---|:---:|:---:|
| Emitir (`Quipu::emit`) y persistir (`DocumentDispatcher`) | ✓ | ✓ |
| Series, correlativos y máquina de estados | ✓ | ✓ |
| Almacenamiento por disco (local/S3), colas, eventos, scheduling | ✓ | ✓ |
| Comandos Artisan base (`send`, `status`, `summary`, `read`, `cdr:fetch`, `doctor`, `install`, `prune`) | ✓ | ✓ |
| `Quipu::fake()` y aserciones de testing | ✓ | ✓ |
| Certificado por fuente **PEM** (`path` / `inline` / `disk`) | ✓ | ✓ |
| Multi-tenant (drivers `stancl`/`spatie`, `Quipu::forTenant`, cert cifrado por-tenant) | ✓ | ✓ |
| Envío resiliente (logging → retry → idempotencia persistente) | ✗ | ✓ |
| Validación avanzada + diagnóstico accionable de rechazos | ✗ | ✓ |
| Motor tributario + builders fluidos (`Quipu::invoice()`, `creditNote()`, `debitNote()`) | ✗ | ✓ |
| Certificados `.pfx`/`.p12` (inspección, conversión, pre-flight, alerta de expiración) | ✗ | ✓ |
| Comandos Pro (`cert:inspect`/`convert`/`alert`, `diagnose`, `xml:inspect`/`diff`, `pro:retry`) | ✗ | ✓ |

La forma de activar Pro (`config('quipu.pro')`) y el detalle de cada capacidad están en
[Edición Pro](/integraciones/laravel/pro).

## Requisitos

- PHP **8.4+**
- Laravel **12 o 13** (la edición Pro requiere Laravel **13+**, por `brick/money`)
- El resto de dependencias del emisor: ver [Instalación](/empezando/instalacion).

## En esta sección

- **[Instalación y configuración](/integraciones/laravel/instalacion)** — instalar el paquete, publicar config
  y migraciones, y toda la configuración (emisor, certificado, ambiente, storage, colas, logging, tablas,
  scheduling).
- **[Uso (base)](/integraciones/laravel/uso)** <Availability lite pro /> — emitir con persistencia, colas/jobs,
  eventos y los comandos Artisan que siempre están disponibles.
- **[Edición Pro](/integraciones/laravel/pro)** <Availability pro /> — auto-detección, envío resiliente, motor
  tributario y builders, validación y diagnóstico, certificados y comandos extra.
- **[Multi-tenant](/integraciones/laravel/multi-tenant)** <Availability lite pro /> — emitir para muchos emisores con
  los drivers stancl/spatie, `HasQuipuEmitter` y `Quipu::forTenant`.
- **[Testing](/integraciones/laravel/testing)** — `Quipu::fake()` y sus aserciones, sin red ni certificado.

## Siguiente paso

- Empieza por la **[instalación y configuración](/integraciones/laravel/instalacion)**.
- Repasa qué **no** cubre el emisor y por qué esta capa existe en [Límites y alcance](/empezando/limites).
- Si usas Pro, mira su [introducción](/pro/introduccion) para ver todo lo que Laravel activa por ti.
