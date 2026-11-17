// @ts-check
import preact from '@astrojs/preact'
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
  // The islands of spec 001 §3.4.
  integrations: [preact()],
  security: {
    // Each page carries its policy in a <meta> tag. Astro adds script-src and style-src: 'self'
    // and the SHA-256 hashes of the inline script and style it writes for the island loader.
    // frame-ancestors has no effect in a <meta> tag; public/_headers sends it.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "connect-src 'self' https://eu.i.posthog.com",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
})
