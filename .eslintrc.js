module.exports = {
  extends: 'eslint:recommended',
  parser: 'babel-eslint',
  env: {
    node: true,
    'jest/globals': true
  },
  plugins: ['jest']
};
