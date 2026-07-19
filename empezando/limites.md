# Límites y alcance

quipu es deliberadamente **solo la maquinaria**. Conocer sus límites te ayuda a no pedirle lo que no debe
hacer —y a saber qué le toca a tu aplicación o a un paquete de integración.

## Lo que quipu hace

- **Construye** el XML UBL para factura, boleta, notas, resumen diario, comunicación de baja, guías de
  remisión, retención, percepción y reversión (**UBL 2.1** en la familia de venta y las guías; **UBL 2.0** en
  resumen, baja, retención, percepción y reversión — ver [validación previa](/guias/validacion-local)).
- **Firma** el XML (xmldsig enveloped) con tu certificado.
- **Valida** reglas de negocio de SUNAT y el esquema XSD, localmente, antes de enviar.
- **Envía** el XML a SUNAT por **SOAP** (comprobantes, y también el estado/CDR de tu propio CPE) o por
  **REST/OAuth** (guías de remisión y la Consulta Integrada de Validez).
- **Parsea** el CDR y devuelve un resultado tipado.
- Provee la **vista de impresión** y el **string QR** para la representación impresa —**solo** de factura,
  boleta y notas (ver abajo).
- **Consulta** la validez de CPE de terceros (REST/OAuth) y el estado/CDR de tu propio CPE (SOAP).

## Lo que quipu NO hace

| Responsabilidad | De quién es |
|---|---|
| Persistir comprobantes, XML, CDR, hash | Del consumidor |
| Series y correlativos atómicos (sin huecos/duplicados) | Del consumidor |
| Máquina de estados (emitido→informado→aceptado/observación/rechazado) | Del consumidor |
| Agenda del Resumen Diario (corte `America/Lima`) y reintentos | Del consumidor |
| Generar el PDF de representación impresa | Del consumidor (quipu da los datos, y solo de factura/boleta/notas) |
| Configuración de framework (ServiceProvider, config, env) | Del consumidor / paquete de integración |
| El "pegamento" pago→emisión / devolución→nota de crédito | De la app consumidora |
| Calcular el IGV y los montos de cada línea | Del consumidor (quipu los recibe ya calculados) |

## Por qué estos límites

La separación es intencional: quipu es **agnóstica de framework y de aplicación**. Recibe un `Model\*` ya
armado y devuelve un `Result\*`; no sabe de bases de datos ni de flujos de venta. Eso la hace **reutilizable**
en cualquier proyecto PHP y **testeable** sin infraestructura.

La integración con un framework concreto (persistencia, correlativos, estados, jobs, config) vivirá en un
paquete aparte que se engancha por las **interfaces** de quipu, no por sus clases concretas.

## Casos no cubiertos hoy

Algunos escenarios avanzados están fuera del alcance actual de quipu o pendientes de verificación:

- **Representación impresa fuera de la familia de venta** — `qrString()` y `printable()` **solo** soportan
  `Model\Invoice` (factura/boleta) y `Model\Note` (nota de crédito/débito). Para **guía de remisión**
  (`Despatch`, `CarrierDespatch`), **retención**, **percepción**, **resumen diario** (`DailySummary`),
  **comunicación de baja** (`Voidance`) y **reversión** (`Reversion`) lanzan `InvalidDocumentException`.

  | Familia | `qrString()` / `printable()` |
  |---|---|
  | Factura, boleta (`Invoice`) | ✅ soportado |
  | Nota de crédito / débito (`Note`) | ✅ soportado |
  | GRE remitente y transportista | ❌ `InvalidDocumentException` |
  | Retención, percepción | ❌ `InvalidDocumentException` |
  | Resumen diario, baja, reversión | ❌ `InvalidDocumentException` |

  El motivo es deliberado: el QR de factura/boleta/notas está especificado en el **Anexo N.6** (R.S.
  244-2019, num. 6.4.3) y quipu lo implementa al pie de la letra. El formato de QR de las demás familias **no
  está confirmado** contra su anexo técnico correspondiente, y se prefirió **diferirlo antes que inventarlo**:
  un QR incorrecto en un impreso es peor que no tenerlo. **Retención y percepción son el caso a vigilar**: son
  comprobantes **con** representación impresa por norma, así que su impreso —QR incluido— queda de tu lado.
- **Retención de renta embebida (Cat. 53 código 61)** — la mecánica de emisión no está implementada porque la
  fuente pública no la documenta. El enum reserva el código y el validador previene su uso indebido, pero no se
  emite.
- **Catálogo 25 UNSPSC** — la lista de códigos de producto que SUNAT valida no está cargada (el estándar
  completo son ~150k códigos sin fuente oficial cruzable del subconjunto exacto). `SaleDetail::$sunatProductCode`
  queda como string libre.
- **Guía de remisión transportista (tipo 31)** — es emisión-only: quipu la construye y envía, pero no la lee de
  vuelta (SUNAT no necesita leerla, y reconstruir el modelo desde el XML requeriría inventar valores).
- **Round-trip en vivo de RC, RA y RR sin confirmar** — el **Resumen Diario** (`RC`), la **Comunicación de
  Baja** (`RA`) y la **Reversión** (`RR`) comparten el mismo patrón asíncrono: `sendSummary` devuelve un
  *ticket* y `getStatus()` lo resuelve en el CDR. El flujo está construido y cubierto por tests con el
  transporte **mockeado**; lo que falta es el **CDR final contra un servidor real**. Las causas no son idénticas:
  - **RC y RA** se sirven desde el host FE (`billServiceUrl`); su round-trip en beta no se completó porque el
    **servidor batch asíncrono de SUNAT beta estaba caído** (infraestructura de SUNAT, no de quipu).
  - **RR** además viaja por **otro host** (`otherCpeUrl`, el mismo de retención y percepción): es un endpoint
    distinto por ejercer, no el mismo servidor que RC/RA.

## Siguiente paso

- [Cómo NO usar quipu](/buenas-practicas/como-no-usar)
- [Sensibilidad temporal](/dominio-sunat/sensibilidad-temporal)
