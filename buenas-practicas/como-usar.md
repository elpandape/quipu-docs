# Cómo usar quipu

Esta página recopila las **buenas prácticas** para usar quipu de forma correcta y robusta en producción.

## 1. Emitir local, reportar diferido

> [!IMPORTANT]
> **Firma y entrega el comprobante al cliente al instante; reporta a SUNAT después, en un job diferido.**

<CodeTabs>
<template #php>

```php
// Camino crítico de la venta (síncrono, instantáneo):
$signed = $quipu->sign($invoice);
file_put_contents('storage/' . $invoice->fileName() . '.xml', $signed->xml);

$qr = $quipu->qrString($invoice, $signed);
$view = $quipu->printable($invoice, $signed);
// El cliente se va con su comprobante. Sin esperar a SUNAT.

// Job diferido (dentro del plazo):
$billResult = $quipu->sendBill($signed);
$cdr = $billResult->cdr;
```

</template>
</CodeTabs>

**Por qué**: los webservices de SUNAT se caen con frecuencia. Si el camino crítico depende de SUNAT, una caída
bloquea la venta. El reporte diferido, con días de colchón, absorbe esas caídas sin afectar la experiencia.

## 2. Persiste el XML firmado y el CDR

quipu **no persiste nada**. Es tu trabajo guardar:

- el **XML firmado** (`$signed->xml`),
- el **CDR** (`$cdr->xml`) cuando llegue,
- el **estado** del comprobante en una máquina de estados.

La regulación **obliga a conservar** XML y CDR durante el plazo legal (típicamente 5 años; verifica la norma
vigente). Usa almacenamiento **duradero**, no efímero.

## 3. Asigna correlativos de forma atómica

La numeración debe ser **sin huecos ni duplicados**, incluso bajo concurrencia. Reserva el número con un
mecanismo protegido (p. ej. bloqueo transaccional) **antes** de construir el `Model\*`. quipu no lleva estado
de secuencias.

## 4. Valida antes de enviar

<CodeTabs>
<template #php>

```php
$errors = $quipu->validate($invoice);
if ($errors !== []) {
    // corrige antes de firmar
}
```

</template>
</CodeTabs>

Un error local es accionable y barato; un rechazo de SUNAT cuesta un viaje y requiere emitir un comprobante
nuevo. Usa `validate()` o `assertValid()` en el borde de tu aplicación.

## 5. Inyecta las dependencias, no las newes ad hoc

Construye la instancia de `Quipu` una vez (o por tenant) con sus dependencias inyectadas, y reutilízala. La
fachada orquesta varios colaboradores (builder, signer, sender, validadores…), e inyectarlos por el facade te
da un **punto único de configuración** y un **seam para dobles** en tests. No instancies `new SoapClient` por
fuera del `Sender` ni newees el facade en cada llamada: romperías esa composición y difuminarías dónde se
configura cada cosa. (El `Signer` y el `Sender` no son especialmente caros de construir; el motivo es
composición y testabilidad, no rendimiento.)

## 6. Lee el certificado desde configuración

No asumas que el certificado existe como archivo en disco. En entornos con filesystem efímero (contenedores,
serverless) la ruta no existe entre despliegues. Cárgalo como **contenido base64 por variable de entorno** y
léelo en runtime.

## 7. El día tributario es de Lima

Agrupa boletas para el Resumen Diario por **día calendario de Lima** (`America/Lima`), no por el día UTC del
servidor. Persiste en UTC y convierte a `America/Lima` solo en los cortes y en los documentos.

## 8. Maneja el CDR rechazado como un problema de datos

Un CDR rechazado **no** es un error transitorio: es un problema de **datos**. Reintentar el mismo envío sin
corregir volverá a fallar. El comprobante rechazado **no vale**: emite uno nuevo corregido y guarda la
trazabilidad con el rechazado.

## 9. Reintentos solo en el reporte diferido

Los reintentos van en el **job diferido**, dentro del plazo, con backoff razonable. No reintentes en el camino
crítico de la venta. Y deja **días de colchón** antes de agotar el plazo.

## 10. Eventos de dominio para lo relevante

quipu no acopla a tu stack de logging. Emite **eventos** (en tu capa) para: comprobante emitido, informado,
CDR aceptado, **CDR rechazado**, resumen rechazado, aceptado con observación. Un rechazo repetido debe escalar
a una persona —eso solo es posible si hay un evento que dispararlo.

## Siguiente paso

- [Cómo NO usar quipu](/buenas-practicas/como-no-usar) — los anti-patrones.
- [Manejo de errores](/buenas-practicas/manejo-errores)
