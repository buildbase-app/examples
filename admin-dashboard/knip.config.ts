// Modified from satnaing/shadcn-admin: the api/ functions are entry points.
import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // Vercel Functions: deployed from the folder, not imported by the app.
  entry: ['api/**/*.ts'],
  ignore: [
    'src/components/ui/**',
    'src/components/layout/app-title.tsx',
    'src/tanstack-table.d.ts',
  ],
}

export default config