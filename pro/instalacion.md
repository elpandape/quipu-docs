# Instalación de Pro

<Availability pro />

`elpandape/quipu-pro` **no está en Packagist** y nunca lo estará: es la edición **comercial**, así que se sirve
desde un **repositorio Composer privado propio** —**`https://packages.elpanda.pe`**— autenticado con las
credenciales de tu licencia. Por eso un `composer require elpandape/quipu-pro` a secas **no funciona**: sin
declarar ese repositorio, Composer busca en Packagist, no lo encuentra y aborta.

Instalarlo son **tres pasos**: declarar el repositorio, registrar las credenciales e instalar.

::: tip Lite se instala normal
`elpandape/quipu-lite` (MIT) sí está en Packagist y se instala sin ningún trámite —ver
[Instalación](/empezando/instalacion)—. Todo lo de esta página aplica **solo a Pro**.
:::

## Antes de empezar: la licencia

Necesitas una licencia comercial vigente. Al emitirla recibes dos datos, que son exactamente tu usuario y tu
contraseña de Composer:

| Credencial | Qué es |
|---|---|
| **Usuario** | El **correo** del licenciatario. |
| **Contraseña** | Un **token UUID** que se emite **una sola vez**. |

Guarda el token en tu gestor de secretos en cuanto lo recibas: no se vuelve a mostrar. Para adquirir una
licencia, evaluar Pro o recuperar el acceso, escribe a **contacto@elpanda.pe**.

### Comprueba el token antes de instalar

El token es siempre un **UUID de 36 caracteres** con la forma `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Si lo que
recibiste está vacío, dice `undefined`, o no tiene esa forma, **no sigas**: no es un token y ningún paso
posterior va a funcionar. Verifícalo en un segundo contra el repositorio, sin tocar todavía tu proyecto:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -u tu-correo@empresa.com:EL-TOKEN-UUID https://packages.elpanda.pe/packages.json
```

- `200` → la credencial es válida; sigue con el paso 1.
- `401` → correo o token incorrectos. **`403`** → licencia no vigente.

**No hay autoservicio de tokens.** Emitir, reemitir o rotar un token lo hace ElPandaPe: escribe a
**contacto@elpanda.pe** con el correo del licenciatario indicando si el token nunca funcionó, si lo perdiste o
si necesitas revocarlo (por ejemplo, porque se filtró). Se te emite uno nuevo y el anterior deja de servir.

## Paso 1 — declara el repositorio privado

En el `composer.json` de tu proyecto:

```json
{
  "repositories": [
    { "type": "composer", "url": "https://packages.elpanda.pe" }
  ]
}
```

O, sin editar el archivo a mano:

```bash
composer config repositories.elpanda composer https://packages.elpanda.pe
```

**Las dos formas son equivalentes: haz una u otra, no las dos.** El comando escribe el repositorio como objeto
con clave (`"repositories": { "elpanda": { … } }`) y el JSON de arriba lo escribe como lista; Composer entiende
ambas, pero si aplicas las dos acabas con el repositorio declarado dos veces en formatos distintos dentro del
mismo `composer.json`. Si tu proyecto ya tiene un bloque `repositories`, **añade la entrada al que ya existe**
respetando su formato.

Declarar un repositorio extra **no desactiva Packagist**: los dos conviven. Es lo que necesitas, porque Pro
depende de Lite y Lite se sigue resolviendo desde Packagist.

::: warning Tiene que ser `https://`
Composer rechaza los repositorios en `http://` plano (`secure-http`, activo por defecto). El repositorio se
sirve por HTTPS: usa la URL tal cual. Si ves un error de *secure-http*, corrige la URL — **no** desactives la
opción.

Si sales a internet por un proxy o un firewall de salida, lo único que hay que permitir es
**`packages.elpanda.pe:443`** (catálogo y descargas van por ahí); Composer respeta las variables `https_proxy`
y `no_proxy` del entorno. Si montas un *mirror* interno, tendrá que servirse también por HTTPS con un
certificado en el que confíe la máquina: `secure-http` aplica a cualquier repositorio, no solo al nuestro.
:::

## Paso 2 — registra las credenciales

Composer guarda las credenciales por **host**:

```bash
composer config --global --auth http-basic.packages.elpanda.pe tu-correo@empresa.com 00000000-0000-4000-8000-000000000000
```

Con `--global` se escriben en el `auth.json` de tu `COMPOSER_HOME` (típicamente `~/.composer/auth.json` o
`~/.config/composer/auth.json`), **fuera** del repositorio. Sin `--global` se escriben en un `auth.json` dentro
del proyecto — que **no debes commitear** (ver [Las trampas](#las-trampas)).

::: tip El `--auth` es opcional
Puede que veas el mismo comando **sin** `--auth` (`composer config --global http-basic.packages.elpanda.pe …`).
Hace exactamente lo mismo: Composer reconoce las claves `http-basic.*` y las manda a `auth.json` igual. Usa la
forma con `--auth`, que es explícita, pero si copiaste la otra no tienes nada que corregir.
:::

El archivo resultante queda así:

```json
{
  "http-basic": {
    "packages.elpanda.pe": {
      "username": "tu-correo@empresa.com",
      "password": "00000000-0000-4000-8000-000000000000"
    }
  }
}
```

## Paso 3 — instala

```bash
composer require elpandape/quipu-pro:^1.0
```

Composer resolverá `elpandape/quipu-pro` desde `packages.elpanda.pe` y `elpandape/quipu-lite` desde Packagist.
Comprueba que la fachada resuelve:

<CodeTabs>
<template #php>

```php
<?php

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use ElPandaPe\QuipuPro\QuipuPro;

echo class_exists(QuipuPro::class) ? 'quipu Pro disponible' : 'faltó algo';
```

</template>
</CodeTabs>

Con eso ya puedes montar la fachada: ver [Introducción a Pro](/pro/introduccion).

## En CI: `COMPOSER_AUTH`, nunca un `auth.json` en el repo

En integración continua **no se copia un `auth.json`**: se exporta la variable de entorno `COMPOSER_AUTH` con
**el mismo JSON** que tendría ese archivo, alimentada desde los secretos del proveedor.

```yaml
# .github/workflows/ci.yml
- name: Install dependencies
  env:
    COMPOSER_AUTH: '{"http-basic":{"packages.elpanda.pe":{"username":"${{ secrets.QUIPU_LICENSE_EMAIL }}","password":"${{ secrets.QUIPU_LICENSE_TOKEN }}"}}}'
  run: composer install --no-interaction --prefer-dist
```

El mismo patrón sirve en GitLab CI, Bitbucket, Jenkins o en el `docker build` (pásala como *build secret*, no
como `ARG` — un `ARG` queda escrito en la historia de la imagen).

## Las trampas

Son las formas en que esto falla en la práctica. Ninguna es sutil una vez que las conoces:

1. **El `auth.json` del proyecto acaba commiteado.** Ese archivo contiene el token de tu licencia en claro:
   commitearlo es filtrar la credencial a todo el que lea el repo. Deja las credenciales en el `auth.json`
   **global** (paso 2) o en `COMPOSER_AUTH`, y blinda el proyecto añadiendo esta línea a tu `.gitignore`:

   ```txt
   /auth.json
   ```

   Si ya lo commiteaste, no basta con borrarlo en un commit nuevo: sigue en la historia. Escribe a
   **contacto@elpanda.pe** para que se revoque el token y se emita otro.

2. **La clave del `auth.json` no coincide con el host.** Composer busca la entrada de `http-basic` por el
   **host exacto** del repositorio. Tiene que ser `packages.elpanda.pe`, tal cual: sin `https://`, sin barra
   final, sin puerto y sin subdominios inventados. Si la clave no calza, Composer no manda credenciales y el
   servidor responde `401` — con el token correcto delante.

3. **La caché de Composer te hace creer que sigues autorizado.** Composer guarda los *dist* ya descargados en su
   caché local y los reutiliza sin volver a pedirlos al repositorio. Un `composer install` puede, por eso,
   completarse **sin credenciales válidas** en una máquina donde el zip ya se descargó antes: eso no prueba que
   tu licencia esté viva. Para comprobar de verdad el acceso —al rotar el token, al renovar la licencia o al
   diagnosticar un fallo—, vacía la caché primero:

   ```bash
   composer clear-cache
   ```

   El `curl` del [paso previo](#comprueba-el-token-antes-de-instalar) es la comprobación fiable: no pasa por la
   caché.

::: danger `composer.elpanda.pe` ya no existe
Si arrastras configuración vieja que apunta a `composer.elpanda.pe`, cámbiala: ese host **fue retirado**. El
repositorio de paquetes vive únicamente en **`packages.elpanda.pe`**, y hay que actualizar **las dos** cosas —la
URL del repositorio y la clave de `http-basic`—.

El README que viaja **dentro** del zip de la versión **1.0.0** todavía trae ese host retirado (está corregido
desde **1.0.1**). Si instalaste 1.0.0, ignora las instrucciones de `vendor/elpandape/quipu-pro/README.md`: esta
página es la fuente correcta.
:::

## Qué significa cada error

Composer manda la autenticación **de forma preventiva** (no espera a que el servidor le pida un desafío) y
decide en función del **status code** que recibe. Consecuencia práctica: un `401` es siempre un problema de
credenciales, nunca un "el servidor no me pidió login".

| Código | Situación | Qué hacer |
|---|---|---|
| `401` | No hay credenciales, o el correo/token no son válidos (mal escritos, revocados). | Revisa el paso 2: host exacto, correo del licenciatario, token completo. |
| `403` | Credenciales válidas pero **licencia vencida**. | Renueva la licencia — escribe a **contacto@elpanda.pe**. |
| `404` | El paquete o la versión no existen en el catálogo. | Comprueba el nombre (`elpandape/quipu-pro`) y la restricción de versión. |

### El `401` no se ve como un `401`

Composer no imprime el código: lo envuelve en una excepción cuyo texto despista. Esto es **literalmente** lo que
verás si falta el paso 2 o si el token no es válido:

```
Installation failed, reverting ./composer.json to its original content.

In AuthHelper.php line 225:

  The 'https://packages.elpanda.pe/packages.json' URL required authentication (HTTP 401).
  You must be using the interactive console to authenticate
```

(seguido del volcado completo de la sinopsis de `composer require`, que no aporta nada).

**«You must be using the interactive console to authenticate» no es la solución.** Composer solo está diciendo
que, al no tener credenciales utilizables, te las pediría por teclado si la terminal fuera interactiva.
Autenticarte a mano en el prompt no arregla nada permanente: lo que falta es la credencial en `auth.json`
(paso 2) o el token es incorrecto. Vuelve al paso 2 y verifica con el `curl` de más arriba.

Si en cambio omitiste el **paso 1**, el error es otro y sí es explícito:

```
Could not find a matching version of package elpandape/quipu-pro …
  - It's a private package and you forgot to add a custom repository to find it
```

Para aislar si el problema es de Composer o de la credencial, pide el catálogo a mano:

```bash
curl -u tu-correo@empresa.com:EL-TOKEN https://packages.elpanda.pe/packages.json
```

Un `200` con JSON confirma que la licencia está viva y que el problema está en tu configuración de Composer.

## Cómo se sirve el paquete

El repositorio es un [repositorio Composer](https://getcomposer.org/doc/05-repositories.md#composer) estándar,
servido por la aplicación de elpanda.pe. Dos rutas, **ambas autenticadas**:

| Ruta | Qué devuelve |
|---|---|
| `/packages.json` | El catálogo: qué paquetes y qué versiones puede ver tu licencia. |
| `/dist/{vendor}/{name}/{version}.zip` | El *dist* del paquete (p. ej. `/dist/elpandape/quipu-pro/1.0.0.zip`). |

No hace falta que sepas esto para instalar; sirve para depurar con `curl` y para entender que **cada descarga
pasa por la validación de tu licencia**.

## Actualizar

Pro sigue **SemVer** desde su `1.0.0`, así que `^1.0` te trae correcciones y funcionalidad compatible:

```bash
composer update elpandape/quipu-pro
```

Ver [Estado y versionado](/proyecto/estado-y-versionado) para las garantías de compatibilidad de cada edición.

## Siguiente paso

- Monta la fachada `QuipuPro` en [Introducción a Pro](/pro/introduccion).
- Si trabajas en Laravel, la integración **auto-detecta** Pro: ver [Edición Pro en Laravel](/integraciones/laravel/pro).
