// @ts-check
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://screens.guide',
  // Pages build to <path>.html and are served without a trailing slash; the Worker's
  // html_handling "auto-trailing-slash" maps /devices/iphone-17 to devices/iphone-17.html.
  trailingSlash: 'never',
  build: {
    format: 'file',
    // Every stylesheet is a file under /_astro/, so the content security policy needs no
    // 'unsafe-inline' for styles.
    inlineStylesheets: 'never',
  },
})
