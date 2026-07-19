# El facade Quipu

`ElPandaPe\Quipu\Quipu` es el **punto de entrada único** que compone la maquinaria: construir el XML, firmarlo,
enviarlo a SUNAT y parsear el CDR. El consumidor inyecta las dependencias por constructor y llama a los métodos
del facade.

<Availability lite pro />

::: tip El mismo facade en ambas ediciones
`Quipu` es la fachada del **emisor base (Lite)**. **quipu Pro** <Availability pro /> no la reemplaza: la
**compone** ya cableada —sender resiliente, validadores extra, builders pre-sembrados y diagnóstico— vía
`QuipuPro::for(...)`. El tipo que manejas sigue siendo un `Quipu`. Ver [quipu Pro](/pro/introduccion).
:::

## Constructor

<CodeTabs>
<template #php>

```php
final readonly class Quipu
{
    public function __construct(
        private XmlBuilder $builder,                              // obligatorio
        private Signer $signer,                                   // obligatorio
        private Sender $sender,                                   // obligatorio
        private Validator $validator = new CompositeValidator(...),
        private SchemaValidator $schemaValidator = new DocumentSchemaValidator(),
        private DocumentReader $reader = new CompositeReader(),
        private ?GreSender $greSender = null,                     // opcional: guías de remisión
        private ?CpeValidator $cpeValidator = null,               // opcional: consulta de validez
        private ?CpeStatusService $cpeStatusService = null,       // opcional: estado de CPE propio
        private QrEncoder $qrEncoder = new SunatQrEncoder(),
        private PrintViewBuilder $printViewBuilder = new CompositePrintViewBuilder(),
    ) {}
}
```

</template>
</CodeTabs>

Los tres primeros (`builder`, `signer`, `sender`) son **obligatorios**. El resto tiene defaults sensatos:

- `validator` y `schemaValidator` validan reglas de negocio y el XSD.
- `reader` permite leer un XML de vuelta a su `Model\*`.
- `greSender`, `cpeValidator` y `cpeStatusService` son **opcionales** y se inyectan solo si usas guías de
  remisión, consulta de validez de CPE de terceros o consulta de estado de tu propio CPE. Si no se inyectan, los
  métodos que los requieren lanzan una `TransportException` con un mensaje claro.

## Métodos

### Emisión síncrona (factura, boleta, nota)

| Método | Qué hace | Retorna |
|---|---|---|
| `sign(Document $document): SignedXml` | Construye el XML y lo firma localmente (instantáneo) | `SignedXml` |
| `sendBill(SignedXml $signedXml): BillResult` | Envía un XML ya firmado a SUNAT y parsea el CDR | `BillResult` |
| `emit(Document $document): BillResult` | `sendBill(sign($document))` en un paso | `BillResult` |
| `emitInvoice(Invoice $invoice): BillResult` | Alias semántico de `emit()` para facturas/boletas | `BillResult` |

### Emisión asíncrona (resumen diario, baja, reversión)

| Método | Qué hace | Retorna |
|---|---|---|
| `sendSummary(SignedXml $signedXml): TicketResult` | Envía un documento consolidado y recibe un ticket | `TicketResult` |
| `getStatus(string $ticket): CdrResult` | Consulta el estado de un ticket (un CDR) | `CdrResult` |
| `emitSummary(DailySummary $summary): TicketResult` | Construye + firma + envía un Resumen Diario | `TicketResult` |
| `emitVoidance(Voidance $voidance): TicketResult` | Construye + firma + envía una Comunicación de Baja | `TicketResult` |
| `emitReversion(Reversion $reversion): TicketResult` | Construye + firma + envía una Reversión | `TicketResult` |

::: warning Reversión y retención/percepción usan otro host
`emitReversion()` (y la emisión de retención/percepción) se sirven desde el host **otrosCpe** de SUNAT, no del
host FE. Inyecta un `Sender` construido con `SoapEndpoints::otherCpeUrl()`. Ver [endpoints](/referencia/endpoints).
:::

### Lotes (sendPack)

| Método | Qué hace | Retorna |
|---|---|---|
| `sendPack(list<SignedXml> $documents, string $batchName): TicketResult` | Envía hasta 500 documentos en un solo ZIP | `TicketResult` |
| `getPackStatus(string $ticket): array<string, CdrResult>` | Resuelve un ticket de lote en un CdrResult por documento | `array` |

Para el nombre del lote usa `Ws\BatchNamer`, que sigue la convención de nombrado de SUNAT. Ver [lotes](/guias/lotes).

### Guías de remisión (GRE, REST/OAuth)

| Método | Qué hace | Retorna |
|---|---|---|
| `emitGuide(Document $document): TicketResult` | Firma y envía una guía por la API REST de SUNAT | `TicketResult` |
| `getGuideStatus(string $ticket): CdrResult` | Consulta el estado del ticket de la guía | `CdrResult` |

Requiere inyectar un `GreSender` (p. ej. `Ws\GreClient`). Ver [guía de remisión](/documentos/guia-remision).

### Consulta de CPE

| Método | Qué hace | Retorna |
|---|---|---|
| `validateCpe(CpeQuery $query): CpeValidity` | Consulta la validez de un CPE de un **tercero** | `CpeValidity` |
| `getBillStatus(string $ruc, string $documentType, string $series, int $number): BillConsultResult` | Consulta el estado de tu propio CPE | `BillConsultResult` |
| `retrieveCdr(string $ruc, string $documentType, string $series, int $number): BillConsultResult` | Re-descarga el CDR de tu propio CPE | `BillConsultResult` |

Requiere inyectar `CpeValidator` y/o `CpeStatusService`. Ver [consulta de CPE](/guias/consulta-cpe).

> [!NOTE] Los parámetros están en inglés
> Como en todo el API, los nombres son `$documentType`, `$series` y `$number` —no `$tipo`, `$serie`, `$numero`—.
> Solo importa si los llamas con argumentos nombrados; por posición da igual.

### Validación y lectura

| Método | Qué hace | Retorna |
|---|---|---|
| `validate(Document $document): list<string>` | Reglas de negocio de SUNAT (sin lanzar); vacío = ok | `list<string>` |
| `assertValid(Document $document): void` | Reglas de negocio **+** XSD; lanza `InvalidDocumentException` si falla | `void` |
| `read(string $xml): Document` | Lee un XML UBL de vuelta a su `Model\*` (inverso de build) | `Document` |

### Representación impresa

| Método | Qué hace | Retorna |
|---|---|---|
| `qrString(Document $document, SignedXml $signedXml): string` | Construye el string del QR de SUNAT | `string` |
| `printable(Document $document, SignedXml $signedXml): PrintView` | Proyecta el documento en una vista de impresión tipada | `PrintView` |

quipu **no** renderiza el PDF: te entrega los datos (partes, líneas, totales, QR, hash). El PDF lo armas tú con
el driver que prefieras. Ver [representación impresa](/guias/representacion-impresa).

El string del QR **no es una URL**: son los diez campos del Anexo N.º 6 unidos por `|`, terminando en el
`DigestValue`.

> [!WARNING] Solo la familia de venta
> Ambos métodos soportan **únicamente** `Model\Invoice` (factura y boleta) y `Model\Note` (NC/ND). Con una guía
> de remisión, retención, percepción, resumen diario, comunicación de baja o reversión lanzan
> `Exception\InvalidDocumentException`: el formato del QR de esas familias no está confirmado contra el anexo
> técnico de SUNAT y se difirió a propósito en vez de inventarlo.

## Patrón de uso recomendado

<CodeTabs>
<template #php>

```php
// Al instante, en el punto de venta:
$signed = $quipu->sign($invoice);
$qr = $quipu->qrString($invoice, $signed);
$view = $quipu->printable($invoice, $signed);

// ...más tarde, en un job diferido:
$billResult = $quipu->sendBill($signed);
```

</template>
</CodeTabs>

Así el cliente recibe su comprobante sin esperar a SUNAT, y el reporte se hace en diferido dentro del plazo.

## Siguiente paso

- Ve los [modelos](/referencia/modelos) y [catálogos](/referencia/catalogos) para armar tus `Model\*`.
- Revisa las [buenas prácticas](/buenas-practicas/como-usar) para el patrón de emisión diferida.
