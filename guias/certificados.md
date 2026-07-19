# Certificados digitales

La firma del CPE exige un **certificado digital tributario**. Esta guía cubre el **formato** que quipu espera,
cómo **convertirlo** desde un `.pfx`, cómo **cargarlo y validarlo** en runtime y cómo generar uno **de prueba**
para desarrollo. Para producción, el certificado lo emite una entidad externa: ver
[Obtener el certificado tributario](#obtener-el-certificado-tributario).

<Availability lite pro />

::: tip Herramientas de certificado en Pro
El manejo que describe esta página —PEM concatenado, conversión con `openssl`, pre-validación a mano— es lo que
necesita el **emisor base (Lite)**. Si prefieres no salir del código, **quipu Pro** <Availability pro /> trae un
**inspector** de certificados, un **conversor** `.pfx`→PEM y un **pre-flight checker** (caducidad, RUC, cadena).
Ver [Certificados (Pro)](/pro/certificados).
:::

## Formato que quipu espera

`Signer\XmlSecSigner` recibe un **PEM** con el **certificado X.509 y la llave privada concatenados** (sin
passphrase):

<CodeTabs>
<template #php>

```php
$signer = new XmlSecSigner($certificatePem);
```

</template>
</CodeTabs>

Donde `$certificatePem` es el contenido de un archivo así:

```
-----BEGIN CERTIFICATE-----
MIIF...
-----END CERTIFICATE-----
-----BEGIN PRIVATE KEY-----
MIIE...
-----END PRIVATE KEY-----
```

## Obtener el certificado tributario

El certificado digital tributario **lo emite una entidad de certificación acreditada**; no lo generas tú. quipu
no cataloga proveedores: los vigentes, el costo, la vigencia y si aplica el **programa de certificado gratuito de
SUNAT para nuevos emisores** son datos regulatorios que cambian y que debes confirmar antes del alta como emisor
(ver [sensibilidad temporal](/dominio-sunat/sensibilidad-temporal) y [checklist de go-live](/produccion/checklist)).

La entidad te entrega el certificado como **`.pfx`** o **`.p12`**. El siguiente apartado explica cómo convertirlo
al PEM que quipu espera.

## Desde un `.pfx` / `.p12` (producción)

Convierte el `.pfx` / `.p12` a PEM con `openssl`:

```bash
openssl pkcs12 -in certificado.pfx -out certificate.pem -nodes -clcerts
```

- **`-nodes`** quita la passphrase (quipu espera una llave sin passphrase).
- **`-clcerts`** exporta **solo el certificado del titular** (el *leaf*), descartando los certificados de la CA.
  Importa porque `XmlSecSigner::extractCertificate()` incrusta en la firma **únicamente el primer bloque
  `-----BEGIN CERTIFICATE-----`** del PEM (ver `src/Signer/XmlSecSigner.php`): sin `-clcerts`, el PEM puede traer
  varios bloques y, si el primero no es tu certificado, quipu firma con tu llave privada pero publica el
  certificado equivocado.

El archivo resultante ya tiene certificado + llave concatenados, listo para `XmlSecSigner`.

## Certificado de prueba (desarrollo)

Para desarrollo y tests no necesitas un certificado tributario real: un **autofirmado** basta. SUNAT **beta**
lo acepta (valida que la firma sea criptográficamente válida, no la autoridad del certificado).

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes \
  -subj "/C=PE/ST=Lima/L=Lima/O=MI EMPRESA TEST/OU=Facturacion/CN=20000000001"
cat cert.pem key.pem > certificate.pem
rm cert.pem key.pem
```

- **`-nodes`** = sin passphrase (cert de prueba).
- **CN = RUC de prueba** `20000000001`.

::: warning Nunca commitees un certificado
El certificado (y sobre todo la llave privada) **jamás** va al repositorio. Añádelo a `.gitignore`. En CI,
genera el certificado de prueba en el pipeline antes de los tests.
:::

## Cargar el certificado en runtime

Lee el PEM desde la configuración, no desde una ruta fija. En entornos con filesystem efímero (contenedores,
serverless) la ruta puede no existir entre despliegues:

<CodeTabs>
<template #php>

```php
// Preferido: contenido base64 por variable de entorno
$certificate = base64_decode(getenv('QUIPU_CERTIFICATE_BASE64'));

// o desde un archivo si tu entorno lo garantiza:
$certificate = file_get_contents(getenv('QUIPU_CERTIFICATE_PATH'));
```

</template>
</CodeTabs>

::: tip El certificado caduca y rota
Léelo desde la configuración en runtime; no lo caches indefinidamente en memoria más allá del ciclo de vida del
proceso. Un certificado rotado debe poder reemplazarse sin redeploy del código.
:::

## Validar el PEM antes de usarlo

`XmlSecSigner` valida el PEM al firmar y lanza `SigningException` si falta el certificado o la llave. Para un
fallo temprano, puedes pre-validar:

<CodeTabs>
<template #php>

```php
if (openssl_pkey_get_private($certificate) === false) {
    throw new RuntimeException('El PEM no contiene una llave privada válida.');
}
```

</template>
</CodeTabs>

## Siguiente paso

- [Firma local](/guias/firma-local)
- [Buenas prácticas](/buenas-practicas/como-usar)
