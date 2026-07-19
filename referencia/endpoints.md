# Endpoints SOAP y REST

SUNAT sirve sus servicios desde **varios hosts distintos**. quipu centraliza las URLs en value objects para que
nunca envíes un documento al host equivocado —un error fácil de cometer y difícil de diagnosticar.

<Availability lite pro />

## `SoapEndpoints` — comprobantes (SOAP)

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\SoapEndpoints;

$beta = SoapEndpoints::beta();
$prod = SoapEndpoints::production();
```

</template>
</CodeTabs>

Tres familias de URLs, cada una en un host distinto:

| Método | Host | Para qué |
|---|---|---|
| `billServiceUrl()` | `ol-ti-itcpfegem` | Factura, boleta, notas, resumen diario, comunicación de baja |
| `otherCpeUrl()` | `ol-ti-itemision-otroscpe-gem` | Retención, percepción, reversión |
| `consultUrl()` | `ol-it-wsconscpegem` | Consulta de estado y CDR de tu propio CPE |

> [!IMPORTANT]
> **Retención, percepción y reversión van al host otrosCpe, no al billService FE.** Enviarlos al host FE (o
> viceversa) es un error común. Usa siempre `otherCpeUrl()` para esos tipos.

> [!WARNING]
> `billConsultService` (consulta) **solo existe en producción**: SUNAT no publica una variante beta. Por eso
> `consultUrl()` resuelve al mismo host de producción tanto en `beta()` como en `production()`. No es un
> descuido: es que la beta no tiene ese servicio.

### Uso

<CodeTabs>
<template #php>

```php
// Factura/boleta/nota/resumen/baja:
new SoapSender(SoapEndpoints::production()->billServiceUrl(), $user, $pass);

// Retención/percepción/reversión:
new SoapSender(SoapEndpoints::production()->otherCpeUrl(), $user, $pass);

// Consulta de CPE propio:
new BillConsultClient(SoapEndpoints::production()->consultUrl(), $user, $pass);
```

</template>
</CodeTabs>

Ambos aceptan un **4.º parámetro opcional `?string $wsdlPath = null`**: el WSDL local a usar. Por default toman
el que quipu trae empaquetado en `resources/wsdl/` (`billService.wsdl` y `billConsultService.wsdl`
respectivamente), así que no hace falta descargar nada de SUNAT en runtime. Pásalo solo si necesitas un WSDL
parcheado:

<CodeTabs>
<template #php>

```php
new SoapSender($endpoint, $user, $pass, '/ruta/a/mi/billService.wsdl');
new BillConsultClient($endpoint, $user, $pass, '/ruta/a/mi/billConsultService.wsdl');
```

</template>
</CodeTabs>

## `GreEndpoints` — guías de remisión (REST)

La GRE no usa SOAP: usa una API REST con OAuth. Dos hosts:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\GreEndpoints;

$beta = GreEndpoints::beta();
$prod = GreEndpoints::production();
```

</template>
</CodeTabs>

| Método | Para qué |
|---|---|
| `tokenUrl($clientId)` | OAuth: obtener el bearer token |
| `sendUrl($fileName)` | Enviar la guía (ZIP) |
| `statusUrl($ticket)` | Consultar el estado del ticket |

### Uso

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\CurlHttpClient;
use ElPandaPe\Quipu\Ws\GreClient;
use ElPandaPe\Quipu\Ws\GreCredentials;
use ElPandaPe\Quipu\Ws\GreEndpoints;

$greSender = new GreClient(
    new CurlHttpClient(),
    new GreCredentials($ruc, $clientId, $clientSecret, $solUser, $solPass),
    GreEndpoints::production(),
);
```

</template>
</CodeTabs>

`GreClient` tiene **6 parámetros**; los tres últimos tienen default, y son el punto de extensión:

<CodeTabs>
<template #php>

```php
new GreClient(
    HttpClient $http,
    GreCredentials $credentials,
    GreEndpoints $endpoints,
    ZipCompressor $zip = new ZipCompressor(),
    CdrParser $cdr = new CdrParser(),
    ?TokenStore $tokenStore = null,     // cachea el bearer entre llamadas
);
```

</template>
</CodeTabs>

> [!TIP] Cachea el token
> El 6.º parámetro es donde se engancha el [`TokenStore`](/referencia/contratos#tokenstore). Sin él, el cliente
> pide un token OAuth nuevo en **cada** llamada; con él, lo reutiliza hasta que expira:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\InMemoryTokenStore;
use ElPandaPe\Quipu\Ws\SystemClock;

new GreClient(
    new CurlHttpClient(),
    $credentials,
    GreEndpoints::production(),
    tokenStore: new InMemoryTokenStore(new SystemClock()),
);
```

</template>
</CodeTabs>

`InMemoryTokenStore` **exige un `Contract\Clock`**: no tiene default. En producción pásale `Ws\SystemClock`
(el reloj real, `time()`); en tests, un doble que puedas adelantar a voluntad para ejercitar la expiración.

`CpeValidityClient` recibe el suyo como **4.º parámetro** (`?TokenStore $tokenStore = null`).

## `CpeValidityEndpoints` — consulta de validez (REST)

La *Consulta Integrada de Validez del CPE* (validar comprobantes de terceros) también es REST/OAuth, con sus
propios endpoints.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Ws\CpeValidityClient;
use ElPandaPe\Quipu\Ws\CpeValidityCredentials;
use ElPandaPe\Quipu\Ws\CpeValidityEndpoints;
use ElPandaPe\Quipu\Ws\CurlHttpClient;

$cpeValidator = new CpeValidityClient(
    new CurlHttpClient(),
    new CpeValidityCredentials($clientId, $clientSecret, $ruc),
    CpeValidityEndpoints::production(),
);
```

</template>
</CodeTabs>

> [!IMPORTANT] `CpeValidityCredentials` recibe 3 argumentos, no 4
> A diferencia de `GreCredentials`, esta API **no usa el usuario SOL**: autentica con
> `grant_type=client_credentials`, no con el *password grant* de la GRE. Por eso:
>
> - Son **3** parámetros: `(string $clientId, string $clientSecret, string $consultantRuc)`.
> - El tercero es el **RUC a secas** (`'20512345678'`), **no** el RUC concatenado con el usuario SOL.
> - No hay parámetro de contraseña.
>
> El `clientId`/`clientSecret` se generan desde "Credenciales de API SUNAT".

| Método | Devuelve |
|---|---|
| `tokenUrl($clientId)` | URL del token OAuth — path **`/v1/clientesextranet/{clientId}/oauth2/token/`** |
| `validateUrl($consultantRuc)` | URL que valida el comprobante, direccionada por el RUC del consultante |

> [!WARNING] El path es `clientesextranet`, no `clientessol`
> La GRE usa `/v1/clientessol/…`; la Consulta Integrada usa **`/v1/clientesextranet/…`**, aunque ambas
> comparten el host de seguridad `api-seguridad.sunat.gob.pe`. Confundirlos da un fallo de autenticación
> difícil de leer.

> [!NOTE] `CpeValidityEndpoints::beta()` devuelve literalmente `production()`
> SUNAT **no publica un entorno beta/homologación** para esta API (a diferencia de la GRE). `beta()` existe por
> simetría, pero retorna `self::production()`: los mismos hosts de producción. Verificado contra el *Manual de
> Consulta Integrada* y la spec OpenAPI de greenter, cuya lista `servers:` solo tiene hosts de producción.
> **Consecuencia práctica**: no puedes ensayar esta API sin credenciales reales — apunta a un mock propio
> construyendo el VO a mano (ver abajo).

## Credenciales

### SOAP (comprobantes y consulta propia)

El usuario SOAP es el **RUC concatenado con el usuario SOL secundario** (p. ej. `20512345678MODDATOS`), y la
contraseña es la del SOL. WS-Security (UsernameToken) se añade automáticamente.

### REST (GRE y consulta de validez)

Ambas usan **OAuth** con un `clientId`/`clientSecret` que SUNAT otorga para la API, pero **con grants distintos**:

| | `GreCredentials` | `CpeValidityCredentials` |
|---|---|---|
| Grant | *password grant* | `client_credentials` |
| Params | `(ruc, clientId, clientSecret, solUser, solPassword)` | `(clientId, clientSecret, consultantRuc)` |
| ¿Usuario SOL? | **Sí** | **No** |
| Path del token | `/v1/clientessol/…` | `/v1/clientesextranet/…` |

`GreCredentials` expone además `username()`, que devuelve el usuario OAuth que SUNAT espera: el RUC
inmediatamente seguido del usuario SOL (p. ej. `20512345678MODDATOS`). En `CpeValidityCredentials` **no** existe
esa concatenación: `consultantRuc` es el RUC a secas.

Ver [`GreCredentials`](/documentos/guia-remision#credenciales-gre).

## Entornos de prueba

Los tres VOs exponen `beta()`, pero **cada uno significa una cosa distinta**. Vale la pena leer la tabla antes
de asumir que "beta" es siempre un entorno de pruebas oficial de SUNAT:

| VO | Qué es `beta()` realmente |
|---|---|
| `SoapEndpoints` | **Beta real de SUNAT** (`e-beta.sunat.gob.pe`) — servicio de pruebas oficial, que **solo valida estructura XML**, no reglas de negocio. Salvo `consultUrl()`, que resuelve a producción porque SUNAT no publica ese servicio en beta |
| `GreEndpoints` | **Un mock de la comunidad**, `gre-test.nubefact.com` — *no* es SUNAT |
| `CpeValidityEndpoints` | **Producción**: `beta()` devuelve literalmente `production()` |

### SOAP — beta oficial de SUNAT

`SoapEndpoints::beta()` apunta a `https://e-beta.sunat.gob.pe`, con las credenciales públicas
`20000000001MODDATOS` / `moddatos`. Valida la estructura UBL y que la firma sea criptográficamente válida, no
la autoridad del certificado, así que acepta un [certificado autofirmado](/guias/certificados) de prueba.

### GRE — no es SUNAT

> [!WARNING] `GreEndpoints::beta()` apunta a un mock de terceros
> `GreEndpoints::beta()` resuelve a **`https://gre-test.nubefact.com`**, descrito en el propio código como
> *"hosted by the community mock"*. **No es un entorno de SUNAT**: es un servicio de terceros mantenido por la
> comunidad, útil para ensayar el flujo (OAuth → envío → ticket → CDR) sin credenciales reales.
>
> Que pase el mock **no acredita homologación** ante SUNAT, ni garantiza que producción vaya a aceptar el mismo
> documento: las validaciones del mock son una aproximación, no la fuente de verdad. Y estás enviando tus
> documentos de prueba a un host de terceros — no le mandes datos reales de contribuyentes.
>
> SUNAT no publica una beta oficial de la API REST de GRE; de ahí el mock. Si necesitas certeza, prueba contra
> producción con un RUC propio, o levanta tu propio mock (ver abajo).

## Apuntar a un mock propio

Los tres VOs tienen **constructor público con propiedades `readonly`**: además de las factories `beta()`/
`production()`, puedes construirlos a mano. Es el *seam* para dirigir quipu a un mock local, un proxy de
inspección o un entorno de staging:

<CodeTabs>
<template #php>

```php
new SoapEndpoints(
    feBaseUrl: 'http://localhost:8080/ol-ti-itcpfegem',
    otherCpeBaseUrl: 'http://localhost:8080/ol-ti-itemision-otroscpe-gem',
    consultBaseUrl: 'http://localhost:8080/ol-it-wsconscpegem',
);

new GreEndpoints(
    authBaseUrl: 'http://localhost:8080',
    cpeBaseUrl: 'http://localhost:8080/v1/contribuyente/gem/comprobantes',
);

new CpeValidityEndpoints(
    authBaseUrl: 'http://localhost:8080',
    validationBaseUrl: 'http://localhost:8080/v1/contribuyente/contribuyentes',
);
```

</template>
</CodeTabs>

Las propiedades son públicas, así que también puedes leerlas (`$endpoints->feBaseUrl`) para loggear a dónde
está apuntando tu configuración.

## Siguiente paso

- [Consulta de CPE](/guias/consulta-cpe)
- [Guía de remisión](/documentos/guia-remision)
