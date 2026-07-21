# Contribuir a quipu

quipu es una librería **PHP 8.4+ pura y framework-agnóstica** que implementa la maquinaria de facturación
electrónica de SUNAT. Toda la ayuda cuenta: un código de catálogo que te falta, un rechazo que no logras
explicar, un ejemplo más claro o una corrección en esta documentación.

Esta página explica **cómo** contribuir de forma que tu aporte encaje a la primera. El código vive en
repositorios separados, uno por paquete:

| Repositorio | Qué contiene |
|---|---|
| [`elpandape/quipu-php-lite`](https://github.com/elpandape/quipu-php-lite) | El emisor (MIT). Es donde van los PRs de la librería. |
| [`elpandape/quipu-laravel`](https://github.com/elpandape/quipu-laravel) | La integración con Laravel (MIT). |
| [`elpandape/quipu-docs`](https://github.com/elpandape/quipu-docs) | Este sitio. |

La edición **Pro** es comercial y su código no es público; los reportes sobre Pro van por
**contacto@elpanda.pe**.

> [!TIP] Si solo quieres editar esta documentación
> Cada página tiene un enlace *«Editar esta página en GitHub»* arriba a la derecha. Abre un PR desde ahí; lo
> demás de esta página no hace falta para cambios de contenido del sitio.

## Antes de empezar

quipu **no corre con PHP local**: el entorno entero vive en Docker y se maneja con `make`. No invoques
`php`, `composer` o `vendor/bin/*` directamente (no hay binario local; fallan). La regla de oro es
**Docker vía `make`, siempre**.

Necesitas Docker y `docker compose`. Para levantar el entorno por primera vez:

```bash
git clone https://github.com/elpandape/quipu-php-lite.git
cd quipu-php-lite
make install   # composer install dentro del contenedor
```

**Este sitio es otro repositorio y no usa PHP**: es VitePress sobre Node 22+, con `npm` directo.

```bash
git clone https://github.com/elpandape/quipu-docs.git
cd quipu-docs
npm install
npm run dev     # servidor en http://localhost:5173
npm run build   # build de producción a .vitepress/dist
```

::: warning El alcance de cada herramienta
`make review` / `make test` / `make fix` son para el **código PHP de la librería** (`src/`), y solo existen
en los repositorios de los paquetes. El **sitio** se levanta con `npm run dev`. Mezclarlos es el error más
común al arrancar.
:::

## Flujo de desarrollo

1. **Rama**: trabaja sobre `main` o abre una rama `feature/*` para tu PR (`git switch -c feature/algo`).
2. **Cambios** en `src/` (librería) o en las páginas `.md` (sitio).
3. **Calidad** antes de pedir review: deja `make review` **verde al 100%**.

```bash
make test      # solo Pest (rápido, para iterar)
make review    # quality gate completo: php-cs-fixer + rector + phpstan max + Pest (cobertura 100%)
make fix       # auto-formatea (rector + php-cs-fixer); vuelve a correr make review después
```

`make review` corresponde a `composer review` y es el gate que CI exige en la matriz **PHP 8.4 / 8.5**. Si
tocaste `src/`, debe quedar verde; si solo tocaste el sitio, alcanza con `npm run build` verde.

Si tu cambio involucra firma (ej. un nuevo caso de test que firma un XML), (re)genera el certificado de
prueba autofirmado con `make cert` antes de correr los tests.

Las convenciones de código (PHP 8.4, `declare(strict_types=1)`, DTOs `readonly`, enums para catálogos,
identificadores en inglés, cero acople a framework) se resumen en el
[`CONTRIBUTING.md`](https://github.com/elpandape/quipu-php-lite/blob/main/CONTRIBUTING.md) del repositorio.
Léelo antes de tocar `src/`.

## Reportar un rechazo de SUNAT

Si SUNAT te rechaza un comprobante y crees que es quipu (no tus datos), abre un issue con **evidencia**.
Cuanto más aislado esté el caso, más rápido se reproduce y se arregla. Antes, identifica **dónde** falló —
el tipo de falla cambia qué evidencia adjuntar (ver [manejo de errores](/buenas-practicas/manejo-errores)
para el detalle de cada caso):

- **CDR rechazado** (`$cdr->status === CdrStatus::Rejected`): SUNAT procesó el envío y lo rechazó por
  contenido. Es la fuente de rechazos más común.
- **SOAP Fault síncrono** (`SunatFaultException`, con `$e->faultCode`): SUNAT respondió con un fault en vez
  de procesar (sistema, credenciales o estructura).
- **`InvalidDocumentException`**: el propio quipu rechazó el documento **antes de enviarlo** (regla de
  negocio o validación contra el XSD local). Esto **no** es un rechazo de SUNAT y no requiere CDR.

### Cómo detectar el responseCode

quipu ya resuelve el código del CDR a su descripción vía el catálogo de errores interno:

```php
use ElPandaPe\Quipu\Result\CdrStatus;

// $cdr es el CdrResult: $bill = $quipu->sendBill(...); $cdr = $bill->cdr;
if ($cdr->status === CdrStatus::Rejected) {
    // Estos tres campos son la evidencia clave del issue:
    $cdr->responseCode;    // ej. '3244' — el código numérico del rechazo
    $cdr->description;     // texto tal cual vino en el CDR
    $cdr->resolvedMessage; // descripción del catálogo de errores de quipu, si la conoce
    $cdr->xml;             // el CDR crudo (XML) que devolvió SUNAT, si se retuvo
}
```

Para un fault síncrono, el código vive en la excepción:

```php
use ElPandaPe\Quipu\Exception\SunatFaultException;

// dentro del catch (SunatFaultException $e)
$e->faultCode; // ej. '103' o '2335'
```

### Qué adjuntar al issue

::: danger Anonimiza siempre
El XML y el CDR contienen **tu** RUC, razón social y los datos de **tu** cliente (DNI/RUC, nombres). Antes
de pegarlos en un issue público, reemplaza RUC reales, nombres de persona y cualquier dato sensible por
valores obvios de prueba. **Mantén intactos** los códigos de catálogo, la estructura del XML, los montos
*si son relevantes al rechazo* y, sobre todo, el `responseCode`.
:::

Un buen issue de rechazo incluye:

1. **El `responseCode`** exacto (ej. `3244`) y el texto del CDR (`description`).
2. **El XML que enviaste**, anonimizado. Es lo único que reproduce el rechazo sin necesidad de tu RUC.
3. **El CDR**, anonimizado (`$cdr->xml`, o el `.zip`/`R-*.xml` que devolvió SUNAT si lo capturaste).
4. **Qué esperabas** y contra qué lo comparaste (¿greenter lo acepta con los mismos datos? ¿otra librería?).
5. **Versión de quipu** y el documento de que se trata (factura, boleta, nota…).

No hace falta que adjuntes credenciales ni el certificado: el rechazo se reproduce con el XML + el
`responseCode`.

## Pedir el alta de un código de catálogo

Los catálogos de SUNAT están modelados en quipu de **dos formas distintas**, y saber cuál es cuál te dice si
te falta un `case` de enum o si es otra cosa.

### Tier 1 — Enums curados (`src/Catalog/`)

Los catálogos pequeños que se usan para **construir** documentos son enums respaldados por string
(`enum ... : string`) bajo `ElPandaPe\Quipu\Catalog\`: el *value* es el código oficial de SUNAT y el *case
name* está en inglés. Hay **23 enums** en ese directorio (`DocumentType`, `Currency`, `IgvAffectationType`,
`OperationType`, `UnitOfMeasure`, `LegendCode`, etc.; ver [catálogos](/referencia/catalogos)).

Estos enums se curaron **al 80/20 a propósito**: el 20 % de los valores que cubre el 80 % de los casos. No
es un defecto a cerrar de golpe —añadir un valor es aditivo y de bajo riesgo—, así que a casi todo usuario le
falta un código tarde o temprano. El síntoma es que tu código no aparece como `case`:

```php
use ElPandaPe\Quipu\Catalog\Currency;

Currency::tryFrom('PEN'); // Currency::Sol — presente
Currency::tryFrom('INR'); // null — la rupia india no está en el subset curado
```

Para pedir el alta, abre un issue con:

- El **número de catálogo** (ej. Cat.02 — moneda) y el **código exacto** (`INR`).
- La **descripción oficial** de SUNAT para ese código.
- Un **enlace al catálogo oficial** (el anexo/resolución de SUNAT que lo define).

Con eso, añadirlo es un PR de una línea: un `case IndianRupee = 'INR';` en el enum correspondiente, más su
`label()` de impresión si el enum lo define. Los enums que ya se ampliaron así (p. ej. `Currency` y
`OperationType` —Cat.51— con sus casos curados) son el patrón a seguir.

### Tier 2 — Tablas de referencia (`src/Reference/`)

Los catálogos **grandes** (cientos o miles de entradas) no son enums: vivirían en `src/Reference/CatalogRepository.php`
como tablas `code => descripción` cargadas desde `resources/catalog/`. Hoy están registrados **Cat.04**
(país), **Cat.03** (unidades de medida) y **Cat.13** (ubigeo). El repository expone `knows()`, `has()` y
`get()` para **validar** códigos que ya llegan elegidos (propios o de terceros), no para construir.

::: warning Cat.25 (UNSPSC) no es un enum que falte
El catálogo 25 (código de producto SUNAT, UNSPSC) **no está** registrado en `CatalogRepository`, y es una
decisión de diseño, no un olvido: el UNSPSC completo son ~150 000 códigos sin una fuente verificable para el
subconjunto exacto que SUNAT valida, así que cargarlo sería adivinar. Por eso `knows('unspsc')` devuelve
`false` y `CatalogValidator` **omite** esa validación en vez de rechazar todo. No lo pidas como si fuera un
`case` faltante: es una decisión registrada y rastreada (ver
[vigilancia de SUNAT](/produccion/vigilancia-sunat)).
:::

## Tests

La suite exige **100 % de cobertura de líneas y de tipos**, **sin tocar la red**: la firma es local (se
prueba de verdad), el borde SOAP va *mockeado* (el `SoapSender` real es el único `@codeCoverageIgnore`), y la
integración contra SUNAT beta es manual/fuera de la suite de cobertura.

Hay una regla dura sobre cómo se estructuran los tests:

::: danger Nada de funciones dentro de `*Test.php`
Un archivo `*Test.php` contiene **solo** `it()` / `describe()` / hooks. Ni fixtures, ni helpers, ni
envoltorios. No declares funciones dentro de un test, ni siquiera como atajo.
:::

- **Fixtures de modelo** (`Invoice`, `Company`, `SaleDetail`…) → van en **`tests/Factory/*Factory.php`**:
  clases `final` namespaced con métodos estáticos y parámetros por defecto. Ya existen `InvoiceFactory`,
  `CompanyFactory`, `ClientFactory`, etc.
- **Infraestructura de test** (validadores XSD, lectores XPath, fakes, armado del SUT) → van en
  **`tests/Support/*.php`**: clases `final` namespaced (`ElPandaPe\Quipu\Tests\Support\`) autocargadas por
  PSR-4, como `FakeClock` o `FakeHttpClient`. Lo verdaderamente transversal (ej. `testCertificate()`) vive
  como función en `tests/Pest.php`.

¿Necesitas una variante de un fixture? **Parametriza o añade un método a la factory** y llámala desde el
test; no la dupliques ni la declares inline. El certificado de prueba autofirmado lo genera `make cert`; los
fixtures de CDR viven en `tests/Fixtures/` del propio repositorio.

## Commits

Conventional Commits **en español**, sin firma de IA en el footer:

```
feat(xml): construir la factura UBL
fix(signer): corregir el digest de la firma
refactor(test): mover los fixtures de nota a factories
docs(quipu-docs): aclarar el alta de códigos de catálogo
```

Scopes típicos: `model`, `catalog`, `xml`, `signer`, `ws`, `cdr`, `build`, `test`, `docs`, `ci`, y los de
este sitio (`quipu-docs`, `examples`). El `type` va en inglés (`feat`, `fix`, `refactor`, `docs`, `test`,
`ci`) y **el mensaje en español**. Si tu PR tiene varios commits, cuídalos: el historial se revisa.

La rama principal es `main`; el trabajo en ramas `feature/*`.

## Mejorar esta documentación

El sitio es VitePress con contenido en español, en el repositorio
[`elpandape/quipu-docs`](https://github.com/elpandape/quipu-docs). Para iterar rápido:

```bash
npm install     # solo la primera vez
npm run dev     # http://localhost:5173, recarga en vivo
```

Reglas del sitio que conviene tener presentes:

- **Contenido en español** con tildes correctas; **identificadores de código en inglés**.
- Enlaces internos como **rutas absolutas sin extensión**: `[manejo de errores](/buenas-practicas/manejo-errores)`.
- Containers `::: tip` / `::: warning` / `::: danger`, `#` como título y `##`/`###` para secciones.
- El sitio documenta **cómo se usa** quipu, no el *por qué* interno del diseño.
- Verifica cada afirmación contra `src/` antes de escribirla; un snippet PHP debe compilar, con todos sus
  `use ...;` y los nombres reales de clases y métodos.

Añadir una página son **dos pasos**: crear el `.md` en la carpeta que le toque y registrarla en el `sidebar`
de `.vitepress/config.ts` (con el `link` sin extensión, porque el sitio usa `cleanUrls`). Saltarse el segundo
deja la página publicada pero inalcanzable desde la navegación.
