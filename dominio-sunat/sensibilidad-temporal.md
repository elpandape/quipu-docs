# Sensibilidad temporal

<Availability lite pro />

La regulación de CPE es de **alta sensibilidad temporal**: cambia con frecuencia y, a veces, las propias
fuentes de SUNAT se contradicen. Esta página lista lo que debes **re-verificar** antes de implementar y antes
del go-live.

::: warning Documento regulatorio
Los **plazos, umbrales, obligatoriedad y conservación** de esta página son contexto de dominio, no API de
quipu: la librería no los hardcodea y los deja al consumidor para que los configure y los mantenga al día.
Ojo con los **catálogos**: sí son enums **cerrados** en `src/Catalog/` (curados al 80/20 a propósito), así que
un código nuevo y válido de SUNAT exige una **release** de quipu, no configuración de tu lado. Ver
[catálogos](/referencia/catalogos).
:::

## Plazos de envío

Los plazos han cambiado en el pasado (las facturas pasaron de 1 día a 3 días; la anunciada eliminación del
Resumen Diario fue desactivada) y, a julio 2026, **las fuentes oficiales se contradicen** (7 días vs. 3 días).
Ver [plazos de SUNAT](/dominio-sunat/plazos-sunat).

- **Acción**: re-verificar contra la norma vigente (R.S. correspondiente), no solo contra las páginas
  informativas. Mantener los plazos **configurables** y usar la lectura más estricta entre tanto.

## Obligatoriedad del emisor

Con la R.S. 155-2017/SUNAT modificada por R.S. 000075-2026/SUNAT (vigente desde 01-06-2026), la designación
como emisor electrónico es **desde el día de la inscripción** en el RUC —antes existía un período de gracia
que **ya no aplica**. Una empresa nueva **nace obligada** a emitir CPE.

## Umbral de identificación en boletas

El DNI del cliente es obligatorio en boletas **solo cuando el importe supera S/ 700.00** (o cuando el cliente
lo solicita). Recomendación: captúralo **siempre**, desde el primer contacto.

## Catálogos SUNAT

Los catálogos (tipo de documento, moneda, unidad, afectación IGV, motivos de nota, tipo de operación, leyendas,
motivos de cargo/descargo…) se **actualizan**. quipu curó los valores más comunes (el 80/20); confirma la
versión vigente al implementar. Ver [catálogos](/referencia/catalogos).

## Certificado digital

- Proveedores vigentes, costo y vigencia del certificado tributario.
- Si sigue existiendo el programa de certificado gratuito de SUNAT para nuevos emisores.

**Acción**: confirmar con SUNAT y/o las entidades de certificación autorizadas antes del alta como emisor.

## Representación impresa

Los requisitos formales del PDF (campos mínimos, código QR, valor resumen/hash) deben **validarse contra la
norma vigente** antes del go-live. quipu te entrega los datos (vista de impresión + QR) **para factura, boleta
y notas**; los requisitos del render son tuyos. Para el resto de familias (GRE, retención, percepción, resumen,
baja, reversión) ni siquiera los datos: `qrString()`/`printable()` lanzan. Ver
[límites y alcance](/empezando/limites).

## Plazo de conservación

El plazo exacto de conservación de XML/CDR/Resúmenes/comunicaciones de baja se cita típicamente como **5
años**, pero **no está verificado**. Confirma contra la norma antes de definir tu política de retención.

## Entorno beta

Las credenciales y el endpoint del entorno beta pueden **rotar**. Verifícalos al inicio del desarrollo. quipu
los expone en `SoapEndpoints::beta()` y `GreEndpoints::beta()`, pero confirma que siguen vigentes.

Más importante que la rotación: el beta de SUNAT **solo valida estructuras XML** —no la consistencia de los
datos ni las reglas de negocio—, así que **un verde en beta no garantiza producción**. Y `GreEndpoints::beta()`
ni siquiera es SUNAT (es un mock de la comunidad). Ver
[De beta a producción](/produccion/de-beta-a-produccion).

## Cómo enterarte de los cambios

Esta página te dice **qué** re-verificar. El **cómo** —qué fuentes vigilar, con qué cadencia y por qué un diff
de esquemas no basta— está en [Vigilancia de cambios de SUNAT](/produccion/vigilancia-sunat).

## Regla general

> [!IMPORTANT]
> Toda la sección regulatoria (obligatoriedad, plazos, umbrales, vías) es de **alta sensibilidad temporal**.
> **Re-verifícala al momento de implementar y de nuevo antes del go-live.** No la trates como verdad congelada.

## Siguiente paso

- [Plazos de SUNAT](/dominio-sunat/plazos-sunat)
- [Límites y alcance](/empezando/limites)
