// Every page lib's Vitest setup (its vite.config.mts is `webTestConfig(import.meta.dirname)`): the app's specs, with
// the fakes.
import react from '@vitejs/plugin-react';
import { relative, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

export const webTestConfig = (root: string) => {
  const project = relative(workspaceRoot, root);
  return defineConfig({
    root,
    cacheDir: `${workspaceRoot}/node_modules/.vite/${project}`,
    plugins: [react()],
    resolve: { tsconfigPaths: true }, // @nba/* aliases from tsconfig.base.json
    test: {
      name: project,
      watch: false,
      globals: true,
      environment: 'jsdom',
      testTimeout: 30_000,
      // theme.tsx reads the palette from theme.module.scss's :export, so that file needs real compiling.
      css: { include: [/theme\.module\.scss$/] },
      setupFiles: [`${import.meta.dirname}/src/lib/test-setup.ts`],
      include: ['src/**/*.spec.{ts,tsx}'],
      reporters: ['default'],
    },
  });
};
