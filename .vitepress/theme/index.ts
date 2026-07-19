// Custom theme: extends the VitePress default and registers the global
// components used across the docs (<CodeTabs>, <Availability>).
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import Availability from './Availability.vue'
import CodeTabs from './CodeTabs.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodeTabs', CodeTabs)
    app.component('Availability', Availability)
    
    // Initialize Vercel Web Analytics
    inject()
    
    // Initialize Vercel Speed Insights
    injectSpeedInsights()
  },
} satisfies Theme
