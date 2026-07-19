# Plazos de SUNAT

<Availability lite pro />

Los plazos de envío de comprobantes a SUNAT son de **alta sensibilidad temporal**: han cambiado en el pasado y,
a julio 2026, **las propias fuentes oficiales de SUNAT se contradicen entre sí**. Esta página documenta la
situación y la regla de ingeniería para resolver la contradicción.

::: warning Documento regulatorio, no de API
Esta página describe el **dominio regulatorio**, no la API de quipu. quipu **no** hardcodea plazos: los deja al
consumidor. Lo de aquí es contexto para que tu capa de integración los configure correctamente.
:::

## La contradicción (jul-2026)

Al re-verificar los plazos contra fuentes primarias de SUNAT, **distintas páginas oficiales informan plazos
distintos**:

### Lectura A — portal CPE / buscador SUNAT

| Qué | Canal | Plazo |
|---|---|---|
| Facturas + sus notas | Individual (obligatorio) | **7 días** calendario desde el día siguiente a la emisión |
| Boletas | Individual (opcional) | **5 días** calendario desde la emisión |
| Boletas + sus notas | Resumen Diario | **7 días** calendario |

### Lectura B — página del SEE del contribuyente (vía gob.pe)

| Qué | Canal | Plazo |
|---|---|---|
| Facturas + sus notas | Individual (obligatorio) | **3 días** calendario siguientes |
| Boletas + sus notas | Resumen Diario | **3 días** calendario |

## Regla de ingeniería

> [!IMPORTANT]
> Ante la contradicción:
> 1. **Usa la lectura más estricta** (los **3 días calendario**, contados desde el día siguiente a la emisión).
>    Cumplir el plazo corto satisface también al largo; lo contrario, no.
> 2. **Haz los plazos configurables**, no los hardcodees. Cuando la norma se aclare o cambie, se ajusta por
>    configuración sin tocar la lógica.
> 3. **Programa el trabajo diferido con días de colchón** para reintentos dentro del plazo.
> 4. **Re-verifica contra la norma vigente antes del go-live.**

## Consecuencia de fuera de plazo

Una factura enviada **fuera de plazo** **pierde su validez** como factura electrónica. Por eso las facturas se
tratan con la ventana más corta y con prioridad sobre las boletas.

## El principio que se deriva

> [!IMPORTANT]
> **Emitir localmente al instante; reportar a SUNAT en diferido.** El comprobante se genera, firma y entrega al
> cliente en el acto, sin esperar a SUNAT. El reporte ocurre después, mediante trabajo programado, dentro de la
> ventana de días que dan los plazos. Así el camino crítico de la venta **nunca depende** de SUNAT.

quipu refleja este principio en su API: [`sign()`](/guias/firma-local) es instantáneo y local;
[`sendBill()`](/arquitectura/facade) es el reporte, separable y diferible.

## El día tributario es de Lima

Los plazos se cuentan en **días calendario de Perú**. El Resumen Diario agrupa por **día de Lima**
(`America/Lima`), no por día UTC. Ver [cómo usar quipu](/buenas-practicas/como-usar).

## Envío individual vs. Resumen Diario

- **Facturas** (y sus notas) → envío **individual** obligatorio, CDR síncrono.
- **Boletas** (y sus notas) → **Resumen Diario** (flujo asíncrono ticket + polling). El envío individual de
  boletas es opcional pero no es el mecanismo estándar.

## Siguiente paso

- [CDR y ciclo de vida](/dominio-sunat/cdr-ciclo-vida)
- [Sensibilidad temporal](/dominio-sunat/sensibilidad-temporal)
