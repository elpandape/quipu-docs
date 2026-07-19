# Cómo NO usar quipu

Anti-patrones y errores comunes que conviene evitar. Si te ves haciendo algo de esto, revalora.

## No esperes a SUNAT en el camino crítico

<CodeTabs>
<template #php>

```php
// ❌ MAL: la venta se bloquea si SUNAT se cae
$result = $quipu->emitInvoice($invoice);
giveToCustomer($result->cdr);
```

</template>
</CodeTabs>

<CodeTabs>
<template #php>

```php
// ✅ BIEN: firma local al instante, reporta diferido
$signed = $quipu->sign($invoice);
giveToCustomer($signed);
// sendBill($signed) va en un job diferido
```

</template>
</CodeTabs>

Ver [cómo usar quipu](/buenas-practicas/como-usar).

## No reintentes un rechazo sin corregir

<CodeTabs>
<template #php>

```php
// ❌ MAL: un rechazo es un problema de datos, reenviar lo mismo fallará otra vez
do {
    $result = $quipu->emitInvoice($invoice);
} while ($result->cdr->status === CdrStatus::Rejected);
```

</template>
</CodeTabs>

Un CDR rechazado significa que el comprobante **no vale**. Corrige la causa y emite uno **nuevo**.

## No caches el certificado para siempre

<CodeTabs>
<template #php>

```php
// ❌ MAL: un certificado que rota no se actualiza
$this->signer ??= new XmlSecSigner(file_get_contents('/etc/quipu/cert.pem'));
```

</template>
</CodeTabs>

El certificado **caduca y rota**. Léelo desde configuración en runtime; si lo caches, invalida la cache al
rotar. Y **nunca** lo commitees al repositorio.

## No asumas el día UTC

<CodeTabs>
<template #php>

```php
// ❌ MAL: agrupar por día UTC pone una boleta de las 23:30 Lima en el resumen de mañana
$day = (new DateTimeImmutable())->format('Ymd');
```

</template>
</CodeTabs>

El día tributario es **día calendario de Lima**. Convierte a `America/Lima` para los cortes y los documentos.

## No envíes retención/percepción/reversión al host FE

<CodeTabs>
<template #php>

```php
// ❌ MAL: retención al host de facturas
new SoapSender(SoapEndpoints::production()->billServiceUrl(), ...);
$quipu->emit($retention);

// ❌ MAL: la reversión (RR) también va por otrosCpe, aunque comparta el flujo asíncrono del RA
$quipu->emitReversion($reversion);
```

</template>
</CodeTabs>

<CodeTabs>
<template #php>

```php
// ✅ BIEN: retención, percepción y reversión al host otrosCpe
new SoapSender(SoapEndpoints::production()->otherCpeUrl(), ...);
```

</template>
</CodeTabs>

La reversión es la que más se escapa: `emitReversion()` reporta por `sendSummary()` y se consulta con
`getStatus()` —el mismo flujo de ticket que el resumen diario y la comunicación de baja—, así que es fácil
asumir que comparte host con ellos. **No lo comparte**: `RC` y `RA` van por `billServiceUrl()`; `RR`, por
`otherCpeUrl()`.

Ver [endpoints](/referencia/endpoints).

## No hardcodees plazos ni valores volátiles de SUNAT

Los plazos de envío han cambiado y las fuentes de SUNAT se contradicen entre sí. No los hardcodees como
constantes: hazlos **configurables** y re-verifícalos antes del go-live. Ver [plazos de SUNAT](/dominio-sunat/plazos-sunat).

## No mezcles `getStatus` y `getPackStatus`

- `getStatus(ticket)` → para `sendSummary` (resumen/baja/reversión): **un** CDR.
- `getPackStatus(ticket)` → para `sendPack`: **un CDR por documento**.

Usar el incorrecto **no lanza**: `getStatus()` sobre un ticket de lote lee la **primera** entrada del ZIP y
descarta el resto en silencio; `getPackStatus()` sobre un ticket de resumen devuelve un array de un elemento.
El síntoma es **pérdida silenciosa de datos**, no una excepción. Ver
[errores comunes](/buenas-practicas/errores-comunes).

## No filtres tipos de terceros en tu API

quipu envuelve `xmlseclibs` y `SoapClient` tras sus `Result\*` y `Contract\*`. No expongas objetos de esas
librerías en tu propia API: envuélvelos en tus propios tipos.

## No uses `emit()` sin validar si tus datos son dudosos

`emit()` **no** valida implícitamente. Si tus datos vienen de una fuente no confiable, llama `assertValid()`
antes para frenar a tiempo.

## No inventes códigos ni mecánicas de SUNAT

quipu solo emite lo que la norma documenta. Si necesitas un caso no cubierto (p. ej. una retención embebida
cuya mecánica no está especificada), no inventes el nodo: la regla de oro es no emitir códigos ni mecánicas que
no estén verificados contra fuentes oficiales.

## No asumas que quipu gestiona la numeración

quipu **no** asigna series ni correlativos. Si dos emisiones concurrentes toman el mismo número, SUNAT lo
rechaza y tienes un problema tributario. La atomicidad de la numeración es **tuya**.

## No dependas de la beta para producción

La beta es para homologación. Sus endpoints, credenciales y comportamiento **no** son los de producción:
prueba en beta, despliega en producción. Y ojo con la consulta: SUNAT **no publica `billConsultService` en
beta**, así que `SoapEndpoints::beta()->consultUrl()` resuelve **al mismo host de producción** que
`production()`. Llamarlo creyendo que estás en beta **consulta producción de verdad**, no un entorno de pruebas.
Ver [endpoints](/referencia/endpoints).

## Siguiente paso

- [Cómo usar quipu](/buenas-practicas/como-usar)
- [Errores comunes](/buenas-practicas/errores-comunes)
