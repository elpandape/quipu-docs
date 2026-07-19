# Checklist de go-live

<Availability lite pro />

Lista verificable antes de emitir de verdad. Está ordenada por lo que más duele si falla: primero lo que te
impide emitir, luego lo que te hace emitir **mal**, y al final lo que solo se nota semanas después.

> [!IMPORTANT]
> Los puntos marcados con 🔍 son **regulatorios y de sensibilidad temporal alta**: no los des por buenos porque
> lo diga esta documentación. Re-verifícalos contra la norma vigente antes del go-live.

## 1. Credenciales y certificado (si esto falla, no emites)

- [ ] **Certificado tributario real** de una entidad de certificación acreditada 🔍 — no el autofirmado de prueba.
- [ ] Certificado en **PEM**: certificado + llave privada concatenados, **sin passphrase**
      (ver [Certificados digitales](/guias/certificados)).
- [ ] **Fecha de caducidad** del certificado anotada, con alerta anticipada. Vencido = emisión detenida.
- [ ] **Usuario SOL secundario** creado, con permisos de emisión, y su clave.
- [ ] Usuario SOAP armado como `RUC + usuarioSOL` (p. ej. `20512345678MIUSUARIO`).
- [ ] Si emites **GRE**: `client_id` / `client_secret` de producción solicitados a SUNAT (OAuth, distinto de la Clave SOL).
- [ ] Certificado y credenciales **fuera del repositorio** y fuera de los logs.

## 2. Entorno

- [ ] `SoapEndpoints::production()` (no `beta()`), resuelto **desde configuración**, no cableado.
- [ ] Si emites GRE: `GreEndpoints::production()`. Recuerda que la beta era un
      [mock de la comunidad](/produccion/de-beta-a-produccion), no SUNAT.
- [ ] Extensiones PHP presentes en el servidor: `soap`, `dom`, `openssl`, `zip`.
- [ ] Salida a internet hacia los hosts de SUNAT permitida (firewall/proxy).

## 3. Datos del emisor y del comprobante

- [ ] **RUC y razón social** exactos, tal como figuran en SUNAT.
- [ ] **Series** correctas por tipo: `F` para factura, `B` para boleta 🔍 (las notas referencian la serie del
      documento que corrigen).
- [ ] **Forma de pago** consignada. Omitirla provoca el rechazo **3244** ("Debe consignar la información del
      tipo de transacción del comprobante"). En quipu el campo tiene default `PaymentForm::Cash`, así que el
      riesgo real es declarar `Credit` **sin** `installments`.
- [ ] **Catálogos vigentes** 🔍 — quipu curó un subconjunto (80/20). Si usas un código poco común, confirma que
      sigue vigente (ver [Catálogos SUNAT](/referencia/catalogos)).

## 4. Lo que quipu NO hace y debes tener resuelto

Esto es lo que más se subestima. quipu construye, firma, envía y parsea; **todo lo demás es tuyo**
(ver [Límites y alcance](/empezando/limites)).

- [ ] **Correlativos atómicos**: incrementales, **sin huecos ni duplicados**, incluso bajo concurrencia. Es un
      requisito de dominio, no un detalle. Si dos procesos emiten a la vez, necesitas un candado real.
- [ ] **Persistencia** del XML firmado, del CDR y del `digestValue`. quipu devuelve resultados tipados y no
      guarda nada.
- [ ] **Máquina de estados** del comprobante (emitido → informado → aceptado / observado / rechazado),
      tolerante a eventos duplicados y tardíos.
- [ ] **Envío diferido**: el Resumen Diario y los envíos dentro de plazo necesitan un proceso programado.
      quipu no agenda nada.
- [ ] **Reintentos** ante fallos de transporte, con idempotencia (ver [Operación](/produccion/operacion)).

## 5. Plazos 🔍

- [ ] Plazo de envío **verificado contra la norma vigente**. Las fuentes oficiales de SUNAT **se contradicen**
      entre sí (7 días vs. 3 días para facturas y Resumen Diario), y también difieren en el cómputo ("desde la
      emisión" vs. "desde el día siguiente"). Ver [Plazos de SUNAT](/dominio-sunat/plazos-sunat).
- [ ] Ante la duda, aplicada la **lectura más estricta** (3 días calendario desde el día siguiente): cumplir el
      plazo corto satisface también al largo; al revés no.
- [ ] Plazos **configurables**, no constantes en el código.
- [ ] Envío programado **con colchón** para reintentos dentro del plazo (si el plazo es 3 días, no dejes el
      envío para el día 3).

## 6. Validación previa

- [ ] `assertValid()` (o `validate()`) ejecutado antes de emitir, al menos en los tipos críticos. Ni `sign()`
      ni `emit()` validan implícitamente (ver [Validación previa](/guias/validacion-local)).
- [ ] Definido qué haces cuando `validate()` devuelve violaciones: no emitir y avisar, no "intentarlo igual".

## 7. Manejo de la respuesta

- [ ] Tratamiento distinto para **CDR aceptado**, **aceptado con observaciones** y **rechazado**. Un aceptado
      con observaciones **es válido**: no lo trates como error (ver [CDR y ciclo de vida](/dominio-sunat/cdr-ciclo-vida)).
- [ ] `SunatFaultException` capturada **antes** que `TransportException` (hereda de ella).
- [ ] Reintentos guiados por `CdrSeverity`, no por reintentar todo a ciegas (ver [Operación](/produccion/operacion)).

## 8. Conservación 🔍

- [ ] **Plazo de conservación** verificado contra la norma vigente, y almacenamiento acorde.
- [ ] XML firmado y CDR **recuperables** durante ese plazo, no solo "están en la base".
- [ ] Copia de respaldo probada: haber restaurado alguna vez, no suponer que se puede.

## 9. Representación impresa

- [ ] Si imprimes: el QR se genera desde `qrString()`, que **solo soporta factura, boleta y notas**. Para GRE,
      retención y percepción quipu lanza `InvalidDocumentException`
      (ver [Representación impresa y QR](/guias/representacion-impresa)).
- [ ] Requisitos formales del impreso (tamaños, ubicación del QR, leyendas obligatorias) verificados 🔍 — quipu
      te da los datos, no el diseño.

## 10. Después de lanzar

- [ ] **Vigilancia de cambios de SUNAT**: esquemas, catálogos y sobre todo **reglas** cambian. Monta el
      mecanismo antes de necesitarlo (ver [Vigilancia de cambios de SUNAT](/produccion/vigilancia-sunat)).
- [ ] Alertas ante una tasa de rechazo anómala: un cambio de SUNAT suele aparecer primero como rechazos nuevos
      — y las reglas nuevas **no** están en el XSD, así que un diff de esquemas no las verá.

## Siguiente paso

- [Operación en producción](/produccion/operacion)
