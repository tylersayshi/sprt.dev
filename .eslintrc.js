module.exports = {
  extends: 'eslint:recommended',
  parser: 'babel-eslint',
  env: {
    node: true,
    'jest/globals': true,
    browser: true,
    es6: true
  },
  plugins: ['jest']
};
