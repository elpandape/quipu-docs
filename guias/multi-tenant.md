# Multi-tenant

quipu es **stateless respecto al emisor**: no guarda estado del certificado, las credenciales ni el endpoint.
Toda esa información se **inyecta** en el constructor. Esto la hace naturalmente multi-tenant: resuelves el
tenant actual y le pasas sus credenciales a una instancia de `Quipu`.

<Availability lite pro />

::: tip Una fábrica ya cableada en Pro
El patrón *stateless por (tenant, host)* que arma esta página es del **emisor base (Lite)**. **quipu Pro**
<Availability pro /> ofrece `QuipuPro::for(...)`, una fábrica que compone la instancia con el sender resiliente,
los validadores extra y el diagnóstico ya conectados; encaja como el `quipuFactory->for($tenant)` de más abajo.
Ver [quipu Pro](/pro/introduccion).
:::

## El certificado y las credenciales son del tenant

Cada tenant (emisor) tiene su propio:

- **certificado** tributario (PEM),
- **usuario SOL** (RUC + usuario secundario + contraseña),
- **endpoint** (producción o beta).

Como `XmlSecSigner` y `SoapSender` reciben eso por constructor, basta con construir una instancia de `Quipu`
por tenant (o por emisión) con las credenciales resueltas:

<CodeTabs>
<template #php>

```php
function buildQuipuForTenant(Tenant $tenant): Quipu
{
    return new Quipu(
        new CompositeBuilder(),
        new XmlSecSigner($tenant->certificatePem()),
        new SoapSender(
            SoapEndpoints::production()->billServiceUrl(),
            $tenant->ruc() . $tenant->solUser(),
            $tenant->solPassword(),
        ),
    );
}
```

</template>
</CodeTabs>

## Una instancia por host, no solo por tenant

::: warning La factory de arriba no puede emitir retención, percepción ni reversión
`Quipu` recibe **un solo `Sender`** en su constructor, y ese `Sender` lleva **una sola URL** cableada. La
factory de arriba le pasa `billServiceUrl()`, así que la instancia que devuelve solo sirve para la familia FE:
factura (`01`), boleta (`03`), notas (`07`/`08`), resumen diario (`RC`) y comunicación de baja (`RA`).

**Retención (`20`), percepción (`40`) y reversión (`RR`) viven en otro host** —`otherCpeUrl()`— y enviarlas por
esta instancia las manda al host equivocado. Ver [endpoints](/referencia/endpoints).
:::

El eje de la construcción no es solo el tenant: es **(tenant, host)**. Si un tenant emite retención o percepción,
necesita una segunda instancia:

<CodeTabs>
<template #php>

```php
function buildQuipuForTenant(Tenant $tenant, string $endpoint): Quipu
{
    return new Quipu(
        new CompositeBuilder(),
        new XmlSecSigner($tenant->certificatePem()),
        new SoapSender(
            $endpoint,
            $tenant->ruc() . $tenant->solUser(),
            $tenant->solPassword(),
        ),
    );
}

$endpoints = SoapEndpoints::production();

// Familia FE: factura, boleta, notas, resumen, baja.
$fe = buildQuipuForTenant($tenant, $endpoints->billServiceUrl());
$fe->emitInvoice($invoice);

// Familia otros CPE: retención, percepción, reversión.
$otrosCpe = buildQuipuForTenant($tenant, $endpoints->otherCpeUrl());
$otrosCpe->emit($retention);
$otrosCpe->emitReversion($reversion);
```

</template>
</CodeTabs>

::: tip Cachea por clave compuesta
Si memorizas instancias, la clave debe incluir el host: `"{$tenant->id()}:fe"` y `"{$tenant->id()}:otroscpe"`.
Una cache indexada solo por tenant devuelve la instancia FE cuando pidas la de retención, y el fallo aparece
recién en la respuesta de SUNAT.
:::

Lo mismo aplica a las otras fronteras de `Quipu`, que **no** pasan por el `Sender` SOAP:

- la **GRE** (`emitGuide()` / `getGuideStatus()`) usa el `GreSender` REST —`Ws\GreClient`, con OAuth—;
- la **consulta de validez** de un CPE de terceros (`validateCpe()`) usa el `CpeValidator` —`Ws\CpeValidityClient`—;
- la **consulta de tu propio CPE** (`getBillStatus()` / `retrieveCdr()`) usa el `CpeStatusService`
  —`Ws\BillConsultClient`, que apunta a un **tercer host**, `consultUrl()`—.

Los tres son parámetros con default `null`: si un tenant los necesita, inyéctalos también con sus credenciales.
Sin ellos, esos métodos lanzan `TransportException`.

## Resolución del tenant

quipu no sabe qué tenant es el "actual". La capa que lo consume (tu app, tu servicio, un paquete de integración)
resuelve el tenant —por el usuario autenticado, por el subdominio, por el header de la petición— y le pasa sus
credenciales a quipu.

<CodeTabs>
<template #php>

```php
$tenant = $this->tenantResolver->current();
$quipu = $this->quipuFactory->for($tenant);
$result = $quipu->emitInvoice($invoice);
```

</template>
</CodeTabs>

## Correlativos atómicos por (tenant, serie)

> [!IMPORTANT]
> La **numeración atómica sin huecos ni duplicados** es responsabilidad del consumidor, no de quipu. Bajo
> concurrencia, dos emisiones simultáneas del mismo tenant no pueden tomar el mismo número ni saltarse uno.

Asigna el correlativo **antes** de construir el `Model\*`, con un mecanismo protegido contra condiciones de
carrera (p. ej. bloqueo transaccional al reservar el número). quipu solo recibe la serie y el número ya
asignados.

## No caches el certificado indefinidamente

El certificado **caduca y rota**. Si construyes una instancia de `Quipu` por emisión (o por job), siempre
leerás el certificado fresco desde la configuración del tenant. Si la cacheas, asegúrate de invalidarla al
rotar el certificado.

## Siguiente paso

- [Certificados digitales](/guias/certificados)
- [Cómo usar quipu](/buenas-practicas/como-usar)
