import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'e2e'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'server/**/*.ts',
        'shared/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/*.test.*',
        'server/index.ts',
        'server/vite.ts',
        'server/db.ts',
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});

