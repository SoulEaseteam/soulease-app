// .eslintrc.cjs — ESLint config (legacy format)
//
// Pragmatic config: ตรวจสิ่งที่เป็นบั๊กจริง ไม่ใช่ "บูต๊อก" ทุกบรรทัด
// — `recommended-type-checked` เข้มพอจะจับ unsafe assignment / floating promise
// — disable rule ที่ noise สูง (no-confusing-void-expression, ฯลฯ) ใน legacy code
//
// ไฟล์เปิดด้วย CommonJS เพราะ package.json มี "type": "module"
//   → .js จะถูก parse เป็น ESM, ESLint v8 ใช้ require() ซึ่งโหลด ESM ไม่ได้
//   → ใช้ .cjs จึงปลอดภัยกว่า

module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "react-refresh", "react"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
  ],
  settings: {
    react: { version: "detect" },
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "functions/lib/",
    "scripts/",
    "removeAvailable.cjs",
    "cleanup.sh",
    ".eslintrc.js",
  ],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],

    // ─── Pragmatic overrides ──────────────────────────────────────────────
    // Legacy code ใช้ pattern เหล่านี้เยอะ — เปลี่ยนเป็น warn เพื่อไม่ block build

    // `||` ก็ใช้ได้ในเคสที่ string fallback ไม่ใช่บั๊ก
    "@typescript-eslint/prefer-nullish-coalescing": "warn",

    // MUI / event handlers รับ () => Promise<void> ได้จริง
    "@typescript-eslint/no-misused-promises": [
      "error",
      { checksVoidReturn: { attributes: false } },
    ],

    // arrow shorthand ที่ return void เป็น style preference
    "@typescript-eslint/no-confusing-void-expression": "off",

    // unused vars — เตือน (เพื่อกัน config drift) แต่ปล่อย _-prefix ผ่าน
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],

    // legacy code มี `any` เยอะ — warn ก่อน ค่อยลดทีหลัง
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "@typescript-eslint/no-unsafe-argument": "warn",

    // floating promises — ยังเตือน (สำคัญ) แต่ allow void prefix
    "@typescript-eslint/no-floating-promises": [
      "error",
      { ignoreVoid: true, ignoreIIFE: true },
    ],

    // type vs interface — let it be
    "@typescript-eslint/consistent-type-definitions": "off",

    // T[] preference — ปล่อย
    "@typescript-eslint/array-type": "off",

    // unnecessary conditional บน optional chain ที่ TS infer ไม่ได้แม่น
    "@typescript-eslint/no-unnecessary-condition": "warn",

    // template literal `${val}` กับ unknown / any
    "@typescript-eslint/restrict-template-expressions": [
      "warn",
      { allowNumber: true, allowBoolean: true, allowAny: true, allowNullish: true },
    ],

    // empty function (เช่น default async logout: async () => {})
    "@typescript-eslint/no-empty-function": "off",

    // non-null `!` — warn (แทนที่จะ error) เพื่อ legacy
    "@typescript-eslint/no-non-null-assertion": "warn",

    // assertion ที่ TS เห็นว่าไม่จำเป็น — warn
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",
  },
  overrides: [
    {
      // ไฟล์ config ของ build tools ไม่ต้องเข้มเรื่อง type strictness
      files: ["vite.config.ts", "*.config.ts", "*.config.cjs"],
      rules: {
        "@typescript-eslint/prefer-nullish-coalescing": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
      },
    },
  ],
};
