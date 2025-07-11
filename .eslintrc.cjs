module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react-refresh', 'react'],
  extends: [
    'eslint:recommended',

    // ✅ ใช้ rule ที่ตรวจ type เชิงลึก
    'plugin:@typescript-eslint/strict-type-checked',

    // ✅ เพิ่ม stylistic rules (optional)
    'plugin:@typescript-eslint/stylistic-type-checked',

    // ✅ React + JSX
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};