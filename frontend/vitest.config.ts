import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The monorepo root hoists React 19 (used by @testing-library/react, which is also
    // hoisted), while the frontend app's own node_modules has React 18. Mixing them
    // ("a React 18 element rendered by the React 19 renderer") breaks tests. Pin
    // react/react-dom and their subpaths to the single hoisted React 19 copy so the
    // element factory and the renderer always match.
    dedupe: ['react', 'react-dom'],
    alias: {
      // Most specific first — a bare `react-dom` alias does not catch the
      // `react-dom/client` subpath that the jsx runtime / app code imports. Pointing
      // these at the root copy matches what @testing-library/react resolves via Node.
      'react-dom/client': path.resolve(__dirname, '../node_modules/react-dom/client.js'),
      'react-dom/test-utils': path.resolve(__dirname, '../node_modules/react-dom/test-utils.js'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': path.resolve(__dirname, '../node_modules/react/jsx-runtime.js'),
      react: path.resolve(__dirname, '../node_modules/react'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
