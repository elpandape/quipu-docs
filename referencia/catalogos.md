# Catálogos SUNAT

quipu modela los catálogos de SUNAT como **enums** bajo `ElPandaPe\Quipu\Catalog\`. Casi todos son enums
respaldados por string (`enum ... : string`), donde el *value* es el **código oficial** de SUNAT y el *case
name* está en inglés. Algunos tienen además un método `label()` con el nombre en español para la
representación impresa.

<Availability lite pro />

> [!NOTE] Dos excepciones a la regla
> - **`PortLocationType` no tiene backing**: es un `enum` puro (`case SeaPort;`), sin `: string` ni `->value`.
>   Sus códigos se obtienen por métodos (`locationTypeCode()`, `schemeUri()`), porque un mismo case aporta
>   varios valores al XML. Ver los catálogos 63/64, más abajo.
> - **`PaymentForm` y `SummaryStatus` no viven en `Catalog\` sino en `ElPandaPe\Quipu\Model\`.** Un
>   `use ElPandaPe\Quipu\Catalog\PaymentForm;` **falla**. Ver [Forma de pago](#forma-de-pago-paymentform) y
>   [Estado del ítem de resumen](#estado-del-item-de-resumen-summarystatus).

## Catálogo 01 — Tipo de comprobante (`DocumentType`)

| Case | Código | Documento |
|---|---|---|
| `Invoice` | `01` | Factura electrónica |
| `Receipt` | `03` | Boleta de venta electrónica |
| `CreditNote` | `07` | Nota de crédito |
| `DebitNote` | `08` | Nota de débito |
| `GuideSender` | `09` | Guía de remisión remitente |
| `CarrierGuide` | `31` | Guía de remisión transportista |
| `DailySummary` | `RC` | Resumen diario |
| `VoidedDocuments` | `RA` | Comunicación de baja |
| `ReversalSummary` | `RR` | Reversión |
| `Retention` | `20` | Retención |
| `Perception` | `40` | Percepción |

Método **`label(): string`** — el nombre imprimible en español, con la redacción normativa de SUNAT, para la
representación impresa:

<CodeTabs>
<template #php>

```php
DocumentType::Invoice->label();    // 'FACTURA ELECTRÓNICA'
DocumentType::Receipt->label();    // 'BOLETA DE VENTA ELECTRÓNICA'
DocumentType::CreditNote->label(); // 'NOTA DE CRÉDITO ELECTRÓNICA'
DocumentType::DailySummary->label(); // 'RESUMEN DIARIO DE BOLETAS'
```

</template>
</CodeTabs>

Es el valor que `PrintView::$documentTypeLabel` ya trae resuelto (ver [modelos](/referencia/modelos#printview)).

## Catálogo 02 — Moneda (`Currency`)

`Sol` (`PEN`), `Dollar` (`USD`), `Euro` (`EUR`), `BritishPound` (`GBP`), `JapaneseYen` (`JPY`), `ChineseYuan`
(`CNY`), `BrazilianReal` (`BRL`), `ChileanPeso` (`CLP`), `ColombianPeso` (`COP`), `MexicanPeso` (`MXN`),
`CanadianDollar` (`CAD`), `AustralianDollar` (`AUD`), `SwissFranc` (`CHF`). SUNAT delega este catálogo a
ISO 4217; cualquier código alfabético ISO 4217 es válido. El enum cura PEN/USD/EUR más las divisas más
frecuentes en el comercio exterior peruano.

Método **`label(): string`** — el nombre en español para la representación impresa:

<CodeTabs>
<template #php>

```php
Currency::Sol->label();    // 'SOLES'
Currency::Dollar->label(); // 'DÓLARES AMERICANOS'
Currency::Euro->label();   // 'EUROS'
```

</template>
</CodeTabs>

## Catálogo 03 — Unidad de medida (`UnitOfMeasure`)

`Unit` (`NIU`), `Service` (`ZZ`), `Kilogram` (`KGM`), `Gram` (`GRM`), `Tonne` (`TNE`), `Litre` (`LTR`),
`Gallon` (`GLL`), `Metre` (`MTR`), `Centimetre` (`CMT`), `SquareMetre` (`MTK`), `CubicMetre` (`MTQ`),
`Kilometre` (`KTM`), `Box` (`BX`), `Pack` (`PK`), `Bag` (`BG`), `Hundred` (`CEN`), `Thousand` (`MIL`),
`Dozen` (`DZN`), `Pair` (`PR`), `Set` (`SET`), `Bucket` (`BJ`), `Gross` (`GRO`). Es un subconjunto curado de
las unidades comerciales comunes de la Recomendación 20 de UN/ECE, no el catálogo completo. La tabla completa
(2136 códigos) sí está disponible, pero como tabla de validación y no como enum: ver
[Catálogos de referencia (no enums)](#catalogos-de-referencia-no-enums).

Método **`label(): string`** — el nombre en español para la representación impresa:

<CodeTabs>
<template #php>

```php
UnitOfMeasure::Unit->label();    // 'UNIDAD'
UnitOfMeasure::Service->label(); // 'SERVICIO'
UnitOfMeasure::Box->label();     // 'CAJA'
```

</template>
</CodeTabs>

Es el valor que `PrintLine::$unitLabel` ya trae resuelto.

## Catálogo 05 — Tributo (`Tribute`)

`Igv` (`1000`), `Ivap` (`1016`), `Isc` (`2000`), `Icbper` (`7152`), `Export` (`9995`), `Free` (`9996`),
`Exonerated` (`9997`), `Unaffected` (`9998`), `Other` (`9999`). Métodos: `taxName()` (p. ej. "IGV") e
`internationalCode()` (UN/ECE 5153: "VAT", "EXC", "FRE", "OTH").

## Catálogo 06 — Tipo de documento de identidad (`IdentityDocumentType`)

`NonDomiciledWithoutRuc` (`0`), `Dni` (`1`), `ForeignerCard` (`4`), `Ruc` (`6`), `Passport` (`7`),
`DiplomaticId` (`A`), `ResidenceCountryDocument` (`B`), `TaxIdNatural` (`C`), `TaxIdLegal` (`D`),
`AndeanMigrationCard` (`E`).

Método **`label(): string`** — el nombre en español para la representación impresa:

<CodeTabs>
<template #php>

```php
IdentityDocumentType::Dni->label();          // 'DNI'
IdentityDocumentType::Ruc->label();          // 'RUC'
IdentityDocumentType::ForeignerCard->label(); // 'CARNET DE EXTRANJERÍA'
IdentityDocumentType::TaxIdLegal->label();   // 'TIN - PERSONA JURÍDICA'
```

</template>
</CodeTabs>

Es el valor que `PrintParty::$documentTypeLabel` ya trae resuelto.

## Catálogo 07 — Afectación IGV (`IgvAffectationType`)

| Case | Código | Tributo |
|---|---|---|
| `TaxedOnerous` | `10` | IGV (gravado oneroso) |
| `TaxedWithdrawalPrize` | `11` | Free |
| `TaxedWithdrawalDonation` | `12` | Free |
| `TaxedWithdrawal` | `13` | Free |
| `TaxedWithdrawalAdvertising` | `14` | Free |
| `TaxedBonus` | `15` | Free |
| `TaxedWithdrawalForWorkers` | `16` | Free |
| `TaxedIvap` | `17` | IVAP |
| `ExoneratedOnerous` | `20` | Exonerado |
| `ExoneratedFreeTransfer` | `21` | Free |
| `UnaffectedOnerous` | `30` | Inafecto |
| `UnaffectedWithdrawalBonus` | `31` | Free |
| `UnaffectedWithdrawal` | `32` | Free |
| `UnaffectedWithdrawalMedicalSamples` | `33` | Free |
| `UnaffectedWithdrawalCollectiveAgreement` | `34` | Free |
| `UnaffectedWithdrawalPrize` | `35` | Free |
| `UnaffectedWithdrawalAdvertising` | `36` | Free |
| `UnaffectedFreeTransfer` | `37` | Free |
| `Export` | `40` | Exportación |

Método `tribute()`: mapea la afectación al `Tribute` que aplica.

## Catálogo 08 — Sistema ISC (`IscSystem`)

`ValueSystem` (`01`), `FixedAmountSystem` (`02`), `RetailPriceSystem` (`03`). Requerido cuando `iscAmount > 0`.

## Catálogo 09 — Motivo de nota de crédito (`CreditNoteType`)

`CancellationOfOperation` (`01`), `CancellationForRucError` (`02`), `DescriptionCorrection` (`03`),
`GlobalDiscount` (`04`), `ItemDiscount` (`05`), `TotalReturn` (`06`), `ItemReturn` (`07`), `Bonus` (`08`),
`ValueDecrease` (`09`), `OtherConcepts` (`10`), `ExportOperationAdjustment` (`11`), `IvapAdjustment` (`12`),
`PaymentDateOrAmountAdjustment` (`13`).

## Catálogo 10 — Motivo de nota de débito (`DebitNoteType`)

`DefaultInterest` (`01`), `ValueIncrease` (`02`), `PenaltiesOrOtherCharges` (`03`),
`ExportOperationAdjustment` (`10`), `IvapAdjustment` (`11`).

## Catálogo 12 — Documento relacionado (`RelatedDocumentType`)

Va en `cbc:DocumentTypeCode` dentro de `cac:AdditionalDocumentReference`; se usa desde `RelatedDocument`.
El catálogo oficial tiene **solo 6 códigos**; los códigos `06`–`10` aparecen en un único mirror no oficial de
2020 y **quedan sin tipar** por no poder confirmarse contra una fuente primaria.

| Case | Código | Documento |
|---|---|---|
| `InvoiceRucCorrection` | `01` | Factura — emitida para corregir el RUC |
| `InvoiceAdvancePayment` | `02` | Factura — emitida por anticipos |
| `ReceiptAdvancePayment` | `03` | Boleta de venta — emitida por anticipos |
| `EnapuExitTicket` | `04` | Ticket de salida (ENAPU) |
| `ScopCode` | `05` | Código SCOP |
| `Other` | `99` | Otros |

## Catálogo 16 — Tipo de precio (`PriceType`)

`UnitPrice` (`01`), `ReferenceValue` (`02`), `RegulatedTariff` (`03`).

## Catálogo 18 — Modo de transporte (`TransportMode`)

`PublicTransport` (`01`), `PrivateTransport` (`02`).

## Catálogo 20 — Motivo de traslado (`TransferReason`)

`Sale` (`01`), `Purchase` (`02`), `SaleWithThirdPartyDelivery` (`03`), `TransferBetweenEstablishments` (`04`),
`Consignment` (`05`), `Return` (`06`), `PickupOfTransformedGoods` (`07`), `Import` (`08`), `Export` (`09`),
`Other` (`13`), `SaleSubjectToBuyerConfirmation` (`14`), `TransferForProcessing` (`17`),
`ItinerantIssuerTransfer` (`18`), `ForeignGoodsTransfer` (`19`).

## Catálogo 22 — Régimen de percepción (`PerceptionRegime`)

`InternalSale` (`01`), `FuelAcquisition` (`02`), `SpecialRate` (`03`).

## Catálogo 23 — Régimen de retención (`RetentionRegime`)

`Rate3` (`01`), `Rate6` (`02`).

## Catálogo 51 — Tipo de operación (`OperationType`)

Subconjunto curado (20 cases) de las operaciones de venta, exportación, detracción y percepción comunes:

| Case | Código | Operación |
|---|---|---|
| `InternalSale` | `0101` | Venta interna |
| `InternalSaleDeductibleExpenses` | `0112` | Venta interna — sustenta gastos deducibles |
| `InternalSaleNrus` | `0113` | Venta interna — NRUS |
| `GoodsExport` | `0200` | Exportación de bienes |
| `ServiceExportDomestic` | `0201` | Exportación de servicios — prestación de servicios en el país |
| `ServiceExportLodging` | `0202` | Exportación de servicios — hospedaje |
| `ServiceExportShipping` | `0203` | Exportación de servicios — transporte de navieras |
| `ServiceExportForeignFlagVessels` | `0204` | Exportación de servicios — naves de bandera extranjera |
| `ServiceExportTouristPackage` | `0205` | Exportación de servicios — paquete turístico |
| `ServiceExportCargoComplementary` | `0206` | Exportación de servicios — complementarios al transporte de carga |
| `ServiceExportZedElectricity` | `0207` | Exportación de servicios — suministro de energía a ZED |
| `ServiceExportPartiallyAbroad` | `0208` | Exportación de servicios — prestados parcialmente en el extranjero |
| `DomesticAirWaybill` | `0301` | Guía aérea nacional |
| `RailPassengerTransport` | `0302` | Transporte ferroviario de pasajeros |
| `NonDomiciledNonExport` | `0401` | Venta a no domiciliados que no califica como exportación |
| `SubjectToDetraction` | `1001` | Operación sujeta a detracción |
| `SubjectToDetractionHydrobiological` | `1002` | Detracción — recursos hidrobiológicos |
| `SubjectToDetractionPassengerTransport` | `1003` | Detracción — transporte de pasajeros |
| `SubjectToDetractionCargoTransport` | `1004` | Detracción — transporte de carga |
| `SubjectToPerception` | `2001` | Operación sujeta a percepción |

> [!NOTE]
> Los códigos `0102` (anticipos) y `0103` (venta itinerante) **no existen** en el catálogo oficial y quipu no
> los modela. Los anticipos se declaran con `InternalSale` (`0101`); la venta itinerante, con la leyenda
> `2005` del Cat. 52, no con un tipo de operación.

## Catálogo 52 — Leyendas (`LegendCode`)

`AmountInWords` (`1000`), `FreeTransfer` (`1002`), `PerceptionReceipt` (`2000`),
`AmazonGoodsConsumption` (`2001`), `AmazonServicesConsumption` (`2002`), `AmazonConstruction` (`2003`),
`TravelAgencyPackage` (`2004`), `ItinerantSale` (`2005`), `DetractionSubject` (`2006`), `IvapSubject` (`2007`),
`TacnaExemptSale` (`2008`), `TacnaCommercialZoneFirstSale` (`2009`), `SimplifiedDutyDrawback` (`2010`).

## Catálogo 53 — Motivo de cargo/descargo (`AllowanceChargeReason`)

Motivo de un `cac:AllowanceCharge` (`cbc:AllowanceChargeReasonCode`). Cubre descuentos, deducciones y
retenciones (`ChargeIndicator=false`) y cargos, FISE, el recargo al consumo y percepciones
(`ChargeIndicator=true`). **21 cases**:

| Case | Código | Motivo | `isCharge()` | `affectsBase()` |
|---|---|---|:--:|:--:|
| `ItemDiscountAffectsBase` | `00` | Descuento de línea que afecta la base | `false` | **`true`** |
| `ItemDiscountNoBase` | `01` | Descuento de línea que no afecta la base | `false` | `false` |
| `GlobalDiscountAffectsBase` | `02` | Descuento global que afecta la base | `false` | **`true`** |
| `GlobalDiscountNoBase` | `03` | Descuento global que no afecta la base | `false` | `false` |
| `GlobalDiscountTaxedAdvance` | `04` | Descuento global por anticipo gravado | `false` | **`true`** |
| `GlobalDiscountExemptAdvance` | `05` | Descuento global por anticipo exonerado | `false` | `false` |
| `GlobalDiscountNonTaxableAdvance` | `06` | Descuento global por anticipo inafecto | `false` | `false` |
| `CompensationFactor` | `07` | Factor de compensación (DU 010-2004) | `false` | `false` * |
| `Fise` | `45` | FISE (Ley 29852) | `true` | `false` |
| `ConsumptionSurcharge` | `46` | Recargo al consumo | `true` | `false` |
| `ItemChargeAffectsBase` | `47` | Cargo de línea que afecta la base | `true` | **`true`** |
| `ItemChargeNoBase` | `48` | Cargo de línea que no afecta la base | `true` | `false` |
| `GlobalChargeAffectsBase` | `49` | Cargo global que afecta la base | `true` | **`true`** |
| `GlobalChargeNoBase` | `50` | Cargo global que no afecta la base | `true` | `false` |
| `InternalSalePerception` | `51` | Percepción — venta interna | `true` | `false` |
| `FuelPerception` | `52` | Percepción — adquisición de combustible | `true` | `false` |
| `SpecialRatePerception` | `53` | Percepción — tasa especial | `true` | `false` |
| `ContributionFactor` | `54` | Factor de aportación (DU 010-2004) | `true` | `false` * |
| `IscAdvanceDeduction` | `60` | Deducción de anticipo de ISC | `false` | `false` * |
| `IncomeTaxAdvanceWithholding` | `61` | Retención de renta de segunda categoría | `false` | `false` |
| `IgvWithholding` | `62` | Retención del IGV | `false` | `false` |

\* Códigos `07`, `54` y `60`: `affectsBase()` devuelve `false` de forma **conservadora**; no pudo confirmarse
contra una fuente primaria de SUNAT (factores del DU 010-2004 y la deducción de anticipo de ISC). No los des
por verificados sin revisar la norma.

### `isCharge(): bool`

El `ChargeIndicator` de UBL: **`true`** cuando el motivo **suma** al total (cargos, FISE, recargo al consumo,
percepciones y el factor de aportación `54`); **`false`** cuando **resta** (descuentos, deducciones y
retenciones). No es una propiedad del monto, sino del motivo: el enum ya sabe de qué lado va.

### `affectsBase(): bool`

Si el monto afecta la **base imponible del IGV/IVAP**. Devuelve `true` **solo** para cinco códigos:
`00`, `02`, `04`, `47` y `49` — es decir, los pares línea/global de descuento y cargo marcados explícitamente
como "que afecta la base", más el anticipo gravado.

> [!WARNING]
> `01`–`05` **no** afectan todos la base: de ese rango solo `02` y `04` lo hacen (`01`, `03` y `05` son
> justamente las variantes "que no afecta la base"). Y `00` y `47`/`49`, fuera de ese rango, sí la afectan.
> Guíate por la columna de la tabla, no por el rango del código.

> [!IMPORTANT] Códigos con modelo propio o sin implementar
> - **`51`, `52`, `53` (percepciones)** se modelan con [`SalePerception`](/referencia/modelos) cuando van
>   embebidas en una factura, **no** con el array genérico `Invoice::$allowanceCharges`:
>   `InvoiceValidator` los **rechaza** ahí.
> - **`61`** (retención de renta embebida) **no tiene modelo todavía**: sus mecánicas dentro de una factura no
>   están confirmadas, así que queda pendiente. Se excluye defensivamente —junto con `51`–`53`— del reparto
>   `AllowanceTotalAmount`/`ChargeTotalAmount` para que no descuadre el importe a pagar si aun así lo colocas
>   en `Invoice::$allowanceCharges`.

## Catálogo 54 — Bien o servicio sujeto a detracción (`DetractionGood`)

Va en `cbc:PaymentMeansID` dentro del `cac:PaymentTerms` de la detracción; se usa desde `Detraction::$goodCode`.
**42 cases** — los códigos `001`–`037`, `039`–`041`, `045` y `099` confirmados contra tres fuentes
independientes. Los códigos `038`, `042`, `043` y `044` (espectáculos, ladrillos, estructuras metálicas,
beneficio de minerales) se reportan como "no vigente" por una única fuente sin confirmar y **quedan sin tipar**
a propósito, en vez de adivinarlos.

| Case | Código | Bien o servicio | `isActive()` |
|---|---|---|:--:|
| `SugarAndCaneMolasses` | `001` | Azúcar y melaza de caña | `true` |
| `Rice` | `002` | Arroz | `true` |
| `EthylAlcohol` | `003` | Alcohol etílico | `true` |
| `HydrobiologicalResources` | `004` | Recursos hidrobiológicos | `true` |
| `HardYellowMaize` | `005` | Maíz amarillo duro | `true` |
| `Cotton` | `006` | Algodón | **`false`** |
| `SugarCane` | `007` | Caña de azúcar | `true` |
| `Wood` | `008` | Madera | `true` |
| `SandAndStone` | `009` | Arena y piedra | `true` |
| `WasteAndScrap` | `010` | Residuos, subproductos, desechos y recortes | `true` |
| `IgvTaxedGoodsExemptionWaiver` | `011` | Bienes gravados con IGV por renuncia a la exoneración | `true` |
| `LaborIntermediationAndOutsourcing` | `012` | Intermediación laboral y tercerización | `true` |
| `LiveAnimals` | `013` | Animales vivos | **`false`** |
| `MeatAndEdibleOffal` | `014` | Carnes y despojos comestibles | `true` |
| `FertilizersHidesAndSkins` | `015` | Abonos, cueros y pieles | **`false`** |
| `FishOil` | `016` | Aceite de pescado | `true` |
| `FishAndShellfishMealAndPellets` | `017` | Harina, polvo y pellets de pescado y crustáceos | `true` |
| `FishingVessels` | `018` | Embarcaciones pesqueras | **`false`** |
| `MovablePropertyLease` | `019` | Arrendamiento de bienes muebles | `true` |
| `MovablePropertyMaintenanceAndRepair` | `020` | Mantenimiento y reparación de bienes muebles | `true` |
| `CargoHandling` | `021` | Movimiento de carga | `true` |
| `OtherBusinessServices` | `022` | Otros servicios empresariales | `true` |
| `RawMilk` | `023` | Leche cruda entera | `true` |
| `CommercialCommission` | `024` | Comisión mercantil | `true` |
| `ContractManufacturing` | `025` | Fabricación de bienes por encargo | `true` |
| `PersonTransportService` | `026` | Servicio de transporte de personas | `true` |
| `CargoTransportService` | `027` | Servicio de transporte de carga | `true` |
| `PassengerTransport` | `028` | Transporte de pasajeros | `true` |
| `RawUnginnedCotton` | `029` | Algodón en rama sin desmotar | **`false`** |
| `ConstructionContracts` | `030` | Contratos de construcción | `true` |
| `IgvTaxedGold` | `031` | Oro gravado con IGV | `true` |
| `PaprikaAndCapsicumFruits` | `032` | Páprika y otros frutos del género capsicum | `true` |
| `Asparagus` | `033` | Espárragos | **`false`** |
| `NonGoldMetallicMinerals` | `034` | Minerales metálicos no auríferos | `true` |
| `IgvExemptGoods` | `035` | Bienes exonerados del IGV | `true` |
| `IgvExemptGoldAndMetallicMinerals` | `036` | Oro y demás minerales metálicos exonerados del IGV | `true` |
| `OtherIgvTaxedServices` | `037` | Demás servicios gravados con el IGV | `true` |
| `NonMetallicMinerals` | `039` | Minerales no metálicos | `true` |
| `IgvTaxedRealEstateFirstSale` | `040` | Primera venta de inmuebles gravada con IGV | `true` |
| `Lead` | `041` | Plomo | `true` |
| `GoldMineralsAndConcentratesIgvTaxed` | `045` | Minerales y concentrados de oro gravados con IGV | `true` |
| `Law30737` | `099` | Ley 30737 | `true` |

### `isActive(): bool`

Si SUNAT **sigue aplicando** detracción al bien o servicio. Devuelve `false` solo para seis casos: `Cotton`,
`FishingVessels`, `RawUnginnedCotton` y `Asparagus` (retirados del Anexo 2 con efecto **31/12/2014**), y
`LiveAnimals` y `FertilizersHidesAndSkins` (retirados con efecto **08/01/2005**). Todos los demás están
activos, incluido el `045`, añadido por la R.S. 086-2025 con vigencia desde abril de 2025.

Los cases derogados **se conservan** para poder leer y reprocesar comprobantes históricos; `isActive()` es lo
que te dice si puedes emitir con ese código hoy.

## Catálogo 59 — Medio de pago de la detracción (`DetractionPaymentMethod`)

Va en `cbc:PaymentMeansCode`; se usa desde `Detraction::$paymentMethod`. **22 cases**:

| Case | Código | Medio de pago |
|---|---|---|
| `AccountDeposit` | `001` | Depósito en cuenta |
| `MoneyOrder` | `002` | Giro |
| `FundsTransfer` | `003` | Transferencia de fondos |
| `PaymentOrder` | `004` | Orden de pago |
| `DebitCard` | `005` | Tarjeta de débito |
| `DomesticFinancialCreditCard` | `006` | Tarjeta de crédito emitida en el país por empresa del sistema financiero |
| `NonNegotiableCheck` | `007` | Cheque con cláusula "no negociable" u otra equivalente |
| `CashNoPaymentMethodObligation` | `008` | Efectivo, por operaciones sin obligación de usar medio de pago |
| `CashOtherCases` | `009` | Efectivo, en los demás casos |
| `ForeignTradePaymentMethod` | `010` | Medios de pago usados en comercio exterior |
| `EdpymeAndCreditUnionDocument` | `011` | Documentos emitidos por EDPYME y cooperativas de ahorro y crédito |
| `NonFinancialCreditCard` | `012` | Tarjeta de crédito no emitida por empresa del sistema financiero |
| `ForeignIssuedCreditCard` | `013` | Tarjeta de crédito emitida en el exterior |
| `ForeignTradeTransfer` | `101` | Transferencias — comercio exterior |
| `ForeignTradeBankCheck` | `102` | Cheques bancarios — comercio exterior |
| `ForeignTradeSimplePaymentOrder` | `103` | Orden de pago simple — comercio exterior |
| `ForeignTradeDocumentaryPaymentOrder` | `104` | Orden de pago documentario — comercio exterior |
| `ForeignTradeSimpleRemittance` | `105` | Remesa simple — comercio exterior |
| `ForeignTradeDocumentaryRemittance` | `106` | Remesa documentaria — comercio exterior |
| `ForeignTradeSimpleLetterOfCredit` | `107` | Carta de crédito simple — comercio exterior |
| `ForeignTradeDocumentaryLetterOfCredit` | `108` | Carta de crédito documentario — comercio exterior |
| `Other` | `999` | Otros medios de pago |

## Catálogo 61 — Documento relacionado de la GRE (`GreRelatedDocumentType`)

Específico de la **guía de remisión electrónica** (GRE 2.0, R.S. 000123-2022/SUNAT); va en
`cbc:DocumentTypeCode` del `cac:AdditionalDocumentReference` raíz, con `listURI` de `catalogo61`. Se usa desde
`GreRelatedDocument`. **No confundir con el Cat. 12**, que es genérico a los documentos de venta.

| Case | Código | Documento |
|---|---|---|
| `Invoice` | `01` | Factura |
| `SalesReceipt` | `03` | Boleta de venta |
| `PurchaseSettlement` | `04` | Liquidación de compra |
| `SenderDespatchGuide` | `09` | Guía de remisión remitente |
| `CashRegisterTicket` | `12` | Ticket de máquina registradora |
| `CarrierDespatchGuide` | `31` | Guía de remisión transportista |
| `IvapDepositProof` | `49` | Constancia de depósito — IVAP |
| `CustomsDeclaration` | `50` | Declaración aduanera de mercancías |
| `SimplifiedDeclaration` | `52` | Declaración simplificada |
| `DetractionDepositProof` | `80` | Constancia de depósito de detracción |
| `ScopAuthorizationCode` | `81` | Código de autorización SCOP |
| `MovingAffidavit` | `82` | Declaración jurada de mudanza |

> [!NOTE]
> La tabla oficial lista cada código **dos veces** (variante "electrónica" e "impresa o importada"), pero el
> valor del código es el mismo, así que aquí cada código tiene un solo case. Los códigos `48` y `65`–`69` se
> mencionan en fuentes secundarias pero no están confirmados en la tabla primaria: quedan sin tipar.

## Indicadores de traslado de la GRE (`GreTransferIndicator`)

Cero o más `cac:Shipment/cbc:SpecialInstructions` de la **GRE Remitente** (R.S. 000123-2022/SUNAT). El *value*
del enum **es el token literal de SUNAT**, prefijo incluido — no hay un código aparte que mapear.

| Case | Token (`value`) |
|---|---|
| `ScheduledTransshipment` | `SUNAT_Envio_IndicadorTransbordoProgramado` |
| `TransferInM1LVehicle` | `SUNAT_Envio_IndicadorTrasladoVehiculoM1L` |
| `ReturnWithEmptyContainers` | `SUNAT_Envio_IndicadorRetornoVehiculoEnvaseVacio` |
| `ReturnEmptyVehicle` | `SUNAT_Envio_IndicadorRetornoVehiculoVacio` |
| `TotalTransferDamOrDs` | `SUNAT_Envio_IndicadorTrasladoTotalDAMoDS` |
| `CarrierVehiclesAndDrivers` | `SUNAT_Envio_IndicadorVehiculoConductoresTransp` |

> [!WARNING]
> Estos 6 tokens son **exclusivos de la GRE Remitente**. La GRE Transportista usa un conjunto distinto y más
> amplio que este enum **no** cubre.

## Catálogos 63/64 — Puerto o aeropuerto (`PortLocationType`)

Tipo del primer punto de llegada (`cac:Shipment/cac:FirstArrivalPortLocation`) de un traslado de
importación/exportación: puerto marítimo (Cat. 63) o aeropuerto (Cat. 64). Se usa desde `PortLocation`.

> [!IMPORTANT]
> Es el **único enum sin backing** de `Catalog\`: `enum PortLocationType` (sin `: string`). No tiene `->value`;
> los valores se obtienen por métodos.

| Case | `locationTypeCode()` | `schemeName()` | `schemeUri()` |
|---|---|---|---|
| `SeaPort` | `1` | `Puertos` | `urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo63` |
| `Airport` | `2` | `Aeropuertos` | `urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo64` |

Ambos catálogos comparten el mismo campo `cbc:ID` en el XML: solo `cbc:LocationTypeCode` (`1` vs `2`) y el
`schemeURI` los distinguen. Por eso el enum carga esa metadata en vez de duplicarla en cada call site.

> [!NOTE]
> Los Cat. 63/64 en sí (21 puertos, 31 aeropuertos, y creciendo por resolución de SUNAT) **no** se modelan como
> enums cerrados: `PortLocation::$code` es un string libre, para que quipu no quede clavado a una foto del
> catálogo.

## Forma de pago (`PaymentForm`)

> [!WARNING] Namespace
> `PaymentForm` vive en **`ElPandaPe\Quipu\Model\`**, no en `Catalog\` — no es un catálogo SUNAT formal, sino
> un campo del modelo. `use ElPandaPe\Quipu\Catalog\PaymentForm;` **falla**.

Campo obligatorio desde la R.S. 000193-2020/SUNAT: el documento debe declarar si se paga contra entrega o a
crédito.

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Model\PaymentForm;

PaymentForm::Cash;    // 'Contado' (default en Invoice y Note)
PaymentForm::Credit;  // 'Credito' (requiere installments)
```

</template>
</CodeTabs>

## Estado del ítem de resumen (`SummaryStatus`)

> [!WARNING] Namespace
> Igual que `PaymentForm`, `SummaryStatus` vive en **`ElPandaPe\Quipu\Model\`**, no en `Catalog\`.

Catálogo 19 — estado de un documento dentro de una línea del resumen diario (`SummaryItem::$status`):

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Model\SummaryStatus;

SummaryStatus::Add;     // '1' — adicionar (el caso normal: informar la boleta)
SummaryStatus::Modify;  // '2' — modificar
SummaryStatus::Cancel;  // '3' — anular
```

</template>
</CodeTabs>

## Catálogos de referencia (no enums)

`CatalogRepository` trae los catálogos **tabulares** de SUNAT —los que corren en cientos o miles de
filas y no se modelan como enums— como mapas planos `código => descripción`, leídos una sola vez desde archivos
PHP embebidos en `resources/catalog/`. Existe para **validar** códigos ya elegidos (propios o de terceros)
contra la tabla completa, no para construir documentos: el enum curado `UnitOfMeasure` sigue siendo lo
que usas al armar un `SaleDetail`; el repositorio es lo que te dice si un código que **llegó** de fuera existe
de verdad.

::: tip Curado vs. completo
`UnitOfMeasure` son 22 unidades comerciales comunes para *construir*. El `CatalogRepository` trae las
**2136** entradas de la Recomendación 20 de UN/ECE para *validar* cualquier código que llegue, aunque no esté en
el enum. Esos son dos papeles distintos a propósito.
:::

### Tablas cargadas

| Clave (constante) | Catálogo SUNAT | Archivo | Filas | Fuente |
|---|---|---|---|---|
| `'country'` (`COUNTRY`) | Cat. 04 — País | `cat04-countries.php` | 249 | ISO 3166-1 alpha-2 |
| `'unit'` (`UNIT`) | Cat. 03 — Unidades de medida | `cat03-units.php` | 2136 | UN/ECE Rec. 20 (incluye códigos deprecados que SUNAT aún acepta) |
| `'ubigeo'` (`UBIGEO`) | Cat. 13 — Ubicación geográfica | `cat13-ubigeo.php` | 1891 | INEI (1891 distritos) |

> [!IMPORTANT] La clave no es el número de catálogo
> El repositorio identifica cada tabla por una **clave semántica** (`'country'`, `'unit'`, `'ubigeo'`), no por su
> número. Así `'country'` es el Cat. 04 y `'unit'` el Cat. 03. Usa las constantes públicas
> `CatalogRepository::COUNTRY`, `::UNIT`, `::UBIGEO` en vez del string suelto.

Las descripciones son orientativas: los nombres de país son los cortos en español de CLDR (no la redacción
exacta de la Tabla 4 de SUNAT, que no fue posible contrastar) y los de unidad vienen en inglés, tal como los
publica UN/ECE. Para la validación lo que importa es el **código**, no el nombre.

### Lo que NO trae: Cat. 25 (UNSPSC)

El código de producto (`SaleDetail::$sunatProductCode`, Cat. 25 UNSPSC) **no está cargado**: el estándar
UNSPSC completo son unos 150.000 códigos sin una fuente oficial y contrastable del subconjunto exacto que SUNAT
valida, así que cargarlo significaría enviar la tabla equivocada o adivinar. Es una decisión deliberada de
diferir, no un hueco temporal. La constante `UNSPSC = 'unspsc'` existe reservada para cuando se conecte una
fuente verificada; mientras tanto `knows('unspsc')` devuelve `false`, que es la señal que usa
`CatalogValidator` para **saltar** la validación del código de producto en lugar de rechazarlo.

### API pública

<CodeTabs>
<template #php>

```php
use ElPandaPe\Quipu\Reference\CatalogRepository;

$repo = CatalogRepository::fromResourceDirectory(); // lee resources/catalog/

// ¿Está cargada la tabla?
$repo->knows(CatalogRepository::COUNTRY); // true
$repo->knows(CatalogRepository::UNSPSC);  // false (no cargada)

// ¿Existe el código en la tabla?
$repo->has(CatalogRepository::UBIGEO, '150101'); // true
$repo->has(CatalogRepository::UBIGEO, '000000'); // false

// La descripción del código, o null si no existe (o la tabla no está cargada)
$repo->get(CatalogRepository::UBIGEO, '150101');  // 'LIMA / LIMA / LIMA'
$repo->get(CatalogRepository::COUNTRY, 'PE');     // 'Perú'
$repo->get(CatalogRepository::UNSPSC, '84121506'); // null

// El mapa completo código => descripción (vacío si la tabla no está cargada)
$repo->all(CatalogRepository::COUNTRY); // ['PE' => 'Perú', 'AR' => 'Argentina', ...]
```

</template>
</CodeTabs>

| Método | Firma | Qué devuelve |
|---|---|---|
| `fromResourceDirectory` | `(?string $directory = null): self` | Carga todas las tablas registradas desde `resources/catalog/` (o el directorio que pases). Factory estática. |
| `fromCatalogs` | `(array $catalogs): self` | Construye con mapas en memoria, sin tocar el sistema de archivos (para tests). |
| `knows` | `(string $catalog): bool` | Si la tabla está cargada. `false` para UNSPSC. |
| `has` | `(string $catalog, string $code): bool` | Si el código existe en la tabla (siempre `false` si la tabla no está cargada). |
| `get` | `(string $catalog, string $code): ?string` | La descripción del código, o `null` si falta el código o la tabla. |
| `all` | `(string $catalog): array` | El mapa completo `código => descripción`. |

La clase es `readonly` e inmutable: cada tabla se lee una sola vez, al construirla.

### Cómo se consume

El repositorio por sí solo no valida nada; es `CatalogValidator` quien lo consulta. Ese validador es
**opt-in** (no forma parte del `CompositeValidator` por defecto) y hoy solo juzga `Invoice` y `Note`. Ver
[Validación local — Validación de catálogos](/guias/validacion-local#validacion-de-catalogos-opt-in) para
activarlo.

::: warning Qué protección real añade la tabla
No todos los campos se benefician por igual de la tabla completa:
- **Unidades (Cat. 03)**: **no** son una brecha. `SaleDetail::$unit` está tipado con el enum
  `UnitOfMeasure`, así que una unidad inválida es inconstruible — la tabla del repositorio no añade
  protección ahí.
- **País (`Address::$country`)**: string plano con default `'PE'` — aquí sí gana: sin la tabla, cualquier
  código pasa.
- **UBIGEO (`Address::$ubigeo`)**: string plano (nullable) — aquí es donde la validación atrapa códigos
  inexistentes.
:::

## Siguiente paso

- [Modelos](/referencia/modelos) — dónde se usan los catálogos.
- [Documentos](/documentos/factura) — ejemplos por tipo.
