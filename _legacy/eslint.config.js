import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config} */
export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    env: {
      node: true
    }
  }
];
