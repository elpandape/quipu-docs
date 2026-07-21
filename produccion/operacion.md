# Operación en producción

quipu es *stateless*: construye, firma, envía y parsea. **No guarda nada, no numera nada y no reintenta nada.**
Esta página cubre lo que tienes que operar tú alrededor.

## Qué persistir (y por qué)

quipu devuelve resultados tipados y se olvida de ellos. Como mínimo debes guardar:

| Qué | De dónde sale | Por qué |
|---|---|---|
| **XML firmado** | `SignedXml::$xml` | Es el comprobante. Sin él no tienes nada que conservar ni que reenviar |
| **Hash de la firma** | `SignedXml::$digestValue` | Va en la representación impresa y en el QR; permite verificar el documento |
| **CDR** | `CdrResult::$xml` | Es tu **prueba de que SUNAT lo recibió y lo aceptó** |
| **Estado** | `CdrResult::$status` | Para saber qué falta informar y qué no |
| **Ticket** | `TicketResult::$ticket` | Sin él no puedes resolver un envío asíncrono (resumen, baja, lote) |

> [!WARNING]
> Guarda el **XML firmado**, no los datos para volver a construirlo. Regenerar el XML puede producir un hash
> distinto (basta un cambio de versión, de orden de nodos o de tu propio código). El que vale es el que firmaste.

## Estados: lo que quipu no lleva

El ciclo real de un comprobante es `emitido → informado → aceptado / aceptado con observaciones / rechazado`.
quipu te da el hecho puntual (`CdrResult`); **la máquina de estados es tuya**, y debe tolerar:

- **Eventos duplicados**: reintentos que llegan dos veces.
- **Eventos tardíos**: un ticket resuelto horas después.
- **Aceptado con observaciones**: es **válido**. No lo trates como error
  (ver [CDR y ciclo de vida](/dominio-sunat/cdr-ciclo-vida)).

## Reintentos: no reintentes a ciegas

Reintentar un rechazo de datos es inútil: fallará igual. La distinción está en `CdrSeverity`, que se deriva del
código de respuesta:

| Severidad | Rango de código | ¿Reintentar? |
|---|---|---|
| `Accepted` | `0` | No hace falta |
| `Exception` | `100`–`999` | **Sí** — sistema de SUNAT caído o transitorio. Salvo credenciales (`102`, `103`, `104`, `105`, `111`): eso se escala, no se reintenta |
| `Exception` | `1000`–`1999` | **No** — formato/estructura de tu XML; corrige y reenvía |
| `Rejection` | `2000`–`3999` | **No** — es un error en tus datos; corrige y reemite |
| `Observation` | `4000`+ | No — aceptado, pero revisa la observación |

> [!NOTE]
> `CdrSeverity::fromCode()` colapsa **ambas** bandas de arriba en `Exception`, así que la severidad sola no
> decide el reintento: parte por `< 1000` (sistema/credenciales) frente a `>= 1000` (estructura), como hace
> `bin/canary.php`. Los códigos fuera de rango (incluidos negativos) también caen en `Exception`: es el bucket
> más seguro para un código que aún no se sabe clasificar — no significa que toda la banda sea transitoria.

Y a nivel de transporte, en el **job diferido** (el XML ya está firmado y persistido en `$signed`):

<CodeTabs>
<template #php>

```php
try {
    $result = $quipu->sendBill($signed);
} catch (SunatFaultException $e) {   // ¡antes! — hereda de TransportException
    // SOAP Fault: el código decide. quipu envuelve cualquier fault aquí.
    $log->error('Fault SUNAT', ['code' => $e->faultCode]);

    // faultCode es string y no siempre numérico: extrae los dígitos
    if (preg_match('/\d+/', $e->faultCode, $m) === 1 && (int) $m[0] < 1000) {
        $queue->retryLater($signed);   // 100–999: SUNAT caída (100, 109, 130–138)
    }
    // 1000–1999: tu XML. Reintentar no sirve: va al flujo de corrección.
    // Sin dígitos: no se puede clasificar — revísalo a mano, no lo des por corregible.
} catch (TransportException $e) {
    // Red, timeout, o ticket aún pendiente (estado "98")
    $queue->retryLater($signed);
}
```

</template>
</CodeTabs>

Reintenta siempre sobre **el XML ya firmado** (`$signed`), no sobre el modelo: rearmar el `Invoice` y volver a
firmar **recalcula el digest** y deshace el hash que ya entregaste al cliente (ver el aviso de más arriba).
El orden importa: `SunatFaultException` extiende `TransportException`; si la capturas después, nunca entra.

## Idempotencia y correlativos

Este es el punto donde más sistemas se rompen, y quipu **no te ayuda**: no asigna correlativos.

- El correlativo debe ser **atómico**: incremental, sin huecos ni duplicados, **incluso bajo concurrencia**. Dos
  procesos emitiendo a la vez necesitan un candado real (no un `MAX(numero)+1`).
- **No consumas un correlativo hasta que vayas a firmar.** Si reservas y falla, tienes un hueco.
- **Reenviar es seguro; renumerar no.** Ante un fallo de transporte, reenvía **el mismo XML firmado** — no
  construyas uno nuevo con otro número.
- SUNAT rechaza un `(serie, número)` ya aceptado. Eso es tu red de seguridad contra duplicados, no tu estrategia.

## Envíos asíncronos: no mezcles las consultas

Resumen diario, comunicación de baja y lotes devuelven un **ticket**. Al resolverlo:

- `getStatus($ticket)` → **un** `CdrResult` (resumen, baja, reversión).
- `getPackStatus($ticket)` → **un `CdrResult` por documento** (lotes de `sendPack`).

> [!WARNING]
> Usar el que no toca **no lanza ningún error**: `getStatus()` sobre un ticket de lote lee la primera entrada
> del ZIP y **descarta el resto en silencio**. Perderías los CDR de los demás comprobantes sin enterarte.

## Conservación

Debes conservar el XML firmado y su CDR durante el plazo legal 🔍 (verifícalo contra la norma vigente: es un
punto que esta documentación **no** afirma). Dos consejos que no dependen de la norma:

- **Recuperable ≠ almacenado.** Prueba una restauración real antes de necesitarla.
- Si perdiste un CDR pero el comprobante se declaró bajo tu RUC, puedes **volver a descargarlo** con
  `retrieveCdr()` sin reenviar el documento — pero solo en producción
  (ver [De beta a producción](/produccion/de-beta-a-produccion)).

## Vigila los cambios de SUNAT

Esquemas, catálogos y reglas de validación cambian, y lo hacen sin avisarte a ti. Un cambio de SUNAT suele
manifestarse primero como **una tasa de rechazo anómala**: alerta sobre eso, no solo sobre errores 500.

Ver [Sensibilidad temporal](/dominio-sunat/sensibilidad-temporal) para qué partes envejecen más rápido.

## Lo que sigue siendo tuyo

Un recordatorio de [Límites y alcance](/empezando/limites): persistencia, correlativos, máquina de estados,
agenda del resumen diario, reintentos y conservación **no** son de quipu. Si trabajas en Laravel, ese es
exactamente el hueco que cubre [`quipu-laravel`](/integraciones/laravel).
