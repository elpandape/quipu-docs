# Modelos

Los modelos de quipu viven bajo `ElPandaPe\Quipu\Model\` y representan el dominio de la facturación: el emisor,
el cliente, los ítems, los totales. Casi todos son **DTOs `readonly`** (inmutables, con propiedades públicas
promovidas en el constructor), e implementan `Document` cuando son documentos emitibles.

<Availability lite pro />

::: tip Armarlos con menos código en Pro
Construir estos modelos a mano —con los totales ya calculados— es lo que hace el **emisor base (Lite)**. Si
prefieres partir de inputs mínimos y dejar que un motor liquide los tributos, el *fluent builder* y el motor
tributario son comodidad de **quipu Pro** <Availability pro />. Ver [Fluent Builder](/pro/fluent-builder) y
[Motor tributario](/pro/motor-tributario).
:::

> [!NOTE]
> Dos miembros del namespace **no son DTOs sino enums**: [`PaymentForm`](/referencia/catalogos#forma-de-pago-paymentform)
> (`Contado`/`Credito`) y [`SummaryStatus`](/referencia/catalogos#estado-del-item-de-resumen-summarystatus)
> (Cat. 19). Están documentados junto a los catálogos, aunque su namespace sea `Model\`.

## Documentos (implementan `Document`)

| Modelo | Tipo (Cat. 01) | Prefijo | Uso |
|---|---|---|---|
| `Invoice` | `01` / `03` | `F` / `B` | Factura y boleta (mismo modelo) |
| `Note` | `07` / `08` | ligado al original | Nota de crédito (Cat. 09) o débito (Cat. 10) |
| `Despatch` | `09` | `T` | Guía de remisión remitente (GRE) |
| `CarrierDespatch` | `31` | `V` | Guía de remisión transportista |
| `DailySummary` | `RC` | — | Resumen diario de boletas |
| `Voidance` | `RA` | — | Comunicación de baja |
| `Reversion` | `RR` | — | Reversión de retención/percepción |
| `Retention` | `20` | `R` | Comprobante de retención |
| `Perception` | `40` | `P` | Comprobante de percepción |

Todos exponen:

<CodeTabs>
<template #php>

```php
$document->documentType(): DocumentType;  // tipo de comprobante
$document->fileName(): string;            // nombre SUNAT, p. ej. "20512345678-01-F001-1"
```

</template>
</CodeTabs>

## Partes

### `Company` — emisor

<CodeTabs>
<template #php>

```php
new Company(
    ruc: '20512345678',
    legalName: 'MI EMPRESA SAC',
    tradeName: 'MI EMPRESA',     // ?string, opcional
    address: $address,           // ?Address, opcional pero recomendado
);
```

</template>
</CodeTabs>

### `Client` — receptor / proveedor

<CodeTabs>
<template #php>

```php
new Client(
    documentType: IdentityDocumentType::Ruc,
    documentNumber: '20100456789',
    legalName: 'CLIENTE SAC',
    address: $address,           // ?Address, opcional
);
```

</template>
</CodeTabs>

### `Address`

<CodeTabs>
<template #php>

```php
new Address(
    ubigeo: '150101',           // ?string, código UBIGEO
    department: 'LIMA',         // ?string
    province: 'LIMA',           // ?string
    district: 'LIMA',           // ?string
    urbanization: null,         // ?string
    line: 'AV. SIEMPRE VIVA 123', // ?string, dirección
    country: 'PE',              // string, default 'PE'
    establishmentCode: '0000',  // string, default '0000'
);
```

</template>
</CodeTabs>

## Línea de venta

### `SaleDetail`

<CodeTabs>
<template #php>

```php
new SaleDetail(
    productCode: 'P001',
    unit: UnitOfMeasure::Unit,
    description: 'PRODUCTO',
    quantity: 2.0,
    unitValue: 100.0,           // valor por unidad, sin IGV
    unitPrice: 118.0,           // precio por unidad, con IGV
    lineValue: 200.0,           // valor de línea, sin IGV
    igvAffectation: IgvAffectationType::TaxedOnerous,
    igvBaseAmount: 200.0,
    igvPercentage: 18.0,
    igvAmount: 36.0,
    taxTotal: 36.0,
    // opcionales:
    sunatProductCode: null,     // ?string, Cat.25 UNSPSC
    icbperAmount: 0.0,          // ICBPER (bolsas) de la línea
    icbperFactor: 0.0,          // ICBPER por unidad
    allowanceCharges: [],      // descuentos/cargos de línea (Cat.53)
    iscBaseAmount: 0.0,        // base ISC
    iscAmount: 0.0,            // ISC de la línea
    iscPercentage: 0.0,
    iscSystem: null,           // ?IscSystem, Cat.08 (requerido si iscAmount > 0)
    othBaseAmount: 0.0,        // otros tributos (9999) base
    othPercentage: 0.0,
    othAmount: 0.0,            // otros tributos de la línea
    gs1Code: null,             // ?string, GS1
    additionalProperties: [],  // list<ItemProperty>, Cat.55
);
```

</template>
</CodeTabs>

::: tip Montos ya calculados
quipu **no** calcula el IGV por ti: los montos (`unitValue`, `igvBaseAmount`, `igvAmount`, `taxTotal`, etc.)
vienen **ya calculados** en el `SaleDetail`. El validador verifica la coherencia, pero el cálculo es del
consumidor.
:::

## Leyenda

### `Legend`

<CodeTabs>
<template #php>

```php
new Legend(LegendCode::AmountInWords, 'SON DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES');
```

</template>
</CodeTabs>

## Forma de pago y cuotas

### `PaymentForm` (enum)

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Model\PaymentForm;  // ojo: Model\, no Catalog\

PaymentForm::Cash;    // 'Contado' (default)
PaymentForm::Credit;  // 'Credito' (requiere installments)
```

</template>
</CodeTabs>

### `Installment`

Una cuota a crédito. Obligatorio (al menos una) cuando `paymentForm` es `Credit`.

<CodeTabs>
<template #php>

```php
new Installment(
    amount: 118.0,
    dueDate: new DateTimeImmutable('2026-08-15'),
);
```

</template>
</CodeTabs>

## Ítems de documentos consolidados

### `SummaryItem` — línea del Resumen Diario

<CodeTabs>
<template #php>

```php
new SummaryItem(
    documentType: DocumentType::Receipt,
    documentId: 'B001-1',
    clientDocumentType: IdentityDocumentType::Dni,
    clientDocumentNumber: '44556677',
    status: SummaryStatus::Add,
    total: 118.0,
    taxableAmount: 100.0,
    igvAmount: 18.0,
    // montos por afectación (todos = 0.0 por default):
    exoneratedAmount: 0.0,
    unaffectedAmount: 0.0,
    exportAmount: 0.0,
    freeAmount: 0.0,
    // si es nota:
    affectedDocumentType: null,
    affectedDocumentId: null,
);
```

</template>
</CodeTabs>

`status` usa [`SummaryStatus`](/referencia/catalogos#estado-del-item-de-resumen-summarystatus) (Cat. 19), del
namespace `Model\`.

### `VoidedItem` — ítem de baja/reversión

<CodeTabs>
<template #php>

```php
new VoidedItem(
    documentType: DocumentType::Invoice,
    series: 'F001',
    number: '1',
    reason: 'ANULACION POR ERROR EN EL RUC',
);
```

</template>
</CodeTabs>

::: warning La boleta no va en un `VoidedItem`
La comunicación de baja (`RA`) es para **facturas y sus notas**. La boleta se anula con un `SummaryItem` de
`status: SummaryStatus::Cancel` en el Resumen Diario. `VoidanceValidator` **no** valida el `documentType`, así
que una boleta aquí se firma y se envía: el rechazo lo pone SUNAT.
Ver [comunicación de baja](/documentos/comunicacion-baja).
:::

## Consulta

### `CpeQuery` — consulta de validez de un tercero

<CodeTabs>
<template #php>

```php
new CpeQuery(
    taxpayerId: '20100456789',
    documentCode: '01',
    series: 'F001',
    number: '123',
    issueDate: new DateTimeImmutable('2026-07-10'),
    amount: 236.00,   // ?float, obligatorio para electrónicos
);
```

</template>
</CodeTabs>

### `CpeValidity` — lo que devuelve `validateCpe()`

Resultado de la *Consulta Integrada de Validez del CPE*. Ojo: vive en `Model\`, no en `Result\`.

<CodeTabs>
<template #php>

```php
$validity = $quipu->validateCpe($query);   // CpeValidity

$validity->documentStatus;  // string, estado del comprobante
$validity->taxpayerStatus;  // string, estado del RUC emisor
$validity->domicileStatus;  // string, condición de domicilio del emisor
$validity->observations;    // list<string>, observaciones de SUNAT

$validity->exists();          // bool — SUNAT tiene algún registro del comprobante
$validity->isAccepted();      // bool — documentStatus '1'
$validity->isAnnulled();      // bool — documentStatus '2', comunicado en una baja
$validity->isAuthorized();    // bool — documentStatus '3', con autorización de imprenta
$validity->isNotAuthorized(); // bool — documentStatus '4', no autorizado por imprenta
```

</template>
</CodeTabs>

Códigos, verificados contra el *Manual de Consulta Integrada de Comprobante de Pago por Servicio WEB*:

| Propiedad (campo SUNAT) | Códigos |
|---|---|
| `documentStatus` (`estadoCp`) | `0` no existe (no informado), `1` aceptado, `2` anulado, `3` autorizado, `4` no autorizado |
| `taxpayerStatus` (`estadoRuc`) | `00` activo, `01` baja provisional, `02` baja prov. por oficio, `03` suspensión temporal, `10` baja definitiva, `11` baja de oficio, `22` inhabilitado-vent. única |
| `domicileStatus` (`condDomiRuc`) | `00` habido, `09` pendiente, `11` por verificar, `12` no habido, `20` no hallado |

> [!NOTE]
> `CpeValidity` (validez de un CPE **de terceros**, API REST) no es lo mismo que
> [`BillConsultResult`](/referencia/resultados#billconsultresult) (estado de **tu propio** CPE, SOAP). Son
> servicios distintos, con espacios de códigos distintos.

## Escenarios avanzados de `Invoice`

Tras los 15 parámetros obligatorios (`documentType`, `series`, `number`, `issueDate`, `operationType`,
`currency`, `company`, `client`, `details`, `legends`, `taxableAmount`, `igvAmount`, `taxTotal`, `saleValue`,
`totalAmount`), el constructor de `Invoice` tiene **29 parámetros opcionales**, todos con default:

| Parámetro | Tipo | Default | Para qué |
|---|---|---|---|
| `dueDate` | `?DateTimeImmutable` | `null` | Fecha de vencimiento |
| `exoneratedAmount` | `float` | `0.0` | Total exonerado |
| `unaffectedAmount` | `float` | `0.0` | Total inafecto |
| `exportAmount` | `float` | `0.0` | Total exportación |
| `freeAmount` | `float` | `0.0` | Total gratuito |
| `freeIgvAmount` | `float` | `0.0` | IGV de las operaciones gratuitas |
| `iscAmount` | `float` | `0.0` | ISC |
| `iscBaseAmount` | `float` | `0.0` | Base del ISC |
| `icbperAmount` | `float` | `0.0` | ICBPER (bolsas plásticas) |
| `ivapAmount` | `float` | `0.0` | IVAP |
| `ivapBaseAmount` | `float` | `0.0` | Base del IVAP |
| `othAmount` | `float` | `0.0` | Otros tributos (9999) |
| `othBaseAmount` | `float` | `0.0` | Base de otros tributos |
| `paymentForm` | `PaymentForm` | `Cash` | Contado o crédito |
| `installments` | `list<Installment>` | `[]` | Cuotas; requeridas si `paymentForm` es `Credit` |
| `detraction` | `?Detraction` | `null` | Detracción (SPOT) |
| `roundingAmount` | `float` | `0.0` | Redondeo del importe total |
| `allowanceCharges` | `list<AllowanceCharge>` | `[]` | Descuentos/cargos globales (Cat. 53) |
| `allowanceTotalAmount` | `float` | `0.0` | Total de descuentos |
| `chargeTotalAmount` | `float` | `0.0` | Total de cargos |
| `purchaseOrder` | `?string` | `null` | Número de orden de compra |
| `despatchReferences` | `list<DespatchReference>` | `[]` | Guías que sustentan el traslado |
| `additionalDocumentReferences` | `list<RelatedDocument>` | `[]` | Documentos relacionados (Cat. 12) |
| `deliveryAddress` | `?Address` | `null` | Dirección de entrega |
| `prepaidPayments` | `list<PrepaidPayment>` | `[]` | Anticipos recibidos antes de la venta |
| `prepaidAmount` | `float` | `0.0` | Total de anticipos |
| `perception` | `?SalePerception` | `null` | Percepción embebida (Cat. 53 `51`–`53`) |
| `embeddedDespatch` | `?EmbeddedDespatch` | `null` | Traslado embebido (`sac:SUNATEmbededDespatchAdvice`) |
| `seller` | `?Company` | `null` | Venta por cuenta de tercero (`cac:SellerSupplierParty`) |

> [!NOTE]
> `Note` comparte casi todos estos opcionales, pero **no todos**: no tiene `dueDate`, `purchaseOrder`,
> `ivapAmount`/`ivapBaseAmount`, `othAmount`/`othBaseAmount`, `prepaidPayments`/`prepaidAmount`,
> `despatchReferences`, `additionalDocumentReferences`, `deliveryAddress`, `perception`, `embeddedDespatch` ni
> `seller`. Ver [`Note`](#note-nota-de-credito-debito).

## `Note` (nota de crédito/débito)

El **motivo decide el tipo**: un motivo del Cat. 09 (`CreditNoteType`) la hace nota de crédito (`07`); uno del
Cat. 10 (`DebitNoteType`), nota de débito (`08`). No hay un parámetro `documentType`.

<CodeTabs>
<template #php>

```php
new Note(
    motive: CreditNoteType::DescriptionCorrection,  // CreditNoteType|DebitNoteType
    motiveDescription: 'CORRECCION DE LA DESCRIPCION',
    affectedDocumentType: DocumentType::Invoice,    // el comprobante que ajusta
    affectedDocumentId: 'F001-1',
    series: 'FC01',
    number: '1',
    issueDate: new DateTimeImmutable('2026-07-10'),
    currency: Currency::Sol,
    company: $company,
    client: $client,
    details: [$saleDetail],   // list<SaleDetail>
    legends: [$legend],       // list<Legend>
    taxableAmount: 100.0,
    igvAmount: 18.0,
    taxTotal: 18.0,
    saleValue: 100.0,
    totalAmount: 118.0,
    // opcionales:
    exoneratedAmount: 0.0,
    unaffectedAmount: 0.0,
    exportAmount: 0.0,
    icbperAmount: 0.0,
    freeAmount: 0.0,
    freeIgvAmount: 0.0,
    iscAmount: 0.0,
    iscBaseAmount: 0.0,
    detraction: null,                 // ?Detraction
    paymentForm: PaymentForm::Cash,
    installments: [],                 // list<Installment>
    roundingAmount: 0.0,
    allowanceCharges: [],             // list<AllowanceCharge>
    allowanceTotalAmount: 0.0,
    chargeTotalAmount: 0.0,
);
```

</template>
</CodeTabs>

Además de `documentType()` y `fileName()`, expone:

<CodeTabs>
<template #php>

```php
$note->isCreditNote();  // bool — true si el motivo es un CreditNoteType
```

</template>
</CodeTabs>

## Otros documentos emitibles

Firmas de los documentos restantes que implementan `Document`:

<CodeTabs>
<template #php>

```php
// Resumen diario de boletas (RC)
new DailySummary(
    sequenceNumber: '1',
    referenceDate: new DateTimeImmutable('2026-07-09'),  // día que se resume
    issueDate: new DateTimeImmutable('2026-07-10'),
    currency: Currency::Sol,
    company: $company,
    items: [$summaryItem],   // list<SummaryItem>
);

// Comunicación de baja (RA)
new Voidance(
    sequenceNumber: '1',
    referenceDate: new DateTimeImmutable('2026-07-09'),  // día de emisión de lo que se da de baja
    issueDate: new DateTimeImmutable('2026-07-10'),
    company: $company,
    items: [$voidedItem],    // list<VoidedItem>
);

// Reversión de retención/percepción (RR) — misma firma que Voidance
new Reversion(
    sequenceNumber: '1',
    referenceDate: new DateTimeImmutable('2026-07-09'),
    issueDate: new DateTimeImmutable('2026-07-10'),
    company: $company,
    items: [$voidedItem],    // list<VoidedItem>
);

// Comprobante de retención (20)
new Retention(
    series: 'R001',
    number: '1',
    issueDate: new DateTimeImmutable('2026-07-10'),
    company: $company,
    supplier: $client,               // el proveedor al que se retiene
    regimeCode: RetentionRegime::Rate3,
    percent: 3.0,
    retainedAmount: 30.0,
    paidAmount: 970.0,
    items: [$retentionItem],         // list<RetentionItem>
);

// Comprobante de percepción (40) — misma forma, con PerceptionRegime
new Perception(
    series: 'P001',
    number: '1',
    issueDate: new DateTimeImmutable('2026-07-10'),
    company: $company,
    supplier: $client,
    regimeCode: PerceptionRegime::InternalSale,
    percent: 2.0,
    perceivedAmount: 20.0,
    collectedAmount: 1020.0,
    items: [$perceptionItem],        // list<PerceptionItem>
);
```

</template>
</CodeTabs>

### Guías de remisión

<CodeTabs>
<template #php>

```php
// GRE Remitente (09)
new Despatch(
    series: 'T001',
    number: '1',
    issueDate: new DateTimeImmutable('2026-07-10'),
    company: $company,
    receiver: $client,
    shipment: $shipment,             // Shipment
    details: [$despatchItem],        // list<DespatchItem>
    observation: null,               // ?string
    relatedDocuments: [],            // list<GreRelatedDocument>
    buyer: null,                     // ?Client
    seller: null,                    // ?Company
);

// GRE Transportista (31)
new CarrierDespatch(
    series: 'V001',
    number: '1',
    issueDate: new DateTimeImmutable('2026-07-10'),
    carrier: $carrier,               // Carrier — el transportista que emite
    sender: $client,
    receiver: $client,
    shipment: $shipment,
    details: [$despatchItem],
    relatedDocuments: [],            // list<GreRelatedDocument>
    observation: null,               // ?string
);
```

</template>
</CodeTabs>

## Tabla de firmas — modelos de apoyo

Los modelos que se componen dentro de los documentos anteriores:

| Modelo | Firma |
|---|---|
| `Installment` | `(float $amount, DateTimeImmutable $dueDate)` |
| `Legend` | `(LegendCode $code, string $value)` |
| `VoidedItem` | `(DocumentType $documentType, string $series, string $number, string $reason)` |
| `Detraction` | `(DetractionGood $goodCode, DetractionPaymentMethod $paymentMethod, string $bankAccount, float $percent, float $amount)` — `$bankAccount` es la cuenta del Banco de la Nación |
| `AllowanceCharge` | `(AllowanceChargeReason $reason, float $amount, float $baseAmount, float $factor)` |
| `SalePerception` | `(AllowanceChargeReason $reason, float $percent, float $baseAmount, float $amount, float $totalAmount)` |
| `PrepaidPayment` | `(string $id, float $amount)` |
| `RelatedDocument` | `(string $id, RelatedDocumentType $type, ?string $description = null)` |
| `DespatchReference` | `(string $id, DocumentType $documentType)` |
| `GreRelatedDocument` | `(string $id, GreRelatedDocumentType $type, ?string $issuerRuc = null)` |
| `ItemProperty` | `(string $nameCode, string $name, string $value, ?DateTimeImmutable $usabilityStart = null, ?DateTimeImmutable $usabilityEnd = null)` — `$nameCode` es del Cat. 55, p. ej. `'5010'` (placa) |
| `RetentionItem` | `(DocumentType $affectedDocumentType, string $affectedDocumentId, DateTimeImmutable $affectedIssueDate, Currency $affectedCurrency, float $affectedTotal, float $retainedAmount, DateTimeImmutable $retentionDate, float $netPaid)` |
| `PerceptionItem` | `(DocumentType $affectedDocumentType, string $affectedDocumentId, DateTimeImmutable $affectedIssueDate, Currency $affectedCurrency, float $affectedTotal, float $collectedAmount, DateTimeImmutable $perceptionDate, float $netCollected)` |
| `DespatchItem` | `(UnitOfMeasure $unit, float $quantity, string $description, string $productCode, ?string $sunatProductCode = null)` |
| `Carrier` | `(IdentityDocumentType $documentType, string $documentNumber, string $legalName, string $mtcRegistration)` |
| `Driver` | `(IdentityDocumentType $documentType, string $documentNumber, string $firstName, string $familyName, string $license, string $jobTitle = 'Principal')` |
| `Vehicle` | `(string $plate, list<string> $secondaryPlates = [], ?string $registrationCard = null, ?SpecialAuthorization $authorization = null)` |
| `SpecialAuthorization` | `(string $issuerCode, string $number)` |
| `RoadTransport` | `(string $licensePlate, ?string $brandName = null, list<string> $semiTrailerPlates = [])` |
| `PortLocation` | `(string $code, string $name, PortLocationType $type)` |
| `EmbeddedDespatch` | `(?Address $deliveryAddress = null, ?Address $originAddress = null, ?Carrier $carrier = null, list<Driver> $drivers = [], list<Vehicle> $vehicles = [], ?TransportMode $transportMode = null, ?float $grossWeight = null, string $weightUnit = 'KGM')` |

### `Shipment` — el traslado de una guía

<CodeTabs>
<template #php>

```php
new Shipment(
    reasonCode: TransferReason::Sale,        // Cat. 20
    transportMode: TransportMode::PublicTransport,  // Cat. 18
    grossWeight: 12.5,
    transferDate: new DateTimeImmutable('2026-07-11'),
    departureAddress: $address,
    arrivalAddress: $address,
    // opcionales:
    reasonDescription: null,   // ?string
    weightUnit: 'KGM',         // string
    carrier: null,             // ?Carrier — transporte público
    drivers: [],               // list<Driver> — transporte privado
    vehicle: null,             // ?Vehicle — transporte privado
    packageCount: null,        // ?int
    netWeight: null,           // ?float
    weightInformation: null,   // ?string
    indicators: [],            // list<GreTransferIndicator>
    seals: [],                 // list<string> — precintos
    port: null,                // ?PortLocation
);
```

</template>
</CodeTabs>

## Representación impresa (`Presentation\`)

`Quipu::printable()` proyecta un documento firmado en un **`PrintView`**: un DTO público bajo
`ElPandaPe\Quipu\Presentation\`, listo para alimentar una plantilla. **No carga ninguna preocupación de
render** —ni logo, ni layout, ni driver de PDF—: eso vive fuera del core.

<CodeTabs>
<template #php>

```php
$signed = $quipu->sign($invoice);
$view   = $quipu->printable($invoice, $signed);
```

</template>
</CodeTabs>

> [!WARNING]
> `printable()` y `qrString()` **solo soportan `Invoice` y `Note`**. Cualquier otra familia (GRE, retención,
> percepción, resumen, baja, reversión) lanza
> [`InvalidDocumentException`](/referencia/excepciones#invaliddocumentexception).

### `PrintView`

<CodeTabs>
<template #php>

```php
final readonly class PrintView
{
    public function __construct(
        public string $qrString,           // el string del QR de SUNAT
        public string $digestValue,        // DigestValue de la firma
        public string $documentTypeLabel,  // p. ej. 'FACTURA ELECTRÓNICA' (DocumentType::label())
        public string $series,
        public string $number,
        public DateTimeImmutable $issueDate,
        public string $currencyLabel,      // p. ej. 'SOLES' (Currency::label())
        public PrintParty $issuer,
        public PrintParty $customer,
        public array $lines,               // list<PrintLine>
        public PrintTotals $totals,
        public string $amountInWords,      // el monto en letras (leyenda 1000)
    ) {}
}
```

</template>
</CodeTabs>

### `PrintParty`

Una parte (emisor o cliente) ya desnormalizada para imprimir.

<CodeTabs>
<template #php>

```php
final readonly class PrintParty
{
    public function __construct(
        public string $legalName,
        public string $documentTypeLabel,  // p. ej. 'RUC' (IdentityDocumentType::label())
        public string $documentNumber,
        public ?string $tradeName = null,
        public ?Address $address = null,   // Model\Address
    ) {}
}
```

</template>
</CodeTabs>

### `PrintLine`

Una línea, con la unidad ya resuelta a su etiqueta en español y los montos **en crudo** para que la plantilla
los formatee.

<CodeTabs>
<template #php>

```php
final readonly class PrintLine
{
    public function __construct(
        public int $number,           // correlativo de la línea
        public string $description,
        public string $unitLabel,     // p. ej. 'UNIDAD' (UnitOfMeasure::label())
        public float $quantity,
        public float $unitPrice,
        public float $lineValue,
        public float $igvAmount,
        public float $taxTotal,
        public ?string $productCode = null,
    ) {}
}
```

</template>
</CodeTabs>

### `PrintTotals`

<CodeTabs>
<template #php>

```php
final readonly class PrintTotals
{
    public function __construct(
        public float $taxableAmount,
        public float $exoneratedAmount,
        public float $unaffectedAmount,
        public float $igvAmount,      // el IGV solo — la cifra que lleva el QR
        public float $iscAmount,
        public float $icbperAmount,
        public float $taxTotal,       // agrega TODOS los tributos
        public float $totalAmount,
        public float $roundingAmount = 0.0,
    ) {}
}
```

</template>
</CodeTabs>

> [!NOTE]
> `taxTotal` agrega todos los tributos; `igvAmount` es solo el IGV. Son distintos en cuanto hay ISC, ICBPER u
> otros tributos, y confundirlos descuadra la impresión.

## `Money` — el formato de montos que exige SUNAT

Los montos de `PrintView` van en crudo (`float`) a propósito. Para renderizarlos como SUNAT los espera, usa el
mismo helper que usan internamente los builders UBL y el encoder del QR:

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Support\Money;

Money::amount(1234.5);   // '1234.50'
Money::amount(0.1 + 0.2); // '0.30'
```

</template>
</CodeTabs>

**Exactamente dos decimales, punto como separador, sin separador de miles.** Al compartirlo el XML firmado y el
QR, un QR impreso nunca diverge del XML.

## Leer un XML de vuelta a un `Model` (`read()`) — y sus límites

<Availability lite pro />

`Quipu::read($xml)` es el inverso de la construcción: parsea un XML firmado y reconstruye el `Model\*`
correspondiente (implementa `Document`). Es útil para inspeccionar, re-emitir o auditar un comprobante
a partir de su XML. Ahora bien, el *round-trip* **no es 100 % fiel**: guarda estas limitaciones conocidas antes
de confiar en el modelo reconstruido.

> [!WARNING] Limitaciones conocidas de `read()`
> - **No reconstruye `embeddedDespatch`**: el traslado embebido (`sac:SUNATEmbededDespatchAdvice`) se pierde en
>   la lectura y el campo vuelve siempre como `null`, aunque el XML original lo llevara.
> - **Hay lossiness documentada**: algunos campos no sobreviven al ida y vuelta. Por ejemplo, `Company::tradeName`
>   (nombre comercial) no se recupera en ciertos casos. El modelo leído es fiel en lo esencial, no bit-a-bit.
> - **La GRE del transportista (tipo `31`, `CarrierDespatch`) no tiene lector**: intentar leer su XML lanza
>   [`InvalidDocumentException`](/referencia/excepciones#invaliddocumentexception). Solo la GRE remitente (`09`,
>   `Despatch`) tiene *reader*.
> - **Un código de catálogo válido pero fuera del subconjunto soportado también lanza `InvalidDocumentException`**:
>   la lectura acepta el subconjunto de valores que quipu emite, no todo el espacio de un catálogo SUNAT.

## Siguiente paso

- [Catálogos](/referencia/catalogos) — los enums que usan los modelos.
- [Resultados](/referencia/resultados) — lo que devuelven las operaciones.
