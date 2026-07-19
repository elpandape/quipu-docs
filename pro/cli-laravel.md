# CLI y Laravel

<Availability pro />

Dos sub-proyectos acompañan a Pro. **`quipu-laravel` ya está disponible** y tiene su propia sección —ver
[Integración con Laravel](/integraciones/laravel)—; la **CLI `QuipuConsole` sigue planificada**. Esta página
resume el estado de ambos.

::: warning La CLI aún no está disponible
La consola (`Console\QuipuConsole`) todavía no está implementada. El resto de quipu Pro sí lo está y es usable
hoy (ver el resto de esta sección). Esta página se actualizará cuando la CLI aterrice.
:::

## CLI: `QuipuConsole` (planificado)

Una **consola** para operar quipu desde la terminal, sin escribir un script PHP para cada tarea. La idea es cubrir
las operaciones que hoy haces con código suelto:

- inspeccionar y convertir certificados (PFX→PEM, pre-vuelo) desde la línea de comandos;
- validar un documento o un XML contra las reglas de SUNAT antes de enviarlo;
- emitir un comprobante desde un archivo de entrada y guardar el CDR;
- diagnosticar un código de error o un CDR rechazado;
- inspeccionar un XML por XPath o compararlo con otro.

Es una envoltura de las utilidades que ya viste en esta sección ([certificados](/pro/certificados),
[validación](/pro/validacion-diagnostico), [herramientas XML](/pro/xml-tooling)), expuestas como comandos.

## `quipu-laravel` (ya disponible)

Un paquete de integración para **Laravel**: service providers, *config* publicable, *facades* y *bindings* del
contenedor para que un proyecto Laravel use quipu sin cablear las dependencias a mano. Añade además persistencia,
series/correlativos, máquina de estados, colas, eventos, comandos Artisan y auto-detección de la edición Pro.

Su documentación completa —instalación, configuración, uso y testing— vive en
[Integración con Laravel](/integraciones/laravel).

Es importante entender por qué esto es un paquete **aparte** y no parte del core: quipu es, por diseño,
**framework-agnóstico**. Ni Lite ni Pro dependen de Laravel, Symfony ni ningún framework —DI por constructor, DTOs
`readonly`, enums para los catálogos—. Esa neutralidad es una decisión deliberada: permite que quipu corra en
cualquier proyecto PHP 8.4+ y que la misma maquinaria sirva de base a integraciones para distintos frameworks. La
integración con Laravel se engancha **por fuera**, a través de las interfaces y value objects tipados de la
frontera pública, sin filtrar detalles de implementación al core.

## Mientras tanto (para la CLI)

Todo lo que haría la CLI ya es posible hoy en PHP puro:

- **Componer las dependencias**: `QuipuPro::for(...)` — ver [Introducción a Pro](/pro/introduccion).
- **Emitir**: los [builders fluidos](/pro/fluent-builder) más `->core()->emitInvoice(...)`.
- **Operar con resiliencia**: los decoradores de [infraestructura](/pro/infra).
- **Validar y diagnosticar**: los [validadores y el diagnóstico](/pro/validacion-diagnostico).

Si trabajas en Laravel no necesitas cablear nada de esto a mano: `quipu-laravel` ya registra `QuipuPro` (y el
`Quipu` que devuelve `->core()`) en el contenedor por ti. Ver [Integración con Laravel](/integraciones/laravel).

## Siguiente paso

- Repasa cómo encaja todo el ecosistema multi-lenguaje en [Ecosistema](/proyecto/ecosistema).
- Vuelve a [Introducción a Pro](/pro/introduccion) para montar la fachada hoy.
