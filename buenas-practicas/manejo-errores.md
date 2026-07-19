# Manejo de errores

La estrategia de manejo de errores de quipu se basa en distinguir **tres clases** de falla, cada una con una
respuesta distinta.

## Las tres clases de falla

### 1. Error de datos (corrige, no reintentes)

- `InvalidDocumentException` — el documento viola reglas de negocio o el XSD.
- CDR con `status = Rejected` — SUNAT rechazó el comprobante.

**Respuesta**: corrige la causa y emite un comprobante **nuevo**. Reenviar lo mismo fallará otra vez. Un
rechazo **no** es transitorio.

::: tip Un CDR rechazado no lanza
Un CDR rechazado **no** es una excepción en quipu: `sendBill()` devuelve un `CdrResult` normal y tú lo detectas
con `$cdr->status === CdrStatus::Rejected` (como en el ejemplo de abajo). Si prefieres modelar el rechazo como
excepción, lanza **la tuya** desde tu capa de aplicación: quipu no impone ninguna.
:::

### 2. SOAP Fault síncrono (depende del código)

- `SunatFaultException` — SUNAT respondió con un SOAP Fault en vez de procesar el envío. quipu envuelve
  **cualquier** fault aquí, sin mirar el código, así que la clase de falla la decide el `faultCode`:

| Banda | Qué pasó | Respuesta |
|---|---|---|
| `100`–`999` | Sistema de SUNAT o credenciales | Sistema (`100`, `109`, `130`–`138`): **reintenta** con backoff. Credenciales (`102`, `103`, `104`, `105`, `111`): **no** reintentes, escala |
| `1000`–`1999` | Formato/estructura de tu XML | Corrige el XML y reenvía. No reintentes a ciegas |

::: warning No trates todo fault como «corrige tu XML»
Es el error más caro de esta página. Un `109` (*«El sistema no puede responder su solicitud»*) o un `102`
(*«Usuario o contraseña incorrectos»*) **no** son problemas de tu XML: el primero se reintenta y el segundo
necesita que alguien arregle la clave SOL. Si los mandas al flujo de corrección, el comprobante se queda sin
enviar y el plazo corre.
:::

### 3. Error transitorio (reintenta en diferido)

- `TransportException` (sin `SunatFaultException`) — red caída, SOAP inalcanzable, respuesta vacía, ticket
  aún pendiente (`"98"`), estado inesperado.

**Respuesta**: reintenta en el **job diferido**, con backoff y dentro del plazo. SUNAT se cae con frecuencia;
el diseño diferido ya absorbe esas caídas.

::: warning No todo `TransportException` es transitorio
La fachada también lanza `TransportException` para **errores de composición**: llamar a `emitGuide()`,
`validateCpe()` o `getBillStatus()` sin haber inyectado el colaborador correspondiente (`GreSender`,
`CpeValidator`, `CpeStatusService`) produce mensajes como *"No GRE sender is configured for this Quipu
instance"*. Eso **no** se arregla reintentando: es un fallo de configuración que exige inyectar el colaborador
que falta. Distingúyelo por el mensaje antes de encolar un reintento.
:::

## La severidad del CDR

`CdrResult::$severity` (`CdrSeverity`) clasifica el `responseCode` para decidir si reintentar:

| Severidad | Rango | Acción |
|---|---|---|
| `Accepted` | `0` | Nada que hacer |
| `Exception` | `100`–`1999` | Error de sistema o formato: no reintentar a ciegas |
| `Rejection` | `2000`–`3999` | Contenido: corregir antes de reenviar |
| `Observation` | `4000`+ | Aceptado con observación: válido, corregir en futuras emisiones |

::: tip `Exception` no distingue las dos bandas
`CdrSeverity::fromCode()` (estático) mapea **todo** `100`–`1999` a `Exception`, así que saber que algo es
`Exception` **no** te dice si reintentar. Para eso parte la banda tú mismo por `< 1000` —sistema/credenciales—
frente a `>= 1000` —estructura—, que es justo lo que hace `bin/canary.php` al clasificar.
:::

## Patrón de captura recomendado

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\{
    QuipuException,
    InvalidDocumentException,
    SigningException,
    SunatFaultException,
    TransportException,
};
use ElPandaPe\Quipu\Result\CdrStatus;

try {
    $quipu->assertValid($invoice);            // valida antes
    $signed = $quipu->sign($invoice);         // firma local
} catch (InvalidDocumentException $e) {
    return errorResponse('Datos inválidos: ' . $e->getMessage());
} catch (SigningException $e) {
    return errorResponse('Problema con el certificado');
}

// Guarda el XML firmado y entrega al cliente (camino crítico)
persist($signed);
giveToCustomer($signed);

// Reporte diferido (job):
try {
    $result = $quipu->sendBill($signed);
    $cdr = $result->cdr;

    if ($cdr->status === CdrStatus::Rejected) {
        // problema de datos: emite uno nuevo corregido
        triggerCorrectionWorkflow($invoice, $cdr->responseCode, $cdr->description);
    } else {
        markAsAccepted($invoice, $cdr);
    }
} catch (SunatFaultException $e) {
    // el faultCode decide: puede ser tu XML, o SUNAT caída, o tus credenciales
    logFault($e->faultCode, $e->getMessage());

    // el faultCode es un string y no siempre es numérico: extrae los dígitos
    if (preg_match('/\d+/', $e->faultCode, $m) !== 1) {
        // sin dígitos (p. ej. "soap-env:Client"): no lo puedes clasificar.
        // No lo mandes al flujo de corrección: revísalo a mano.
        flagForReview($invoice, $e->faultCode, $e->getMessage());
    } elseif ((int) $m[0] < 1000) {
        scheduleRetry($signed, $e->getMessage());   // 100–999: sistema o credenciales
    } else {
        triggerCorrectionWorkflow($invoice, $e->faultCode, $e->getMessage()); // 1000–1999: tu XML
    }
} catch (TransportException $e) {
    // transitorio: reintenta en diferido con backoff
    scheduleRetry($signed, $e->getMessage());
}
```

</template>
</CodeTabs>

## Reintentos: cuándo y cómo

- **Solo en el job diferido**, nunca en el camino crítico.
- Con **backoff** exponencial y un **límite** de intentos.
- Dejando **días de colchón** antes de agotar el plazo de SUNAT.
- Un rechazo repetido (mismo `responseCode`) debe **escalar a una persona**, no reintentar indefinidamente.

## Un rechazo no es recuperable reenviando

> [!IMPORTANT]
> Un comprobante con CDR **Rechazado** no tiene validez tributaria. No se "borra": se emite uno **nuevo
> corregido**, guardando la trazabilidad con el rechazado (su serie+número y el código de rechazo).

## Siguiente paso

- [Excepciones](/referencia/excepciones) — la jerarquía completa.
- [Validación previa](/guias/validacion-local) — frena los errores de datos antes de tiempo.
