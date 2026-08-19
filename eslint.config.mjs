// @ts-check
import eslint from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/.react-router/**',
      '**/.wrangler/**',
      '**/.pnpm-store/**',
      '**/.workspace/**',
      '**/coverage/**',
      'test-results/**',
      'e2e/*.spec.ts-snapshots/**',
      '**/*.d.ts',
      // Installed agent skills ship their own tooling, not project code.
      '.claude/**',
      '.agents/**',
      // Package build outputs.
      'packages/*/lib/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The classic pair; the v7 compiler-powered presets flag working UI code.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      // An underscore prefix marks an intentionally unused binding.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Standalone Node scripts (build, IndexNow, doc checks).
    files: ['**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
