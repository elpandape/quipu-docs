# Ecosistema

quipu no es un solo paquete: es una **familia** de implementaciones de la misma maquinaria de facturación
electrónica de SUNAT, pensada para crecer a varios lenguajes bajo **una sola documentación agnóstica**. Esta
página describe qué existe hoy y hacia dónde apunta.

::: warning Estado honesto
Hoy existen sólo las dos implementaciones en **PHP**: `quipu-php-lite` y `quipu-php-pro`. Las implementaciones en
otros lenguajes que aparecen más abajo **todavía no existen**: son la dirección del proyecto, no algo que puedas
instalar ahora.
:::

## Lo que existe hoy: PHP

La referencia —la primera implementación completa— está en PHP, dividida en dos ediciones:

| Paquete | Edición | Qué es |
|---|---|---|
| `elpandape/quipu` (`quipu-php-lite`) | **Lite** | El emisor completo: construye el XML UBL, lo firma, lo envía a SUNAT y parsea el CDR. PHP puro, sin framework. |
| `elpandape/quipu-pro` (`quipu-php-pro`) | **Pro** | La capa comercial sobre Lite: productividad, calidad y operación avanzada, 100 % local. Ver [la sección Pro](/pro/introduccion). |

Pro **extiende** Lite: no lo reemplaza. Toda la maquinaria vive en Lite; Pro añade builders fluidos, motor
tributario, validación avanzada, diagnóstico, infraestructura resiliente y utilidades. La división edición está
descrita, feature por feature, con los badges <Availability lite pro /> que aparecen en toda la documentación.

## Hacia dónde va: multi-lenguaje

El objetivo es llevar la misma maquinaria a los ecosistemas donde vive quien factura en Perú, con la misma
separación Lite/Pro en cada uno:

| Familia (planificada) | Ecosistema |
|---|---|
| `quipu-java-*` | Java / JVM |
| `quipu-dotnet-*` | .NET / C# |
| `quipu-python-*` | Python |
| `quipu-js-*` | JavaScript / TypeScript / Node |

::: tip Ninguna de estas existe todavía
Son la hoja de ruta del proyecto. La implementación de PHP es la referencia contra la que se construirán las
demás; hasta que una aterrice, la única forma de usar quipu es en PHP.
:::

## Una sola documentación para todas

La decisión de diseño que hace posible el multi-lenguaje es que **la documentación es agnóstica del lenguaje**. Lo
que quipu documenta —cómo emitir cada tipo de comprobante, los plazos de SUNAT, el ciclo de vida del CDR, los
catálogos, cómo pasar a producción— es **el dominio de SUNAT**, no una API de PHP. Ese conocimiento es el mismo
sin importar en qué lenguaje esté escrita la librería.

Por eso los ejemplos de código de este sitio usan el componente **selector de lenguaje**: hoy muestran PHP, y
cuando exista la implementación de otro lenguaje sus ejemplos aparecerán en la misma pestaña, sobre la misma
explicación. Los lenguajes que aún no tienen implementación muestran un aviso de "próximamente" en lugar de una
pestaña rota.

<CodeTabs>
<template #php>

```php
// El mismo concepto —emitir una factura— documentado una vez.
// Hoy el ejemplo es PHP; mañana Java, .NET, Python o JS comparten la explicación.
$result = $quipu->emitInvoice($invoice);
```

</template>
</CodeTabs>

Esto mantiene una sola fuente de verdad para el dominio y evita que la documentación se fragmente por lenguaje: la
regulación de SUNAT se explica una vez, y cada implementación aporta sólo la forma de su código.

## Por qué framework-agnóstico

Un principio transversal a todo el ecosistema: el core **no depende de ningún framework**. En PHP eso significa
cero Laravel y cero Symfony en el núcleo —DI por constructor, DTOs `readonly`, enums para los catálogos—. Las
integraciones con frameworks concretos (como [`quipu-laravel`](/integraciones/laravel)) se enganchan **por
fuera**, a través de las interfaces y value objects tipados de la frontera pública. La misma filosofía guiará las
implementaciones en otros lenguajes: una base neutral, e integraciones idiomáticas encima.

## Siguiente paso

- Conoce la edición Pro en [Introducción a Pro](/pro/introduccion).
- Revisa el [estado y versionado](/proyecto/estado-y-versionado) del proyecto.
