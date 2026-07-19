# Instalación

Esta página cubre la instalación de la **implementación de referencia en PHP**, la única disponible hoy. Cada
lenguaje del [ecosistema](/proyecto/ecosistema) traerá su propio gestor de paquetes cuando exista (por ejemplo
Maven/Gradle en Java, NuGet en .NET, pip en Python o npm en JavaScript); los comandos de abajo son los de PHP.

## Requisitos

quipu requiere **PHP 8.4 o superior** y las siguientes extensiones de PHP:

| Extensión | Para qué |
|---|---|
| `ext-soap` | Transporte SOAP a los webservices de SUNAT |
| `ext-dom` | Construcción y lectura del XML UBL |
| `ext-openssl` | Firma xmldsig y manejo del certificado |
| `ext-zip` | Compresión del XML en ZIP para el envío |
| `ext-curl` | **Condicional.** Solo si usas el `CurlHttpClient` que viene incluido (el transporte HTTP de la **GRE REST** y la **Consulta de CPE**). No está declarada en `composer.json`: `GreClient` y `CpeValidityClient` reciben un `Contract\HttpClient` por constructor, así que puedes inyectar tu propia implementación (Guzzle, Symfony HttpClient, lo que uses) y prescindir de curl. |

Verifica tu entorno antes de instalar:

```bash
php -v
php -m | grep -E 'soap|dom|openssl|zip|curl'
```

## Vía Composer

::: warning quipu todavía no está publicado en Packagist
El comando de abajo **aún no funciona**: el paquete no está publicado, así que `composer require` fallará con
un error de paquete no encontrado. Publicarlo en Packagist está hoy **fuera del alcance** del core.

Es el camino previsto para cuando se publique. Mientras tanto, la forma de usar quipu es **clonar el
repositorio** y apuntar Composer a esa copia local.
:::

```bash
composer require elpandape/quipu
```

Cuando el comando funcione, instalará también la única dependencia de runtime: `robrichards/xmlseclibs`, la
librería estándar para la firma XML (xmldsig) y la canonicalización C14N.

## Verificación

Tras instalar, confirma que las clases principales resuelven:

<CodeTabs>
<template #php>

```php
<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use ElPandaPe\Quipu\Quipu;

echo class_exists(Quipu::class) ? 'quipu disponible' : 'faltó algo';
```

</template>
</CodeTabs>

## Sin framework

quipu **no acopla** a ningún framework. Funciona en cualquier proyecto PHP 8.4+ que use Composer: una app
Slim, un script CLI, un worker de cola, una API con Symfony components standalone, etc. La integración con
Laravel vivirá en un paquete aparte y se engancha por las **interfaces** de quipu, no por sus clases concretas.

## Extensiones que pueden faltar en contenedores

Las imágenes Docker oficiales de PHP (`php:8.4-cli`) incluyen `dom` y `openssl` pero **no** `soap` ni `zip`.

La vía recomendada es `mlocati/php-extension-installer`, que resuelve las librerías del sistema por ti. Es la
que usa el propio repo de quipu en su `docker/Dockerfile`:

```dockerfile
FROM php:8.4-cli
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/bin/
RUN install-php-extensions soap zip
```

Si prefieres `docker-php-ext-install`, tienes que instalar las cabeceras a mano. Ojo con **`libxml2-dev`**:
la imagen base purga las cabeceras de libxml2 tras compilar PHP, y sin ellas la compilación de `soap` falla.

```dockerfile
FROM php:8.4-cli
RUN apt-get update && apt-get install -y libxml2-dev libzip-dev \
    && docker-php-ext-install soap zip
```

En cualquiera de las dos vías, comprueba el resultado con el `php -m | grep` de arriba — incluido `curl`, si
piensas usar el `CurlHttpClient`.

## Siguiente paso

Con quipu instalado, repasa los [conceptos de dominio](/empezando/conceptos) antes del [inicio rápido](/empezando/inicio-rapido).
