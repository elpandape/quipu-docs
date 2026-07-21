# Multi-tenant

<Availability lite pro />

Emite para **muchos emisores** (tenants), cada uno con su RUC, certificado, series y almacenamiento. quipu no
reinventa la tenancy: se **integra** con el paquete que ya uses. Probado con **`stancl/tenancy`** y
**`spatie/laravel-multitenancy`** (bajo Laravel 13).

Por defecto es **mono-tenant** (`config('quipu.tenancy.driver') = 'none'`): siempre se usa el `emisor` del config.
El multi-tenant se activa fijando el driver:

```php
// config/quipu.php
'tenancy' => [
    'driver' => env('QUIPU_TENANCY_DRIVER', 'none'), // none | stancl | spatie | auto | Tu\Resolver::class
],
```

## El modelo Tenant expone su emisor

Tu modelo Tenant implementa `ProvidesQuipuEmitter`, o usa el trait `HasQuipuEmitter`, que lo
resuelve desde columnas convencionales (override-ables) y **cifra las credenciales** con el cast `encrypted` de
Laravel (`APP_KEY`) — apto para Laravel Cloud, sin ficheros de certificado en disco:

```php
use ElPandaPe\QuipuLaravel\Tenancy\HasQuipuEmitter;

class Tenant extends BaseTenant // el modelo del paquete de tenancy que uses
{
    use HasQuipuEmitter;
    // columnas: quipu_ruc, quipu_legal_name, quipu_trade_name, quipu_sol_user,
    //           quipu_sol_pass, quipu_certificate (cast encrypted),
    //           quipu_certificate_passphrase, quipu_igv_rate (nullable),
    //           quipu_series_prefix, quipu_disk
}
```

El **certificado por-tenant** vive **cifrado en la BD** (columna `quipu_certificate`, cast `encrypted`); el trait
entrega el PEM ya descifrado al emisor.

Cada tenant puede además correr bajo su propia **[tasa de IGV](/integraciones/laravel/instalacion#la-tasa-de-igv)**
(columna `quipu_igv_rate`, o el método `quipuIgvRate(): ?float`): un tenant MYPE emite al 8 % mientras el resto va
al 18 %. Cuando es `null` cae al valor global `config('quipu.igv_rate')`.

## Emitir por tenant

En apps con tenancy **por request** (el middleware de stancl/spatie fija el tenant actual), el emisor se resuelve
solo para ese tenant — no haces nada especial. Para procesos que **iteran** tenants (un comando o schedule que
envía el resumen diario de cada uno), usa `Quipu::forTenant`:

```php
Quipu::forTenant($tenant->getKey(), function () use ($invoice) {
    // aquí el emisor, los correlativos y el storage son los del tenant
    Quipu::emitInvoice($invoice);
});
```

`forTenant` conmuta el tenant con la API del propio paquete y **restaura** el anterior al terminar; el emisor se
**re-resuelve** para que firme con el certificado del tenant activo. Con el driver `none` lanza un error claro.

**Scoping automático:** los comprobantes persistidos llevan `tenant_id`, los **correlativos** son por-tenant y el
**almacenamiento** usa el disco propio del tenant si lo define (si no, el global).

::: tip En PHP puro (sin este paquete)
El patrón *stateless por (tenant, host)* también se puede aplicar a mano construyendo un `Quipu` por tenant con
sus credenciales. Ver la guía [Multi-tenant](/guias/multi-tenant).
:::

## Siguiente paso

- Prueba tu integración sin red ni certificado en [Testing](/integraciones/laravel/testing).
