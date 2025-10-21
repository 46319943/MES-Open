import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // Used for vitest to resolve paths. Without this plugin, your tests would fail because Vitest wouldn't understand these custom path aliases and would treat them as external packages rather than local file references.
    tsconfigPaths()
  ],
  test: {
    // any test-specific config
  },
})

