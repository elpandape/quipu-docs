# Primer envío: troubleshooting del debut

Esta es la guía de lo que falla **antes** de emitir tu primer comprobante: armar el certificado, conectar con SUNAT y
destrabar el primer envío. Cada item es un recetario **síntoma → causa → arreglo**, con un snippet cuando aporta.

Para los errores de un usuario **ya operativo** (host equivocado, lotes, conciliación de tickets), ver
[errores comunes](/buenas-practicas/errores-comunes); para el marco general de excepciones, ver
[manejo de errores](/buenas-practicas/manejo-errores).

<Availability lite pro />

## Cómo diagnosticar en una mirada

Los fallos del debut llegan en dos sabores, y conviene distinguirlos antes de leer nada más:

- **Excepción** (`TransportException` o su hija `SunatFaultException`): el envío no completó, **no hay CDR**. Es lo
  que verás con el certificado, la autenticación y la red.
- **CDR rechazado**: SUNAT procesó el envío y respondió con un `CdrResult` de estado `Rejected` (un resultado
  normal, no una excepción). Es lo que verás con un contenido inválido, p. ej. el **rechazo 3244** de Forma de
  Pago. Un `(serie, correlativo)` repetido es un caso frontera: según el canal de SUNAT puede llegar como
  excepción (`402`) o como CDR rechazado, por eso tiene su propia sección más abajo.

## El PEM no tiene una llave privada válida

**Síntoma**: al primer `sign()` / `emitInvoice()` recibes una `SigningException` con uno de estos mensajes (los
mensajes del core están **en inglés**):

- `The PEM does not contain a valid private key.`
- `The PEM does not contain an X.509 certificate.`

**Causa**: `XmlSecSigner` exige un PEM con **certificado X.509 + llave privada concatenados, sin passphrase**, y lo
valida en dos puntos distintos antes de firmar:

- La **llave**: `openssl_pkey_get_private($certificate)` se llama **sin contraseña**
  así que una llave protegida con passphrase —justo lo que produces al exportar
  el `.pfx` **sin** `-nodes`— da el mismo error que si la llave faltara. También falla si el PEM trae solo el
  certificado.
- El **certificado**: un regex busca el bloque `-----BEGIN CERTIFICATE-----`; si no está (PEM con solo la llave),
  lanza la otra excepción.

**Arreglo**: regenera el PEM con ambos bloques y sin passphrase:

```bash
openssl pkcs12 -in certificado.pfx -out certificate.pem -nodes -clcerts
```

`-nodes` quita la passphrase; `-clcerts` deja únicamente el certificado del titular (importa: quipu incrusta en la
firma solo el primer bloque `-----BEGIN CERTIFICATE-----` del PEM). Para desarrollo, un autofirmado basta: la beta
de SUNAT lo acepta. Ver [certificados digitales](/guias/certificados).

## `SunatFaultException` de autenticación (102, 103, 104)

**Síntoma**: `emitInvoice()` lanza `SunatFaultException`. El mensaje lo arma quipu desde el catálogo de SUNAT, p. ej.:

```
SUNAT SOAP fault 102: Usuario o contraseña incorrectos
```

La misma familia incluye `103` (*El Usuario ingresado no existe*), `104` (*La Clave ingresada es incorrecta*) y
`105` (*El Usuario no está activo*). Todos son códigos de credenciales (banda `100`–`999`).

**Causa**: el usuario SOAP **no es** tu usuario SOL tal cual: es el **RUC concatenado, sin separador, con el usuario
SOL secundario**. Es un formato traicionero porque se ve como un RUC "deformado". Si pasas solo el usuario SOL, o
añades un guion, SUNAT responde con un fault de credenciales:

- `examples/emit-invoice-beta.php:47` → `'20000000001MODDATOS'` (RUC `20000000001` + usuario `MODDATOS`).
- El constructor de `SoapSender` lo documenta en su parámetro `$username`.

**Arreglo**: arma el usuario concatenando, sin separador:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;

$username = $ruc . $solUser;   // '20512345678' . 'MODDATOS' => '20512345678MODDATOS'
$password = $solPassword;      // la contraseña del SOL

new SoapSender(SoapEndpoints::production()->billServiceUrl(), $username, $password);
```

</template>
</CodeTabs>

Para tu primera prueba contra beta, las credenciales públicas ya vienen concatenadas: `'20000000001MODDATOS'` /
`'moddatos'` (ver [inicio rápido](/empezando/inicio-rapido)).

::: warning El formato se INVIERTE en la Consulta Integrada (REST)
No todas las APIs de SUNAT usan `RUC + usuario SOL`. La **Consulta Integrada de Validez del CPE** (comprobantes de
terceros, REST/OAuth) **no** usa usuario ni clave SOL: autentica con `grant_type=client_credentials`, y
`CpeValidityCredentials` recibe **3** argumentos —`(clientId, clientSecret, consultantRuc)`— donde `consultantRuc`
es el **RUC a secas**, sin concatenar, y no hay parámetro de contraseña. Resumen:

- **SOAP** (emisión **y** `billConsultService`, tu propio CPE): `RUC + usuarioSOLSecundario`.
- **REST Consulta Integrada** (CPE de terceros): `clientId`/`clientSecret` + RUC a secas.

Ver [consulta de CPE](/guias/consulta-cpe) y [endpoints](/referencia/endpoints).
:::

## Timeouts y SSL hacia la beta de SUNAT

**Síntoma**: `emitInvoice()` lanza `TransportException` cuyo mensaje empieza con `SUNAT transport error: ...` (y
**no** `SunatFaultException`). El detalle interno depende del fallo concreto: timeout de conexión, fallo de
resolución DNS o handshake de SSL. SUNAT nunca devolvió un CDR ni un fault estructurado.

**Causa**: a diferencia de un fault (que es una respuesta SOAP válida con un código de error), esto es un fallo
**de transporte**: el `SoapClient` de PHP no logró completar la petición. `SoapClientSupport::call()` envuelve
cualquier `Throwable` que no sea un `SoapFault` en una `TransportException`,
mientras que los `SoapFault` sí pasan a `SunatFaultException`. Por eso **el tipo de excepción ya te dice en qué capa
estás**.

**Arreglo**: revisa la salida de red hacia el host de SUNAT, no el XML:

- ¿Llega tu petición al host? `SoapEndpoints::beta()` resuelve al host oficial de pruebas (`e-beta.sunat.gob.pe`).
  Confirma que tu entorno tenga salida hacia él: firewalls corporativos, proxies de salida y contenedores sin DNS
  son los sospechosos habituales.
- Si usas proxy, configúralo a nivel de PHP o del contexto del stream; quipu no lo hace por ti.
- ¿Es intermitente? Los timeouts de la beta suelen ser transitorios: reintenta con backoff. A diferencia de un CDR
  `Rejected` (un problema de datos), un `TransportException` por red **sí** justifica reenviar el mismo comprobante.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Exception\TransportException;

try {
    $result = $quipu->emitInvoice($invoice);
} catch (TransportException $e) {
    // Timeouts, DNS y fallos de conexión llegan aquí.
    // $e->getMessage() empieza con 'SUNAT transport error: ...'.
}
```

</template>
</CodeTabs>

::: tip Distingue fallo de red de rechazo de datos
`TransportException` (y su hija `SunatFaultException`) son fallos del **envío**: no hay CDR. Un comprobante
**rechazado** no es una excepción, sino un `CdrResult` con `status = Rejected` que llega dentro de la respuesta
normal. Reintentar tiene sentido para el primero; para el segundo hay que corregir y emitir uno nuevo. Ver
[manejo de errores](/buenas-practicas/manejo-errores).
:::

## Serie + correlativo repetido

**Síntoma**: al reenviar el mismo ejemplo (p. ej. `F001-1`), SUNAT lo rechaza. El catálogo de SUNAT lo tipifica como
`402`: *"La numeracion o nombre del documento ya ha sido enviado anteriormente"*; en
beta puede llegar como `SunatFaultException` con ese `faultCode`.

**Causa**: SUNAT beta (y producción) no acepta un `(serie, correlativo)` que ya envió. Cuando copias el ejemplo de
[inicio rápido](/empezando/inicio-rapido) y lo ejecutas tal cual, la segunda corrida choca con el `F001-1` que ya
mandaste. El propio `examples/emit-invoice-beta.php` lo advierte en su cabecera: *"SUNAT beta may reject a repeated
(series, number); bump $number to re-send."*

**Arreglo**: sube el correlativo antes de reenviar:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Model\Invoice;

$invoice = new Invoice(
    // ... resto de los campos ...
    series: 'F001',
    number: '2',  // F001-1 ya fue enviado a beta: sube el correlativo
    // ...
);
```

</template>
</CodeTabs>

::: warning En producción no se resuelve "a mano"
En beta puedes tocar el `number` para reenviar. En producción el correlativo es consecutivo y legal: lo asigna tu
sistema con bloqueo atómico, no lo editas para destrabar un envío. Ver [inicio rápido](/empezando/inicio-rapido) y
[cómo usar quipu](/buenas-practicas/como-usar).
:::

## Rechazo 3244 — Forma de Pago (tipo de transacción)

**Síntoma**: el CDR viene rechazado con código `3244`: *"Debe consignar la informacion del tipo de transaccion del
comprobante"* (catálogo de SUNAT). Es el rechazo de "falta la forma de pago / tipo de
transacción".

**Causa**: con quipu **no deberías verlo por el camino normal**. `InvoiceBuilder` **siempre** emite el bloque
`cac:PaymentTerms[ID=FormaPago]`: el default del modelo es `PaymentForm::Cash` (un enum
no-nullable) y el builder lo escribe tanto para `Cash` como para `Credit`.
Así que un `3244` ("falta el bloque") significa que **el comprobante que llegó a SUNAT no lo construyó
`InvoiceBuilder`**: un builder propio, un XML armado a mano, o el nodo removido en algún post-procesado.

**Arreglo**: emite a través del builder de quipu (`InvoiceBuilder`, o `CompositeBuilder` si emites varios tipos) y
no elimines el bloque de pago. Si vendes al crédito, pasa `PaymentForm::Credit` **con** sus `installments`: el
validador local de quipu rechaza un crédito sin cuotas, y el builder
emite una rama `cac:PaymentTerms` por cada una. Valida antes de enviar para descubrirlo sin gastar un envío:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Model\Invoice;

// No hace falta pasar paymentForm: el default es PaymentForm::Cash y el
// builder SIEMPRE escribe el bloque cac:PaymentTerms[ID=FormaPago].
$invoice = new Invoice(
    // ... resto de los campos ...
    // paymentForm omitido intencionalmente => PaymentForm::Cash
);

$errors = $quipu->validate($invoice); // list<string>; inspecciona sin lanzar
```

</template>
</CodeTabs>

Ver [validación local](/guias/validacion-local).

## Siguiente paso

- Ya emitiste en beta: pasa a [de beta a producción](/produccion/de-beta-a-produccion) y al
  [checklist](/produccion/checklist).
- Profundiza en [errores comunes](/buenas-practicas/errores-comunes) (usuario operativo) y en
  [manejo de errores](/buenas-practicas/manejo-errores).
