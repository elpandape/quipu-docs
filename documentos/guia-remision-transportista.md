# Guía de remisión transportista (tipoDoc 31)

La **Guía de Remisión Electrónica transportista** (código `31`) es el complemento de la [GRE del remitente (`09`)](/documentos/guia-remision):
quien declara el traslado aquí **no es el remitente**, sino la **empresa transportista** que efectivamente
mueve la mercancía. Ambas comparten el mismo elemento raíz UBL (`DespatchAdvice`) y la misma API REST con
OAuth de la GRE; lo que las distingue es el `cbc:DespatchAdviceTypeCode` (`09` vs `31`) y quién firma.

<Availability lite pro />

> [!NOTE]
> En la `09` el **emisor es el remitente** de los bienes. En la `31` el **emisor es el transportista**; el
> remitente y el destinatario viajan como **terceros** (solo identificación, sin dirección propia en el cuerpo
> UBL). Por eso el modelo de la `31` **no lleva un `Company`**: lleva un `Carrier`.

## Modelo

`CarrierDespatch`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `series` | `string` | serie del transportista (`V001`) |
| `number` | `string` | correlativo |
| `issueDate` | `DateTimeImmutable` | fecha de emisión |
| `carrier` | `Carrier` | **el transportista (emisor/firmante)** — RUC + registro MTC |
| `sender` | `Client` | el remitente (tercero, solo identificación) |
| `receiver` | `Client` | el destinatario (tercero, solo identificación) |
| `shipment` | `Shipment` | el traslado (peso, puntos, chofer, vehículo) |
| `details` | `list<DespatchItem>` | ítems trasladados (mínimo uno) |
| `relatedDocuments` | `list<GreRelatedDocument>` | documentos que sustentan el transporte (Cat. 61); **debe incluir la guía del remitente** (ver [más abajo](#debes-referenciar-la-guia-del-remitente)) |
| `observation` | `?string` | observación opcional |

::: warning Ojo al orden de `relatedDocuments` y `observation`
Es **el inverso** del de la [`Despatch` (`09`)](/documentos/guia-remision). En `Despatch` el constructor va
`..., observation = null, relatedDocuments = []`; en `CarrierDespatch` va `..., relatedDocuments = [], observation = null`.
Si copias la firma de memoria te arriesgas a cruzar los valores. Usa **argumentos con nombre** (como hace el
ejemplo de esta página) y el problema desaparece.
:::

### `Carrier`

`Carrier`. **Sin valores por defecto**: los cuatro campos son obligatorios en el
constructor.

| Propiedad | Tipo | Notas |
|---|---|---|
| `documentType` | `IdentityDocumentType` | **debe ser `Ruc`** — el validador rechaza cualquier otro |
| `documentNumber` | `string` | RUC del transportista (se usa también en el `fileName`) |
| `legalName` | `string` | razón social del transportista |
| `mtcRegistration` | `string` | número de Registro MTC del transportista; **el validador exige que no esté vacío** |

::: tip `mtcRegistration` se valida, no es decorativo
`CarrierDespatchValidator` rechaza la guía si `mtcRegistration` viene vacío o en blanco — ver
[Validación local](#validacion-local). El mismo `mtcRegistration` es el que el builder serializa como
`cbc:CompanyID` dentro de `cac:ShipmentStage/cac:CarrierParty`.
:::

## Validación local

`CarrierDespatchValidator` (incluido en el `CompositeValidator` por defecto de la
fachada `Quipu`) revisa la `31` y devuelve errores para estos siete casos:

1. El transportista **no se identifica con RUC**.
2. El `mtcRegistration` del transportista **está vacío**.
3. La guía **no tiene ningún bien** (`details` vacío).
4. El `grossWeight` del traslado **no es mayor que cero**.
5. **Falta el `vehicle`** en el `Shipment`.
6. **Falta al menos un `Driver`** (chofer) en el `Shipment`.
7. `relatedDocuments` **no referencia la guía del remitente** (`GreRelatedDocumentType::SenderDespatchGuide`).

::: warning En la `31` el vehículo es SIEMPRE obligatorio
A diferencia de la [`09`](/documentos/guia-remision) —donde el transporte privado puede eximir el vehículo con
un indicador M1/L— aquí el validador **siempre** exige `vehicle` y `drivers`, sin exención: el transportista
reporta el medio con el que realiza el traslado. No intentes reutilizar el atajo de `indicators` de la `09`.
:::

Llámala a mano con `$quipu->validate($despatch)` (devuelve la lista de violaciones) o con
`$quipu->assertValid($despatch)` (lanza `InvalidDocumentException` si hay alguna) antes de emitir.

::: tip El `reasonCode` y el `transportMode` no se serializan en la `31`
El constructor de `Shipment` los exige (son obligatorios en la firma), así que debes pasarlos; pero
`CarrierDespatchBuilder` **no los escribe** en el XML — el motivo y la modalidad del traslado ya están
declarados en la guía del remitente referenciada, y no se repiten. Pásalos igual (p. ej. `Sale` /
`PublicTransport`); no llegan a SUNAT.
:::

## Credenciales GRE

La `31` usa **exactamente el mismo flujo OAuth** que la `09`: un cliente OAuth (`client_id`/`client_secret`) más
el usuario SOL del RUC, contra `api-seguridad.sunat.gob.pe`. La única diferencia es que las credenciales son
**del transportista** (él es quien firma y envía), no del remitente.

El detalle de cómo obtener el `client_id`/`client_secret`, del caché del token (`TokenStore`) y de por qué **no
hay sandbox oficial** está en [Credenciales GRE](/documentos/guia-remision#credenciales-gre) — no se repite aquí.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\GreCredentials;

// El RUC es el del TRANSPORTISTA, no el del remitente
$credentials = new GreCredentials(
    ruc: '20600000011',
    clientId: getenv('GRE_CLIENT_ID'),
    clientSecret: getenv('GRE_CLIENT_SECRET'),
    solUser: 'MODDATOS',
    solPassword: 'clave-sol',
);
```

</template>
</CodeTabs>

## Ejemplo completo

::: danger Este ejemplo apunta a `GreEndpoints::beta()` — no lo cambies a producción para probar
SUNAT **no ofrece un entorno de pruebas** para la API GRE. `GreEndpoints::production()` emite guías **reales**
desde la primera ejecución. Estrénate contra `beta()` (el mock de la comunidad) y pasa a producción solo cuando
el traslado sea real — ver [De beta a producción](/produccion/de-beta-a-produccion).
:::

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\GreRelatedDocumentType;
use ElPandaPe\Quipu\Catalog\IdentityDocumentType;
use ElPandaPe\Quipu\Catalog\TransferReason;
use ElPandaPe\Quipu\Catalog\TransportMode;
use ElPandaPe\Quipu\Catalog\UnitOfMeasure;
use ElPandaPe\Quipu\Model\Address;
use ElPandaPe\Quipu\Model\Carrier;
use ElPandaPe\Quipu\Model\CarrierDespatch;
use ElPandaPe\Quipu\Model\Client;
use ElPandaPe\Quipu\Model\DespatchItem;
use ElPandaPe\Quipu\Model\Driver;
use ElPandaPe\Quipu\Model\GreRelatedDocument;
use ElPandaPe\Quipu\Model\Shipment;
use ElPandaPe\Quipu\Model\Vehicle;
use ElPandaPe\Quipu\Quipu;
use ElPandaPe\Quipu\Signer\XmlSecSigner;
use ElPandaPe\Quipu\Ws\CurlHttpClient;
use ElPandaPe\Quipu\Ws\GreClient;
use ElPandaPe\Quipu\Ws\GreCredentials;
use ElPandaPe\Quipu\Ws\GreEndpoints;
use ElPandaPe\Quipu\Ws\InMemoryTokenStore;
use ElPandaPe\Quipu\Ws\SoapEndpoints;
use ElPandaPe\Quipu\Ws\SoapSender;
use ElPandaPe\Quipu\Ws\SystemClock;
use ElPandaPe\Quipu\Xml\CompositeBuilder;

$carrierRuc = '20600000011';                      // RUC del TRANSPORTISTA (emisor de la 31)
$certificate = file_get_contents('/ruta/a/tu/certificate.pem');

// El transportista es el emisor/firmante: RUC + registro MTC.
$carrier = new Carrier(
    documentType: IdentityDocumentType::Ruc,
    documentNumber: $carrierRuc,
    legalName: 'TRANSPORTES RÁPIDO SAC',
    mtcRegistration: 'MD0123456',                  // tu número de Registro MTC
);

$despatch = new CarrierDespatch(
    series: 'V001',                                // serie del transportista
    number: '1',
    issueDate: new DateTimeImmutable(),
    carrier: $carrier,
    sender: new Client(                            // el remitente (tercero): RUC, solo identificación
        documentType: IdentityDocumentType::Ruc,
        documentNumber: '20512345678',
        legalName: 'EMPRESA DE PRUEBA SAC',
    ),
    receiver: new Client(                          // el destinatario (tercero): RUC, solo identificación
        documentType: IdentityDocumentType::Ruc,
        documentNumber: '20100456789',
        legalName: 'DESTINATARIO SAC',
    ),
    shipment: new Shipment(
        reasonCode: TransferReason::Sale,            // venta (no se serializa en la 31)
        transportMode: TransportMode::PublicTransport, // transporte público (no se serializa en la 31)
        grossWeight: 12.5,
        transferDate: new DateTimeImmutable(),
        departureAddress: new Address(ubigeo: '150101', line: 'AV. PARTIDA 100'),
        arrivalAddress: new Address(ubigeo: '150203', line: 'AV. LLEGADA 200'),
        drivers: [new Driver(
            documentType: IdentityDocumentType::Dni,
            documentNumber: '44556677',
            firstName: 'JUAN',
            familyName: 'PEREZ',
            license: 'Q44556677',
        )],
        vehicle: new Vehicle(plate: 'ABC123'),       // obligatorio en la 31 (sin exención)
    ),
    details: [
        new DespatchItem(
            unit: UnitOfMeasure::Unit,
            quantity: 5.0,
            description: 'PRODUCTO DE PRUEBA',
            productCode: 'P001',
        ),
    ],
    relatedDocuments: [
        // La guía del REMITENTE (09) que este transporte está cumpliendo.
        // Su serie-number y el RUC del remitente emisor:
        new GreRelatedDocument(
            id: 'T001-1',
            type: GreRelatedDocumentType::SenderDespatchGuide,
            issuerRuc: '20512345678',
        ),
    ],
);

// El SoapSender es obligatorio por el constructor, pero la GRE no lo usa:
// el GreClient es el transporte REST que envía la guía.
$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(SoapEndpoints::beta()->billServiceUrl(), $carrierRuc . 'MODDATOS', 'moddatos'),
    greSender: new GreClient(
        new CurlHttpClient(),
        $credentials,
        GreEndpoints::beta(), // mock de la comunidad; producción emite guías reales
        // Sin tokenStore, cada vuelta del polling pide un access_token nuevo.
        tokenStore: new InMemoryTokenStore(new SystemClock()),
    ),
);

// 1) Enviar la guía: SUNAT responde con un ticket
$ticket = $quipu->emitGuide($despatch);

// 2) Polling: la GRE es asíncrona
for ($attempt = 1; $attempt <= 10; ++$attempt) {
    sleep(3);
    try {
        $cdr = $quipu->getGuideStatus($ticket->ticket);
        printf("Estado: %s  Código: %s\n", $cdr->status->value, $cdr->responseCode);
        break;
    } catch (Throwable $e) {
        printf("Intento %d: %s\n", $attempt, $e->getMessage());
    }
}
```

</template>
</CodeTabs>

`emitGuide()` acepta cualquier `Document` y arma el nombre del archivo con `$document->fileName()`. Para la
`31` ese nombre **ya refleja el RUC del transportista** (ver [la trampa siguiente](#el-filename-usa-el-ruc-del-transportista)).

## Tres particularidades del 31

### El `fileName` usa el RUC del transportista

`CarrierDespatch::fileName()` devuelve:

<CodeTabs>
<template #php>

```php
"{$this->carrier->documentNumber}-31-{$this->series}-{$this->number}"
```

</template>
</CodeTabs>

Es decir, construye el nombre con el **RUC del transportista** (`carrier->documentNumber`), **no** con el del
remitente. En el ejemplo de arriba el nombre resulta `20600000011-31-V001-1`. Es coherente con que el
transportista sea el emisor, pero contradice la intuición de quien viene de la `09` (donde el `fileName` lleva
el RUC de la `company`). Si tu transportista gestiona guías de varios remitentes, ten presente que todas las
`31` se nombran bajo **su** RUC.

### Debes referenciar la guía del remitente

`relatedDocuments` **debe incluir** al menos un `GreRelatedDocument` con
`type: GreRelatedDocumentType::SenderDespatchGuide` (Cat. 61, código `09`): es la guía del remitente que este
transporte está cumpliendo. `CarrierDespatchValidator` rechaza la guía si no la encuentra. El `id` es la
serie-correlativo de esa guía (`T001-1`) y `issuerRuc` es el RUC del remitente emisor.

> [!TIP]
> `GreRelatedDocumentType` también cubre el código `31` (`CarrierDespatchGuide`) para encadenar transportes, y
> otros del Cat. 61 (`Invoice`, `CustomsDeclaration`, `DetractionDepositProof`...). Pero el que el validador
> **exige** es el `SenderDespatchGuide`.

### Es solo emisión: sin lector

quipu **sabe construir y firmar** la `31`, pero **no leerla** de vuelta. `CompositeReader` desambigua la raíz
`DespatchAdvice` mirando `cbc:DespatchAdviceTypeCode`: el `09` tiene lector, pero cualquier otro valor (incluido
el `31`) lanza `InvalidDocumentException`:

> No hay un lector registrado para la guía de remisión de tipo «31».

El motivo es de fondo: el builder de la `31` no serializa `Shipment::$reasonCode` ni `$transportMode` (viajan en
la guía del remitente referenciada), así que un lector no podría reconstruirlos sin inventar datos. En la
práctica, esto significa que la `31` es un documento de **emisión**: llamas a `emitGuide()` / `getGuideStatus()`,
pero `$quipu->read($xml)` sobre una `31` lanza. Si necesitas parsear el XML tú mismo, hazlo sobre el UBL crudo.

## Pasar a producción

Cuando el traslado sea real, cambia **solo** los endpoints del `GreClient` a `GreEndpoints::production()` (el
resto del ejemplo no cambia):

<CodeTabs>
<template #php>

```php
greSender: new GreClient(
    new CurlHttpClient(),
    $credentials,
    GreEndpoints::production(), // emite guías REALES ante SUNAT
    tokenStore: new InMemoryTokenStore(new SystemClock()),
),
```

</template>
</CodeTabs>

::: danger No hay ensayo previo en producción
Como SUNAT no publica un entorno de pruebas de la API GRE, **la primera emisión contra producción ya es una guía
real**. Prevé un traslado de bajo riesgo para estrenarte y verifica antes el flujo completo contra `beta()`. Ver
[De beta a producción](/produccion/de-beta-a-produccion).
:::

## Estado de esta integración

::: warning El flujo GRE no se ha ejercido en vivo
El round-trip completo —OAuth → envío → ticket → CDR— **todavía no se ha
ejecutado contra un servidor real**, ni para la `09` ni para la `31`: falta disponer de un
`client_id`/`client_secret` OAuth de la API GRE. El código y este ejemplo están construidos y cubiertos por
tests con el transporte HTTP mockeado, pero eso **no** sustituye a la verificación en vivo. Espera fricción en
la primera integración y valida contra `beta()` antes de emitir nada real.
:::

## Representación impresa: no cubierta

`qrString()` y `printable()` **solo** soportan factura/boleta y notas. Con un `CarrierDespatch` lanzan
`InvalidDocumentException` — ver [representación impresa](/guias/representacion-impresa). Si necesitas el
impreso de la guía transportista, arma el QR y la vista tú mismo.

## Siguiente paso

- [Guía de remisión remitente (`09`)](/documentos/guia-remision) — la guía que esta `31` referencia
- [Endpoints SOAP y REST](/referencia/endpoints)
- [Certificados digitales](/guias/certificados)
