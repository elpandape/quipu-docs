---
layout: home

hero:
  name: quipu
  text: Facturación electrónica SUNAT
  tagline: 'La librería de facturación electrónica de SUNAT (CPE Perú) para todo el ecosistema: construye el XML UBL, lo firma, lo envía a SUNAT y parsea el CDR. Hoy, en PHP puro y sin framework.'
  image:
    src: /favicon.svg
    alt: quipu
  actions:
    - theme: brand
      text: Empezar
      link: /empezando/introduccion
    - theme: alt
      text: Inicio rápido
      link: /empezando/inicio-rapido

features:
  - icon: 🧾
    title: El UBL que exige SUNAT
    details: 'Construye el XML con DOM contra el esquema oficial de cada familia: UBL 2.1 para factura, boleta, notas y guías; UBL 2.0 para resumen diario, baja, reversión, retención y percepción.'
  - icon: 🔏
    title: Firma xmldsig
    details: Firma enveloped con RSA dentro de UBLExtensions, como exige SUNAT. Apoyada en xmlseclibs, la librería estándar de cripto XML.
  - icon: 📡
    title: Envío SOAP y REST
    details: Transporte a los webservices SOAP de SUNAT con WS-Security para comprobantes, y API REST con OAuth para guías de remisión.
  - icon: 📄
    title: CDR tipado
    details: Parsea la Constancia de Recepción y devuelve un CdrResult con estado, código, descripción, observaciones y severidad para reintentos.
  - icon: 🧩
    title: Agnóstica de framework
    details: Cero Laravel, cero Symfony en el core. DI por constructor, DTOs readonly, enums para los catálogos. Corre en cualquier proyecto PHP 8.4+.
  - icon: ✅
    title: Validación local previa
    details: 'Llama a assertValid() y valida reglas de negocio de SUNAT y el esquema XSD antes de firmar y enviar. Es opt-in: emit() no valida por su cuenta, tú decides cuándo pagar el costo.'
    link: /guias/validacion-local
    linkText: Ver la guía
  - icon: 🖨️
    title: Representación impresa y QR
    details: El string del QR del Anexo N.º 6 y una vista de impresión tipada con partes, líneas y totales, listos para tu plantilla. El PDF lo renderizas tú, con el motor que prefieras.
    link: /guias/representacion-impresa
    linkText: Ver la guía
---

::: tip Estado
El **emisor** `elpandape/quipu-lite` ya está en **Packagist** en su versión estable **`v1.0.0`** y sigue
[Semantic Versioning](https://semver.org): dentro de `1.x` no hay cambios incompatibles en la API pública. La
edición **Pro** (comercial) aún no se publica. Detalle en [Estado y versionado](/proyecto/estado-y-versionado).
:::

::: tip Una maquinaria, varios lenguajes
quipu documenta **el dominio de SUNAT**, no la API de un lenguaje: la explicación es la misma sin importar en qué
esté escrita la librería. Hoy la **implementación de referencia es PHP** —lo único instalable ahora—, y el diseño
apunta a un **ecosistema multi-lenguaje**. Por eso los ejemplos usan un selector de lenguaje: hoy muestran PHP y
el resto anuncia "próximamente". Ver [Ecosistema](/proyecto/ecosistema).
:::

<script setup>
import { VPButton } from 'vitepress/theme'
</script>

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #3aa675, #1f8a5b);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #3aa67522, #1f8a5b22);
  --vp-home-hero-image-filter: blur(44px);
  --vp-button-brand-bg: #3aa675;
  --vp-button-brand-hover-bg: #2f9267;
  --vp-c-brand-1: #3aa675;
  --vp-c-brand-2: #2f9267;
  --vp-c-brand-3: #1f8a5b;
}
</style>
