# Guía de remisión (GRE)

La **Guía de Remisión Electrónica remitente** (código `09`) reporta el **traslado de bienes** de un punto a
otro. A diferencia del resto de comprobantes, la GRE **no se envía por SOAP**: usa una **API REST con OAuth**.

<Availability lite pro />

## Modelo

`ElPandaPe\Quipu\Model\Despatch`:

| Propiedad | Tipo | Notas |
|---|---|---|
| `series` | `string` | `T001` |
| `number` | `string` | correlativo |
| `issueDate` | `DateTimeImmutable` | fecha de emisión |
| `company` | `Company` | emisor (remitente) |
| `receiver` | `Client` | destinatario |
| `shipment` | `Shipment` | el traslado (motivo, modo, peso, puntos, chofer, vehículo) |
| `details` | `list<DespatchItem>` | ítems trasladados |
| `relatedDocuments` | `list<GreRelatedDocument>` | documentos que sustentan el traslado (Cat. 61) |
| `observation` | `?string` | observación opcional |
| `buyer` | `?Client` | comprador, cuando difiere del destinatario |
| `seller` | `?Company` | vendedor tercero, cuando difiere del emisor |

### `Shipment`

Las seis primeras propiedades son **obligatorias**; el resto, opcionales con default:

| Propiedad | Tipo | Default | Notas |
|---|---|---|---|
| `reasonCode` | `TransferReason` | — | **obligatorio**. Cat. 20 (venta, compra, traslado, etc.) |
| `transportMode` | `TransportMode` | — | **obligatorio**. Cat. 18 (`PublicTransport` o `PrivateTransport`) |
| `grossWeight` | `float` | — | **obligatorio**. peso bruto (debe ser > 0) |
| `transferDate` | `DateTimeImmutable` | — | **obligatorio**. fecha de inicio del traslado |
| `departureAddress` | `Address` | — | **obligatorio**. punto de partida (requiere `ubigeo`) |
| `arrivalAddress` | `Address` | — | **obligatorio**. punto de llegada (requiere `ubigeo`) |
| `reasonDescription` | `?string` | `null` | descripción del motivo de traslado |
| `weightUnit` | `string` | `'KGM'` | unidad de peso |
| `carrier` | `?Carrier` | `null` | transportista (transporte público) |
| `drivers` | `list<Driver>` | `[]` | choferes (transporte privado) |
| `vehicle` | `?Vehicle` | `null` | vehículo (transporte privado) |
| `packageCount` | `?int` | `null` | número de bultos |
| `netWeight` | `?float` | `null` | peso neto |
| `weightInformation` | `?string` | `null` | información complementaria del peso |
| `indicators` | `list<GreTransferIndicator>` | `[]` | indicadores especiales (`cbc:SpecialInstructions`); **única vía** de eximir el vehículo en transporte privado (ver abajo) |
| `seals` | `list<string>` | `[]` | precintos/números de contenedor (un `cac:TransportHandlingUnit` por elemento) |
| `port` | `?PortLocation` | `null` | puerto o aeropuerto de primera llegada; **obligatorio** para importación/exportación/mercancía extranjera (ver abajo) |

::: warning `port` es obligatorio para comercio exterior
Si `reasonCode` es `Import`, `Export` o `ForeignGoodsTransfer`, `DespatchValidator` exige `port` (un
`PortLocation` con puerto o aeropuerto de llegada). Sin él, la guía se rechaza.
:::

::: tip `indicators` es la única vía de eximir el vehículo
En `PrivateTransport` el `vehicle` es obligatorio, **salvo** que el traslado sea en un vehículo de categoría
M1 o L. Esa exención se señala incluyendo `GreTransferIndicator::TransferInM1LVehicle` en `indicators`:
sin ese indicador (y sin `vehicle`), `DespatchValidator` rechaza la guía.
:::

## Credenciales GRE

La GRE necesita credenciales **distintas** a las de SOAP: un **cliente OAuth** (id/secret) que SUNAT otorga para
la API, más el usuario SOL secundario del RUC.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\GreCredentials;

$credentials = new GreCredentials(
    ruc: '20512345678',
    clientId: getenv('GRE_CLIENT_ID'),
    clientSecret: getenv('GRE_CLIENT_SECRET'),
    solUser: 'MODDATOS',
    solPassword: 'clave-sol',
);
```

</template>
</CodeTabs>

::: warning El usuario OAuth es RUC + SOL
SUNAT espera que el **username** del OAuth sea el **RUC concatenado con el usuario SOL** (p. ej.
`20512345678MODDATOS`). `GreCredentials::username()` lo arma por ti.
:::

### Cómo obtener el `client_id` y el `client_secret`

Se generan **una sola vez** desde el Portal SOL, registrando una aplicación:

1. Entra a **SUNAT Operaciones en Línea (SOL)** con tu **RUC + usuario SOL + clave SOL**. El usuario debe tener
   el **perfil de emisión de GRE**.
2. Ve a **Empresas → Credenciales de API SUNAT → Gestión Credenciales de API SUNAT**.
3. **Registra la aplicación**: un nombre y una URL.
4. Marca la API **«GRE Emisión de Comprobantes `/v1/contribuyente/gem`»** con alcance **«Desktop»** y guarda.
5. Copia el **`client_id`** y el **`client_secret`** que devuelve la pantalla.

El flujo del token es un *password grant* (no `client_credentials`): quipu lo arma en `OAuthAuthenticator`
contra `api-seguridad.sunat.gob.pe/v1/clientessol/{client_id}/oauth2/token/`, con
`scope=https://api-cpe.sunat.gob.pe`.

### El caché del token es opt-in

::: warning Sin `TokenStore` se re-autentica en cada llamada
`GreClient` **no cachea el token por defecto**: su parámetro `tokenStore` es opcional (`?TokenStore
$tokenStore = null`) y, sin él, `OAuthAuthenticator::token()` pide un `access_token` nuevo en **cada** envío
y **cada** consulta de ticket. Un bucle de polling de 10 vueltas son 10 autenticaciones de más.
:::

Para activarlo, inyecta una implementación de `ElPandaPe\Quipu\Contract\TokenStore`. quipu trae
`InMemoryTokenStore`, que cachea en memoria durante la vida del objeto y recibe un `Clock`:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\InMemoryTokenStore;
use ElPandaPe\Quipu\Ws\SystemClock;

new GreClient(
    new CurlHttpClient(),
    $credentials,
    GreEndpoints::beta(),
    tokenStore: new InMemoryTokenStore(new SystemClock()),
);
```

</template>
</CodeTabs>

Con un `TokenStore` presente, el token se guarda bajo la clave `client_id:username` y se renueva **600 s
antes** del `expires_in` que reporte SUNAT, para no usarlo justo cuando expira. `InMemoryTokenStore` es
process-local: si tu app corre por petición (FPM), cada proceso vuelve a autenticar. Para compartir el token
entre procesos, implementa `TokenStore` sobre Redis, archivo o lo que use tu app — es una interfaz de dos
métodos (`get`/`put`).

::: danger Estas credenciales son de PRODUCCIÓN
SUNAT **no ofrece un entorno de pruebas** para la API GRE: las credenciales que generas en SOL emiten guías
**reales**. Si solo quieres ensayar el flujo, usa `GreEndpoints::beta()` (el mock de la comunidad) — ver
[De beta a producción](/produccion/de-beta-a-produccion).
:::

## Ejemplo completo

::: danger Este ejemplo apunta a `GreEndpoints::beta()` — no lo cambies a producción para probar
No hay sandbox oficial de la API GRE. `GreEndpoints::production()` emite **guías de remisión reales** desde
la primera ejecución: no es un ensayo, es un traslado declarado ante SUNAT. Estrénate contra `beta()` (el
mock de la comunidad) y pasa a producción solo cuando el traslado sea real — ver
[nota de producción](#pasar-a-produccion) abajo.
:::

Es el mismo flujo que `examples/emit-guide-gre.php` en el repo, que puedes ejecutar tal cual.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Catalog\IdentityDocumentType;
use ElPandaPe\Quipu\Catalog\TransferReason;
use ElPandaPe\Quipu\Catalog\TransportMode;
use ElPandaPe\Quipu\Catalog\UnitOfMeasure;
use ElPandaPe\Quipu\Model\Address;
use ElPandaPe\Quipu\Model\Client;
use ElPandaPe\Quipu\Model\Company;
use ElPandaPe\Quipu\Model\Despatch;
use ElPandaPe\Quipu\Model\DespatchItem;
use ElPandaPe\Quipu\Model\Driver;
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

$ruc = '20512345678';
$certificate = file_get_contents('/ruta/a/tu/certificate.pem');

$company = new Company(
    ruc: $ruc,
    legalName: 'EMPRESA DE PRUEBA SAC',
    tradeName: 'QUIPU DEMO',
    address: new Address(
        ubigeo: '150101',
        department: 'LIMA',
        province: 'LIMA',
        district: 'LIMA',
        line: 'AV. SIEMPRE VIVA 123',
    ),
);

$despatch = new Despatch(
    series: 'T001',
    number: '1',
    issueDate: new DateTimeImmutable(),
    company: $company,
    receiver: new Client(
        documentType: IdentityDocumentType::Ruc,
        documentNumber: '20100456789',
        legalName: 'DESTINATARIO SAC',
    ),
    shipment: new Shipment(
        reasonCode: TransferReason::Sale,            // venta (Cat. 20)
        transportMode: TransportMode::PrivateTransport, // privado (Cat. 18)
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
        vehicle: new Vehicle(plate: 'ABC123'),
    ),
    details: [
        new DespatchItem(
            unit: UnitOfMeasure::Unit,
            quantity: 5.0,
            description: 'PRODUCTO DE PRUEBA',
            productCode: 'P001',
        ),
    ],
);

// El SoapSender es obligatorio por el constructor pero la GRE no lo usa:
// el GreClient es el transporte REST que envía la guía.
$quipu = new Quipu(
    new CompositeBuilder(),
    new XmlSecSigner($certificate),
    new SoapSender(SoapEndpoints::beta()->billServiceUrl(), $ruc . 'MODDATOS', 'moddatos'),
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

## Pasar a producción

Cuando el traslado sea real, cambia **solo** los endpoints del `GreClient` a `GreEndpoints::production()`
(el resto del ejemplo no cambia):

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
Como SUNAT no publica un entorno de pruebas de la API GRE, **la primera emisión contra producción ya es una
guía real**. Prevé un traslado de bajo riesgo para estrenarte, y verifica antes el flujo completo contra
`beta()`. Ver [De beta a producción](/produccion/de-beta-a-produccion).
:::

## Estado de esta integración

::: warning El flujo GRE no se ha ejercido en vivo
Según `docs/09-pendientes.md`, el round-trip completo —OAuth → envío → ticket → CDR— **todavía no se ha
ejecutado contra un servidor real**: ni contra SUNAT ni contra el mock de la comunidad, porque falta
disponer de un `client_id`/`client_secret` OAuth de la API GRE. El código y el ejemplo están construidos y
cubiertos por tests con el transporte HTTP mockeado, pero eso **no** sustituye a la verificación en vivo.

En la práctica: espera fricción en la primera integración (formato del payload, respuestas de error, tiempos
del ticket) y valida contra `beta()` antes de emitir nada real. El resto de comprobantes por SOAP sí tiene
round-trip verificado en beta.
:::

## Transporte público vs. privado

El `TransportMode` cambia qué datos lleva el `Shipment`:

- **`PublicTransport`** → provee `carrier` (el transportista: RUC, razón social).
- **`PrivateTransport`** → provee `vehicle` (placa) y `drivers` (choferes con licencia).

## Endpoints

<CodeTabs>
<template #php>

```php
GreEndpoints::beta();        // mock de la comunidad → https://gre-test.nubefact.com  (NO es SUNAT)
GreEndpoints::production();  // producción → SUNAT (api-seguridad / api-cpe)
```

</template>
</CodeTabs>

> [!WARNING]
> `GreEndpoints::beta()` **no apunta a SUNAT**: apunta a `https://gre-test.nubefact.com`, un **mock mantenido
> por la comunidad** (SUNAT no publica un entorno de pruebas de la API GRE). Sirve para probar el flujo —OAuth,
> envío, ticket, polling— pero **no es SUNAT**: sus validaciones y respuestas no garantizan que producción
> acepte tu guía. Como no hay sandbox oficial, la primera emisión contra SUNAT es ya **una guía real**
> (ver [Pasar a producción](#pasar-a-produccion)).

Ver [endpoints](/referencia/endpoints) para el detalle.

## Representación impresa: no cubierta

> [!WARNING]
> `qrString()` y `printable()` **solo** soportan factura/boleta (`Invoice`) y notas (`Note`). Con un `Despatch`
> o un `CarrierDespatch` lanzan `InvalidDocumentException`. El motivo: el formato del QR de la GRE no está
> confirmado contra su anexo técnico de SUNAT, y se difirió a propósito en vez de inventarlo. Si necesitas el
> impreso de la guía, arma el QR y la vista tú mismo.
> Ver [representación impresa](/guias/representacion-impresa).

## Siguiente paso

- [Endpoints SOAP y REST](/referencia/endpoints)
- [Certificados digitales](/guias/certificados)
