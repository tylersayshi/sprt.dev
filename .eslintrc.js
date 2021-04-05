module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parser: '@typescript-eslint/parser',
  env: {
    node: true,
    'jest/globals': true,
    browser: true,
    es6: true
  },
  plugins: ['jest'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
};
