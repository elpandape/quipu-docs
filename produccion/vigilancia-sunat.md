# Vigilancia de cambios de SUNAT

<Availability lite pro />

SUNAT cambia esquemas, catálogos y **reglas**. El objetivo de esta página es que te enteres **a tiempo** —con
contexto y sin ruido— en lugar de descubrirlo el día que producción empieza a rechazar.

::: warning Documento regulatorio
Esto es **contexto de dominio y práctica operativa**, no API de quipu. La librería no vigila nada por ti: te da
los ganchos (versiones, catálogos, códigos de error) para que tú montes el mecanismo.
:::

## La distinción que lo cambia todo: forma vs. fondo

La intuición habitual es "vigilo el XSD y estoy cubierto". **Es falsa.**

- El **XSD** de SUNAT lleva congelado desde el **28/02/2022**, y el WSDL SOAP no cambia de contrato desde
  ~2018. Diffearlos es barato, pero detecta poco.
- Lo que de verdad rompe producción son las **reglas de validación del lado servidor**, que **no están en el
  XSD**: un XML estructuralmente perfecto empieza a rechazarse porque SUNAT activó una regla nueva. Fue el caso
  de la **Forma de Pago**, que pasó a ser obligatoria (R.S. 193-2020) y tumbó integraciones que llevaban meses
  emitiendo sin tocarse.

> [!IMPORTANT]
> Un diff de XSD/WSDL **nunca** verá una regla nueva. Si solo vigilas esquemas, el próximo cambio de reglas te
> agarra en producción.

## Qué vigilar y dónde

Ordenado por valor real, no por facilidad:

| Qué | Dónde | Por qué importa |
|---|---|---|
| **Reglas de validación** y **Listado de Observaciones que migran a Error** (son **Excel**, no PDF) | [`cpe.sunat.gob.pe/guias-y-manuales`](https://cpe.sunat.gob.pe/guias-y-manuales) | ⭐ Aquí viven las reglas server-side. Es la única señal automatizable que atrapa el caso "forma de pago" |
| **Resoluciones de Superintendencia** | [`cpe.sunat.gob.pe/informacion_general/normas_legales`](https://cpe.sunat.gob.pe/informacion_general/normas_legales) | El *por qué* y, sobre todo, la **fecha de vigencia** |
| **Reglas y esquemas de la GRE** | [`cpe.sunat.gob.pe/node/116`](https://cpe.sunat.gob.pe/node/116) | La GRE cambia y se deprecia por su cuenta |
| **XSD / WSDL** | `cpe.sunat.gob.pe/guias-y-manuales` | Prioridad baja: llevan años estables |
| **Códigos de error nuevos** | Tus propios CDR | Un código que no reconoces suele ser una regla nueva |

SUNAT **no publica RSS ni boletín** de estas páginas: hay que raspar el índice o revisarlo a mano.

## El mecanismo, en capas

Ninguna capa basta sola. Combínalas:

1. **Aserción de versión en CI** *(coste casi cero)* — un test que afirme que los `UBLVersionID`/`CustomizationID`
   que emites son los que SUNAT espera hoy (factura 2.1/2.0, resumen 2.0/1.1, retención 2.0/1.0…). Si algún día
   los bumpean, tu CI se pone rojo sin descargar nada.
2. **Diff de las hojas de reglas** *(semanal)* — descarga los Excel de reglas y observaciones y compara **por
   código**, no por línea de texto (las descripciones cambian de redacción sin cambiar la regla).
3. **Canary contra beta** *(diario)* — emite un set de documentos **conocidos-buenos** y alerta si uno que antes
   era ACEPTADO cambia de estado o devuelve un código nuevo. Es lo único que atrapa cambios de comportamiento.
4. **Seguimiento normativo** *(continuo)* — al detectar una R.S. nueva, abre el PDF y extrae la **fecha de
   vigencia** (sección *Disposiciones Complementarias Finales*) para tener margen de migración.

> [!TIP]
> La fecha oficial de publicación de una norma se lee sin navegador desde
> `busquedas.elperuano.pe/dispositivo/NL/<id>`. Lleva un pequeño **calendario de vigencias**
> (fecha → cambio → acción): detectar "cambió" no basta si no sabes **desde cuándo** aplica.

## Cuatro trampas

**1. Un verde en beta no garantiza producción.** SUNAT dice textualmente que su servicio beta *"solo sirve para
realizar pruebas a las estructuras XML"* y que **no hace verificaciones de consistencia de datos**. El motor de
reglas completo solo se ejerce en producción. Ver [De beta a producción](/produccion/de-beta-a-produccion).

**2. No hardcodees las URLs de los artefactos.** SUNAT los sirve desde Drupal con un sufijo inestable
(`… (1).xlsx`, `… (3).xlsx`) y algunas URLs ya devuelven 404. Raspa el enlace desde la página índice.

**3. Distingue "SUNAT caída" de "documento rechazado".** El ambiente de pruebas es inestable. Si tu canary no
separa un fallo de infraestructura (códigos de sistema **por debajo de `1000`**, incluido el `200`
*"Ocurrio un error en el batch"*, además de HTTP 5xx) de un rechazo real (`2000-3999`), te inunda de falsos
positivos y te entrena a ignorar las alertas. La frontera real que usa `quipu-watch/bin/canary.php` es `< 1000`,
no solo `01xx`: si te quedas en `01xx` dejas fuera el `200`, que el canary sí trata como infra.

**4. Los catálogos de errores públicos envejecen.** El catálogo comunitario más usado lleva **congelado desde
2021** y no contiene los códigos más recientes. Por eso tu canary debe alertar ante **cualquier código que no
reconozca**, no solo ante una lista conocida.

## Qué te da quipu para engancharlo

- **Versiones**: cada builder emite el par `UBLVersionID`/`CustomizationID` de su tipo — afírmalo en tu CI.
- **Códigos**: `Error\ErrorCatalog` traduce código → mensaje, y `Result\CdrSeverity` lo clasifica por rango
  (`0` aceptado · `100-1999` excepción · `2000-3999` rechazo · `4000+` observación). Con eso decides
  reintentar / corregir / aceptar con observaciones. Ver [Manejo de errores](/buenas-practicas/manejo-errores).
- **Catálogos**: los enums tipados fallan localmente ante un código inválido antes de gastar el webservice.
  Pero están **curados al 80/20 a propósito** (los valores que cubren la mayoría de los casos, no todos): si
  SUNAT publica un código nuevo y válido que el enum aún no incluye, también fallará y **bloqueará la emisión**
  hasta que lo añadas en una release. No es pura red de seguridad: también es un punto a vigilar cuando aparezca
  un código que creas legítimo.

::: tip Implementación de referencia
El monorepo de quipu incluye su propio sistema de vigilancia (scripts de diff del portal y de normas, y un
canary contra beta con clasificación infra-vs-regla) en el sub-proyecto `quipu-watch/` (`bin/` y
`.github/workflows/`). No es parte de la librería que instalas, pero sirve de plantilla si quieres montar el tuyo.
:::

## Siguiente paso

- [Sensibilidad temporal](/dominio-sunat/sensibilidad-temporal) — qué re-verificar antes del go-live.
- [Checklist de go-live](/produccion/checklist)
- [Operación en producción](/produccion/operacion)
