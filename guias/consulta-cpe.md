# Consulta de CPE

quipu puede **consultar comprobantes** en SUNAT de dos formas distintas:

1. **Validez de un CPE de un tercero** — la *Consulta Integrada de Validez del CPE* (REST). Requiere inyectar
   un `CpeValidator`.
2. **Estado de tu propio CPE** — el *billConsultService* (SOAP): existe, aceptado, rechazado o de baja, y
   re-descarga del CDR. Requiere inyectar un `CpeStatusService`.

Ambos son **opcionales**: si no inyectas el servicio, el método lanza `TransportException` con un mensaje claro.

<Availability lite pro />

## Consultar un CPE de un tercero

Para verificar si un comprobante que te entregó un proveedor es válido:

<CodeTabs>
<template #php>

```php
use DateTimeImmutable;
use ElPandaPe\Quipu\Model\CpeQuery;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\CpeValidityClient;
use ElPandaPe\Quipu\Ws\CpeValidityCredentials;
use ElPandaPe\Quipu\Ws\CpeValidityEndpoints;
use ElPandaPe\Quipu\Ws\CurlHttpClient;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Xml\CompositeBuilder;

$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(/* ... */),
    cpeValidator: new CpeValidityClient(
        new CurlHttpClient(),
        new CpeValidityCredentials(
            getenv('CONSULTA_CLIENT_ID'),      // clientId de "Credenciales de API SUNAT"
            getenv('CONSULTA_CLIENT_SECRET'),  // clientSecret
            '20512345678',                     // RUC del consultante (a secas, sin usuario SOL)
        ),
        CpeValidityEndpoints::production(),
    ),
);

$query = new CpeQuery(
    taxpayerId: '20100456789',   // RUC del emisor del comprobante a consultar
    documentCode: '01',          // tipo: 01 factura, 03 boleta, 07 NC, 08 ND, ...
    series: 'F001',
    number: '123',
    issueDate: new DateTimeImmutable('2026-07-10'),
    amount: 236.00,              // obligatorio para documentos electrónicos
);

$validity = $quipu->validateCpe($query);

$validity->documentStatus;  // "0" no existe, "1" aceptado, "2" anulado, "3" autorizado, "4" no autorizado
$validity->taxpayerStatus;  // "00" activo, "01" baja provisional, ...
$validity->domicileStatus;  // "00" habido, "09" pendiente, "11" por verificar, "12" no habido, "20" no hallado
$validity->observations;    // list<string>

$validity->exists();          // ¿SUNAT tiene registro del comprobante? (documentStatus != "0")
$validity->isAccepted();      // ¿está aceptado? ("1")
$validity->isAnnulled();      // ¿fue dado de baja? ("2")
$validity->isAuthorized();    // ¿tiene autorización de imprenta? ("3")
$validity->isNotAuthorized(); // ¿no autorizado por imprenta? ("4")
```

</template>
</CodeTabs>

> [!NOTE] Esta API no usa el usuario/clave SOL
> `CpeValidityCredentials` recibe **tres** argumentos: `clientId`, `clientSecret` y `consultantRuc`. El tercero es
> el **RUC del consultante a secas**, no el RUC concatenado con el usuario SOL, y **no hay** parámetro de clave
> SOL: la Consulta Integrada autentica con `grant_type=client_credentials` (a diferencia de GRE, que usa el
> *password grant* con `RUC + usuario SOL`).

::: warning SUNAT no expone el XML de terceros
La consulta de validez reporta el **estado** del comprobante y la **condición del RUC emisor**, pero **no** los
renglones ni el XML del tercero. SUNAT no expone esa información por esta API.
:::

## Consultar tu propio CPE

Para saber el estado de un comprobante que tú emitiste (y re-descargar su CDR sin reenviarlo):

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\BillConsultClient;
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Xml\CompositeBuilder;

$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(/* ... */),
    cpeStatusService: new BillConsultClient(
        SoapEndpoints::production()->consultUrl(),
        $ruc . $solUser,
        $solPassword,
    ),
);

// ¿Existe y en qué estado está?
$result = $quipu->getBillStatus('20512345678', '01', 'F001', 1);

$result->statusCode;    // "0001" aceptado, "0002" rechazado, "0003" de baja, "0011" no existe, ...
$result->statusMessage;
$result->exists();      // 0001, 0002 o 0003: SUNAT tiene registro del comprobante
$result->isAccepted();  // 0001
$result->isRejected();  // 0002
$result->isVoided();    // 0003
$result->isNotFound();  // 0011
$result->isNotOwned();  // 0012: existe, pero no fue emitido por el RUC consultante

// Re-descargar el CDR:
$result = $quipu->retrieveCdr('20512345678', '01', 'F001', 1);
if ($result->hasCdr()) {
    $cdr = $result->cdr;   // CdrResult
    file_put_contents('cdr.xml', $cdr->xml);
}
```

</template>
</CodeTabs>

### Códigos de `BillConsultResult`

| `statusCode` | Significado |
|---|---|
| `0001` | Existe y está aceptado |
| `0002` | Existe pero está rechazado |
| `0003` | Existe pero está de baja |
| `0004` | Formato de RUC no válido |
| `0005` | Formato del tipo no válido |
| `0006` | Formato de serie inválido |
| `0007` | El número debe ser mayor que cero |
| `0008` | El RUC no está inscrito en SUNAT |
| `0009` | El tipo debe ser 01/07/08 |
| `0010` | Solo se consulta facturas/notas con serie `F` |
| `0011` | El CPE no existe |
| `0012` | El CPE no le pertenece (no es de tu RUC) |

## Host de la consulta

`billConsultService` vive en un **tercer host** de SUNAT, distinto al de factura y al de otrosCpe, y **solo
existe en producción** (no hay beta de consulta). `SoapEndpoints::consultUrl()` ya lo resuelve correctamente.

Ver [endpoints](/referencia/endpoints).

## Siguiente paso

- [Endpoints SOAP y REST](/referencia/endpoints)
- [Resultados](/referencia/resultados)
