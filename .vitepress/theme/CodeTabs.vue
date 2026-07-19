<script setup lang="ts">
// Multi-language code block. Renders one tab per configured language and shows
// the slot for the globally-selected language. Selecting a language here syncs
// every other <CodeTabs> on the site and persists the choice (see useLang.ts).
//
// Usage in Markdown (blank lines around the fenced block are required so
// markdown-it renders it):
//
//   <CodeTabs>
//   <template #php>
//
//   ```php
//   $invoice = ...
//   ```
//
//   </template>
//   </CodeTabs>
//
// Languages without a slot show a "próximamente" placeholder automatically.
import { computed, onMounted, useSlots } from 'vue'
import { currentLang, hydrateLang, languageLabel, languages, setLang } from './useLang'

const slots = useSlots()

onMounted(hydrateLang)

const currentLabel = computed(() => languageLabel(currentLang.value))
const hasCurrentSlot = computed(() => Boolean(slots[currentLang.value]))

function select(id: string, available: boolean): void {
  if (available) {
    setLang(id)
  }
}
</script>

<template>
  <div class="code-tabs">
    <div class="code-tabs__tabs" role="tablist" aria-label="Lenguaje de ejemplo">
      <button
        v-for="lang in languages"
        :key="lang.id"
        type="button"
        role="tab"
        class="code-tabs__tab"
        :class="{
          'is-active': lang.available && currentLang === lang.id,
          'is-disabled': !lang.available,
        }"
        :aria-selected="lang.available && currentLang === lang.id"
        :disabled="!lang.available"
        :title="lang.available ? lang.label : `Ejemplo en ${lang.label} próximamente`"
        @click="select(lang.id, lang.available)"
      >
        {{ lang.label }}
        <span v-if="!lang.available" class="code-tabs__soon">pronto</span>
      </button>
    </div>

    <div class="code-tabs__panel">
      <slot v-if="hasCurrentSlot" :name="currentLang" />
      <p v-else class="code-tabs__placeholder">
        Ejemplo en {{ currentLabel }} próximamente
      </p>
    </div>
  </div>
</template>
