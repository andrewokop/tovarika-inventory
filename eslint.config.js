import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', URL: 'readonly', Blob: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.flat.recommended.rules, 'no-unused-vars': 'off' },
  },
  { files: ['vite.config.js'], languageOptions: { globals: { process: 'readonly' } } },
];
