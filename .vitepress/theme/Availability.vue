<script setup lang="ts">
// Edition availability badges. Shows whether a feature ships in Lite and/or Pro.
//
// Usage in Markdown:
//   <Availability lite pro />        both editions
//   <Availability lite />            Lite only (Pro shows ✗)
//   <Availability :pro="true" />     Pro only (Lite shows ✗)
withDefaults(defineProps<{ lite?: boolean; pro?: boolean }>(), {
  lite: false,
  pro: false,
})
</script>

<template>
  <span class="availability" role="group" aria-label="Disponibilidad por edición">
    <span class="availability__item" :class="lite ? 'is-yes' : 'is-no'">
      <span class="availability__mark" aria-hidden="true">{{ lite ? '✓' : '✗' }}</span>
      Lite
    </span>
    <span class="availability__item" :class="pro ? 'is-yes' : 'is-no'">
      <span class="availability__mark" aria-hidden="true">{{ pro ? '✓' : '✗' }}</span>
      Pro
    </span>
  </span>
</template>
