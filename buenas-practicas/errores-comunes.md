# Errores comunes

<Availability lite pro />

Una colección de los errores más frecuentes al integrar con SUNAT y cómo quipu te ayuda a evitarlos —o cómo
diagnosticarlos cuando ocurren.

## Enviar al host equivocado

**Síntoma**: SUNAT rechaza con un error genérico o el servicio no responde como esperabas.

**Causa**: enviaste retención/percepción/reversión al host FE (`billServiceUrl`), o factura al host otrosCpe.

**Solución**: usa siempre los métodos de `SoapEndpoints` —`billServiceUrl()` para FE, `otherCpeUrl()` para
retención/percepción/reversión, `consultUrl()` para consulta. Ver [endpoints](/referencia/endpoints).

## Olvidar la forma de pago

**Síntoma**: SUNAT rechaza con código **3244** ("tipo de transacción").

**Causa**: falta la **Forma de Pago** (`cac:PaymentTerms`), obligatoria desde R.S. 000193-2020/SUNAT.

**Solución**: el campo no se puede "olvidar" —`paymentForm` es un enum no nullable con default `PaymentForm::Cash`,
así que quipu siempre emite el nodo—. El fallo real es declarar `PaymentForm::Credit` **sin** `installments`: la
forma de pago sale como crédito pero sin las cuotas que la sustentan. Si vendes a crédito, provee las cuotas
(el validador lo exige: `Credit` con `installments === []` es un error). Ver [factura](/documentos/factura).

::: warning El validador no corre solo
`sign()`, `emit()` y `emitInvoice()` **nunca** validan implícitamente. Que "el validador lo exija" solo te
protege si llamas tú a `$quipu->assertValid($invoice)` (lanza `InvalidDocumentException`) o a
`$quipu->validate($invoice)` (devuelve la lista de errores) **antes** de emitir. Si no, el `Credit` sin cuotas
llega a SUNAT y el rechazo lo descubres en el CDR. Ver [validación local](/guias/validacion-local).
:::

## Mezclar `getStatus` y `getPackStatus`

**Síntoma**: **ninguno**. No hay excepción, no hay error de parseo: el código corre y tú crees que tienes el
CDR completo.

**Causa**: SUNAT resuelve ambos tickets con la **misma** operación (`getStatus`); lo único que cambia es cómo se
parsea el ZIP devuelto. Por eso el uso incorrecto **no falla**:

- `getStatus()` sobre un ticket de `sendPack` → `CdrParser::fromZip()` lee **la primera entrada `.xml`** del ZIP
  y devuelve un `CdrResult` normal, **descartando en silencio** el CDR de todos los demás documentos del lote.
- `getPackStatus()` sobre un ticket de `sendSummary` → devuelve un array de **un solo** elemento, sin fallar.

> [!WARNING]
> El error no se manifiesta como una excepción sino como **pérdida silenciosa de datos**: das por informados
> comprobantes de los que nunca leíste el CDR. En un lote de 200 documentos, `getStatus()` te devuelve 1 y los
> otros 199 quedan sin conciliar —y tu máquina de estados nunca se entera—.

**Solución**:
- `sendSummary` (resumen/baja/reversión) → `getStatus()` — devuelve **un** `CdrResult`.
- `sendPack` (lote) → `getPackStatus()` — devuelve **un `CdrResult` por documento**, indexado por nombre de
  comprobante. Ver [lotes](/guias/lotes).

## Firmar con un PEM incompleto o protegido con passphrase

**Síntoma**: `SigningException` con uno de estos mensajes (los mensajes de excepción del core están **en
inglés**): `The PEM does not contain an X.509 certificate.` o `The PEM does not contain a valid private key.`

**Causa**: puede ser que el PEM solo tenga el certificado o solo la llave (falta uno de los dos), **o** que el
PEM esté completo pero la llave **tenga passphrase**. `XmlSecSigner` valida la llave con
`openssl_pkey_get_private()` **sin contraseña** (ver `src/Signer/XmlSecSigner.php`), así que una llave cifrada
—justo lo que produces al exportar el `.pfx` sin `-nodes`— da el mismo error que si faltara.

**Solución**: el PEM debe tener **certificado + llave privada concatenados, sin passphrase**. Si partes de un
`.pfx`: `openssl pkcs12 -in cert.pfx -out certificate.pem -nodes -clcerts`. Ver [certificados](/guias/certificados).

## Agrupar boletas por día UTC

**Síntoma**: boletas en el resumen equivocado; SUNAT rechaza por inconsistencia de fechas.

**Causa**: agrupaste por día UTC del servidor. Una boleta de las 23:30 Lima cae "mañana" en UTC.

**Solución**: agrupa por **día calendario de Lima** (`America/Lima`). Ver [cómo usar quipu](/buenas-practicas/como-usar).

## Duplicar correlativos bajo concurrencia

**Síntoma**: SUNAT rechaza por número duplicado; o un hueco en la numeración.

**Causa**: dos emisiones simultáneas tomaron el mismo número.

**Solución**: asigna el correlativo con **bloqueo atómico** (transaccional) antes de construir el `Model\*`.
quipu no gestiona la numeración.

## Reintentar un rechazo

**Síntoma**: el reintento falla igual que el original.

**Causa**: un rechazo es un problema de **datos**, no transitorio.

**Solución**: corrige la causa y emite un comprobante **nuevo**. Ver [manejo de errores](/buenas-practicas/manejo-errores).

## Enviar más de 500 en un lote

**Síntoma**: SUNAT rechaza el `sendPack`.

**Causa**: el límite es 500 documentos por lote.

**Solución**: quipu no valida el límite en código. Parte tu lote en chunks de ≤500.

## Confundir SOAP Fault con CDR rechazado

**Síntoma**: obtienes un `SunatFaultException` y crees que el comprobante fue rechazado en el CDR.

**Causa**: la distinción no es síncrono vs. asíncrono, sino **excepción vs. resultado**. Un
`SunatFaultException` es un **SOAP Fault**: SUNAT respondió con un Fault en vez de procesar el envío, así que
**no hay CDR** (quipu envuelve **cualquier** fault ahí, sin mirar el código). Un CDR rechazado es un **resultado
normal** de `sendBill()`: llega en la **misma respuesta** y se representa con un `CdrResult` de estado
`Rejected`, no como excepción.

**Solución**: revisa [excepciones](/referencia/excepciones), [manejo de errores](/buenas-practicas/manejo-errores)
y [CDR y ciclo de vida](/dominio-sunat/cdr-ciclo-vida).

## Leer todo `SunatFaultException` como «error de estructura»

**Síntoma**: un envío falla, lo mandas al flujo de «corregir el XML», y nadie encuentra qué corregir. El
comprobante nunca se reenvía y el plazo corre.

**Causa**: solo la banda `1000`–`1999` es formato/estructura de tu XML. La banda `100`–`999` es del sistema de
SUNAT o de tus credenciales: `109` es *«El sistema no puede responder su solicitud»* y `102` es *«Usuario o
contraseña incorrectos»*. Ninguno se arregla tocando el XML.

**Solución**: ramifica por `$e->faultCode` antes de decidir. `< 1000` → reintenta (salvo credenciales: `102`,
`103`, `104`, `105`, `111`, que hay que escalar); `>= 1000` → corrige el XML. Ojo: el `faultCode` es un
`string` y no siempre viene numérico, así que extrae los dígitos con `preg_match('/\d+/', ...)` en vez de
castear a `int` a ciegas — ver [manejo de errores](/buenas-practicas/manejo-errores).

## Siguiente paso

- [Cómo NO usar quipu](/buenas-practicas/como-no-usar)
- [Manejo de errores](/buenas-practicas/manejo-errores)
