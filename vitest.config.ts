import { defineConfig } from 'vitest/config';

// The zone aliases have one owner, tsconfig.json; Vite reads them from there.
export default defineConfig({ resolve: { tsconfigPaths: true } });
