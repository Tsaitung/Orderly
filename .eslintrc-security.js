// Dedicated ESLint config for the security-audit workflow's "ESLint Security Scan"
// step (security-audit.yml). It was referenced via `--config .eslintrc-security.js`
// but never existed, so the scan crashed with "Cannot find module". Rules are
// declared explicitly (not via `extends: plugin:security/...`) to stay version-
// agnostic across eslint-plugin-security v1/v2/v3. All rules are warnings; the
// step also runs with `|| true`, so this surfaces findings without blocking CI.
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['security'],
  rules: {
    'security/detect-eval-with-expression': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-child-process': 'warn',
    'security/detect-unsafe-regex': 'warn',
    'security/detect-buffer-noassert': 'warn',
    'security/detect-pseudoRandomBytes': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-object-injection': 'off',
  },
}
